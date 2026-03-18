"use client";

import { useCart } from "@/components/store/cart-provider";

export function CartStatus() {
  const { totalItems, isReady, isSyncing } = useCart();

  return (
    <span className="text-sm font-semibold">
      {!isReady ? "..." : isSyncing ? `${totalItems}*` : totalItems}
    </span>
  );
}
