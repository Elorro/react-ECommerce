import { afterEach, describe, expect, it } from "vitest";

describe("payments helpers", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.E2E_STRIPE_MODE;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
  });

  it("enables mock checkout whenever the explicit e2e flag is set", async () => {
    process.env.E2E_STRIPE_MODE = "mock";
    process.env.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3100";

    const { isStripeMockEnabled, isStripeCheckoutEnabled } = await import("@/lib/payments");

    expect(isStripeMockEnabled()).toBe(true);
    expect(isStripeCheckoutEnabled()).toBe(true);
  });

  it("disables checkout when neither stripe nor mock mode is configured", async () => {
    const { isStripeMockEnabled, isStripeCheckoutEnabled } = await import("@/lib/payments");

    expect(isStripeMockEnabled()).toBe(false);
    expect(isStripeCheckoutEnabled()).toBe(false);
  });
});
