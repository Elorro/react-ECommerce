import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const getAdminDashboardMetricsMock = vi.fn();
const getAdminOrderMetricsMock = vi.fn();
const getObservabilityMetricsMock = vi.fn();
const getOperationalAlertsMock = vi.fn();
const listAdminAuditEventsMock = vi.fn();

vi.mock("@/lib/admin", () => ({
  requirePermission: requireAdminMock,
}));

vi.mock("@/lib/catalog", () => ({
  getAdminDashboardMetrics: getAdminDashboardMetricsMock,
}));

vi.mock("@/lib/orders", () => ({
  getAdminOrderMetrics: getAdminOrderMetricsMock,
}));

vi.mock("@/lib/observability", () => ({
  getObservabilityMetrics: getObservabilityMetricsMock,
  getOperationalAlerts: getOperationalAlertsMock,
  listAdminAuditEvents: listAdminAuditEventsMock,
}));

describe("admin dashboard page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("renders core admin metrics and quick links", async () => {
    requireAdminMock.mockResolvedValue({
      user: {
        role: "ADMIN",
      },
    });
    getAdminDashboardMetricsMock.mockResolvedValue({
      products: 20,
      activeProducts: 16,
      categories: 5,
      totalStock: 90,
      featuredProducts: 4,
    });
    getAdminOrderMetricsMock.mockResolvedValue({
      totalOrders: 12,
      pendingOrders: 3,
      paidOrders: 9,
      fulfilledOrders: 7,
      failedPayments: 1,
      requiresActionOrders: 2,
      canceledOrders: 1,
      paidRevenue: 1340,
    });
    getObservabilityMetricsMock.mockResolvedValue({
      total: {
        errors: 1,
        warnings: 3,
        info: 12,
      },
      last24Hours: {
        errors: 1,
        warnings: 3,
        paymentFailures: 1,
        rateLimits: 2,
      },
      stalePendingPayments: 0,
      auditEvents24h: 4,
      topErrorScopes: [],
      recentErrors: [],
    });
    getOperationalAlertsMock.mockResolvedValue([]);
    listAdminAuditEventsMock.mockResolvedValue([]);

    const { default: AdminDashboardPage } = await import("@/app/admin/page");
    render(await AdminDashboardPage());

    expect(screen.getByText("Dashboard operativo")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("$1340.00")).toBeInTheDocument();
    expect(screen.getByText("Exportar productos CSV")).toBeInTheDocument();
    expect(screen.getByText("Requieren acción")).toBeInTheDocument();
  });
});
