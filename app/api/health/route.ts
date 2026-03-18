import { NextResponse } from "next/server";
import { getAvailableAuthProviders } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObservabilityMetrics } from "@/lib/observability";
import { isStripeCheckoutEnabled, isStripeConfigured, isStripeMockEnabled } from "@/lib/payments";

export async function GET() {
  let databaseOk = true;

  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    databaseOk = false;
  }

  const metrics = await getObservabilityMetrics();
  const missingReadiness: string[] = [];

  if (!process.env.NEXTAUTH_SECRET) {
    missingReadiness.push("NEXTAUTH_SECRET");
  }

  if (!process.env.NEXTAUTH_URL) {
    missingReadiness.push("NEXTAUTH_URL");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    missingReadiness.push("NEXT_PUBLIC_APP_URL");
  }

  if (!process.env.INTERNAL_JOB_SECRET) {
    missingReadiness.push("INTERNAL_JOB_SECRET");
  }

  if (!process.env.DATABASE_URL_POSTGRES) {
    missingReadiness.push("DATABASE_URL_POSTGRES");
  }

  return NextResponse.json({
    ok: databaseOk,
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
    jobsConfigured: Boolean(process.env.INTERNAL_JOB_SECRET),
    readiness: {
      productionReady: databaseOk && missingReadiness.length === 0,
      missing: missingReadiness,
      cronReconcileUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/internal/orders/reconcile`,
    },
    observability: {
      errors24h: metrics.last24Hours.errors,
      paymentFailures24h: metrics.last24Hours.paymentFailures,
      stalePendingPayments: metrics.stalePendingPayments,
    },
    timestamp: new Date().toISOString(),
  });
}
