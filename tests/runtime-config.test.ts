import { afterEach, describe, expect, it } from "vitest";
import { getRuntimeReadiness } from "@/lib/runtime-config";

const originalEnv = { ...process.env };

describe("runtime readiness", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("marks production as not ready when SQLite is used", () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
    };
    process.env.DATABASE_URL = "file:./prisma/dev.db";
    process.env.NEXTAUTH_SECRET = "super-secure-nextauth-secret-value-123";
    process.env.NEXTAUTH_URL = "https://shop.example.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://shop.example.com";
    process.env.INTERNAL_JOB_SECRET = "super-secure-internal-job-secret-123";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.STRIPE_SECRET_KEY = "sk_live_test_like_value_for_validation";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_like_value_for_validation";

    const readiness = getRuntimeReadiness();

    expect(readiness.productionReady).toBe(false);
    expect(readiness.issues).toContain("Production should not run on SQLite");
  });

  it("marks production as ready with a consistent postgres setup", () => {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
    };
    process.env.DATABASE_URL = "postgresql://shop:pass@db.example.com:5432/shop?schema=public";
    process.env.DATABASE_URL_POSTGRES =
      "postgresql://shop:pass@db.example.com:5432/shop?schema=public";
    process.env.NEXTAUTH_SECRET = "super-secure-nextauth-secret-value-123";
    process.env.NEXTAUTH_URL = "https://shop.example.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://shop.example.com";
    process.env.INTERNAL_JOB_SECRET = "super-secure-internal-job-secret-123";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.STRIPE_SECRET_KEY = "sk_live_test_like_value_for_validation";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_like_value_for_validation";
    process.env.SENTRY_DSN = "https://public@example.ingest.sentry.io/1";
    process.env.ALERT_WEBHOOK_URL = "https://alerts.example.com/webhook";

    const readiness = getRuntimeReadiness();

    expect(readiness.productionReady).toBe(true);
    expect(readiness.issues).toHaveLength(0);
  });
});
