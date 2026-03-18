"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  productCount: number;
};

const initialForm = {
  name: "",
  slug: "",
  imageUrl: "",
};

export function AdminCategoriesTable({
  categories,
  filters,
}: {
  categories: AdminCategory[];
  filters: {
    q?: string;
    totalItems: number;
  };
}) {
  const [state, setState] = useState(categories);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const { pushToast } = useToast();

  const updateRow = (id: string, patch: Partial<AdminCategory>) => {
    setState((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const create = async () => {
    setCreating(true);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo crear la categoría." });
      return;
    }

    const { id } = (await response.json()) as { id: string };
    setState((current) => [
      {
        id,
        name: form.name,
        slug: form.slug,
        imageUrl: form.imageUrl,
        productCount: 0,
      },
      ...current,
    ]);
    setForm(initialForm);
    pushToast({ tone: "success", message: "Categoría creada." });
  };

  const save = async (category: AdminCategory) => {
    setSavingId(category.id);
    const response = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
      }),
    });
    setSavingId(null);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo guardar la categoría." });
      return;
    }

    pushToast({ tone: "success", message: `Categoría ${category.name} actualizada.` });
  };

  const remove = async (categoryId: string) => {
    const response = await fetch(`/api/admin/categories/${categoryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo eliminar la categoría." });
      return;
    }

    setState((current) => current.filter((item) => item.id !== categoryId));
    pushToast({ tone: "success", message: "Categoría eliminada." });
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-card">
        <form action="/admin/categories" className="grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Buscar categoría por nombre o slug"
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          />
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-ink">
            {filters.totalItems} categorías
          </span>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-black/5 bg-pine p-5 text-white md:grid-cols-[1fr_1fr_1.4fr_auto]">
        <label className="text-sm font-medium">
          Nombre
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Slug
          <input
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          URL de imagen
          <input
            value={form.imageUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {creating ? "Creando..." : "Crear categoria"}
          </button>
        </div>
      </section>

      <div className="grid gap-4">
        {state.map((category) => (
          <article
            key={category.id}
            className="grid gap-4 rounded-3xl border border-black/5 bg-canvas p-5 md:grid-cols-[1fr_1fr_1.5fr_auto_auto_auto]"
          >
            <label className="text-sm font-medium">
              Nombre
              <input
                value={category.name}
                onChange={(event) => updateRow(category.id, { name: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Slug
              <input
                value={category.slug}
                onChange={(event) => updateRow(category.id, { slug: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Imagen
              <input
                value={category.imageUrl}
                onChange={(event) => updateRow(category.id, { imageUrl: event.target.value })}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
              />
            </label>
            <div className="flex items-end text-sm font-medium text-black/55">
              {category.productCount} productos
            </div>
            <button
              type="button"
              onClick={() => save(category)}
              disabled={savingId === category.id}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingId === category.id ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => remove(category.id)}
              className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand"
            >
              Eliminar
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
