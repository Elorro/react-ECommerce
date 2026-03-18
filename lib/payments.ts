import Stripe from "stripe";
import { isLocalAppUrl } from "@/lib/runtime-config";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isStripeMockEnabled() {
  return process.env.E2E_STRIPE_MODE === "mock" && isLocalAppUrl();
}

export function isStripeCheckoutEnabled() {
  return isStripeConfigured() || isStripeMockEnabled();
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }

  return stripeClient;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function isMockStripeSessionId(sessionId: string) {
  return isStripeMockEnabled() && sessionId.startsWith("mock_checkout_");
}

export async function refundCheckoutSessionPayment(input: {
  orderId: string;
  paymentProvider?: string | null;
  paymentSessionId?: string | null;
  reason: string;
}) {
  if (input.paymentProvider !== "stripe") {
    return {
      mode: "manual" as const,
      referenceId: null,
    };
  }

  if (!input.paymentSessionId) {
    throw new Error("Stripe refund requires a checkout session reference.");
  }

  if (isMockStripeSessionId(input.paymentSessionId)) {
    return {
      mode: "mock" as const,
      referenceId: `mock_refund_${input.orderId}`,
    };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(input.paymentSessionId, {
    expand: ["payment_intent"],
  });
  const paymentIntent = session.payment_intent;

  if (!paymentIntent) {
    throw new Error("Stripe checkout session does not have a payment intent.");
  }

  const refund = await stripe.refunds.create({
    payment_intent: typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id,
    reason: "requested_by_customer",
    metadata: {
      orderId: input.orderId,
      supportReason: input.reason.slice(0, 500),
    },
  });

  return {
    mode: "stripe" as const,
    referenceId: refund.id,
  };
}
