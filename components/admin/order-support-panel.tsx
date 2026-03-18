"use client";

import { useState } from "react";
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
}: {
  orderId: string;
  initialNotes: SupportNote[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
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
          disabled={saving || content.trim().length < 3}
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
