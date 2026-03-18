import { notFound } from "next/navigation";
import { OrderSupportPanel } from "@/components/admin/order-support-panel";
import { auth } from "@/lib/auth";
import { canRefundOrder } from "@/lib/order-status";
import { hasPermission } from "@/lib/permissions";
import { getOrderById, getOrderSupportNotes, getOrderTimeline } from "@/lib/orders";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const canViewSupportNotes = hasPermission(session.user.role, "orders.notes.manage");
  const canRefund = hasPermission(session.user.role, "orders.refund");
  const [order, timeline, supportNotes] = await Promise.all([
    getOrderById(id, session.user.id, session.user.role),
    getOrderTimeline(id),
    canViewSupportNotes ? getOrderSupportNotes(id) : Promise.resolve([]),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Orden creada
        </span>
        <h1 className="font-display text-4xl">Pedido {order.id}</h1>
        <p className="text-black/70">
          El pedido fue persistido en base de datos y los totales fueron recalculados del
          lado servidor. El frontend no tuvo autoridad sobre precios ni stock.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <InfoCard label="Cliente" value={`${order.customerName} · ${order.customerEmail}`} />
        <InfoCard label="Estado" value={order.status} />
        <InfoCard label="Pago" value={order.paymentStatus} />
        <InfoCard label="Subtotal" value={`$${order.subtotalAmount.toFixed(2)}`} />
        <InfoCard label="Total" value={`$${order.totalAmount.toFixed(2)}`} />
      </div>
      <div className="space-y-4">
        <h2 className="font-display text-3xl">Items</h2>
        <div className="grid gap-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-3xl border border-black/5 bg-canvas px-5 py-4"
            >
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="text-sm text-black/55">Cantidad: {item.quantity}</p>
              </div>
              <p className="font-semibold">${item.lineTotal.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="font-display text-3xl">Timeline operativo</h2>
        <div className="grid gap-4">
          {timeline.map((event) => (
            <article
              key={event.id}
              className={`rounded-3xl border px-5 py-4 ${
                event.tone === "error"
                  ? "border-red-200 bg-red-50"
                  : event.tone === "warn"
                    ? "border-amber-200 bg-amber-50"
                    : event.tone === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-black/5 bg-canvas"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold">{event.title}</p>
                <p className="text-xs text-black/45">
                  {new Date(event.createdAt).toLocaleString("es-CO")}
                </p>
              </div>
              <p className="mt-2 text-sm text-black/70">{event.description}</p>
              {event.metadata ? (
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink p-4 text-xs text-white">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      {canViewSupportNotes ? (
        <OrderSupportPanel
          orderId={order.id}
          initialNotes={supportNotes}
          canRefund={
            canRefund &&
            canRefundOrder({
              status: order.status,
              paymentStatus: order.paymentStatus,
            })
          }
          status={order.status}
          paymentStatus={order.paymentStatus}
        />
      ) : null}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-canvas px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{label}</p>
      <p className="mt-2 text-lg font-medium">{value}</p>
    </div>
  );
}
