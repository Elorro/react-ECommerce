"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/store/cart-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";

export function CartView() {
  const router = useRouter();
  const [itemPendingRemoval, setItemPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const {
    items,
    totalAmount,
    removeItem,
    updateQuantity,
    isReady,
    isSyncing,
    errorMessage,
    pendingAction,
    pendingItemId,
  } = useCart();

  if (!isReady) {
    return (
      <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-56" />
          </div>
          <div className="rounded-3xl bg-white px-5 py-4 shadow-card">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="mt-3 h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <article
              key={index}
              className="grid gap-5 rounded-[1.75rem] border border-black/5 bg-white/85 p-5 shadow-card md:grid-cols-[120px_1fr_auto]"
            >
              <Skeleton className="aspect-square rounded-3xl" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </article>
          ))}
        </div>
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
        <button
          type="button"
          onClick={() => router.push("/catalog")}
          className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Explorar catálogo
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <ConfirmDialog
        open={itemPendingRemoval !== null}
        title="¿Eliminar producto del carrito?"
        description={
          itemPendingRemoval
            ? `${itemPendingRemoval.name} se quitará de tu carrito. Puedes volver a agregarlo después si cambias de idea.`
            : ""
        }
        confirmLabel="Eliminar producto"
        tone="danger"
        busy={Boolean(
          itemPendingRemoval &&
            pendingItemId === itemPendingRemoval.id &&
            pendingAction === "remove" &&
            isSyncing,
        )}
        onCancel={() => setItemPendingRemoval(null)}
        onConfirm={() => {
          if (!itemPendingRemoval) {
            return;
          }

          removeItem(itemPendingRemoval.id);
          setItemPendingRemoval(null);
        }}
      />
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
        <InlineNotice tone="warn">
          Actualizando tu carrito...
        </InlineNotice>
      ) : null}
      {errorMessage ? (
        <InlineNotice tone="error">
          {errorMessage}
        </InlineNotice>
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
                {pendingItemId === item.id && pendingAction === "update" ? (
                  <span className="mt-2 block text-xs text-black/55">Actualizando...</span>
                ) : null}
              </label>
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => setItemPendingRemoval({ id: item.id, name: item.name })}
                className="rounded-full border border-transparent px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingItemId === item.id && pendingAction === "remove" ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push("/checkout")}
        className={`inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
          isSyncing ? "pointer-events-none bg-black/35" : "bg-ink hover:bg-brand"
        }`}
        disabled={isSyncing}
      >
        {isSyncing ? "Preparando pago..." : "Ir a pago"}
      </button>
    </section>
  );
}
