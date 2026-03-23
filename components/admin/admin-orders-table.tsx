"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { getAllowedOrderStatusTransitions } from "@/lib/order-status";
import { formatOrderReference, humanizeOrderStatus, humanizePaymentStatus } from "@/lib/order-presentation";

type AdminOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  status: "PENDING" | "PAID" | "PROCESSING" | "FULFILLED" | "CANCELED";
  paymentStatus: "UNPAID" | "REQUIRES_ACTION" | "PAID" | "FAILED" | "REFUNDED";
  paymentExpiresAt: string | null;
  processingStartedAt: string | null;
  refundedAt: string | null;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
};

type ConfirmState =
  | null
  | {
      title: string;
      description: string;
      confirmLabel: string;
      tone: "default" | "danger";
      run: () => Promise<void>;
    };

function humanizeAdminError(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return "Tu sesión ya no tiene permisos para completar esta acción. Recarga la página e intenta de nuevo.";
  }

  if (response.status === 429) {
    return "Has realizado demasiadas acciones seguidas. Espera unos segundos e inténtalo nuevamente.";
  }

  return "No pudimos completar esta acción. Vuelve a intentarlo.";
}

export function AdminOrdersTable({
  orders,
  filters,
}: {
  orders: AdminOrder[];
  filters: {
    q?: string;
    status?: AdminOrder["status"];
    paymentStatus?: AdminOrder["paymentStatus"];
    totalItems: number;
  };
}) {
  const [state, setState] = useState(orders);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const { pushToast } = useToast();

  const updateRow = (id: string, patch: Partial<AdminOrder>) => {
    setState((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    setSelectedIds((current) =>
      current.length === state.length ? [] : state.map((item) => item.id),
    );
  };

  const save = async (order: AdminOrder) => {
    setSavingId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: order.status,
        }),
      });

      if (!response.ok) {
        pushToast({ tone: "error", message: humanizeAdminError(response) });
        return;
      }

      pushToast({ tone: "success", message: `Pedido ${formatOrderReference(order.id)} actualizado.` });
    } catch {
      pushToast({ tone: "error", message: "No pudimos actualizar el pedido por un problema de conexión." });
    } finally {
      setSavingId(null);
      setConfirmState(null);
    }
  };

  const runBulkStatus = async (status: "PAID" | "PROCESSING" | "FULFILLED" | "CANCELED") => {
    if (!selectedIds.length) {
      pushToast({ tone: "error", message: "Selecciona al menos una orden." });
      return;
    }

    setBulkSaving(true);
    try {
      const response = await fetch("/api/admin/orders/bulk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
          status,
        }),
      });

      if (!response.ok) {
        pushToast({ tone: "error", message: humanizeAdminError(response) });
        return;
      }

      const data = (await response.json()) as {
        updatedCount: number;
        updatedIds: string[];
        skippedIds: string[];
      };
      setState((current) =>
        current.map((item) =>
          data.updatedIds.includes(item.id)
            ? {
                ...item,
                status,
                paymentStatus:
                  status === "PAID" || status === "PROCESSING" || status === "FULFILLED"
                    ? "PAID"
                    : status === "CANCELED" && item.paymentStatus === "PAID"
                      ? "REFUNDED"
                      : status === "CANCELED" && item.paymentStatus === "REFUNDED"
                        ? "REFUNDED"
                        : status === "CANCELED"
                          ? "FAILED"
                          : item.paymentStatus,
                processingStartedAt:
                  status === "PROCESSING"
                    ? new Date().toISOString()
                    : status === "PAID"
                      ? null
                      : item.processingStartedAt,
                refundedAt:
                  status === "CANCELED" && item.paymentStatus === "PAID"
                    ? new Date().toISOString()
                    : status !== "CANCELED"
                      ? null
                      : item.refundedAt,
              }
            : item,
        ),
      );
      setSelectedIds([]);
      pushToast({
        tone: data.skippedIds.length ? "warn" : "success",
        message: data.skippedIds.length
          ? `Se actualizaron ${data.updatedCount} pedidos y ${data.skippedIds.length} quedaron sin cambios por una transición no válida.`
          : `Se actualizaron ${data.updatedCount} pedidos.`,
      });
    } catch {
      pushToast({ tone: "error", message: "No pudimos ejecutar la acción masiva por un problema de conexión." });
    } finally {
      setBulkSaving(false);
      setConfirmState(null);
    }
  };

  return (
    <div className="grid gap-4">
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Confirmar"}
        tone={confirmState?.tone ?? "default"}
        busy={Boolean(savingId || bulkSaving)}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) {
            return;
          }

          void confirmState.run();
        }}
      />
      <section className="grid gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-card">
        <form action="/admin/orders" className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Buscar por cliente, email u orden"
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          />
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="PAID">Confirmado</option>
            <option value="PROCESSING">En preparación</option>
            <option value="FULFILLED">Entregado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
          <select
            name="paymentStatus"
            defaultValue={filters.paymentStatus ?? ""}
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          >
            <option value="">Todos los pagos</option>
            <option value="UNPAID">Sin pago</option>
            <option value="REQUIRES_ACTION">Pendiente</option>
            <option value="PAID">Pago recibido</option>
            <option value="FAILED">Pago no completado</option>
            <option value="REFUNDED">Reembolsado</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-ink">
            {filters.totalItems} órdenes
          </span>
          <button
            type="button"
            onClick={() =>
              setConfirmState({
                title: "¿Marcar pedidos como confirmados?",
                description: "Usa esta acción solo si ya confirmaste el cobro correspondiente.",
                confirmLabel: "Confirmar cambio",
                tone: "default",
                run: async () => runBulkStatus("PAID"),
              })
            }
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Marcar como confirmadas
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmState({
                title: "¿Marcar pedidos como entregados?",
                description: "Esta actualización indica que la entrega ya fue completada.",
                confirmLabel: "Marcar entregados",
                tone: "default",
                run: async () => runBulkStatus("FULFILLED"),
              })
            }
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Marcar como entregadas
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmState({
                title: "¿Pasar pedidos a preparación?",
                description: "Esto indicará al equipo que los pedidos ya están en alistamiento.",
                confirmLabel: "Actualizar pedidos",
                tone: "default",
                run: async () => runBulkStatus("PROCESSING"),
              })
            }
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Pasar a preparación
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmState({
                title: "¿Cancelar pedidos seleccionados?",
                description: "Si alguno ya estaba cobrado, el panel aplicará el estado correspondiente. Revisa bien esta acción antes de continuar.",
                confirmLabel: "Cancelar pedidos",
                tone: "danger",
                run: async () => runBulkStatus("CANCELED"),
              })
            }
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
        </div>
      </section>

      <label className="flex items-center gap-3 text-sm font-medium text-black/65">
        <input
          type="checkbox"
          checked={state.length > 0 && selectedIds.length === state.length}
          onChange={toggleAll}
        />
        Seleccionar todas las órdenes visibles
      </label>

      {state.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          isSelected={selectedIds.includes(order.id)}
          isSaving={savingId === order.id}
          isBulkSaving={bulkSaving}
          onToggleSelection={toggleSelection}
          onUpdateRow={updateRow}
          onSave={save}
          onConfirm={setConfirmState}
        />
      ))}
    </div>
  );
}

function OrderRow({
  order,
  isSelected,
  isSaving,
  isBulkSaving,
  onToggleSelection,
  onUpdateRow,
  onSave,
  onConfirm,
}: {
  order: AdminOrder;
  isSelected: boolean;
  isSaving: boolean;
  isBulkSaving: boolean;
  onToggleSelection: (id: string) => void;
  onUpdateRow: (id: string, patch: Partial<AdminOrder>) => void;
  onSave: (order: AdminOrder) => void;
  onConfirm: (value: ConfirmState) => void;
}) {
  const allowedStatuses = getAllowedOrderStatusTransitions({
    status: order.status,
    paymentStatus: order.paymentStatus,
  });

  return (
    <article className="grid gap-4 rounded-3xl border border-black/5 bg-canvas p-5 md:grid-cols-[auto_1.5fr_1fr_0.9fr_0.9fr_0.8fr_auto_auto]">
      <label className="flex items-center pt-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(order.id)}
        />
      </label>
      <div>
        <p className="font-semibold">{order.customerName}</p>
        <p className="text-sm text-black/55">{order.customerEmail}</p>
        <p className="mt-1 text-xs text-black/45">{formatOrderReference(order.id)}</p>
      </div>

      <div className="text-sm">
        <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
        <p className="text-black/55">{order.itemCount} ítems</p>
        <p className="text-black/45">{new Date(order.createdAt).toLocaleString("es-CO")}</p>
      </div>

      <div className="text-sm">
        <p className="font-semibold">Pago</p>
        <p>{humanizePaymentStatus(order.paymentStatus)}</p>
        {order.paymentExpiresAt ? (
          <p className="text-xs text-black/45">
            vence {new Date(order.paymentExpiresAt).toLocaleString("es-CO")}
          </p>
        ) : null}
        {order.refundedAt ? (
          <p className="text-xs text-black/45">
            reembolso {new Date(order.refundedAt).toLocaleString("es-CO")}
          </p>
        ) : null}
      </div>

      <label className="text-sm font-medium">
        Estado
        <select
          value={order.status}
          onChange={(event) =>
            onUpdateRow(order.id, {
              status: event.target.value as AdminOrder["status"],
            })
          }
          disabled={isSaving || isBulkSaving}
          className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="PENDING" disabled={!allowedStatuses.includes("PENDING")}>
            {humanizeOrderStatus("PENDING")}
          </option>
          <option value="PAID" disabled={!allowedStatuses.includes("PAID")}>
            {humanizeOrderStatus("PAID")}
          </option>
          <option value="PROCESSING" disabled={!allowedStatuses.includes("PROCESSING")}>
            {humanizeOrderStatus("PROCESSING")}
          </option>
          <option value="FULFILLED" disabled={!allowedStatuses.includes("FULFILLED")}>
            {humanizeOrderStatus("FULFILLED")}
          </option>
          <option value="CANCELED" disabled={!allowedStatuses.includes("CANCELED")}>
            {humanizeOrderStatus("CANCELED")}
          </option>
        </select>
      </label>

      <div className="flex items-center text-sm font-semibold text-brand">
        {order.status === "FULFILLED"
          ? "Listo"
          : order.status === "PROCESSING"
            ? "En preparación"
            : order.paymentStatus === "REFUNDED"
              ? "Reembolsada"
              : "Pendiente"}
      </div>

      <Link
        href={`/orders/${order.id}`}
        className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
      >
        Ver detalle
      </Link>

      <button
        type="button"
        onClick={() =>
          onConfirm({
            title: "¿Guardar cambio de estado?",
            description: `El pedido ${formatOrderReference(order.id)} quedará como ${humanizeOrderStatus(order.status).toLowerCase()}. Verifica que esta actualización sea correcta antes de continuar.`,
            confirmLabel: "Guardar cambio",
            tone: order.status === "CANCELED" ? "danger" : "default",
            run: async () => onSave(order),
          })
        }
        disabled={isSaving || isBulkSaving}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSaving ? "Guardando..." : "Guardar"}
      </button>
    </article>
  );
}
