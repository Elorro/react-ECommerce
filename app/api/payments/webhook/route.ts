import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordOperationalEvent } from "@/lib/observability";
import { confirmStripeOrderPaymentBySessionId, failStripeOrderPaymentBySessionId } from "@/lib/orders";
import { getStripe, isStripeConfigured } from "@/lib/payments";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    logEvent("ERROR", "payments.webhook.misconfigured", { requestId });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "payments.webhook",
      message: "Stripe webhook called without full configuration",
      requestId,
      route: "/api/payments/webhook",
    });
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      withRequestIdHeaders({ status: 503 }, requestId),
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    logEvent("WARN", "payments.webhook.missing_signature", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "payments.webhook",
      message: "Stripe webhook signature missing",
      requestId,
      route: "/api/payments/webhook",
    });
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }

  try {
    const body = await request.text();
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.id) {
        await confirmStripeOrderPaymentBySessionId(session.id);
      }
    }

    if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.id) {
        await failStripeOrderPaymentBySessionId(session.id);
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      logEvent("INFO", "payments.webhook.payment_intent_succeeded", {
        requestId,
        eventType: event.type,
        orderId: paymentIntent.metadata?.orderId,
      });
      await recordOperationalEvent({
        level: "INFO",
        scope: "payments.webhook",
        message: "Stripe payment intent succeeded",
        requestId,
        route: "/api/payments/webhook",
        metadata: {
          eventType: event.type,
          orderId: paymentIntent.metadata?.orderId ?? null,
          paymentIntentId: paymentIntent.id,
        },
      });
    }

    logEvent("INFO", "payments.webhook.received", {
      requestId,
      eventType: event.type,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "payments.webhook",
      message: "Stripe webhook processed",
      requestId,
      route: "/api/payments/webhook",
      metadata: {
        eventType: event.type,
      },
    });

    return NextResponse.json({ received: true }, withRequestIdHeaders(undefined, requestId));
  } catch (error) {
    logEvent("ERROR", "payments.webhook.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "payments.webhook",
      message: "Stripe webhook failed",
      requestId,
      route: "/api/payments/webhook",
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
