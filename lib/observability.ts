import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPagination } from "@/lib/pagination";
import { logEvent } from "@/lib/logger";

type OperationalEventInput = {
  level: "INFO" | "WARN" | "ERROR";
  scope: string;
  message: string;
  requestId?: string;
  route?: string;
  userId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

function isTestRuntime() {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

export async function recordOperationalEvent(input: OperationalEventInput) {
  try {
    await db.operationalLog.create({
      data: {
        level: input.level,
        scope: input.scope,
        message: input.message,
        requestId: input.requestId,
        route: input.route,
        userId: input.userId,
        orderId: input.orderId,
        metadata: input.metadata
          ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (error) {
    if (isTestRuntime()) {
      return;
    }

    logEvent("ERROR", "observability.persist.failed", {
      scope: input.scope,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function recordAdminAuditEvent(input: {
  actorUserId: string;
  action: string;
  route: string;
  requestId?: string;
  targetType: "product" | "category" | "order" | "export";
  targetIds?: string[];
  metadata?: Record<string, unknown>;
}) {
  await recordOperationalEvent({
    level: "INFO",
    scope: `audit.admin.${input.action}`,
    message: `Admin action: ${input.action}`,
    requestId: input.requestId,
    route: input.route,
    userId: input.actorUserId,
    metadata: {
      targetType: input.targetType,
      targetIds: input.targetIds ?? [],
      ...input.metadata,
    },
  });
}

export async function listAdminAuditEvents(limit = 8) {
  const events = await db.operationalLog.findMany({
    where: {
      scope: {
        startsWith: "audit.admin.",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return events.map((event) => ({
    id: event.id,
    scope: event.scope,
    message: event.message,
    route: event.route,
    userId: event.userId,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  }));
}

export async function listOperationalEvents(filters: {
  page: number;
  level?: "INFO" | "WARN" | "ERROR";
  scope?: string;
}) {
  const pageSize = 12;
  const where = {
    ...(filters.level ? { level: filters.level } : {}),
    ...(filters.scope
      ? {
          scope: {
            contains: filters.scope,
          },
        }
      : {}),
  };

  const totalItems = await db.operationalLog.count({ where });
  const { currentPage, totalPages, skip, take } = getPagination({
    page: filters.page,
    pageSize,
    totalItems,
  });

  const events = await db.operationalLog.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take,
  });

  return {
    items: events.map((event) => ({
      id: event.id,
      level: event.level,
      scope: event.scope,
      message: event.message,
      requestId: event.requestId,
      route: event.route,
      userId: event.userId,
      orderId: event.orderId,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    })),
    totalItems,
    currentPage,
    totalPages,
  };
}

export async function getObservabilityMetrics() {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [
    errors,
    warnings,
    info,
    recentErrors,
    errors24h,
    warnings24h,
    paymentFailures24h,
    rateLimits24h,
    stalePendingPayments,
    topErrorScopes,
    auditEvents24h,
  ] =
    await Promise.all([
    db.operationalLog.count({
      where: {
        level: "ERROR",
      },
    }),
    db.operationalLog.count({
      where: {
        level: "WARN",
      },
    }),
    db.operationalLog.count({
      where: {
        level: "INFO",
      },
    }),
    db.operationalLog.findMany({
      where: {
        level: "ERROR",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    db.operationalLog.count({
      where: {
        level: "ERROR",
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
    db.operationalLog.count({
      where: {
        level: "WARN",
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
    db.operationalLog.count({
      where: {
        level: "ERROR",
        scope: {
          startsWith: "payments.",
        },
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
    db.operationalLog.count({
      where: {
        level: "WARN",
        message: {
          contains: "Rate limit",
        },
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
    db.order.count({
      where: {
        paymentStatus: "REQUIRES_ACTION",
        paymentExpiresAt: {
          lte: now,
        },
      },
    }),
    db.operationalLog.groupBy({
      by: ["scope"],
      where: {
        level: "ERROR",
        createdAt: {
          gte: last24Hours,
        },
      },
      _count: {
        scope: true,
      },
      orderBy: {
        _count: {
          scope: "desc",
        },
      },
      take: 5,
    }),
    db.operationalLog.count({
      where: {
        scope: {
          startsWith: "audit.admin.",
        },
        createdAt: {
          gte: last24Hours,
        },
      },
    }),
  ]);

  return {
    total: {
      errors,
      warnings,
      info,
    },
    last24Hours: {
      errors: errors24h,
      warnings: warnings24h,
      paymentFailures: paymentFailures24h,
      rateLimits: rateLimits24h,
    },
    stalePendingPayments,
    auditEvents24h,
    topErrorScopes: topErrorScopes.map((entry) => ({
      scope: entry.scope,
      count: entry._count.scope,
    })),
    recentErrors: recentErrors.map((event) => ({
      id: event.id,
      scope: event.scope,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function getOperationalAlerts(
  metricsInput?: Awaited<ReturnType<typeof getObservabilityMetrics>>,
) {
  const metrics = metricsInput ?? (await getObservabilityMetrics());
  const alerts: Array<{
    severity: "warn" | "critical";
    title: string;
    description: string;
  }> = [];

  if (metrics.stalePendingPayments > 0) {
    alerts.push({
      severity: "critical",
      title: "Órdenes pendientes ya vencidas",
      description: `${metrics.stalePendingPayments} órdenes siguen en REQUIRES_ACTION aunque ya pasaron su ventana de pago.`,
    });
  }

  if (metrics.last24Hours.paymentFailures >= 3) {
    alerts.push({
      severity: "critical",
      title: "Fallos de pago elevados en 24h",
      description: `${metrics.last24Hours.paymentFailures} errores de pago fueron registrados en las últimas 24 horas.`,
    });
  }

  if (metrics.last24Hours.rateLimits >= 5) {
    alerts.push({
      severity: "warn",
      title: "Picos de rate limit",
      description: `${metrics.last24Hours.rateLimits} eventos rate-limited sugieren abuso o fricción anómala en rutas públicas.`,
    });
  }

  if (metrics.last24Hours.errors > 0) {
    alerts.push({
      severity: "warn",
      title: "Errores recientes en operación",
      description: `${metrics.last24Hours.errors} errores fueron persistidos durante las últimas 24 horas.`,
    });
  }

  if (metrics.auditEvents24h > 30) {
    alerts.push({
      severity: "warn",
      title: "Actividad administrativa inusual",
      description: `${metrics.auditEvents24h} acciones admin fueron auditadas en las últimas 24 horas.`,
    });
  }

  return alerts;
}
