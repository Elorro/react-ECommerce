import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearUserCart, getUserCart, mergeUserCart, syncUserCart } from "@/lib/cart";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { rateLimitByIp } from "@/lib/rate-limit";
import { cartMergeSchema, cartSyncSchema } from "@/lib/validators/cart";

async function requireSession(request: Request, requestId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const rateLimit = rateLimitByIp(request, "cart:mutations", {
    limit: 30,
    windowMs: 60_000,
  });

  return {
    session,
    rateLimit,
  };
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication is required." },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  const items = await getUserCart(session.user.id);

  return NextResponse.json({ items }, withRequestIdHeaders(undefined, requestId));
}

export async function PUT(request: Request) {
  const requestId = getRequestId(request);
  const result = await requireSession(request, requestId);

  if (!result?.session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication is required." },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  if (!result.rateLimit.success) {
    return NextResponse.json(
      { error: "Too many cart updates. Try again in a minute." },
      withRequestIdHeaders({ status: 429 }, requestId),
    );
  }

  try {
    const rawBody = await request.text();
    const payload = cartSyncSchema.parse(rawBody ? JSON.parse(rawBody) : { items: [] });
    const items = await syncUserCart(result.session.user.id, payload);

    return NextResponse.json({ items }, withRequestIdHeaders(undefined, requestId));
  } catch (error) {
    logEvent("ERROR", "cart.sync.failed", {
      requestId,
      userId: result.session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Unable to sync cart." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const result = await requireSession(request, requestId);

  if (!result?.session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication is required." },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  if (!result.rateLimit.success) {
    return NextResponse.json(
      { error: "Too many cart updates. Try again in a minute." },
      withRequestIdHeaders({ status: 429 }, requestId),
    );
  }

  try {
    const rawBody = await request.text();
    const payload = cartMergeSchema.parse(rawBody ? JSON.parse(rawBody) : { items: [] });
    const items = await mergeUserCart(result.session.user.id, payload);

    return NextResponse.json({ items }, withRequestIdHeaders({ status: 201 }, requestId));
  } catch (error) {
    logEvent("ERROR", "cart.merge.failed", {
      requestId,
      userId: result.session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Unable to merge cart." },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}

export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  const result = await requireSession(request, requestId);

  if (!result?.session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication is required." },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  await clearUserCart(result.session.user.id);

  return NextResponse.json({ items: [] }, withRequestIdHeaders(undefined, requestId));
}
