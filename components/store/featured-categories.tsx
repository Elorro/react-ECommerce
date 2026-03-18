import Link from "next/link";
import type { CategoryCard } from "@/lib/catalog";

export function FeaturedCategories({
  categories,
}: {
  categories: CategoryCard[];
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Categorias
        </span>
        <h2 className="font-display text-4xl">Entrada visual limpia y responsive</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/catalog?category=${category.slug}`}
            className="group relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-card"
          >
            <div
              className="h-72 bg-cover bg-center transition duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${category.imageUrl})` }}
            />
            <div className="absolute inset-x-6 bottom-6 rounded-[1.25rem] bg-white/85 p-5 backdrop-blur">
              <h3 className="font-display text-3xl capitalize">{category.name}</h3>
              <p className="mt-2 text-sm text-black/65">
                {category.productCount} productos disponibles
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
