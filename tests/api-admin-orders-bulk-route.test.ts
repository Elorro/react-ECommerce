// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const bulkUpdateOrderStatusesMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/orders", () => ({
  bulkUpdateOrderStatuses: bulkUpdateOrderStatusesMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    operationalLog: {
      create: vi.fn(),
    },
  },
}));

describe("api/admin/orders/bulk PATCH", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects non-admin users", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        role: "CUSTOMER",
      },
    });

    const { PATCH } = await import("@/app/api/admin/orders/bulk/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/orders/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: ["ord_1"],
          status: "FULFILLED",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("updates orders in bulk for admins", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "admin_1",
        role: "ADMIN",
      },
    });
    bulkUpdateOrderStatusesMock.mockResolvedValue({
      updatedIds: ["ord_1", "ord_2"],
      skippedIds: [],
    });

    const { PATCH } = await import("@/app/api/admin/orders/bulk/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/orders/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: ["ord_1", "ord_2"],
          status: "PAID",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      updatedCount: 2,
      updatedIds: ["ord_1", "ord_2"],
      skippedIds: [],
    });
    expect(bulkUpdateOrderStatusesMock).toHaveBeenCalledWith(["ord_1", "ord_2"], "PAID");
  });
});
