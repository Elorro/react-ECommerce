import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { getProductBySlug } from "@/lib/catalog";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div
        className="min-h-[28rem] rounded-[2rem] border border-black/5 bg-cover bg-center shadow-card"
        style={{ backgroundImage: `url(${product.imageUrl})` }}
      />
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              {product.categoryName}
            </p>
            <h1 className="font-display text-5xl">{product.name}</h1>
          </div>
          <p className="text-lg text-black/75">{product.description}</p>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-black/45">Precio</p>
              <p className="text-5xl font-bold text-ink">${product.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-black/45">Stock</p>
              <p className="text-lg font-medium">{product.stock} disponibles</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-black/70">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-800">
              Compra segura
            </span>
            <span className="rounded-full bg-canvas px-4 py-2">
              Envío y disponibilidad confirmados antes de finalizar
            </span>
          </div>
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
        </div>
      </section>
    </div>
  );
}
