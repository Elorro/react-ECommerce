import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";
import { createProductSchema } from "@/lib/validators/admin";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("catalog.products.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const payload = createProductSchema.parse(await request.json());

    const product = await db.product.create({
      data: payload,
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "product.create",
      route: "/api/admin/products",
      requestId,
      targetType: "product",
      targetIds: [product.id],
      metadata: {
        status: product.status,
      },
    });

    return NextResponse.json({ id: product.id }, withRequestIdHeaders({ status: 201 }, requestId));
  } catch {
    return NextResponse.json(
      { error: "Invalid product payload." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
