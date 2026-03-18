import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordOperationalEvent } from "@/lib/observability";
import { orderCheckoutSchema } from "@/lib/validators/order";
import { createOrder } from "@/lib/orders";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    logEvent("WARN", "orders.create.unauthorized", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "orders.create",
      message: "Unauthorized order creation attempt",
      requestId,
      route: "/api/orders",
    });
    return NextResponse.json(
      { error: "Authentication is required." },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  const rateLimit = rateLimitByIp(request, "orders:create", {
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.success) {
    logEvent("WARN", "orders.create.rate_limited", {
      requestId,
      userId: session.user.id,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    await recordOperationalEvent({
      level: "WARN",
      scope: "orders.create",
      message: "Rate limit reached during order creation",
      requestId,
      route: "/api/orders",
      userId: session.user.id,
      metadata: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
    });
    return NextResponse.json(
      { error: "Too many checkout attempts. Try again in a minute." },
      withRequestIdHeaders({
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }, requestId),
    );
  }

  try {
    const json = await request.json();
    const payload = orderCheckoutSchema.parse(json);
    const order = await createOrder(payload, {
      userId: session.user.id,
      userEmail: session.user.email,
    });

    logEvent("INFO", "orders.create.success", {
      requestId,
      userId: session.user.id,
      orderId: order.id,
    });
    await recordOperationalEvent({
      level: "INFO",
      scope: "orders.create",
      message: "Order created successfully",
      requestId,
      route: "/api/orders",
      userId: session.user.id,
      orderId: order.id,
    });

    return NextResponse.json(
      {
        orderId: order.id,
      },
      withRequestIdHeaders({ status: 201 }, requestId),
    );
  } catch (error) {
    logEvent("ERROR", "orders.create.failed", {
      requestId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    await recordOperationalEvent({
      level: "ERROR",
      scope: "orders.create",
      message: "Order creation failed",
      requestId,
      route: "/api/orders",
      userId: session.user.id,
      metadata: {
        error: error instanceof Error ? error.message : "unknown",
      },
    });

    return NextResponse.json(
      {
        error: "Unable to create order with the provided information.",
      },
      withRequestIdHeaders({ status: 400 }, requestId),
    );
  }
}
