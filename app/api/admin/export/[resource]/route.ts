import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getRequestId, withRequestIdHeaders } from "@/lib/logger";
import { recordAdminAuditEvent } from "@/lib/observability";

type ExportResource = "products" | "categories" | "orders" | "logs";

const exportPermissions = {
  products: "exports.products",
  categories: "exports.categories",
  orders: "exports.orders",
  logs: "exports.logs",
} as const;

function escapeCsv(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function buildCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","));

  return [headers.join(","), ...body].join("\n");
}

async function getRows(resource: ExportResource, request: Request) {
  const { searchParams } = new URL(request.url);

  if (resource === "products") {
    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;
    const products = await db.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(status === "ACTIVE" || status === "DRAFT" || status === "ARCHIVED"
          ? { status }
          : {}),
        ...(q
          ? {
              OR: [{ name: { contains: q } }, { slug: { contains: q } }],
            }
          : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      featured: product.featured ? "yes" : "no",
      stock: product.stock,
      price: Number(product.price),
      category: product.category.name,
      createdAt: product.createdAt.toISOString(),
    }));
  }

  if (resource === "categories") {
    const q = searchParams.get("q")?.trim();
    const categories = await db.category.findMany({
      where: q
        ? {
            OR: [{ name: { contains: q } }, { slug: { contains: q } }],
          }
        : undefined,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      productCount: category._count.products,
    }));
  }

  if (resource === "orders") {
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const orders = await db.order.findMany({
      where: {
        ...(status === "PENDING" || status === "PAID" || status === "FULFILLED" || status === "CANCELED"
          ? { status }
          : {}),
        ...(paymentStatus === "UNPAID" ||
        paymentStatus === "REQUIRES_ACTION" ||
        paymentStatus === "PAID" ||
        paymentStatus === "FAILED"
          ? { paymentStatus }
          : {}),
        ...(q
          ? {
              OR: [
                { customerName: { contains: q } },
                { customerEmail: { contains: q } },
                { id: { contains: q } },
              ],
            }
          : {}),
      },
      include: {
        items: {
          select: {
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.paymentProvider,
      paymentExpiresAt: order.paymentExpiresAt?.toISOString() ?? "",
      fulfilledAt: order.fulfilledAt?.toISOString() ?? "",
      canceledAt: order.canceledAt?.toISOString() ?? "",
      shippingAddress: order.shippingAddress,
      totalAmount: Number(order.totalAmount),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt.toISOString(),
    }));
  }

  const logs = await db.operationalLog.findMany({
    where: {
      ...(searchParams.get("orderId")
        ? {
            orderId: searchParams.get("orderId") || "",
          }
        : {}),
      ...(searchParams.get("level")
        ? {
            level: searchParams.get("level") as "INFO" | "WARN" | "ERROR",
          }
        : {}),
      ...(searchParams.get("scope")
        ? {
            scope: {
              contains: searchParams.get("scope") || "",
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  return logs.map((log) => ({
    id: log.id,
    level: log.level,
    scope: log.scope,
    message: log.message,
    requestId: log.requestId,
    route: log.route,
    userId: log.userId,
    orderId: log.orderId,
    metadata: log.metadata ? JSON.stringify(log.metadata) : "",
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const requestId = getRequestId(request);
  const { resource } = await params;

  if (!["products", "categories", "orders", "logs"].includes(resource)) {
    return NextResponse.json(
      { error: "Unsupported export." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }

  const session = await requireApiPermission(exportPermissions[resource as ExportResource]);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Forbidden" },
      withRequestIdHeaders({ status: 403 }, requestId),
    );
  }

  const rows = await getRows(resource as ExportResource, request);
  const csv = buildCsv(rows);
  await recordAdminAuditEvent({
    actorUserId: session.user.id,
    action: "export.download",
    route: "/api/admin/export/[resource]",
    requestId,
    targetType: "export",
    targetIds: [resource],
    metadata: {
      rowCount: rows.length,
      query: Object.fromEntries(new URL(request.url).searchParams.entries()),
    },
  });

  return new NextResponse(csv, {
    ...withRequestIdHeaders(
      {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${resource}.csv"`,
        },
      },
      requestId,
    ),
  });
}
