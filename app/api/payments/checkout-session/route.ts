import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordOperationalEvent } from "@/lib/observability";
import { createPendingStripeOrder } from "@/lib/orders";
import { isStripeCheckoutEnabled, isStripeMockEnabled } from "@/lib/payments";
import { rateLimitByIp } from "@/lib/rate-limit";
import { orderCheckoutSchema } from "@/lib/validators/order";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    logEvent("WARN", "payments.checkout_session.unauthorized", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "payments.checkout_session",
      message: "Unauthorized Stripe checkout session attempt",
      requestId,
      route: "/api/payments/checkout-session",
    });
    return NextResponse.json(
      { error: "Authentication is required." },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  if (!isStripeCheckoutEnabled()) {
    logEvent("ERROR", "payments.checkout_session.misconfigured", { requestId });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "payments.checkout_session",
      message: "Stripe checkout attempted without configuration",
      requestId,
      route: "/api/payments/checkout-session",
    });
    return NextResponse.json(
      { error: "Stripe is not configured." },
      withRequestIdHeaders({ status: 503 }, requestId),
    );
  }

  const rateLimit = rateLimitByIp(request, "payments:checkout-session", {
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.success) {
    logEvent("WARN", "payments.checkout_session.rate_limited", {
      requestId,
      userId: session.user.id,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    await recordOperationalEvent({
      level: "WARN",
      scope: "payments.checkout_session",
      message: "Rate limit reached during Stripe checkout session creation",
      requestId,
      route: "/api/payments/checkout-session",
      userId: session.user.id,
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return NextResponse.json(
      { error: "Too many payment attempts. Try again in a minute." },
      withRequestIdHeaders({ status: 429 }, requestId),
    );
  }

  try {
    const payload = orderCheckoutSchema.parse(await request.json());
    const result = await createPendingStripeOrder(payload, {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
    });

    logEvent("INFO", "payments.checkout_session.created", {
      requestId,
      userId: session.user.id,
      orderId: result.orderId,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "payments.checkout_session",
      message: "Stripe checkout session created",
      requestId,
      route: "/api/payments/checkout-session",
      userId: session.user.id,
      orderId: result.orderId,
      metadata: {
        mode: isStripeMockEnabled() ? "mock" : "stripe",
      },
    });

    return NextResponse.json(result, withRequestIdHeaders({ status: 201 }, requestId));
  } catch (error) {
    logEvent("ERROR", "payments.checkout_session.failed", {
      requestId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "payments.checkout_session",
      message: "Stripe checkout session creation failed",
      requestId,
      route: "/api/payments/checkout-session",
      userId: session.user.id,
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return NextResponse.json(
      { error: "Unable to create payment session." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
