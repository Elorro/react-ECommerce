import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatOrderReference, humanizeOrderStatus, humanizePaymentStatus } from "@/lib/order-presentation";
import { confirmStripeOrderPayment } from "@/lib/orders";
import { isStripeCheckoutEnabled } from "@/lib/payments";

export const metadata = {
  title: "Pago confirmado | Atelier Commerce",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; order_id?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const { session_id: sessionId, order_id: orderId } = await searchParams;

  if (!sessionId || !orderId || !isStripeCheckoutEnabled()) {
    redirect("/account");
  }

  const order = await confirmStripeOrderPayment({
    orderId,
    sessionId,
    userId: session.user.id,
  });

  if (!order) {
    redirect("/account");
  }

  return (
    <section className="space-y-6 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
        Compra confirmada
      </span>
      <h1 className="font-display text-4xl">Tu compra fue confirmada correctamente</h1>
      <p className="max-w-2xl text-black/70">
        Recibimos tu pago y tu pedido ya quedó registrado. Puedes revisar el detalle y seguir su avance desde tu cuenta siempre que lo necesites.
      </p>
      <div className="grid gap-4 rounded-3xl border border-black/5 bg-canvas px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
            Número de pedido
          </p>
          <p className="font-semibold">{formatOrderReference(order.id)}</p>
          <p className="text-sm text-black/55">
            Estado: {humanizeOrderStatus(order.status)} · Pago: {humanizePaymentStatus(order.paymentStatus)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-black/70">
          Tu detalle de compra ya está disponible dentro de tu cuenta.
        </div>
      </div>
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        Pago seguro procesado por Stripe. Conserva la referencia del pedido para revisarlo cuando quieras.
      </div>
      <p className="text-sm text-black/60">
        Siguiente paso: entra al detalle del pedido para revisar su estado o vuelve al catálogo si quieres seguir comprando.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Ver mi pedido
        </Link>
        <Link
          href="/catalog"
          className="inline-flex rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Seguir comprando
        </Link>
      </div>
    </section>
  );
}
