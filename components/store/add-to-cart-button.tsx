"use client";

import { useState } from "react";
import { useCart } from "@/components/store/cart-provider";
import type { CartProduct } from "@/lib/types";

export function AddToCartButton({ product }: { product: CartProduct }) {
  const { addItem, isReady } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={!isReady}
      onClick={() => {
        addItem(product);
        setIsAdded(true);
        window.setTimeout(() => setIsAdded(false), 1500);
      }}
      className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {!isReady ? "Cargando carrito..." : isAdded ? "Agregado al carrito" : "Agregar al carrito"}
    </button>
  );
}
