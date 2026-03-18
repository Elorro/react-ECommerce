"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { CartProduct } from "@/lib/types";

const ANONYMOUS_CART_STORAGE_KEY = "atelier-commerce-cart:anonymous";
const LEGACY_CART_STORAGE_KEY = "atelier-commerce-cart";

export type CartItem = CartProduct & {
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  isReady: boolean;
  isSyncing: boolean;
  source: "anonymous" | "user";
  addItem: (product: CartProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readAnonymousCart() {
  const raw =
    window.localStorage.getItem(ANONYMOUS_CART_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CartItem[];

    if (window.localStorage.getItem(LEGACY_CART_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
      window.localStorage.setItem(ANONYMOUS_CART_STORAGE_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(ANONYMOUS_CART_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    return [];
  }
}

function writeAnonymousCart(items: CartItem[]) {
  if (!items.length) {
    window.localStorage.removeItem(ANONYMOUS_CART_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ANONYMOUS_CART_STORAGE_KEY, JSON.stringify(items));
}

function toCartPayload(items: CartItem[]) {
  return {
    items: items.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    })),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [source, setSource] = useState<"anonymous" | "user">("anonymous");
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const isHydratingUserCartRef = useRef(false);
  const hydrateAbortControllerRef = useRef<AbortController | null>(null);
  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const clearAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isActive = true;

    hydrateAbortControllerRef.current?.abort();
    hydrateAbortControllerRef.current = null;

    async function hydrateAnonymousCart() {
      const anonymousItems = readAnonymousCart();

      if (!isActive) {
        return;
      }

      setSource("anonymous");
      setItems(anonymousItems);
      setIsReady(true);
      lastUserIdRef.current = null;
    }

    async function hydrateUserCart(userId: string) {
      isHydratingUserCartRef.current = true;
      setIsReady(false);
      const abortController = new AbortController();
      hydrateAbortControllerRef.current = abortController;
      const anonymousItems = readAnonymousCart();
      const switchedUser = lastUserIdRef.current !== userId;

      if (switchedUser && isActive) {
        setSource("user");
        setItems([]);
      }

      try {
        const response = await fetch("/api/cart", {
          method: anonymousItems.length && switchedUser ? "POST" : "GET",
          signal: abortController.signal,
          headers:
            anonymousItems.length && switchedUser
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
          body:
            anonymousItems.length && switchedUser
              ? JSON.stringify(toCartPayload(anonymousItems))
              : undefined,
        });

        if (!response.ok) {
          if (!isActive) {
            return;
          }

          isHydratingUserCartRef.current = false;
          setSource("anonymous");
          setItems(readAnonymousCart());
          setIsReady(true);
          return;
        }

        const data = (await response.json()) as { items?: CartItem[] };

        if (!isActive) {
          return;
        }

        if (anonymousItems.length && switchedUser) {
          writeAnonymousCart([]);
        }

        setSource("user");
        setItems(data.items ?? []);
        isHydratingUserCartRef.current = false;
        setIsReady(true);
        lastUserIdRef.current = userId;
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        isHydratingUserCartRef.current = false;
        setSource("anonymous");
        setItems(readAnonymousCart());
        setIsReady(true);
      }
    }

    if (status === "loading") {
      return () => {
        isActive = false;
        hydrateAbortControllerRef.current?.abort();
      };
    }

    if (!session?.user?.id) {
      void hydrateAnonymousCart();
      return () => {
        isActive = false;
        setIsReady(false);
      };
    }

    void hydrateUserCart(session.user.id);

    return () => {
      isActive = false;
      hydrateAbortControllerRef.current?.abort();
      isHydratingUserCartRef.current = false;
    };
  }, [session?.user?.id, status]);

  useEffect(() => {
    if (source !== "anonymous" || status === "loading" || session?.user?.id) {
      return;
    }

    writeAnonymousCart(items);
  }, [items, session?.user?.id, source, status]);

  useEffect(() => {
    if (status === "loading") {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      syncAbortControllerRef.current?.abort();
      return;
    }

    if (source !== "user" || !session?.user?.id || isHydratingUserCartRef.current) {
      return;
    }

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      const abortController = new AbortController();
      syncAbortControllerRef.current?.abort();
      syncAbortControllerRef.current = abortController;
      setIsSyncing(true);
      void fetch("/api/cart", {
        method: "PUT",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toCartPayload(items)),
      }).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }).finally(() => {
        if (syncAbortControllerRef.current === abortController) {
          syncAbortControllerRef.current = null;
        }
        setIsSyncing(false);
      });
    }, 250);

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      syncAbortControllerRef.current?.abort();
    };
  }, [items, session?.user?.id, source, status]);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      items,
      totalItems,
      totalAmount,
      isReady,
      isSyncing,
      source,
      addItem: (product) => {
        setItems((currentItems) => {
          const existingItem = currentItems.find((item) => item.id === product.id);

          if (existingItem) {
            const nextQuantity = Math.min(existingItem.quantity + 1, product.stock);
            return currentItems.map((item) =>
              item.id === product.id ? { ...item, quantity: nextQuantity } : item,
            );
          }

          return [...currentItems, { ...product, quantity: 1 }];
        });
      },
      removeItem: (productId) => {
        setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
      },
      updateQuantity: (productId, quantity) => {
        setItems((currentItems) =>
          currentItems
            .map((item) =>
              item.id === productId
                ? {
                    ...item,
                    quantity: Math.max(1, Math.min(quantity, item.stock)),
                  }
                : item,
            )
            .filter((item) => item.quantity > 0),
        );
      },
      clearCart: () => {
        setItems([]);

        if (source === "anonymous") {
          writeAnonymousCart([]);
          return;
        }

        clearAbortControllerRef.current?.abort();
        const abortController = new AbortController();
        clearAbortControllerRef.current = abortController;
        setIsSyncing(true);
        void fetch("/api/cart", {
          method: "DELETE",
          signal: abortController.signal,
        }).catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }).finally(() => {
          if (clearAbortControllerRef.current === abortController) {
            clearAbortControllerRef.current = null;
          }
          setIsSyncing(false);
        });
      },
    };
  }, [isReady, isSyncing, items, source]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
