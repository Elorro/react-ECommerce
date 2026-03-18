import Link from "next/link";

type CategoryFilter = {
  id: string;
  name: string;
  slug: string;
};

export function CatalogFilters({
  categories,
  selectedCategory,
  selectedSort,
  query,
  totalItems,
}: {
  categories: CategoryFilter[];
  selectedCategory?: string;
  selectedSort?: string;
  query?: string;
  totalItems: number;
}) {
  return (
    <section className="grid gap-4 rounded-[1.75rem] border border-black/5 bg-white/85 p-5 shadow-card lg:grid-cols-[1.4fr_1fr]">
      <form action="/catalog" className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr_auto]">
        <input
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder="Buscar producto o descripcion"
          className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        />
        <select
          name="category"
          defaultValue={selectedCategory ?? ""}
          className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        >
          <option value="">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={selectedSort ?? "name"}
          className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        >
          <option value="name">Orden alfabetico</option>
          <option value="featured">Destacados primero</option>
          <option value="price-asc">Precio ascendente</option>
          <option value="price-desc">Precio descendente</option>
        </select>
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
        >
          Aplicar
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-ink">
          {totalItems} resultados
        </span>
        <Link
          href="/catalog"
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
        >
          Limpiar
        </Link>
        {selectedCategory ? (
          <span className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
            Categoria: {selectedCategory}
          </span>
        ) : null}
        {query ? (
          <span className="rounded-full bg-sand px-4 py-2 text-sm font-semibold text-ink">
            Busqueda: {query}
          </span>
        ) : null}
      </div>
    </section>
  );
}
