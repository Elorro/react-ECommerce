// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiPermissionMock = vi.fn();
const orderFindUniqueMock = vi.fn();
const refundOrderMock = vi.fn();
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
  refundOrder: refundOrderMock,
}));

vi.mock("@/lib/observability", () => ({
  recordAdminAuditEvent: recordAdminAuditEventMock,
  recordOperationalEvent: recordOperationalEventMock,
}));

describe("api/admin/orders/[id]/refund POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderFindUniqueMock.mockResolvedValue({
      id: "ord_1",
      status: "PAID",
      paymentStatus: "PAID",
      paymentProvider: "stripe",
      paymentSessionId: "cs_test_123",
      canceledAt: null,
      refundedAt: null,
    });
  });

  it("rejects users without refund permission", async () => {
    requireApiPermissionMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/admin/orders/[id]/refund/route");
    const response = await POST(
      new Request("http://localhost:3000/api/admin/orders/ord_1/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-refund-denied",
        },
        body: JSON.stringify({ reason: "Cliente solicito cancelacion." }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("x-request-id")).toBe("req-refund-denied");
  });

  it("refunds an order and records audit context", async () => {
    requireApiPermissionMock.mockResolvedValue({
      user: {
        id: "ops_1",
        role: "OPERATIONS",
      },
    });
    refundOrderMock.mockResolvedValue({
      order: {
        id: "ord_1",
        status: "CANCELED",
        paymentStatus: "REFUNDED",
        canceledAt: new Date("2026-03-18T03:00:00.000Z"),
        refundedAt: new Date("2026-03-18T03:00:00.000Z"),
      },
      noteId: "note_1",
      refundMode: "stripe",
      refundReferenceId: "re_123",
    });

    const { POST } = await import("@/app/api/admin/orders/[id]/refund/route");
    const response = await POST(
      new Request("http://localhost:3000/api/admin/orders/ord_1/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-refund-ok",
        },
        body: JSON.stringify({ reason: "Cliente solicito cancelacion." }),
      }),
      { params: Promise.resolve({ id: "ord_1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "ord_1",
      status: "CANCELED",
      paymentStatus: "REFUNDED",
    });
    expect(refundOrderMock).toHaveBeenCalledWith({
      orderId: "ord_1",
      actorUserId: "ops_1",
      reason: "Cliente solicito cancelacion.",
    });
    expect(recordAdminAuditEventMock).toHaveBeenCalled();
  });
});
