import { AdminOrdersTable } from "@/components/admin/admin-orders-table";
import { PaginationLinks } from "@/components/ui/pagination-links";
import Link from "next/link";
import { requirePermission } from "@/lib/admin";
import { parsePage } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions";
import { expireStalePendingOrders, getAdminOrders } from "@/lib/orders";

export const metadata = {
  title: "Admin Ordenes | Atelier Commerce",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    paymentStatus?: string;
  }>;
}) {
  const session = await requirePermission("orders.view");
  const params = await searchParams;
  const page = parsePage(params.page);
  const status =
    params.status === "PENDING" ||
    params.status === "PAID" ||
    params.status === "PROCESSING" ||
    params.status === "FULFILLED" ||
    params.status === "CANCELED"
      ? params.status
      : undefined;
  const paymentStatus =
    params.paymentStatus === "UNPAID" ||
    params.paymentStatus === "REQUIRES_ACTION" ||
    params.paymentStatus === "PAID" ||
    params.paymentStatus === "REFUNDED" ||
    params.paymentStatus === "FAILED"
      ? params.paymentStatus
      : undefined;
  await expireStalePendingOrders();
  const orders = await getAdminOrders({
    page,
    q: params.q,
    status,
    paymentStatus,
  });

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-4xl">Operación de órdenes</h1>
        <p className="max-w-2xl text-black/70">
          Vista operativa para revisar pagos, volumen de ítems y avanzar el fulfillment sin
          modificar datos manualmente.
        </p>
        {hasPermission(session.user.role, "exports.orders") ? (
          <Link
            href={{
              pathname: "/api/admin/export/orders",
              query: {
                q: params.q,
                status,
                paymentStatus,
              },
            }}
            className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Exportar vista CSV
          </Link>
        ) : null}
      </div>
      <AdminOrdersTable
        orders={orders.items}
        filters={{
          q: params.q,
          status,
          paymentStatus,
          totalItems: orders.totalItems,
        }}
      />
      <PaginationLinks
        currentPage={orders.currentPage}
        totalPages={orders.totalPages}
        basePath="/admin/orders"
        query={{
          q: params.q,
          status,
          paymentStatus,
        }}
      />
    </section>
  );
}
