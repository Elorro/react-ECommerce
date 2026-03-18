import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";
import { updateProductSchema } from "@/lib/validators/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const session = await requireApiPermission("catalog.products.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const { id } = await params;
    const json = await request.json();
    const payload = updateProductSchema.parse(json);
    const before = await db.product.findUnique({
      where: { id },
      select: {
        id: true,
        stock: true,
        featured: true,
        status: true,
      },
    });

    const product = await db.product.update({
      where: { id },
      data: payload,
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "product.update",
      route: "/api/admin/products/[id]",
      requestId,
      targetType: "product",
      targetIds: [product.id],
      metadata: {
        before,
        after: {
          stock: product.stock,
          featured: product.featured,
          status: product.status,
        },
        patch: payload,
      },
    });

    return NextResponse.json({
      id: product.id,
      stock: product.stock,
      featured: product.featured,
      status: product.status,
    }, withRequestIdHeaders(undefined, requestId));
  } catch {
    return NextResponse.json(
      { error: "Invalid payload." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(_request);
  const session = await requireApiPermission("catalog.products.manage");

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, withRequestIdHeaders({ status: 403 }, requestId));
  }

  try {
    const { id } = await params;
    await db.product.delete({
      where: { id },
    });
    await recordAdminAuditEvent({
      actorUserId: session.user.id,
      action: "product.delete",
      route: "/api/admin/products/[id]",
      requestId,
      targetType: "product",
      targetIds: [id],
    });

    return new NextResponse(null, withRequestIdHeaders({ status: 204 }, requestId));
  } catch {
    return NextResponse.json(
      { error: "Unable to delete product. It may be referenced by orders." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
