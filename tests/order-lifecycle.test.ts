import { describe, expect, it } from "vitest";
import { getPendingPaymentExpiryDate, shouldExpirePendingOrder } from "@/lib/orders-lifecycle";

describe("order lifecycle", () => {
  it("computes a pending payment expiry window", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const expiry = getPendingPaymentExpiryDate(start);

    expect(expiry.toISOString()).toBe("2026-01-01T00:30:00.000Z");
  });

  it("expires only pending payment orders whose window passed", () => {
    expect(
      shouldExpirePendingOrder({
        paymentStatus: "REQUIRES_ACTION",
        paymentExpiresAt: new Date("2026-01-01T00:30:00.000Z"),
        now: new Date("2026-01-01T00:31:00.000Z"),
      }),
    ).toBe(true);

    expect(
      shouldExpirePendingOrder({
        paymentStatus: "PAID",
        paymentExpiresAt: new Date("2026-01-01T00:30:00.000Z"),
        now: new Date("2026-01-01T00:31:00.000Z"),
      }),
    ).toBe(false);
  });
});
