import { AdminCategoriesTable } from "@/components/admin/admin-categories-table";
import { PaginationLinks } from "@/components/ui/pagination-links";
import Link from "next/link";
import { getAdminCategoriesPage } from "@/lib/catalog";
import { requirePermission } from "@/lib/admin";
import { parsePage } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Admin Categorias | Atelier Commerce",
};

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
  }>;
}) {
  const session = await requirePermission("catalog.categories.view");
  const params = await searchParams;
  const page = parsePage(params.page);
  const categories = await getAdminCategoriesPage({
    page,
    q: params.q,
  });

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-4xl">Categorias</h1>
        <p className="max-w-2xl text-black/70">
          Gestión de categorías centralizada para que catálogo y home compartan la misma
          fuente de verdad.
        </p>
        {hasPermission(session.user.role, "exports.categories") ? (
          <Link
            href={{
              pathname: "/api/admin/export/categories",
              query: {
                q: params.q,
              },
            }}
            className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Exportar vista CSV
          </Link>
        ) : null}
      </div>
      <AdminCategoriesTable
        categories={categories.items}
        filters={{
          q: params.q,
          totalItems: categories.totalItems,
        }}
      />
      <PaginationLinks
        currentPage={categories.currentPage}
        totalPages={categories.totalPages}
        basePath="/admin/categories"
        query={{
          q: params.q,
        }}
      />
    </section>
  );
}
