import { afterEach, describe, expect, it } from "vitest";

describe("payments helpers", () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.E2E_STRIPE_MODE;
  });

  it("enables mock checkout whenever the explicit e2e flag is set", async () => {
    process.env.E2E_STRIPE_MODE = "mock";

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
