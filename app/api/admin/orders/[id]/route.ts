import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent, recordOperationalEvent } from "@/lib/observability";
import { updateOrderStatus } from "@/lib/orders";
import { updateOrderStatusSchema } from "@/lib/validators/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("orders.update");

  if (!session?.user?.id) {
    logEvent("WARN", "admin.orders.update.forbidden", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "admin.orders.update",
      message: "Forbidden admin order update attempt",
      requestId,
      route: "/api/admin/orders/[id]",
      userId: session?.user?.id,
    });
    return NextResponse.json(
      { error: "Forbidden" },
      withRequestIdHeaders({ status: 403 }, requestId),
    );
  }

  try {
    const { id } = await params;
    const payload = updateOrderStatusSchema.parse(await request.json());
    const before = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        fulfilledAt: true,
        canceledAt: true,
      },
    });
    const order = await updateOrderStatus(id, payload.status);

    logEvent("INFO", "admin.orders.update.success", {
      requestId,
      userId: session.user.id,
      orderId: order.id,
      status: order.status,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "admin.orders.update",
      message: "Admin updated order status",
      requestId,
      route: "/api/admin/orders/[id]",
      userId: session.user.id,
      orderId: order.id,
      metadata: {
        status: order.status,
      },
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "order.update",
      route: "/api/admin/orders/[id]",
      requestId,
      targetType: "order",
      targetIds: [order.id],
      metadata: {
        before,
        after: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          processingStartedAt: order.processingStartedAt?.toISOString() ?? null,
          fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
          canceledAt: order.canceledAt?.toISOString() ?? null,
          refundedAt: order.refundedAt?.toISOString() ?? null,
        },
      },
    });

    return NextResponse.json(
      { id: order.id, status: order.status },
      withRequestIdHeaders({ status: 200 }, requestId),
    );
  } catch (error) {
    logEvent("ERROR", "admin.orders.update.failed", {
      requestId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "admin.orders.update",
      message: "Admin order update failed",
      requestId,
      route: "/api/admin/orders/[id]",
      userId: session.user.id,
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });
    return NextResponse.json(
      { error: "Invalid order update." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
