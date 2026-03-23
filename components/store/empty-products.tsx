import Link from "next/link";

export function EmptyProducts() {
  return (
    <section className="rounded-[1.75rem] border border-dashed border-black/15 bg-white/70 p-10 text-center shadow-card">
      <h2 className="font-display text-3xl">No hay resultados</h2>
      <p className="mt-3 text-black/65">
        No encontramos productos con esos filtros. Ajusta la búsqueda o vuelve al catálogo
        completo.
      </p>
      <Link
        href="/catalog"
        className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Ver todo el catálogo
      </Link>
    </section>
  );
}
