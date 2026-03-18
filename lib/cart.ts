import { db } from "@/lib/db";
import type { CartSyncPayload } from "@/lib/validators/cart";

type PersistedCartProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  price: number;
  stock: number;
  quantity: number;
};

function serializeCartItems(
  items: Array<{
    quantity: number;
    product: {
      id: string;
      slug: string;
      name: string;
      imageUrl: string;
      price: { toNumber(): number } | number;
      stock: number;
    };
  }>,
): PersistedCartProduct[] {
  return items.map((item) => ({
    id: item.product.id,
    slug: item.product.slug,
    name: item.product.name,
    imageUrl: item.product.imageUrl,
    price:
      typeof item.product.price === "number" ? item.product.price : item.product.price.toNumber(),
    stock: item.product.stock,
    quantity: item.quantity,
  }));
}

async function getOrCreateUserCart(userId: string) {
  return db.cart.upsert({
    where: {
      userId,
    },
    update: {},
    create: {
      userId,
    },
  });
}

async function normalizeCartItems(input: CartSyncPayload["items"]) {
  if (!input.length) {
    return [];
  }

  const products = await db.product.findMany({
    where: {
      id: {
        in: input.map((item) => item.productId),
      },
      status: "ACTIVE",
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  return input
    .map((item) => {
      const product = productMap.get(item.productId);

      if (!product || product.stock < 1) {
        return null;
      }

      return {
        productId: product.id,
        quantity: Math.max(1, Math.min(item.quantity, product.stock, 20)),
      };
    })
    .filter((item): item is { productId: string; quantity: number } => item !== null);
}

export async function getUserCart(userId: string) {
  const cart = await db.cart.findUnique({
    where: {
      userId,
    },
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!cart) {
    return [];
  }

  return serializeCartItems(cart.items);
}

export async function syncUserCart(userId: string, payload: CartSyncPayload) {
  const cart = await getOrCreateUserCart(userId);
  const normalizedItems = await normalizeCartItems(payload.items);

  await db.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    if (normalizedItems.length) {
      await tx.cartItem.createMany({
        data: normalizedItems.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }
  });

  return getUserCart(userId);
}

export async function mergeUserCart(userId: string, payload: CartSyncPayload) {
  const currentItems = await getUserCart(userId);
  const mergedItems = new Map<string, number>();

  for (const item of currentItems) {
    mergedItems.set(item.id, item.quantity);
  }

  for (const item of payload.items) {
    mergedItems.set(item.productId, (mergedItems.get(item.productId) ?? 0) + item.quantity);
  }

  return syncUserCart(userId, {
    items: Array.from(mergedItems.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
  });
}

export async function clearUserCart(userId: string) {
  const cart = await db.cart.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!cart) {
    return [];
  }

  await db.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });

  return [];
}
