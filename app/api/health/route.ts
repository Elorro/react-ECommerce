import { NextResponse } from "next/server";
import { alertsAreConfigured } from "@/lib/alerts";
import { getAvailableAuthProviders } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObservabilityMetrics } from "@/lib/observability";
import { isStripeCheckoutEnabled, isStripeConfigured, isStripeMockEnabled } from "@/lib/payments";
import { getRuntimeReadiness } from "@/lib/runtime-config";

export async function GET() {
  let databaseOk = true;

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    databaseOk = false;
  }

  const metrics = await getObservabilityMetrics();
  const readiness = getRuntimeReadiness();
  const ok = databaseOk && (process.env.NODE_ENV !== "production" || readiness.productionReady);

  return NextResponse.json({
    ok,
    service: "atelier-commerce",
    environment: process.env.NODE_ENV,
    database: {
      ok: databaseOk,
      provider: process.env.DATABASE_URL?.startsWith("postgresql://") ? "postgresql" : "sqlite",
      postgresConfigured: Boolean(process.env.DATABASE_URL_POSTGRES),
    },
    authProviders: getAvailableAuthProviders().map((provider) => provider.id),
    stripeConfigured: isStripeConfigured(),
    stripeCheckoutEnabled: isStripeCheckoutEnabled(),
    stripeMockEnabled: isStripeMockEnabled(),
    stripeLiveMode: Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")),
    jobsConfigured: Boolean(process.env.INTERNAL_JOB_SECRET),
    alertsConfigured: alertsAreConfigured(),
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
    readiness: {
      productionReady: readiness.productionReady,
      issues: readiness.issues,
      warnings: readiness.warnings,
      cronReconcileUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/internal/orders/reconcile`,
      stripeWebhookEvents: [
        "checkout.session.completed",
        "checkout.session.expired",
        "checkout.session.async_payment_failed",
        "payment_intent.succeeded",
      ],
    },
    observability: {
      errors24h: metrics.last24Hours.errors,
      paymentFailures24h: metrics.last24Hours.paymentFailures,
      stalePendingPayments: metrics.stalePendingPayments,
    },
    timestamp: new Date().toISOString(),
  }, { status: ok ? 200 : 503 });
}
