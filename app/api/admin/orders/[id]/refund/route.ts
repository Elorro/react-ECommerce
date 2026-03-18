import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent, recordOperationalEvent } from "@/lib/observability";
import { refundOrder } from "@/lib/orders";
import { refundOrderSchema } from "@/lib/validators/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("orders.refund");

  if (!session?.user?.id) {
    logEvent("WARN", "admin.orders.refund.forbidden", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "admin.orders.refund",
      message: "Forbidden admin refund attempt",
      requestId,
      route: "/api/admin/orders/[id]/refund",
      userId: session?.user?.id,
    });
    return NextResponse.json(
      { error: "Forbidden" },
      withRequestIdHeaders({ status: 403 }, requestId),
    );
  }

  try {
    const { id } = await params;
    const payload = refundOrderSchema.parse(await request.json());
    const before = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentProvider: true,
        paymentSessionId: true,
        canceledAt: true,
        refundedAt: true,
      },
    });

    if (!before) {
      return NextResponse.json(
        { error: "Order not found." },
        withRequestIdHeaders({ status: 404 }, requestId),
      );
    }

    const result = await refundOrder({
      orderId: id,
      actorUserId: session.user.id,
      reason: payload.reason,
    });

    logEvent("INFO", "admin.orders.refund.success", {
      requestId,
      userId: session.user.id,
      orderId: result.order.id,
      refundMode: result.refundMode,
      refundReferenceId: result.refundReferenceId,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "admin.orders.refund",
      message: "Admin refunded an order",
      requestId,
      route: "/api/admin/orders/[id]/refund",
      userId: session.user.id,
      orderId: result.order.id,
      metadata: {
        refundMode: result.refundMode,
        refundReferenceId: result.refundReferenceId,
        reason: payload.reason,
        noteId: result.noteId,
      },
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "order.refund",
      route: "/api/admin/orders/[id]/refund",
      requestId,
      targetType: "order",
      targetIds: [result.order.id],
      metadata: {
        reason: payload.reason,
        refundMode: result.refundMode,
        refundReferenceId: result.refundReferenceId,
        noteId: result.noteId,
        before,
        after: {
          status: result.order.status,
          paymentStatus: result.order.paymentStatus,
          canceledAt: result.order.canceledAt?.toISOString() ?? null,
          refundedAt: result.order.refundedAt?.toISOString() ?? null,
        },
      },
    });

    return NextResponse.json(
      {
        id: result.order.id,
        status: result.order.status,
        paymentStatus: result.order.paymentStatus,
      },
      withRequestIdHeaders({ status: 200 }, requestId),
    );
  } catch (error) {
    logEvent("ERROR", "admin.orders.refund.failed", {
      requestId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "admin.orders.refund",
      message: "Admin order refund failed",
      requestId,
      route: "/api/admin/orders/[id]/refund",
      userId: session.user.id,
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return NextResponse.json(
      { error: "Unable to refund order." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
