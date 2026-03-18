import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";
import { createCategorySchema } from "@/lib/validators/admin";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("catalog.categories.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const payload = createCategorySchema.parse(await request.json());
    const category = await db.category.create({
      data: payload,
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "category.create",
      route: "/api/admin/categories",
      requestId,
      targetType: "category",
      targetIds: [category.id],
    });

    return NextResponse.json({ id: category.id }, withRequestIdHeaders({ status: 201 }, requestId));
  } catch {
    return NextResponse.json(
      { error: "Invalid category payload." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
