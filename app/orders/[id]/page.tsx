import { notFound } from "next/navigation";
import { OrderSupportPanel } from "@/components/admin/order-support-panel";
import { auth } from "@/lib/auth";
import { canRefundOrder } from "@/lib/order-status";
import {
  formatOrderReference,
  humanizeOrderStatus,
  humanizePaymentStatus,
  humanizeReturnStatus,
} from "@/lib/order-presentation";
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
  const canManageReturns = hasPermission(session.user.role, "orders.returns.manage");
  const [order, timeline, supportNotes] = await Promise.all([
    getOrderById(id, session.user.id, session.user.role),
    getOrderTimeline(id),
    canViewSupportNotes ? getOrderSupportNotes(id) : Promise.resolve([]),
  ]);

  if (!order) {
    notFound();
  }

  const publicTimeline = timeline.map((event) => formatOrderEvent(event));

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Pedido confirmado
        </span>
        <h1 className="font-display text-4xl">Pedido {formatOrderReference(order.id)}</h1>
        <p className="text-black/70">
          Aquí puedes revisar el estado de tu compra, los productos incluidos y cualquier actualización importante del pedido.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <InfoCard label="Cliente" value={`${order.customerName} · ${order.customerEmail}`} />
        <InfoCard label="Estado" value={humanizeOrderStatus(order.status)} />
        <InfoCard label="Pago" value={humanizePaymentStatus(order.paymentStatus)} />
        <InfoCard label="Devolución" value={humanizeReturnStatus(order.returnStatus)} />
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
        <h2 className="font-display text-3xl">Estado del pedido</h2>
        <div className="grid gap-4">
          {publicTimeline.map((event, index) => (
            <article
              key={`${event.title}-${index}`}
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
          canManageReturns={canManageReturns}
          status={order.status}
          paymentStatus={order.paymentStatus}
          returnStatus={order.returnStatus}
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

function formatOrderEvent(event: {
  title: string;
  description: string;
  tone: "info" | "warn" | "success" | "error";
  createdAt: string;
}) {
  const normalizedTitle = event.title.toLowerCase();

  if (normalizedTitle === "orden creada") {
    return {
      title: "Pedido confirmado",
      description: "Recibimos tu pedido y lo estamos preparando para el siguiente paso.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "pago reembolsado") {
    return {
      title: "Pago reembolsado",
      description: "El reembolso fue procesado correctamente.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "orden en preparación") {
    return {
      title: "Pedido en preparación",
      description: "Tu pedido está siendo alistado para su entrega.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "orden fulfilled") {
    return {
      title: "Pedido entregado",
      description: "La entrega de tu pedido fue completada.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "orden cancelada") {
    return {
      title: "Pedido cancelado",
      description: "Este pedido fue cancelado antes de completarse.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "pago pendiente") {
    return {
      title: "Pago pendiente",
      description: "Estamos esperando la confirmación del pago para continuar.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "devolución solicitada" || normalizedTitle === "devolucion solicitada") {
    return {
      title: "Devolución solicitada",
      description: "Registramos tu solicitud de devolución y será revisada por el equipo.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle === "devolución recibida" || normalizedTitle === "devolucion recibida") {
    return {
      title: "Devolución recibida",
      description: "Recibimos el producto devuelto y avanzamos con la revisión final.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  if (normalizedTitle.startsWith("audit.admin.") || normalizedTitle.startsWith("admin.") || normalizedTitle.startsWith("orders.")) {
    return {
      title: "Actualización del pedido",
      description: "Tu pedido recibió una actualización interna.",
      tone: event.tone,
      createdAt: event.createdAt,
    };
  }

  return {
    title: "Actualización del pedido",
    description: "Tu pedido recibió una actualización reciente.",
    tone: event.tone,
    createdAt: event.createdAt,
  };
}
