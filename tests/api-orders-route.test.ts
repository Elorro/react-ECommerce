// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const createOrderMock = vi.fn();
const rateLimitByIpMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/orders", () => ({
  createOrder: createOrderMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: rateLimitByIpMock,
}));

describe("api/orders POST", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(
      new Request("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-unauth",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBe("req-unauth");
  });

  it("creates an order for authenticated users with valid payload", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        email: "buyer@example.com",
      },
    });
    rateLimitByIpMock.mockReturnValue({ success: true, retryAfterSeconds: 0 });
    createOrderMock.mockResolvedValue({ id: "ord_1" });

    const { POST } = await import("@/app/api/orders/route");
    const response = await POST(
      new Request("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-order",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          customerName: "Luis Araque",
          shippingAddress: "Calle 123 #45-67, Bogota",
          items: [{ productId: "prod_1", quantity: 2 }],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ orderId: "ord_1" });
    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: "Luis Araque",
        items: [{ productId: "prod_1", quantity: 2 }],
      }),
      {
        userId: "user_1",
        userEmail: "buyer@example.com",
      },
    );
  });
});
