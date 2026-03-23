"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/store/cart-provider";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-provider";
import { clientCheckoutSchema, type ClientCheckoutValues } from "@/lib/validators/order";

export function CheckoutForm({
  stripeEnabled,
  paymentCancelled = false,
}: {
  stripeEnabled: boolean;
  paymentCancelled?: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, totalAmount, clearCart, isReady, isSyncing, source } = useCart();
  const { pushToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  const redirectToSignIn = () => {
    pushToast({
      tone: "error",
      message: "Tu sesión expiró. Inicia sesión nuevamente para continuar con tu compra.",
    });
    router.push("/auth/sign-in?callbackUrl=/checkout");
  };

  const humanizeCheckoutError = (message?: string) => {
    if (!message) {
      return "No pudimos continuar con tu compra. Intenta nuevamente en unos segundos.";
    }

    const normalized = message.toLowerCase();

    if (normalized.includes("insufficient stock")) {
      return "Algunos productos ya no tienen la cantidad disponible que elegiste. Revisa tu carrito e inténtalo de nuevo.";
    }

    if (normalized.includes("product not found")) {
      return "Uno de los productos ya no está disponible. Actualiza tu carrito para continuar.";
    }

    if (normalized.includes("unauthorized") || normalized.includes("forbidden")) {
      return "Tu sesión expiró. Inicia sesión nuevamente para continuar.";
    }

    if (normalized.includes("rate limit") || normalized.includes("too many")) {
      return "Has realizado demasiados intentos seguidos. Espera unos segundos y vuelve a intentarlo.";
    }

    return "No pudimos procesar tu solicitud. Revisa tus datos e inténtalo nuevamente.";
  };

  const form = useForm<ClientCheckoutValues>({
    resolver: zodResolver(clientCheckoutSchema),
    defaultValues: {
      customerName: "",
      shippingAddress: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (response.status === 401) {
        redirectToSignIn();
        return;
      }

      if (response.status === 429) {
        setServerError("Has realizado demasiados intentos seguidos. Espera unos segundos y vuelve a intentarlo.");
        return;
      }

      const data = (await response.json()) as { error?: string; orderId?: string };

      if (!response.ok || !data.orderId) {
        setServerError(humanizeCheckoutError(data.error));
        return;
      }

      pushToast({
        tone: "success",
        message: "Tu pedido fue creado correctamente.",
      });
      clearCart();
      router.push(`/orders/${data.orderId}`);
    } catch {
      setServerError("No pudimos procesar tu pedido por un problema de conexión. Intenta nuevamente.");
    }
  });

  const onPayWithStripe = form.handleSubmit(async (values) => {
    setServerError(null);
    setIsRedirectingToPayment(true);
    try {
      const response = await fetch("/api/payments/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (response.status === 401) {
        setIsRedirectingToPayment(false);
        redirectToSignIn();
        return;
      }

      if (response.status === 429) {
        setIsRedirectingToPayment(false);
        setServerError("Has realizado demasiados intentos seguidos. Espera unos segundos y vuelve a intentarlo.");
        return;
      }

      const data = (await response.json()) as { error?: string; checkoutUrl?: string };

      if (!response.ok || !data.checkoutUrl) {
        setIsRedirectingToPayment(false);
        setServerError(
          humanizeCheckoutError(data.error) ||
            "No pudimos procesar tu pago. Intenta nuevamente o usa otro método.",
        );
        return;
      }

      router.push(data.checkoutUrl);
    } catch {
      setIsRedirectingToPayment(false);
      setServerError(
        "No pudimos iniciar el pago por un problema de conexión. Revisa tu red e inténtalo de nuevo.",
      );
    }
  });

  if (!isReady) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <section className="space-y-5 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </section>
        <aside className="space-y-4 rounded-[2rem] border border-black/5 bg-pine p-8 text-white shadow-card">
          <Skeleton className="h-10 w-48 bg-white/15" />
          <Skeleton className="h-5 w-full bg-white/10" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full bg-white/10" />
          ))}
        </aside>
      </div>
    );
  }

  if (!items.length) {
    return (
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <h1 className="font-display text-4xl">Tu carrito está vacío</h1>
        <p className="mt-3 max-w-xl text-black/70">
          Agrega al menos un producto antes de continuar al pago.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
      <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <div className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Pago seguro
          </span>
          <h1 className="font-display text-4xl">Finaliza tu compra</h1>
          <p className="max-w-xl text-black/70">
            Revisa tus datos de entrega y completa tu pedido con total confianza.
          </p>
          <div className="flex flex-wrap gap-3 pt-2 text-sm font-medium text-black/70">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-800">
              Pago seguro procesado por Stripe
            </span>
            <span className="rounded-full bg-canvas px-4 py-2 text-black/75">
              Tus datos están protegidos
            </span>
          </div>
        </div>

        <Field
          label="Nombre completo"
          required
          error={form.formState.errors.customerName?.message}
          input={
            <input
              {...form.register("customerName")}
              aria-invalid={Boolean(form.formState.errors.customerName)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            />
          }
        />
        <div className="rounded-2xl border border-black/10 bg-canvas px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Correo autenticado
          </p>
          <p className="mt-2 text-sm font-medium">{session?.user?.email}</p>
        </div>

        <Field
          label="Direccion de envio"
          required
          error={form.formState.errors.shippingAddress?.message}
          input={
            <textarea
              rows={4}
              {...form.register("shippingAddress")}
              aria-invalid={Boolean(form.formState.errors.shippingAddress)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            />
          }
        />

        {serverError ? (
          <InlineNotice tone="error">
            {serverError}
          </InlineNotice>
        ) : null}
        {paymentCancelled ? (
          <InlineNotice tone="warn">
            El pago no se completó. Tu carrito sigue intacto para que puedas intentarlo de nuevo cuando quieras.
          </InlineNotice>
        ) : null}
        {isSyncing ? (
          <InlineNotice tone="info">
            Estamos actualizando tu carrito antes de continuar.
          </InlineNotice>
        ) : null}

        {stripeEnabled ? (
          <button
            type="button"
            onClick={onPayWithStripe}
            disabled={form.formState.isSubmitting || isSyncing || isRedirectingToPayment}
            className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRedirectingToPayment ? "Procesando pago..." : "Ir a pago seguro"}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting || isSyncing || isRedirectingToPayment}
          className="inline-flex w-full items-center justify-center rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {form.formState.isSubmitting ? "Confirmando pedido..." : "Confirmar pedido"}
        </button>
      </form>

      <aside className="space-y-4 rounded-[2rem] border border-black/5 bg-pine p-8 text-white shadow-card lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-3xl">Resumen de tu pedido</h2>
        <p className="text-white/75">
          Revisa tus productos antes de pasar al pago.
        </p>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-3xl bg-white/10 px-4 py-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-white/65">Cantidad: {item.quantity}</p>
              </div>
              <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-white/15 pt-4">
          <div className="flex items-center justify-between text-xl font-semibold">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <p className="mt-3 text-sm text-white/70">
            Revisaremos tu pedido para confirmar precios y disponibilidad antes de finalizar la compra.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  input,
  error,
  required,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label} {required ? <span className="text-brand">*</span> : null}
      {input}
      {error ? <span className="mt-2 block text-sm text-brand">{error}</span> : null}
    </label>
  );
}
