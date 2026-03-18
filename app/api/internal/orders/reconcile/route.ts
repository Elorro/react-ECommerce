import { NextResponse } from "next/server";
import { getRequestId, logEvent, withRequestIdHeaders } from "@/lib/logger";
import { recordOperationalEvent } from "@/lib/observability";
import { expireStalePendingOrders } from "@/lib/orders";

function isAuthorized(request: Request) {
  const configured = process.env.INTERNAL_JOB_SECRET;

  if (!configured) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  return bearer === `Bearer ${configured}`;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isAuthorized(request)) {
    logEvent("WARN", "orders.reconcile.unauthorized", { requestId });
    await recordOperationalEvent({
      level: "WARN",
      scope: "orders.reconcile",
      message: "Unauthorized reconcile attempt",
      requestId,
      route: "/api/internal/orders/reconcile",
    });
    return NextResponse.json(
      { error: "Unauthorized" },
      withRequestIdHeaders({ status: 401 }, requestId),
    );
  }

  const result = await expireStalePendingOrders();
  logEvent("INFO", "orders.reconcile.completed", {
    requestId,
    expiredCount: result.expiredCount,
  });
  await recordOperationalEvent({
    level: "INFO",
    scope: "orders.reconcile",
    message: "Pending orders reconciled",
    requestId,
    route: "/api/internal/orders/reconcile",
    metadata: {
      expiredCount: result.expiredCount,
    },
  });

  return NextResponse.json(result, withRequestIdHeaders({ status: 200 }, requestId));
}
