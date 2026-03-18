import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mergeUserCart, syncUserCart } from "@/lib/cart";

function isEnabled(request: Request) {
  return (
    Boolean(process.env.E2E_TEST_SECRET) &&
    request.headers.get("x-e2e-secret") === process.env.E2E_TEST_SECRET
  );
}

export async function POST(request: Request) {
  if (!isEnabled(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    email: string;
    mode?: "sync" | "merge";
    items?: Array<{
      productId?: string;
      slug?: string;
      quantity: number;
    }>;
  };

  const user = await db.user.findUnique({
    where: {
      email: body.email,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const requestedItems = Array.isArray(body.items) ? body.items : [];
  const slugItems = requestedItems.filter((item) => item.slug);
  const slugProducts = slugItems.length
    ? await db.product.findMany({
        where: {
          slug: {
            in: slugItems.map((item) => item.slug as string),
          },
          status: "ACTIVE",
        },
        select: {
          id: true,
          slug: true,
          stock: true,
        },
      })
    : [];
  const slugProductMap = new Map(slugProducts.map((product) => [product.slug, product]));

  const payload = {
    items: requestedItems
      .map((item) => {
        if (item.productId) {
          return {
            productId: item.productId,
            quantity: item.quantity,
          };
        }

        const product = item.slug ? slugProductMap.get(item.slug) : null;

        if (!product) {
          return null;
        }

        return {
          productId: product.id,
          quantity: Math.max(1, Math.min(item.quantity, product.stock)),
        };
      })
      .filter((item): item is { productId: string; quantity: number } => item !== null),
  };

  const items =
    body.mode === "merge"
      ? await mergeUserCart(user.id, payload)
      : await syncUserCart(user.id, payload);

  return NextResponse.json({ items }, { status: 200 });
}
