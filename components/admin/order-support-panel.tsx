"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast-provider";

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
  const { pushToast } = useToast();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo guardar la nota interna." });
      return;
    }

    const note = (await response.json()) as SupportNote;
    setNotes((current) => [note, ...current]);
    setContent("");
    pushToast({ tone: "success", message: "Nota interna guardada." });
  };

  const onRefund = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRefunding(true);

    const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: refundReason,
      }),
    });

    setRefunding(false);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo registrar el reembolso." });
      return;
    }

    setRefundReason("");
    pushToast({ tone: "success", message: "Reembolso registrado y orden cancelada." });
    router.refresh();
  };

  const onReturnAction = async (
    event: React.FormEvent<HTMLFormElement>,
    action: "REQUEST" | "RECEIVE" | "REFUND",
  ) => {
    event.preventDefault();
    setManagingReturn(true);

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

    setManagingReturn(false);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo actualizar la devolución." });
      return;
    }

    if (action === "REQUEST") {
      setReturnReason("");
      pushToast({ tone: "success", message: "Devolución solicitada." });
    } else if (action === "RECEIVE") {
      pushToast({ tone: "success", message: "Devolución recibida." });
    } else {
      setRefundReason("");
      pushToast({ tone: "success", message: "Devolución reembolsada." });
    }

    router.refresh();
  };

  return (
    <section className="space-y-4 rounded-[2rem] border border-black/5 bg-white/85 p-6 shadow-card">
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
          Accion comercial
        </p>
        <p className="mt-2 text-sm text-black/70">
          Estado actual: {status} · Pago: {paymentStatus} · Devolución: {returnStatus}
        </p>
        {canRefund ? (
          <form onSubmit={onRefund} className="mt-4 space-y-3">
            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              rows={3}
              placeholder="Motivo del reembolso para auditoria y soporte interno"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
            />
            <button
              type="submit"
              disabled={refunding || managingReturn || refundReason.trim().length < 5}
              className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refunding ? "Procesando reembolso..." : "Reembolsar y cancelar orden"}
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-black/10 bg-white px-4 py-3 text-sm text-black/60">
            El reembolso solo se habilita para órdenes cobradas que aún no fueron fulfilled.
          </p>
        )}

        {canManageReturns ? (
          <div className="mt-4 space-y-3">
            {returnStatus === "NONE" && status === "FULFILLED" && paymentStatus === "PAID" ? (
              <form onSubmit={(event) => void onReturnAction(event, "REQUEST")} className="space-y-3">
                <textarea
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  rows={3}
                  placeholder="Motivo de la devolución posterior al fulfillment"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
                />
                <button
                  type="submit"
                  disabled={managingReturn || returnReason.trim().length < 5}
                  className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {managingReturn ? "Registrando..." : "Solicitar devolución"}
                </button>
              </form>
            ) : null}

            {returnStatus === "REQUESTED" ? (
              <form onSubmit={(event) => void onReturnAction(event, "RECEIVE")}>
                <button
                  type="submit"
                  disabled={managingReturn}
                  className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {managingReturn ? "Actualizando..." : "Marcar devolución recibida"}
                </button>
              </form>
            ) : null}

            {returnStatus === "RECEIVED" && paymentStatus === "PAID" ? (
              <form onSubmit={(event) => void onReturnAction(event, "REFUND")} className="space-y-3">
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={3}
                  placeholder="Motivo del reembolso asociado a la devolución"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3"
                />
                <button
                  type="submit"
                  disabled={managingReturn || refundReason.trim().length < 5}
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
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={4}
          placeholder="Añade contexto operativo, decisiones o incidencias de esta orden"
          className="w-full rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        />
        <button
          type="submit"
          disabled={saving || refunding || managingReturn || content.trim().length < 3}
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
                  {note.author.name || note.author.email || note.author.id}
                </p>
                <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black/60">
                  {note.author.role}
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
