import { CatalogFilters } from "@/components/store/catalog-filters";
import { EmptyProducts } from "@/components/store/empty-products";
import { ProductGrid } from "@/components/store/product-grid";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { getAllProducts, getCatalogFilters } from "@/lib/catalog";
import { parsePage } from "@/lib/pagination";

export const metadata = {
  title: "Catalogo | Atelier Commerce",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const [catalog, categories] = await Promise.all([
    getAllProducts({
      q: params.q,
      category: params.category,
      page,
      sort:
        params.sort === "featured" ||
        params.sort === "price-asc" ||
        params.sort === "price-desc" ||
        params.sort === "name"
          ? params.sort
          : "name",
      }),
    getCatalogFilters(),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Catalogo
        </span>
        <h1 className="font-display text-4xl">Todos los productos</h1>
        <p className="max-w-2xl text-black/70">
          Explora la colección completa, compara estilos y agrega tus favoritos al carrito
          cuando encuentres la pieza ideal.
        </p>
      </div>
      <CatalogFilters
        categories={categories}
        selectedCategory={params.category}
        selectedSort={params.sort}
        query={params.q}
        totalItems={catalog.totalItems}
      />
      {catalog.items.length ? (
        <>
          <ProductGrid products={catalog.items} />
          <PaginationLinks
            currentPage={catalog.currentPage}
            totalPages={catalog.totalPages}
            basePath="/catalog"
            query={{
              q: params.q,
              category: params.category,
              sort: params.sort,
            }}
          />
        </>
      ) : (
        <EmptyProducts />
      )}
    </div>
  );
}
