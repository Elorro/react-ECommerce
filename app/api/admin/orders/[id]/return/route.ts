import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent, recordOperationalEvent } from "@/lib/observability";
import { manageOrderReturn } from "@/lib/orders";
import { manageReturnSchema } from "@/lib/validators/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("orders.returns.manage");

  if (!session?.user?.id) {
    logEvent("WARN", "admin.orders.return.forbidden", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "admin.orders.return",
      message: "Forbidden admin return attempt",
      requestId,
      route: "/api/admin/orders/[id]/return",
      userId: session?.user?.id,
    });
    return NextResponse.json(
      { error: "Forbidden" },
      withRequestIdHeaders({ status: 403 }, requestId),
    );
  }

  try {
    const { id } = await params;
    const payload = manageReturnSchema.parse(await request.json());
    const before = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        returnStatus: true,
        returnRequestedAt: true,
        returnReceivedAt: true,
        refundedAt: true,
      },
    });

    if (!before) {
      return NextResponse.json(
        { error: "Order not found." },
        withRequestIdHeaders({ status: 404 }, requestId),
      );
    }

    const result = await manageOrderReturn({
      orderId: id,
      actorUserId: session.user.id,
      action: payload.action,
      reason: "reason" in payload ? payload.reason : undefined,
    });

    logEvent("INFO", "admin.orders.return.success", {
      requestId,
      userId: session.user.id,
      orderId: result.order.id,
      action: payload.action,
      refundMode: result.refundMode,
      refundReferenceId: result.refundReferenceId,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "admin.orders.return",
      message: "Admin updated order return flow",
      requestId,
      route: "/api/admin/orders/[id]/return",
      userId: session.user.id,
      orderId: result.order.id,
      metadata: {
        action: payload.action,
        noteId: result.noteId,
        refundMode: result.refundMode,
        refundReferenceId: result.refundReferenceId,
      },
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "order.return.manage",
      route: "/api/admin/orders/[id]/return",
      requestId,
      targetType: "order",
      targetIds: [result.order.id],
      metadata: {
        action: payload.action,
        reason: "reason" in payload ? payload.reason : undefined,
        noteId: result.noteId,
        refundMode: result.refundMode,
        refundReferenceId: result.refundReferenceId,
        before,
        after: {
          status: result.order.status,
          paymentStatus: result.order.paymentStatus,
          returnStatus: result.order.returnStatus,
          returnRequestedAt: result.order.returnRequestedAt?.toISOString() ?? null,
          returnReceivedAt: result.order.returnReceivedAt?.toISOString() ?? null,
          refundedAt: result.order.refundedAt?.toISOString() ?? null,
        },
      },
    });

    return NextResponse.json(
      {
        id: result.order.id,
        status: result.order.status,
        paymentStatus: result.order.paymentStatus,
        returnStatus: result.order.returnStatus,
      },
      withRequestIdHeaders({ status: 200 }, requestId),
    );
  } catch (error) {
    logEvent("ERROR", "admin.orders.return.failed", {
      requestId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "admin.orders.return",
      message: "Admin order return update failed",
      requestId,
      route: "/api/admin/orders/[id]/return",
      userId: session.user.id,
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return NextResponse.json(
      { error: "Unable to update return flow." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
