"use client";

import React from "react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast-provider";

type AdminProduct = {
  id: string;
  name: string;
  categoryName: string;
  stock: number;
  featured: boolean;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  price: number;
  slug: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
};

type AdminCategory = {
  id: string;
  name: string;
};

const initialForm = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  price: 1,
  stock: 0,
  featured: false,
  status: "DRAFT" as AdminProduct["status"],
  categoryId: "",
};

export function AdminProductsTable({
  products,
  categories,
  filters,
}: {
  products: AdminProduct[];
  categories: AdminCategory[];
  filters: {
    q?: string;
    categoryId?: string;
    status?: AdminProduct["status"];
    totalItems: number;
  };
}) {
  const [state, setState] = useState(products);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const { pushToast } = useToast();

  const updateRow = (id: string, patch: Partial<AdminProduct>) => {
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

  const save = async (product: AdminProduct) => {
    setSavingId(product.id);
    const response = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stock: product.stock,
        featured: product.featured,
        status: product.status,
      }),
    });
    setSavingId(null);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo guardar el producto." });
      return;
    }

    pushToast({ tone: "success", message: `Producto ${product.name} actualizado.` });
  };

  const remove = async (productId: string) => {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo eliminar el producto." });
      return;
    }

    setState((current) => current.filter((item) => item.id !== productId));
    setSelectedIds((current) => current.filter((item) => item !== productId));
    pushToast({ tone: "success", message: "Producto eliminado." });
  };

  const create = async () => {
    setCreating(true);
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    setCreating(false);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo crear el producto." });
      return;
    }

    const { id } = (await response.json()) as { id: string };
    const categoryName = categories.find((category) => category.id === form.categoryId)?.name || "Sin categoría";
    setState((current) => [
      {
        id,
        name: form.name,
        slug: form.slug,
        description: form.description,
        imageUrl: form.imageUrl,
        price: form.price,
        stock: form.stock,
        featured: form.featured,
        status: form.status,
        categoryId: form.categoryId,
        categoryName,
      },
      ...current,
    ]);
    setForm(initialForm);
    pushToast({ tone: "success", message: "Producto creado." });
  };

  const runBulkAction = async (action: "FEATURE" | "UNFEATURE" | "ARCHIVE" | "ACTIVATE") => {
    if (!selectedIds.length) {
      pushToast({ tone: "error", message: "Selecciona al menos un producto." });
      return;
    }

    setBulkSaving(true);
    const response = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: selectedIds,
        action,
      }),
    });
    setBulkSaving(false);

    if (!response.ok) {
      pushToast({ tone: "error", message: "No se pudo ejecutar la acción masiva." });
      return;
    }

    setState((current) =>
      current.map((item) =>
        selectedIds.includes(item.id)
          ? {
              ...item,
              featured:
                action === "FEATURE" ? true : action === "UNFEATURE" ? false : item.featured,
              status:
                action === "ARCHIVE" ? "ARCHIVED" : action === "ACTIVATE" ? "ACTIVE" : item.status,
            }
          : item,
      ),
    );
    setSelectedIds([]);
    pushToast({ tone: "success", message: `Se actualizaron ${selectedIds.length} productos.` });
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-card lg:grid-cols-[1.4fr_1fr_1fr_auto]">
        <form action="/admin/products" className="grid gap-4 md:col-span-4 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Buscar por nombre o slug"
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          />
          <select
            name="categoryId"
            defaultValue={filters.categoryId ?? ""}
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          >
            <option value="">Todas las categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
          <span className="rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-ink">
            {filters.totalItems} productos
          </span>
          <button
            type="button"
            onClick={() => runBulkAction("FEATURE")}
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Destacar selección
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("UNFEATURE")}
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Quitar destacados
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("ACTIVATE")}
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Activar
          </button>
          <button
            type="button"
            onClick={() => runBulkAction("ARCHIVE")}
            disabled={bulkSaving}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Archivar
          </button>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-black/5 bg-pine p-5 text-white md:grid-cols-2 xl:grid-cols-4">
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
        <label className="text-sm font-medium">
          Categoria
          <select
            value={form.categoryId}
            onChange={(event) =>
              setForm((current) => ({ ...current, categoryId: event.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          >
            <option value="">Selecciona</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Descripcion
          <textarea
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Precio
          <input
            type="number"
            min={1}
            value={form.price}
            onChange={(event) =>
              setForm((current) => ({ ...current, price: Number(event.target.value) }))
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Stock inicial
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(event) =>
              setForm((current) => ({ ...current, stock: Number(event.target.value) }))
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2"
          />
        </label>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) =>
                setForm((current) => ({ ...current, featured: event.target.checked }))
              }
            />
            Destacado
          </label>
          <button
            type="button"
            onClick={create}
            disabled={creating}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {creating ? "Creando..." : "Crear producto"}
          </button>
        </div>
      </section>

      <div className="grid gap-4">
        <label className="flex items-center gap-3 text-sm font-medium text-black/65">
          <input
            type="checkbox"
            checked={state.length > 0 && selectedIds.length === state.length}
            onChange={toggleAll}
          />
          Seleccionar todos los productos visibles
        </label>
        {state.map((product) => (
          <article
            key={product.id}
            className="grid gap-4 rounded-3xl border border-black/5 bg-canvas p-5 md:grid-cols-[auto_1.6fr_0.8fr_0.8fr_0.8fr_auto_auto]"
          >
            <label className="flex items-center pt-8">
              <input
                type="checkbox"
                checked={selectedIds.includes(product.id)}
                onChange={() => toggleSelection(product.id)}
              />
            </label>
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-black/55">
                {product.categoryName} · ${product.price.toFixed(2)}
              </p>
            </div>

            <label className="text-sm font-medium">
              Stock
              <input
                type="number"
                min={0}
                value={product.stock}
                onChange={(event) => updateRow(product.id, { stock: Number(event.target.value) })}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
              />
            </label>

            <label className="text-sm font-medium">
              Estado
              <select
                value={product.status}
                onChange={(event) =>
                  updateRow(product.id, {
                    status: event.target.value as AdminProduct["status"],
                  })
                }
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>

            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={product.featured}
                onChange={(event) => updateRow(product.id, { featured: event.target.checked })}
              />
              Destacado
            </label>

            <button
              type="button"
              onClick={() => save(product)}
              disabled={savingId === product.id}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingId === product.id ? "Guardando..." : "Guardar"}
            </button>

            <button
              type="button"
              onClick={() => remove(product.id)}
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
