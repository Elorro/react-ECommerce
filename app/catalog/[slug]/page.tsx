import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
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
        className="min-h-[24rem] rounded-[2rem] border border-black/5 bg-cover bg-center shadow-card sm:min-h-[28rem]"
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
          <div className="grid gap-3 rounded-[1.5rem] bg-canvas p-5 sm:grid-cols-3">
            <TrustPill
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Pago seguro"
              description="Tu compra se procesa con protección de datos y validación del pedido."
            />
            <TrustPill
              icon={<Truck className="h-4 w-4" />}
              title="Envíos seguros"
              description="Revisamos disponibilidad antes de confirmar la compra."
            />
            <TrustPill
              icon={<RotateCcw className="h-4 w-4" />}
              title="Devoluciones disponibles"
              description="Si necesitas seguimiento, encontrarás el detalle desde tu cuenta."
            />
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

function TrustPill({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/5 bg-white px-4 py-4">
      <div className="inline-flex rounded-full bg-emerald-50 p-2 text-emerald-700">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-black/65">{description}</p>
    </div>
  );
}
