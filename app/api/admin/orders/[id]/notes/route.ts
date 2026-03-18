import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent, recordOperationalEvent } from "@/lib/observability";
import { addOrderSupportNote } from "@/lib/orders";
import { createOrderNoteSchema } from "@/lib/validators/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("orders.notes.manage");

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      withRequestIdHeaders({ status: 403 }, requestId),
    );
  }

  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        withRequestIdHeaders({ status: 404 }, requestId),
      );
    }

    const payload = createOrderNoteSchema.parse(await request.json());
    const note = await addOrderSupportNote({
      orderId: id,
      authorUserId: session.user.id,
      content: payload.content,
    });

    logEvent("INFO", "admin.orders.note.created", {
      requestId,
      userId: session.user.id,
      orderId: id,
      noteId: note.id,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "admin.orders.note",
      message: "Admin added an internal order note",
      requestId,
      route: "/api/admin/orders/[id]/notes",
      userId: session.user.id,
      orderId: id,
      metadata: {
        noteId: note.id,
      },
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "order.note.create",
      route: "/api/admin/orders/[id]/notes",
      requestId,
      targetType: "order",
      targetIds: [id],
      metadata: {
        noteId: note.id,
      },
    });

    return NextResponse.json(note, withRequestIdHeaders({ status: 201 }, requestId));
  } catch (error) {
    logEvent("ERROR", "admin.orders.note.failed", {
      requestId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "admin.orders.note",
      message: "Failed to add internal order note",
      requestId,
      route: "/api/admin/orders/[id]/notes",
      userId: session.user.id,
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return NextResponse.json(
      { error: "Unable to create note." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
