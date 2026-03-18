import Link from "next/link";

export function PaginationLinks({
  currentPage,
  totalPages,
  basePath,
  query,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  query: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (page: number) => {
    const search = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });

    if (page > 1) {
      search.set("page", String(page));
    }

    const queryString = search.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  return (
    <nav aria-label="Paginacion" className="flex flex-wrap items-center gap-3">
      <Link
        href={buildHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-40"
      >
        Anterior
      </Link>
      <span className="text-sm text-black/60">
        Pagina {currentPage} de {totalPages}
      </span>
      <Link
        href={buildHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold aria-disabled:pointer-events-none aria-disabled:opacity-40"
      >
        Siguiente
      </Link>
    </nav>
  );
}
