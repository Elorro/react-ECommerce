// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const updateOrderStatusMock = vi.fn();
const orderFindUniqueMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    order: {
      findUnique: orderFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/orders", () => ({
  updateOrderStatus: updateOrderStatusMock,
}));

describe("api/admin/orders/[id] PATCH", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    orderFindUniqueMock.mockResolvedValue({
      id: "ord_1",
      status: "PAID",
      paymentStatus: "PAID",
      processingStartedAt: null,
      fulfilledAt: null,
      canceledAt: null,
      refundedAt: null,
    });
  });

  it("rejects non-admin users", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        role: "CUSTOMER",
      },
    });

    const { PATCH } = await import("@/app/api/admin/orders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/orders/ord_1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-admin-forbidden",
        },
        body: JSON.stringify({ status: "FULFILLED" }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBe("req-admin-forbidden");
  });

  it("updates order status for admins", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "admin_1",
        role: "ADMIN",
      },
    });
    updateOrderStatusMock.mockResolvedValue({
      id: "ord_1",
      status: "FULFILLED",
      paymentStatus: "PAID",
      processingStartedAt: null,
      fulfilledAt: new Date("2026-03-18T02:00:00.000Z"),
      canceledAt: null,
      refundedAt: null,
    });

    const { PATCH } = await import("@/app/api/admin/orders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/orders/ord_1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-admin-ok",
        },
        body: JSON.stringify({ status: "FULFILLED" }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "ord_1", status: "FULFILLED" });
    expect(updateOrderStatusMock).toHaveBeenCalledWith("ord_1", "FULFILLED");
  });

  it("returns a validation error for invalid transitions", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "admin_1",
        role: "ADMIN",
      },
    });
    updateOrderStatusMock.mockRejectedValue(new Error("Invalid order status transition."));

    const { PATCH } = await import("@/app/api/admin/orders/[id]/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/orders/ord_1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PAID" }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(400);
  });
});
