// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const getUserCartMock = vi.fn();
const syncUserCartMock = vi.fn();
const mergeUserCartMock = vi.fn();
const clearUserCartMock = vi.fn();
const rateLimitByIpMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/cart", () => ({
  getUserCart: getUserCartMock,
  syncUserCart: syncUserCartMock,
  mergeUserCart: mergeUserCartMock,
  clearUserCart: clearUserCartMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByIp: rateLimitByIpMock,
}));

describe("api/cart route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    rateLimitByIpMock.mockReturnValue({ success: true, retryAfterSeconds: 0 });
  });

  it("rejects unauthenticated reads", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/cart/route");
    const response = await GET(
      new Request("http://localhost:3000/api/cart", {
        headers: {
          "x-request-id": "req-cart-unauth",
        },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns the authenticated cart", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
      },
    });
    getUserCartMock.mockResolvedValue([
      {
        id: "prod_1",
        name: "Chaqueta",
        slug: "chaqueta",
        imageUrl: "/chaqueta.jpg",
        price: 120,
        stock: 5,
        quantity: 2,
      },
    ]);

    const { GET } = await import("@/app/api/cart/route");
    const response = await GET(new Request("http://localhost:3000/api/cart"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          id: "prod_1",
          name: "Chaqueta",
          slug: "chaqueta",
          imageUrl: "/chaqueta.jpg",
          price: 120,
          stock: 5,
          quantity: 2,
        },
      ],
    });
    expect(getUserCartMock).toHaveBeenCalledWith("user_1");
  });

  it("merges anonymous items into the authenticated cart", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
      },
    });
    mergeUserCartMock.mockResolvedValue([
      {
        id: "prod_1",
        name: "Chaqueta",
        slug: "chaqueta",
        imageUrl: "/chaqueta.jpg",
        price: 120,
        stock: 5,
        quantity: 3,
      },
    ]);

    const { POST } = await import("@/app/api/cart/route");
    const response = await POST(
      new Request("http://localhost:3000/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          items: [{ productId: "prod_1", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mergeUserCartMock).toHaveBeenCalledWith("user_1", {
      items: [{ productId: "prod_1", quantity: 1 }],
    });
  });
});
