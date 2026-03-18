import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    items?: Array<{
      slug: string;
      quantity: number;
    }>;
  };

  if (!body.items?.length) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const products = await db.product.findMany({
    where: {
      slug: {
        in: body.items.map((item) => item.slug),
      },
      status: "ACTIVE",
    },
  });
  const productMap = new Map(products.map((product) => [product.slug, product]));

  const items = body.items
    .map((item) => {
      const product = productMap.get(item.slug);

      if (!product || product.stock < 1) {
        return null;
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        price: Number(product.price),
        stock: product.stock,
        quantity: Math.max(1, Math.min(item.quantity, product.stock)),
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        slug: string;
        name: string;
        imageUrl: string;
        price: number;
        stock: number;
        quantity: number;
      } => item !== null,
    );

  return NextResponse.json({ items }, { status: 200 });
}
