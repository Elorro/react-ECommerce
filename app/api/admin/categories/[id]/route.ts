import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";
import { updateCategorySchema } from "@/lib/validators/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("catalog.categories.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const { id } = await params;
    const payload = updateCategorySchema.parse(await request.json());
    const before = await db.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
      },
    });
    const category = await db.category.update({
      where: { id },
      data: payload,
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "category.update",
      route: "/api/admin/categories/[id]",
      requestId,
      targetType: "category",
      targetIds: [category.id],
      metadata: {
        before,
        after: {
          name: category.name,
          slug: category.slug,
          imageUrl: category.imageUrl,
        },
        patch: payload,
      },
    });

    return NextResponse.json({ id: category.id }, withRequestIdHeaders({ status: 200 }, requestId));
  } catch {
    return NextResponse.json(
      { error: "Invalid category payload." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(_request);
  const session = await requireApiPermission("catalog.categories.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const { id } = await params;
    await db.category.delete({
      where: { id },
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "category.delete",
      route: "/api/admin/categories/[id]",
      requestId,
      targetType: "category",
      targetIds: [id],
    });

    return new NextResponse(null, withRequestIdHeaders({ status: 204 }, requestId));
  } catch {
    return NextResponse.json(
      { error: "Unable to delete category. It may contain products." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
