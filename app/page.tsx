import Link from "next/link";
import { ArrowRight, ShieldCheck, ShoppingBag, Zap } from "lucide-react";
import { FeaturedCategories } from "@/components/store/featured-categories";
import { ProductGrid } from "@/components/store/product-grid";
import { getFeaturedProducts, getHomepageCategories } from "@/lib/catalog";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getHomepageCategories(),
    getFeaturedProducts(),
  ]);

  return (
    <div className="space-y-16">
      <section className="grid gap-10 rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-card backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-12">
        <div className="space-y-6">
          <span className="inline-flex rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
            Coleccion destacada
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl font-display text-5xl leading-tight text-ink sm:text-6xl">
              E-commerce moderno con arquitectura full-stack real.
            </h1>
            <p className="max-w-2xl text-lg text-black/70">
              Catálogo, checkout seguro, validación del lado servidor y una base técnica
              preparada para crecer sin arrastrar la deuda del proyecto original.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand"
            >
              Explorar catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
            >
              Área de cliente
            </Link>
          </div>
        </div>
        <div className="grid gap-4 rounded-[1.5rem] bg-pine p-6 text-white">
          <div className="grid gap-3 rounded-3xl bg-white/10 p-5">
            <ShieldCheck className="h-8 w-8" />
            <h2 className="font-display text-2xl">Seguridad desde la arquitectura</h2>
            <p className="text-white/80">
              Sin claves sensibles en cliente, sin lógica crítica en frontend y con rutas
              preparadas para validación estricta y rate limiting.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Checkout real"
              description="La base queda preparada para órdenes persistentes y pagos seguros."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Base escalable"
              description="Next.js, Prisma y tipado estricto para crecer sin improvisar."
            />
          </div>
        </div>
      </section>

      <FeaturedCategories categories={categories} />
      <ProductGrid
        title="Productos destacados"
        eyebrow="Catálogo inicial"
        products={products}
      />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 inline-flex rounded-full bg-white/10 p-2">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/75">{description}</p>
    </div>
  );
}
