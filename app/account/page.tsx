import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatOrderReference, humanizeOrderStatus, humanizePaymentStatus } from "@/lib/order-presentation";
import { getOrdersByUserId } from "@/lib/orders";

export const metadata = {
  title: "Cuenta | Atelier Commerce",
};

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const orders = await getOrdersByUserId(session.user.id);

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-card">
      <div className="space-y-4">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Cuenta
        </span>
        <h1 className="font-display text-4xl">
          {session.user.name ?? "Cliente"} · {session.user.email}
        </h1>
        <p className="max-w-2xl text-black/70">
          Aquí puedes revisar tus datos y seguir el estado de tus pedidos en un solo lugar.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-3xl">Mis pedidos</h2>
        {orders.length ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="rounded-3xl border border-black/5 bg-canvas px-5 py-4 transition hover:border-brand"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{formatOrderReference(order.id)}</p>
                    <p className="text-sm text-black/55">
                      {humanizeOrderStatus(order.status)} · {humanizePaymentStatus(order.paymentStatus)}
                    </p>
                  </div>
                  <p className="font-semibold">${order.totalAmount.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl border border-dashed border-black/10 bg-canvas px-5 py-6">
            <p className="text-black/65">Aún no tienes compras registradas.</p>
            <Link
              href="/catalog"
              className="inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Explorar productos
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
