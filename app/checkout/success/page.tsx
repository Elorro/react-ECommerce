import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
        Pago confirmado
      </span>
      <h1 className="font-display text-4xl">Stripe validó la sesión y la orden quedó finalizada</h1>
      <p className="max-w-2xl text-black/70">
        La confirmación se hizo del lado servidor. No se confió en el frontend ni en el total
        enviado por el navegador.
      </p>
      <div className="rounded-3xl border border-black/5 bg-canvas px-5 py-4">
        <p className="font-semibold">{order.id}</p>
        <p className="text-sm text-black/55">
          Estado: {order.status} · Pago: {order.paymentStatus}
        </p>
      </div>
      <Link
        href={`/orders/${order.id}`}
        className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
      >
        Ver orden
      </Link>
    </section>
  );
}
