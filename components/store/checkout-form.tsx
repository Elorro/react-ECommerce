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
      setServerError(data.error ?? "No se pudo iniciar el pago.");
      return;
    }

    router.push(data.checkoutUrl);
  });

  if (!isReady) {
    return (
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <h1 className="font-display text-4xl">Preparando checkout</h1>
        <p className="mt-3 max-w-xl text-black/70">
          Estamos cargando el carrito {source === "user" ? "de tu cuenta" : "de este navegador"} antes de permitir el checkout.
        </p>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <h1 className="font-display text-4xl">Checkout bloqueado</h1>
        <p className="mt-3 max-w-xl text-black/70">
          No se puede crear una orden sin items. La validación del servidor además lo
          rechaza aunque intentes enviar el payload manualmente.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
      <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
        <div className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
            Checkout seguro
          </span>
          <h1 className="font-display text-4xl">Datos de la orden</h1>
        </div>

        <Field
          label="Nombre completo"
          error={form.formState.errors.customerName?.message}
          input={
            <input
              {...form.register("customerName")}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3"
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
              className="mt-2 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3"
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
            El pago fue cancelado antes de completarse. Tu carrito sigue intacto y puedes
            reintentar cuando quieras.
          </p>
        ) : null}
        {isSyncing ? (
          <p className="rounded-2xl bg-canvas px-4 py-3 text-sm font-medium text-black/70">
            Esperando a que el carrito termine de sincronizarse antes de enviar la orden.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={form.formState.isSubmitting || isSyncing}
          className="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          {form.formState.isSubmitting ? "Creando orden..." : "Crear orden"}
        </button>
        {stripeEnabled ? (
          <button
            type="button"
            onClick={onPayWithStripe}
            disabled={form.formState.isSubmitting || isSyncing}
            className="ml-3 inline-flex rounded-full border border-ink px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            Pagar con Stripe
          </button>
        ) : null}
      </form>

      <aside className="space-y-4 rounded-[2rem] border border-black/5 bg-pine p-8 text-white shadow-card">
        <h2 className="font-display text-3xl">Resumen del servidor</h2>
        <p className="text-white/75">
          El backend recalcula precios, subtotales y valida stock real antes de persistir.
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
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total estimado</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
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
