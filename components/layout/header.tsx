import Link from "next/link";
import { ShoppingCart } from "lucide-react";
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
      <div className="flex items-center justify-between rounded-full border border-black/5 bg-white/80 px-5 py-4 shadow-card backdrop-blur">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          Atelier Commerce
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-3 text-sm font-medium">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-black/70 transition hover:bg-sand hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/cart"
            aria-label="Ver carrito"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-canvas px-4 py-2"
          >
            <ShoppingCart className="h-4 w-4" />
            <CartStatus />
          </Link>
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
