// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findManyProductsMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    product: {
      findMany: findManyProductsMock,
    },
    category: {
      findMany: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
    operationalLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("api/admin/export/[resource] GET", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("exports products as CSV for admins", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "admin_1",
        role: "ADMIN",
      },
    });
    findManyProductsMock.mockResolvedValue([
      {
        id: "prod_1",
        name: "Chaqueta",
        slug: "chaqueta",
        status: "ACTIVE",
        featured: true,
        stock: 8,
        price: 120,
        category: { name: "Outerwear" },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const { GET } = await import("@/app/api/admin/export/[resource]/route");
    const response = await GET(
      new Request("http://localhost:3000/api/admin/export/products?q=Chaqueta&status=ACTIVE"),
      {
        params: Promise.resolve({ resource: "products" }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(await response.text()).toContain("Chaqueta");
    expect(findManyProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          OR: [{ name: { contains: "Chaqueta" } }, { slug: { contains: "Chaqueta" } }],
        }),
      }),
    );
  });
});
