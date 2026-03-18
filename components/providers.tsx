"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/store/cart-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <CartProvider>{children}</CartProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
