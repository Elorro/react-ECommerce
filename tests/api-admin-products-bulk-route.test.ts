// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const updateManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    product: {
      updateMany: updateManyMock,
    },
    operationalLog: {
      create: vi.fn(),
    },
  },
}));

describe("api/admin/products/bulk PATCH", () => {
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

    const { PATCH } = await import("@/app/api/admin/products/bulk/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/products/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: ["prod_1"],
          action: "ARCHIVE",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("updates products in bulk for admins", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "admin_1",
        role: "ADMIN",
      },
    });
    updateManyMock.mockResolvedValue({ count: 2 });

    const { PATCH } = await import("@/app/api/admin/products/bulk/route");
    const response = await PATCH(
      new Request("http://localhost:3000/api/admin/products/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: ["prod_1", "prod_2"],
          action: "ARCHIVE",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updatedCount: 2 });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["prod_1", "prod_2"],
        },
      },
      data: {
        status: "ARCHIVED",
      },
    });
  });
});
