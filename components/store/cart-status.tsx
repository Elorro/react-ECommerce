"use client";

import { useCart } from "@/components/store/cart-provider";

export function CartStatus() {
  const { totalItems, isReady, isSyncing } = useCart();

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">
      {!isReady ? "..." : isSyncing ? `${totalItems}*` : totalItems}
    </span>
  );
}
