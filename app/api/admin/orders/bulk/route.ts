import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";
import { bulkUpdateOrderStatuses } from "@/lib/orders";
import { bulkOrderStatusSchema } from "@/lib/validators/admin";

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("orders.bulk_update");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const payload = bulkOrderStatusSchema.parse(await request.json());
    const result = await bulkUpdateOrderStatuses(payload.ids, payload.status);
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "order.bulk_update",
      route: "/api/admin/orders/bulk",
      requestId,
      targetType: "order",
      targetIds: payload.ids,
      metadata: {
        status: payload.status,
        updatedIds: result.updatedIds,
        skippedIds: result.skippedIds,
      },
    });

    return NextResponse.json(
      {
        updatedCount: result.updatedIds.length,
        updatedIds: result.updatedIds,
        skippedIds: result.skippedIds,
      },
      withRequestIdHeaders({ status: 200 }, requestId),
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid bulk order action." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
