"use client";

import { useState } from "react";
import { useCart } from "@/components/store/cart-provider";
import type { CartProduct } from "@/lib/types";

export function AddToCartButton({ product }: { product: CartProduct }) {
  const { addItem, isReady, pendingAction, pendingItemId } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const isProcessing = pendingAction === "add" && pendingItemId === product.id;

  return (
    <button
      type="button"
      disabled={!isReady || isProcessing}
      onClick={() => {
        addItem(product);
        setIsAdded(true);
        window.setTimeout(() => setIsAdded(false), 1500);
      }}
      className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {!isReady
        ? "Cargando carrito..."
        : isProcessing
          ? "Agregando..."
          : isAdded
            ? "Agregado al carrito"
            : "Agregar al carrito"}
    </button>
  );
}
