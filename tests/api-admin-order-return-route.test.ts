// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiPermissionMock = vi.fn();
const orderFindUniqueMock = vi.fn();
const manageOrderReturnMock = vi.fn();
const recordAdminAuditEventMock = vi.fn();
const recordOperationalEventMock = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  requireApiPermission: requireApiPermissionMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    order: {
      findUnique: orderFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/orders", () => ({
  manageOrderReturn: manageOrderReturnMock,
}));

vi.mock("@/lib/observability", () => ({
  recordAdminAuditEvent: recordAdminAuditEventMock,
  recordOperationalEvent: recordOperationalEventMock,
}));

describe("api/admin/orders/[id]/return POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderFindUniqueMock.mockResolvedValue({
      id: "ord_1",
      status: "FULFILLED",
      paymentStatus: "PAID",
      returnStatus: "NONE",
      returnRequestedAt: null,
      returnReceivedAt: null,
      refundedAt: null,
    });
  });

  it("rejects users without return permission", async () => {
    requireApiPermissionMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/orders/[id]/return/route");
    const response = await POST(
      new Request("http://localhost:3000/api/admin/orders/ord_1/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-return-denied",
        },
        body: JSON.stringify({ action: "REQUEST", reason: "Cliente reporta defecto." }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBe("req-return-denied");
  });

  it("registers a return request for authorized staff", async () => {
    requireApiPermissionMock.mockResolvedValue({
      user: {
        id: "ops_1",
        role: "OPERATIONS",
      },
    });
    manageOrderReturnMock.mockResolvedValue({
      order: {
        id: "ord_1",
        status: "FULFILLED",
        paymentStatus: "PAID",
        returnStatus: "REQUESTED",
        returnRequestedAt: new Date("2026-03-18T12:00:00.000Z"),
        returnReceivedAt: null,
        refundedAt: null,
      },
      noteId: "note_return_1",
      refundMode: null,
      refundReferenceId: null,
    });

    const { POST } = await import("@/app/api/admin/orders/[id]/return/route");
    const response = await POST(
      new Request("http://localhost:3000/api/admin/orders/ord_1/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-return-ok",
        },
        body: JSON.stringify({ action: "REQUEST", reason: "Cliente reporta defecto." }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "ord_1",
      status: "FULFILLED",
      paymentStatus: "PAID",
      returnStatus: "REQUESTED",
    });
    expect(manageOrderReturnMock).toHaveBeenCalledWith({
      orderId: "ord_1",
      actorUserId: "ops_1",
      action: "REQUEST",
      reason: "Cliente reporta defecto.",
    });
    expect(recordAdminAuditEventMock).toHaveBeenCalled();
  });
});
