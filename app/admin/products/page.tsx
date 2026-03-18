import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { PaginationLinks } from "@/components/ui/pagination-links";
import Link from "next/link";
import { getAdminCategories, getAdminProducts } from "@/lib/catalog";
import { requirePermission } from "@/lib/admin";
import { parsePage } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Admin Productos | Atelier Commerce",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    categoryId?: string;
    status?: string;
  }>;
}) {
  const session = await requirePermission("catalog.products.view");
  const params = await searchParams;
  const page = parsePage(params.page);
  const status =
    params.status === "ACTIVE" || params.status === "DRAFT" || params.status === "ARCHIVED"
      ? params.status
      : undefined;
  const [products, categories] = await Promise.all([
    getAdminProducts({
      page,
      q: params.q,
      categoryId: params.categoryId,
      status,
    }),
    getAdminCategories(),
  ]);

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-4xl">Catalogo y stock</h1>
        <p className="max-w-2xl text-black/70">
          Esta vista solo está disponible para `ADMIN`. Desde aquí ya puedes ajustar stock,
          destacar productos y cambiar su estado comercial sin tocar la base manualmente.
        </p>
        {hasPermission(session.user.role, "exports.products") ? (
          <Link
            href={{
              pathname: "/api/admin/export/products",
              query: {
                q: params.q,
                categoryId: params.categoryId,
                status,
              },
            }}
            className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Exportar vista CSV
          </Link>
        ) : null}
      </div>
      <AdminProductsTable
        products={products.items}
        categories={categories}
        filters={{
          q: params.q,
          categoryId: params.categoryId,
          status,
          totalItems: products.totalItems,
        }}
      />
      <PaginationLinks
        currentPage={products.currentPage}
        totalPages={products.totalPages}
        basePath="/admin/products"
        query={{
          q: params.q,
          categoryId: params.categoryId,
          status,
        }}
      />
    </section>
  );
}
