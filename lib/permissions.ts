import type { UserRole } from "@prisma/client";

export type AppRole = UserRole;

export type Permission =
  | "admin.dashboard.view"
  | "catalog.products.view"
  | "catalog.products.manage"
  | "catalog.categories.view"
  | "catalog.categories.manage"
  | "orders.view"
  | "orders.update"
  | "orders.bulk_update"
  | "orders.refund"
  | "orders.returns.manage"
  | "orders.notes.manage"
  | "observability.view"
  | "exports.products"
  | "exports.categories"
  | "exports.orders"
  | "exports.logs";

const rolePermissions: Record<AppRole, Permission[]> = {
  CUSTOMER: [],
  OPERATIONS: [
    "admin.dashboard.view",
    "orders.view",
    "orders.update",
    "orders.bulk_update",
    "orders.refund",
    "orders.returns.manage",
    "orders.notes.manage",
    "observability.view",
    "exports.orders",
    "exports.logs",
  ],
  ADMIN: [
    "admin.dashboard.view",
    "catalog.products.view",
    "catalog.products.manage",
    "catalog.categories.view",
    "catalog.categories.manage",
    "orders.view",
    "orders.update",
    "orders.bulk_update",
    "orders.refund",
    "orders.returns.manage",
    "orders.notes.manage",
    "observability.view",
    "exports.products",
    "exports.categories",
    "exports.orders",
    "exports.logs",
  ],
};

export function getRolePermissions(role: AppRole) {
  return rolePermissions[role];
}

export function hasPermission(role: AppRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
