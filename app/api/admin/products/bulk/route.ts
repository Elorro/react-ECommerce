import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";
import { bulkProductActionSchema } from "@/lib/validators/admin";

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("catalog.products.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const payload = bulkProductActionSchema.parse(await request.json());
    const data =
      payload.action === "FEATURE"
        ? { featured: true }
        : payload.action === "UNFEATURE"
          ? { featured: false }
          : payload.action === "ARCHIVE"
            ? { status: "ARCHIVED" as const }
            : { status: "ACTIVE" as const };

    const result = await db.product.updateMany({
      where: {
        id: {
          in: payload.ids,
        },
      },
      data,
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "product.bulk_update",
      route: "/api/admin/products/bulk",
      requestId,
      targetType: "product",
      targetIds: payload.ids,
      metadata: {
        action: payload.action,
        updatedCount: result.count,
      },
    });

    return NextResponse.json(
      { updatedCount: result.count },
      withRequestIdHeaders({ status: 200 }, requestId),
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid bulk product action." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
