import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPagination } from "@/lib/pagination";

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  productCount: number;
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  stock: number;
  categoryName: string;
};

type CatalogFilters = {
  q?: string;
  category?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
  page?: number;
};

export async function getHomepageCategories(): Promise<CategoryCard[]> {
  const categories = await db.category.findMany({
    include: {
      products: {
        select: { id: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
    productCount: category.products.length,
  }));
}

export async function getFeaturedProducts(): Promise<ProductCard[]> {
  const products = await db.product.findMany({
    take: 8,
    include: {
      category: true,
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return products.map(mapProductCard);
}

export async function getAllProducts(filters: CatalogFilters = {}) {
  const query = filters.q?.trim();
  const where = {
    status: "ACTIVE" as const,
    ...(filters.category
      ? {
          category: {
            slug: filters.category,
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            {
              name: {
                contains: query,
              },
            },
            {
              description: {
                contains: query,
              },
            },
          ],
        }
      : {}),
  };
  const totalItems = await db.product.count({ where });
  const { currentPage, totalPages, skip, take } = getPagination({
    page: filters.page ?? 1,
    pageSize: 12,
    totalItems,
  });
  const products = await db.product.findMany({
    where,
    include: {
      category: true,
    },
    skip,
    take,
    orderBy:
      filters.sort === "price-asc"
        ? [{ price: "asc" }]
        : filters.sort === "price-desc"
          ? [{ price: "desc" }]
          : filters.sort === "featured"
            ? [{ featured: "desc" }, { name: "asc" }]
            : [{ category: { name: "asc" } }, { name: "asc" }],
  });

  return {
    items: products.map(mapProductCard),
    totalItems,
    currentPage,
    totalPages,
  };
}

export async function getAdminProducts(filters: {
  page: number;
  q?: string;
  categoryId?: string;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
}) {
  const query = filters.q?.trim();
  const where = {
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
          ],
        }
      : {}),
  };
  const totalItems = await db.product.count({ where });
  const { currentPage, totalPages, skip, take } = getPagination({
    page: filters.page,
    pageSize: 10,
    totalItems,
  });
  const products = await db.product.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    skip,
    take,
  });

  return {
    items: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      stock: product.stock,
      featured: product.featured,
      status: product.status,
      price: Number(product.price),
      categoryName: product.category.name,
    })),
    totalItems,
    currentPage,
    totalPages,
  };
}

export async function getAdminCategories() {
  return db.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  }).then((categories) =>
    categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      productCount: category._count.products,
    })),
  );
}

export async function getAdminCategoriesPage(filters: { page: number; q?: string }) {
  const query = filters.q?.trim();
  const where = {
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
          ],
        }
      : {}),
  };
  const totalItems = await db.category.count({ where });
  const { currentPage, totalPages, skip, take } = getPagination({
    page: filters.page,
    pageSize: 10,
    totalItems,
  });
  const categories = await db.category.findMany({
    where,
    orderBy: {
      name: "asc",
    },
    skip,
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return {
    items: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      productCount: category._count.products,
    })),
    totalItems,
    currentPage,
    totalPages,
  };
}

export async function getAdminDashboardMetrics() {
  const [products, activeProducts, categories, totalStock, featuredProducts] = await Promise.all([
    db.product.count(),
    db.product.count({
      where: {
        status: "ACTIVE",
      },
    }),
    db.category.count(),
    db.product.aggregate({
      _sum: {
        stock: true,
      },
    }),
    db.product.count({
      where: {
        featured: true,
      },
    }),
  ]);

  return {
    products,
    activeProducts,
    categories,
    totalStock: totalStock._sum.stock ?? 0,
    featuredProducts,
  };
}

export async function getCatalogFilters() {
  return db.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: true,
    },
  });

  if (!product) {
    return null;
  }

  return {
    ...mapProductCard(product),
    description: product.description,
  };
}

function mapProductCard(product: {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: Prisma.Decimal;
  stock: number;
  category: { name: string };
}) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    imageUrl: product.imageUrl,
    price: Number(product.price),
    stock: product.stock,
    categoryName: product.category.name,
  };
}
