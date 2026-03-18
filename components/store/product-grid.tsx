import { AddToCartButton } from "@/components/store/add-to-cart-button";
import Image from "next/image";
import Link from "next/link";
import type { ProductCard } from "@/lib/catalog";

export function ProductGrid({
  products,
  title,
  eyebrow,
}: {
  products: ProductCard[];
  title?: string;
  eyebrow?: string;
}) {
  return (
    <section className="space-y-6">
      {(title || eyebrow) && (
        <div className="space-y-2">
          {eyebrow ? (
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              {eyebrow}
            </span>
          ) : null}
          {title ? <h2 className="font-display text-4xl">{title}</h2> : null}
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <article
            key={product.id}
            className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="relative aspect-square bg-sand/60">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                  {product.categoryName}
                </p>
                <div className="space-y-3">
                  <h3 className="line-clamp-2 text-lg font-semibold">{product.name}</h3>
                  <span className="block whitespace-nowrap text-2xl font-bold text-ink">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <AddToCartButton
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    imageUrl: product.imageUrl,
                    price: product.price,
                    stock: product.stock,
                  }}
                />
                <Link
                  href={`/catalog/${product.slug}`}
                  className="inline-flex justify-center rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/75 transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Ver detalles
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
