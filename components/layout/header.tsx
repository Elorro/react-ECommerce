import Link from "next/link";
import { ShieldCheck, ShoppingCart } from "lucide-react";
import { AuthStatus } from "@/components/auth/auth-status";
import { CartStatus } from "@/components/store/cart-status";

const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/catalog", label: "Catalogo" },
  { href: "/cart", label: "Carrito" },
  { href: "/checkout", label: "Checkout" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 py-6">
      <div className="grid gap-4 rounded-[2rem] border border-black/5 bg-white/85 px-5 py-4 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Link href="/" className="font-display text-2xl tracking-tight text-ink">
              Atelier Commerce
            </Link>
            <p className="text-sm text-black/60">
              Compra clara, pago seguro y seguimiento de tus pedidos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              Pago seguro
            </span>
            <Link
              href="/cart"
              aria-label="Ver carrito"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-canvas px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Carrito</span>
              <CartStatus />
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Principal" className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-black/70 transition hover:bg-sand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
