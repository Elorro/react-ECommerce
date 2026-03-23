"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { useToast } from "@/components/ui/toast-provider";
import { humanizeOrderStatus, humanizePaymentStatus, humanizeReturnStatus } from "@/lib/order-presentation";

type SupportNote = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    role: "CUSTOMER" | "OPERATIONS" | "ADMIN";
  };
};

type ConfirmState =
  | null
  | {
      action: "refund" | "request-return" | "receive-return" | "refund-return";
      title: string;
      description: string;
      confirmLabel: string;
      tone: "danger" | "warn" | "default";
    };

function humanizeAdminActionError(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return "Tu sesión ya no tiene permisos para completar esta acción. Recarga la página e inicia sesión nuevamente si es necesario.";
  }

  if (response.status === 429) {
    return "Has realizado demasiadas acciones seguidas. Espera unos segundos e inténtalo nuevamente.";
  }

  return "No pudimos completar esta acción. Vuelve a intentarlo.";
}

function humanizeRole(role: SupportNote["author"]["role"]) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "OPERATIONS":
      return "Operaciones";
    default:
      return "Cliente";
  }
}

export function OrderSupportPanel({
  orderId,
  initialNotes,
  canRefund,
  canManageReturns,
  status,
  paymentStatus,
  returnStatus,
}: {
  orderId: string;
  initialNotes: SupportNote[];
  canRefund: boolean;
  canManageReturns: boolean;
  status: string;
  paymentStatus: string;
  returnStatus: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [managingReturn, setManagingReturn] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const { pushToast } = useToast();

  const isBusy = saving || refunding || managingReturn;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
        }),
      });

      if (!response.ok) {
        pushToast({ tone: "error", message: humanizeAdminActionError(response) });
        return;
      }

      const note = (await response.json()) as SupportNote;
      setNotes((current) => [note, ...current]);
      setContent("");
      pushToast({ tone: "success", message: "Nota interna guardada." });
    } catch {
      pushToast({ tone: "error", message: "No pudimos guardar la nota por un problema de conexión." });
    } finally {
      setSaving(false);
    }
  };

  const submitRefund = async () => {
    setRefunding(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: refundReason,
        }),
      });

      if (!response.ok) {
        pushToast({ tone: "error", message: humanizeAdminActionError(response) });
        return;
      }

      setRefundReason("");
      pushToast({ tone: "success", message: "Reembolso registrado y pedido cancelado." });
      router.refresh();
    } catch {
      pushToast({ tone: "error", message: "No pudimos registrar el reembolso por un problema de conexión." });
    } finally {
      setRefunding(false);
      setConfirmState(null);
    }
  };

  const submitReturnAction = async (action: "REQUEST" | "RECEIVE" | "REFUND") => {
    setManagingReturn(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          action === "REQUEST"
            ? {
                action,
                reason: returnReason,
              }
            : action === "REFUND"
              ? {
                  action,
                  reason: refundReason,
                }
              : { action },
        ),
      });

      if (!response.ok) {
        pushToast({ tone: "error", message: humanizeAdminActionError(response) });
        return;
      }

      if (action === "REQUEST") {
        setReturnReason("");
        pushToast({ tone: "success", message: "Solicitud de devolución registrada." });
      } else if (action === "RECEIVE") {
        pushToast({ tone: "success", message: "Producto devuelto marcado como recibido." });
      } else {
        setRefundReason("");
        pushToast({ tone: "success", message: "Devolución reembolsada correctamente." });
      }

      router.refresh();
    } catch {
      pushToast({ tone: "error", message: "No pudimos actualizar la devolución por un problema de conexión." });
    } finally {
      setManagingReturn(false);
      setConfirmState(null);
    }
  };

  return (
    <section className="space-y-4 rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-card">
      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Confirmar"}
        tone={confirmState?.tone ?? "default"}
        busy={isBusy}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) {
            return;
          }

          if (confirmState.action === "refund") {
            void submitRefund();
            return;
          }

          if (confirmState.action === "request-return") {
            void submitReturnAction("REQUEST");
            return;
          }

          if (confirmState.action === "receive-return") {
            void submitReturnAction("RECEIVE");
            return;
          }

          void submitReturnAction("REFUND");
        }}
      />
      <div>
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Soporte interno
        </span>
        <h2 className="mt-2 font-display text-3xl">Notas operativas</h2>
        <p className="mt-2 text-sm text-black/65">
          Estas notas no son visibles para el cliente. Sirven para handoff, soporte y
          seguimiento interno.
        </p>
      </div>

      <div className="rounded-3xl border border-black/5 bg-canvas px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
          Acción comercial
        </p>
        <p className="mt-2 text-sm text-black/70">
          Estado actual: {humanizeOrderStatus(status)} · Pago: {humanizePaymentStatus(paymentStatus)} · Devolución: {humanizeReturnStatus(returnStatus)}
        </p>
        <InlineNotice tone="info">
          Confirma cada cambio antes de aplicarlo. Algunas acciones, como reembolsar o cerrar una devolución, no se pueden deshacer desde esta pantalla.
        </InlineNotice>
        {canRefund ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setConfirmState({
                action: "refund",
                title: "¿Confirmas este reembolso?",
                description: "Se registrará el reembolso y el pedido quedará cancelado. Esta acción no se puede deshacer desde el panel.",
                confirmLabel: "Confirmar reembolso",
                tone: "danger",
              });
            }}
            className="mt-4 space-y-3"
          >
            <label className="block text-sm font-medium">
              Motivo del reembolso <span className="text-brand">*</span>
            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              rows={3}
              placeholder="Explica brevemente por qué se autoriza este reembolso."
              aria-invalid={refundReason.trim().length > 0 && refundReason.trim().length < 5}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
            />
            </label>
            <button
              type="submit"
              disabled={isBusy || refundReason.trim().length < 5}
              className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refunding ? "Procesando reembolso..." : "Reembolsar y cancelar pedido"}
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-black/10 bg-white px-4 py-3 text-sm text-black/60">
            El reembolso solo está disponible para pedidos cobrados que todavía no se han entregado.
          </p>
        )}

        {canManageReturns ? (
          <div className="mt-4 space-y-3">
            {returnStatus === "NONE" && status === "FULFILLED" && paymentStatus === "PAID" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setConfirmState({
                    action: "request-return",
                    title: "¿Registrar solicitud de devolución?",
                    description: "Esto dejará constancia de que el cliente solicitó devolver el producto después de la entrega.",
                    confirmLabel: "Registrar solicitud",
                    tone: "warn",
                  });
                }}
                className="space-y-3"
              >
                <label className="block text-sm font-medium">
                  Motivo de la devolución <span className="text-brand">*</span>
                <textarea
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  rows={3}
                  placeholder="Resume la solicitud del cliente y el motivo de la devolución."
                  aria-invalid={returnReason.trim().length > 0 && returnReason.trim().length < 5}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
                />
                </label>
                <button
                  type="submit"
                  disabled={isBusy || returnReason.trim().length < 5}
                  className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {managingReturn ? "Registrando..." : "Solicitar devolución"}
                </button>
              </form>
            ) : null}

            {returnStatus === "REQUESTED" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setConfirmState({
                    action: "receive-return",
                    title: "¿Confirmar recepción del producto?",
                    description: "Usa esta acción solo cuando el producto ya haya sido recibido físicamente por el equipo.",
                    confirmLabel: "Confirmar recepción",
                    tone: "default",
                  });
                }}
              >
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {managingReturn ? "Actualizando..." : "Marcar devolución recibida"}
                </button>
              </form>
            ) : null}

            {returnStatus === "RECEIVED" && paymentStatus === "PAID" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setConfirmState({
                    action: "refund-return",
                    title: "¿Reembolsar esta devolución?",
                    description: "El reembolso quedará registrado sobre una devolución ya recibida. Verifica el motivo antes de continuar.",
                    confirmLabel: "Reembolsar devolución",
                    tone: "danger",
                  });
                }}
                className="space-y-3"
              >
                <label className="block text-sm font-medium">
                  Motivo del reembolso <span className="text-brand">*</span>
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={3}
                  placeholder="Explica brevemente por qué procede el reembolso de esta devolución."
                  aria-invalid={refundReason.trim().length > 0 && refundReason.trim().length < 5}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
                />
                </label>
                <button
                  type="submit"
                  disabled={isBusy || refundReason.trim().length < 5}
                  className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {managingReturn ? "Procesando..." : "Reembolsar devolución"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium">
          Nota interna <span className="text-brand">*</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            placeholder="Añade contexto operativo, decisiones o incidencias de este pedido."
            aria-invalid={content.trim().length > 0 && content.trim().length < 3}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          />
        </label>
        <button
          type="submit"
          disabled={isBusy || content.trim().length < 3}
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar nota"}
        </button>
      </form>

      <div className="space-y-3">
        {notes.length ? (
          notes.map((note) => (
            <article key={note.id} className="rounded-3xl border border-black/5 bg-canvas px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold">
                  {note.author.name || note.author.email || "Equipo interno"}
                </p>
                <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black/60">
                  {humanizeRole(note.author.role)}
                </p>
                <p className="text-xs text-black/45">
                  {new Date(note.createdAt).toLocaleString("es-CO")}
                </p>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-black/80">{note.content}</p>
            </article>
          ))
        ) : (
          <p className="rounded-3xl border border-dashed border-black/10 bg-canvas px-5 py-4 text-sm text-black/60">
            Aún no hay notas internas para esta orden.
          </p>
        )}
      </div>
    </section>
  );
}
