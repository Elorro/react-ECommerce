"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast-provider";
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
  errorMessage: string | null;
  pendingItemId: string | null;
  pendingAction: "add" | "remove" | "update" | null;
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

function isRateLimited(response: Response) {
  return response.status === 429;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { pushToast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [source, setSource] = useState<"anonymous" | "user">("anonymous");
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"add" | "remove" | "update" | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const isHydratingUserCartRef = useRef(false);
  const hydrateAbortControllerRef = useRef<AbortController | null>(null);
  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const clearAbortControllerRef = useRef<AbortController | null>(null);

  const redirectToSignIn = useCallback(() => {
    const callbackUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    pushToast({
      tone: "error",
      message: "Tu sesión expiró. Inicia sesión nuevamente para continuar.",
    });
    window.location.assign(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, [pushToast]);

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
          if (response.status === 401) {
            redirectToSignIn();
            return;
          }

          if (isRateLimited(response)) {
            isHydratingUserCartRef.current = false;
            setErrorMessage("Has realizado demasiadas solicitudes. Intenta de nuevo en unos segundos.");
            setSource("anonymous");
            setItems(readAnonymousCart());
            setIsReady(true);
            return;
          }

          if (!isActive) {
            return;
          }

          isHydratingUserCartRef.current = false;
          setErrorMessage("No pudimos recuperar tu carrito. Intenta nuevamente en unos segundos.");
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
        setErrorMessage("No pudimos cargar tu carrito. Revisa tu conexión e intenta otra vez.");
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
  }, [redirectToSignIn, session?.user?.id, status]);

  useEffect(() => {
    if (source !== "anonymous" || status === "loading" || session?.user?.id) {
      return;
    }

    writeAnonymousCart(items);
  }, [items, redirectToSignIn, session?.user?.id, source, status]);

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
      }).then((response) => {
        if (response.ok) {
          setErrorMessage(null);
          return;
        }

        if (response.status === 401) {
          redirectToSignIn();
          return;
        }

        if (isRateLimited(response)) {
          setErrorMessage("Has realizado demasiadas solicitudes. Intenta de nuevo en unos segundos.");
          return;
        }

        setErrorMessage("No pudimos actualizar tu carrito. Intenta nuevamente.");
      }).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage("No pudimos actualizar tu carrito. Revisa tu conexión e intenta nuevamente.");
      }).finally(() => {
        if (syncAbortControllerRef.current === abortController) {
          syncAbortControllerRef.current = null;
        }
        setIsSyncing(false);
        setPendingItemId(null);
        setPendingAction(null);
      });
    }, 250);

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      syncAbortControllerRef.current?.abort();
    };
  }, [items, redirectToSignIn, session?.user?.id, source, status]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const value: CartContextValue = {
    items,
    totalItems,
    totalAmount,
    isReady,
    isSyncing,
    errorMessage,
    pendingItemId,
    pendingAction,
    source,
    addItem: (product) => {
      setErrorMessage(null);
      setPendingItemId(product.id);
      setPendingAction("add");
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
      pushToast({
        tone: "success",
        message: `${product.name} fue agregado a tu carrito.`,
      });
      window.setTimeout(() => {
        setPendingItemId((current) => (current === product.id ? null : current));
        setPendingAction((current) => (current === "add" ? null : current));
      }, 450);
    },
    removeItem: (productId) => {
      setErrorMessage(null);
      setPendingItemId(productId);
      setPendingAction("remove");
      setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
    },
    updateQuantity: (productId, quantity) => {
      setErrorMessage(null);
      setPendingItemId(productId);
      setPendingAction("update");
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
      }).then((response) => {
        if (response.ok) {
          setErrorMessage(null);
          return;
        }

        if (response.status === 401) {
          redirectToSignIn();
          return;
        }

        if (isRateLimited(response)) {
          setErrorMessage("Has realizado demasiadas solicitudes. Intenta de nuevo en unos segundos.");
          return;
        }

        setErrorMessage("No pudimos vaciar tu carrito. Intenta nuevamente.");
      }).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage("No pudimos vaciar tu carrito. Revisa tu conexión e intenta nuevamente.");
      }).finally(() => {
        if (clearAbortControllerRef.current === abortController) {
          clearAbortControllerRef.current = null;
        }
        setIsSyncing(false);
      });
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
