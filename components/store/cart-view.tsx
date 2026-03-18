"use client";

import Link from "next/link";
import { useCart } from "@/components/store/cart-provider";

export function CartView() {
  const { items, totalAmount, removeItem, updateQuantity, isReady, isSyncing, source } = useCart();

  if (!isReady) {
    return (
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <h1 className="font-display text-4xl">Preparando tu carrito</h1>
        <p className="mt-3 max-w-xl text-black/70">
          Estamos cargando los productos {source === "user" ? "de tu cuenta" : "de este navegador"} para que puedas continuar tu compra.
        </p>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <h1 className="font-display text-4xl">Tu carrito está vacío</h1>
        <p className="mt-3 max-w-xl text-black/70">
          Aún no agregaste productos. Explora el catálogo y guarda tus favoritos para comprar cuando quieras.
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Explorar catálogo
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Carrito
          </span>
          <h1 className="font-display text-4xl">Tu carrito</h1>
        </div>
        <div className="rounded-3xl bg-white px-5 py-4 text-right shadow-card">
          <p className="text-sm uppercase tracking-[0.2em] text-black/45">Total</p>
          <p className="text-4xl font-bold text-ink">${totalAmount.toFixed(2)}</p>
        </div>
      </div>
      {isSyncing ? (
        <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
          Actualizando tu carrito...
        </p>
      ) : null}

      <div className="grid gap-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid gap-5 rounded-[1.75rem] border border-black/5 bg-white/85 p-5 shadow-card md:grid-cols-[120px_1fr_auto]"
          >
            <div
              className="aspect-square rounded-3xl bg-cover bg-center"
              style={{ backgroundImage: `url(${item.imageUrl})` }}
            />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <p className="text-sm text-black/60">Disponible: {item.stock}</p>
              <p className="font-medium">${item.price.toFixed(2)} por unidad</p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <label className="text-sm font-medium">
                Cantidad
                <input
                  type="number"
                  min={1}
                  max={item.stock}
                  disabled={isSyncing}
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                  className="mt-2 w-24 rounded-2xl border border-black/10 bg-canvas px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => removeItem(item.id)}
                className="rounded-full border border-transparent px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>

      <Link
        href="/checkout"
        className={`inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
          isSyncing ? "pointer-events-none bg-black/35" : "bg-ink hover:bg-brand"
        }`}
      >
        Ir a pago
      </Link>
    </section>
  );
}
