export function parsePage(value?: string, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function getPagination(params: { page: number; pageSize: number; totalItems: number }) {
  const totalPages = Math.max(1, Math.ceil(params.totalItems / params.pageSize));
  const currentPage = Math.min(params.page, totalPages);

  return {
    currentPage,
    totalPages,
    pageSize: params.pageSize,
    skip: (currentPage - 1) * params.pageSize,
    take: params.pageSize,
  };
}
