"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/store/cart-provider";
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);

  const form = useForm<ClientCheckoutValues>({
    resolver: zodResolver(clientCheckoutSchema),
    defaultValues: {
      customerName: "",
      shippingAddress: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);

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

    const data = (await response.json()) as { error?: string; orderId?: string };

    if (!response.ok || !data.orderId) {
      setServerError(data.error ?? "No se pudo crear la orden.");
      return;
    }

    clearCart();
    router.push(`/orders/${data.orderId}`);
  });

  const onPayWithStripe = form.handleSubmit(async (values) => {
    setServerError(null);
    setIsRedirectingToPayment(true);

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

    const data = (await response.json()) as { error?: string; checkoutUrl?: string };

    if (!response.ok || !data.checkoutUrl) {
      setIsRedirectingToPayment(false);
      setServerError(data.error ?? "No se pudo iniciar el pago.");
      return;
    }

    router.push(data.checkoutUrl);
  });

  if (!isReady) {
    return (
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <h1 className="font-display text-4xl">Preparando tu compra</h1>
        <p className="mt-3 max-w-xl text-black/70">
          Estamos cargando tu carrito {source === "user" ? "desde tu cuenta" : "desde este navegador"} para que puedas revisar tu pedido.
        </p>
      </section>
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
          error={form.formState.errors.customerName?.message}
          input={
            <input
              {...form.register("customerName")}
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
          error={form.formState.errors.shippingAddress?.message}
          input={
            <textarea
              rows={4}
              {...form.register("shippingAddress")}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            />
          }
        />

        {serverError ? (
          <p className="rounded-2xl bg-brand/10 px-4 py-3 text-sm font-medium text-brand">
            {serverError}
          </p>
        ) : null}
        {paymentCancelled ? (
          <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
            El pago no se completó. Tu carrito sigue intacto para que puedas intentarlo de nuevo cuando quieras.
          </p>
        ) : null}
        {isSyncing ? (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm font-medium text-black/70">
            Estamos actualizando tu carrito antes de continuar.
          </p>
        ) : null}

        {stripeEnabled ? (
          <button
            type="button"
            onClick={onPayWithStripe}
            disabled={form.formState.isSubmitting || isSyncing || isRedirectingToPayment}
            className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRedirectingToPayment ? "Redirigiendo al pago..." : "Ir a pago seguro"}
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
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {input}
      {error ? <span className="mt-2 block text-sm text-brand">{error}</span> : null}
    </label>
  );
}
