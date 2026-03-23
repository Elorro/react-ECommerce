import Link from "next/link";

const footerLinks = [
  { href: "/catalog", label: "Catalogo" },
  { href: "/cart", label: "Carrito" },
  { href: "/checkout", label: "Pago seguro" },
  { href: "/account", label: "Cuenta" },
];

export function Footer() {
  return (
    <footer className="border-t border-black/5 py-8">
      <div className="grid gap-8 rounded-[2rem] border border-black/5 bg-white/80 px-6 py-6 shadow-card backdrop-blur md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
            Compra con respaldo
          </span>
          <h2 className="font-display text-3xl text-ink">Atelier Commerce</h2>
          <p className="max-w-2xl text-sm leading-6 text-black/70">
            Un proceso de compra claro, pago seguro con Stripe y seguimiento de cada pedido
            desde tu cuenta para que compres con tranquilidad.
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-black/75">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-800">
              Pago seguro procesado por Stripe
            </span>
            <span className="rounded-full bg-canvas px-4 py-2">
              Protección de datos y seguimiento del pedido
            </span>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/45">
              Navegación
            </h3>
            <div className="grid gap-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-black/70 transition hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-black/45">
              Soporte
            </h3>
            <p className="text-sm leading-6 text-black/70">
              Si necesitas revisar una compra o hacer seguimiento, encontrarás toda la
              información de tus pedidos dentro de tu cuenta.
            </p>
            <Link
              href="/account"
              className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Abrir cuenta
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
