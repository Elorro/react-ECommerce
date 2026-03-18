import { describe, expect, it } from "vitest";
import { getRolePermissions, hasPermission } from "@/lib/permissions";

describe("permissions", () => {
  it("keeps operations away from catalog management", () => {
    expect(hasPermission("OPERATIONS", "orders.view")).toBe(true);
    expect(hasPermission("OPERATIONS", "orders.update")).toBe(true);
    expect(hasPermission("OPERATIONS", "catalog.products.view")).toBe(false);
    expect(hasPermission("OPERATIONS", "catalog.products.manage")).toBe(false);
  });

  it("grants admin the full export surface", () => {
    const permissions = getRolePermissions("ADMIN");

    expect(permissions).toContain("exports.products");
    expect(permissions).toContain("exports.categories");
    expect(permissions).toContain("exports.orders");
    expect(permissions).toContain("exports.logs");
  });
});
