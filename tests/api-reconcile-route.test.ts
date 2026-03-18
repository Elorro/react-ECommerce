// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const expireStalePendingOrdersMock = vi.fn();

vi.mock("@/lib/orders", () => ({
  expireStalePendingOrders: expireStalePendingOrdersMock,
}));

describe("api/internal/orders/reconcile POST", () => {
  const previousSecret = process.env.INTERNAL_JOB_SECRET;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_JOB_SECRET = "job-secret";
  });

  it("rejects requests without the internal bearer token", async () => {
    const { POST } = await import("@/app/api/internal/orders/reconcile/route");
    const response = await POST(
      new Request("http://localhost:3000/api/internal/orders/reconcile", {
        method: "POST",
        headers: {
          "x-request-id": "req-job-denied",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBe("req-job-denied");
  });

  it("expires pending orders with a valid bearer token", async () => {
    expireStalePendingOrdersMock.mockResolvedValue({ expiredCount: 3 });

    const { POST } = await import("@/app/api/internal/orders/reconcile/route");
    const response = await POST(
      new Request("http://localhost:3000/api/internal/orders/reconcile", {
        method: "POST",
        headers: {
          Authorization: "Bearer job-secret",
          "x-request-id": "req-job-ok",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ expiredCount: 3 });
  });

  afterAll(() => {
    process.env.INTERNAL_JOB_SECRET = previousSecret;
  });
});
