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
      className="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
    >
      {!isReady ? "Cargando carrito..." : isAdded ? "Agregado al carrito" : "Agregar al carrito"}
    </button>
  );
}
