// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiPermissionMock = vi.fn();
const orderFindUniqueMock = vi.fn();
const orderNoteCreateMock = vi.fn();
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
    orderNote: {
      create: orderNoteCreateMock,
    },
  },
}));

vi.mock("@/lib/observability", () => ({
  recordAdminAuditEvent: recordAdminAuditEventMock,
  recordOperationalEvent: recordOperationalEventMock,
}));

describe("api/admin/orders/[id]/notes POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an internal support note for a valid order", async () => {
    requireApiPermissionMock.mockResolvedValue({
      user: {
        id: "ops_1",
      },
    });
    orderFindUniqueMock.mockResolvedValue({ id: "ord_1" });
    orderNoteCreateMock.mockResolvedValue({
      id: "note_1",
      content: "Cliente reporta cambio de direccion.",
      createdAt: new Date("2026-03-17T12:00:00.000Z"),
      updatedAt: new Date("2026-03-17T12:00:00.000Z"),
      author: {
        id: "ops_1",
        name: "Operaciones",
        email: "ops@example.com",
        role: "OPERATIONS",
      },
    });

    const { POST } = await import("@/app/api/admin/orders/[id]/notes/route");
    const response = await POST(
      new Request("http://localhost:3000/api/admin/orders/ord_1/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "req-note",
        },
        body: JSON.stringify({
          content: "Cliente reporta cambio de direccion.",
        }),
      }),
      {
        params: Promise.resolve({ id: "ord_1" }),
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      id: "note_1",
      content: "Cliente reporta cambio de direccion.",
    });
    expect(orderNoteCreateMock).toHaveBeenCalled();
    expect(recordAdminAuditEventMock).toHaveBeenCalled();
  });
});
