import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncUserCart } from "@/lib/cart";
import type { AppRole } from "@/lib/permissions";

const SESSION_COOKIE_NAME = "next-auth.session-token";

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
    role?: AppRole;
    name?: string;
    cartItems?: Array<{
      slug: string;
      quantity: number;
    }>;
  };

  const role: AppRole =
    body.role === "ADMIN" || body.role === "OPERATIONS" ? body.role : "CUSTOMER";

  const user = await db.user.upsert({
    where: {
      email: body.email,
    },
    update: {
      role,
      name: body.name ?? body.email.split("@")[0],
    },
    create: {
      email: body.email,
      role,
      name: body.name ?? body.email.split("@")[0],
    },
  });

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  if (body.cartItems) {
    const products = await db.product.findMany({
      where: {
        slug: {
          in: body.cartItems.map((item) => item.slug),
        },
        status: "ACTIVE",
      },
    });
    const productMap = new Map(products.map((product) => [product.slug, product]));
    const normalizedItems = body.cartItems
      .map((item) => {
        const product = productMap.get(item.slug);

        if (!product || product.stock < 1) {
          return null;
        }

        return {
          productId: product.id,
          quantity: Math.max(1, Math.min(item.quantity, product.stock)),
        };
      })
      .filter((item): item is { productId: string; quantity: number } => item !== null);

    await syncUserCart(user.id, {
      items: normalizedItems,
    });
  }

  const response = NextResponse.json(
    {
      ok: true,
      userId: user.id,
      role,
      sessionToken,
      expires: expires.toISOString(),
      cartItemCount: body.cartItems?.length ?? 0,
    },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    expires,
    path: "/",
  });

  return response;
}
