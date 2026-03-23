type RuntimeReadiness = {
  issues: string[];
  warnings: string[];
  productionReady: boolean;
};

function normalizeUrl(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function hasOAuthProviderConfigured() {
  return Boolean(
    (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) ||
      (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
  );
}

function hasSecureSecret(value?: string) {
  return Boolean(value && value.length >= 32);
}

function isHttpsUrl(value?: string) {
  const parsed = normalizeUrl(value);
  return parsed?.protocol === "https:";
}

export function isLocalAppUrl() {
  const appUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL);

  if (!appUrl) {
    return false;
  }

  return appUrl.hostname === "localhost" || appUrl.hostname === "127.0.0.1";
}

export function getRuntimeReadiness(): RuntimeReadiness {
  const issues: string[] = [];
  const warnings: string[] = [];
  const appUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  const authUrl = normalizeUrl(process.env.NEXTAUTH_URL);
  const databaseUrl = process.env.DATABASE_URL || "";
  const isProduction = process.env.NODE_ENV === "production";

  if (!process.env.NEXTAUTH_SECRET) {
    issues.push("NEXTAUTH_SECRET is missing");
  }
  if (process.env.NEXTAUTH_SECRET && !hasSecureSecret(process.env.NEXTAUTH_SECRET)) {
    issues.push("NEXTAUTH_SECRET must be at least 32 characters");
  }

  if (!process.env.NEXTAUTH_URL || !authUrl) {
    issues.push("NEXTAUTH_URL is missing or invalid");
  }

  if (!process.env.NEXT_PUBLIC_APP_URL || !appUrl) {
    issues.push("NEXT_PUBLIC_APP_URL is missing or invalid");
  }

  if (!process.env.INTERNAL_JOB_SECRET) {
    issues.push("INTERNAL_JOB_SECRET is missing");
  }
  if (process.env.INTERNAL_JOB_SECRET && !hasSecureSecret(process.env.INTERNAL_JOB_SECRET)) {
    issues.push("INTERNAL_JOB_SECRET must be at least 32 characters");
  }

  if (!databaseUrl) {
    issues.push("DATABASE_URL is missing");
  }

  if (!hasOAuthProviderConfigured()) {
    issues.push("At least one OAuth provider must be configured");
  }

  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    issues.push("STRIPE_WEBHOOK_SECRET is missing");
  }

  if (!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    issues.push("STRIPE_SECRET_KEY is missing");
  }

  if (appUrl && authUrl && appUrl.origin !== authUrl.origin) {
    issues.push("NEXT_PUBLIC_APP_URL and NEXTAUTH_URL must share the same origin");
  }

  if (process.env.E2E_STRIPE_MODE === "mock" && !isLocalAppUrl()) {
    issues.push("E2E_STRIPE_MODE=mock is only allowed with localhost app URLs");
  }

  if (isProduction && databaseUrl.startsWith("file:")) {
    issues.push("Production should not run on SQLite");
  }

  if (isProduction && !isHttpsUrl(process.env.NEXTAUTH_URL)) {
    issues.push("NEXTAUTH_URL must use HTTPS in production");
  }

  if (isProduction && !isHttpsUrl(process.env.NEXT_PUBLIC_APP_URL)) {
    issues.push("NEXT_PUBLIC_APP_URL must use HTTPS in production");
  }

  if (isProduction && process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    issues.push("STRIPE_SECRET_KEY must use a live key in production");
  }

  if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
    issues.push("STRIPE_WEBHOOK_SECRET must start with whsec_");
  }

  if (isProduction && !process.env.DATABASE_URL_POSTGRES) {
    warnings.push("DATABASE_URL_POSTGRES is missing");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push("Stripe is not configured");
  }

  if (!process.env.SENTRY_DSN) {
    warnings.push("SENTRY_DSN is missing");
  }

  if (!process.env.ALERT_WEBHOOK_URL) {
    warnings.push("ALERT_WEBHOOK_URL is missing");
  }

  return {
    issues,
    warnings,
    productionReady: issues.length === 0,
  };
}
