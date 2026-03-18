import React from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/admin";
import { getAdminDashboardMetrics } from "@/lib/catalog";
import {
  getObservabilityMetrics,
  getOperationalAlerts,
  listAdminAuditEvents,
} from "@/lib/observability";
import { getAdminOrderMetrics } from "@/lib/orders";
import { hasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Admin Dashboard | Atelier Commerce",
};

export default async function AdminDashboardPage() {
  const session = await requirePermission("admin.dashboard.view");
  const [catalog, orders, logs, auditEvents] = await Promise.all([
    getAdminDashboardMetrics(),
    getAdminOrderMetrics(),
    getObservabilityMetrics(),
    listAdminAuditEvents(5),
  ]);
  const alerts = await getOperationalAlerts(logs);

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-4xl">Dashboard operativo</h1>
        <p className="max-w-2xl text-black/70">
          Resumen rápido de catálogo, órdenes y salud operativa para no gestionar el negocio a
          ciegas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Productos"
          value={catalog.products}
          detail={`${catalog.activeProducts} activos`}
        />
        <MetricCard
          label="Categorías"
          value={catalog.categories}
          detail={`${catalog.featuredProducts} destacados`}
        />
        <MetricCard
          label="Órdenes"
          value={orders.totalOrders}
          detail={`${orders.pendingOrders} pendientes`}
        />
        <MetricCard
          label="Revenue pagado"
          value={`$${orders.paidRevenue.toFixed(2)}`}
          detail={`${orders.fulfilledOrders} fulfillment`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Errores 24h"
          value={logs.last24Hours.errors}
          detail={`${logs.total.errors} acumulados`}
          tone="danger"
        />
        <MetricCard
          label="Warnings 24h"
          value={logs.last24Hours.warnings}
          detail={`${logs.last24Hours.rateLimits} rate limits`}
          tone="warn"
        />
        <MetricCard
          label="Pagos en riesgo"
          value={logs.stalePendingPayments}
          detail={`${logs.last24Hours.paymentFailures} fallos de pago en 24h`}
          tone={logs.stalePendingPayments > 0 ? "danger" : "neutral"}
        />
        <MetricCard
          label="Requieren acción"
          value={orders.requiresActionOrders}
          detail={`${orders.failedPayments} pagos fallidos`}
          tone={orders.requiresActionOrders > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-black/5 bg-canvas p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Alertas operativas
          </p>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div
                  key={`${alert.severity}-${alert.title}`}
                  className={`rounded-2xl px-4 py-3 ${
                    alert.severity === "critical"
                      ? "bg-red-50 text-red-950"
                      : "bg-amber-50 text-amber-950"
                  }`}
                >
                  <p className="font-semibold">{alert.title}</p>
                  <p className="mt-1 text-sm opacity-80">{alert.description}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-black/60">
                Sin alertas abiertas. La operación no muestra señales críticas ahora mismo.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-black/5 bg-canvas p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Últimos focos de error
          </p>
          <div className="mt-4 space-y-3">
            {logs.recentErrors.length ? (
              logs.recentErrors.map((event) => (
                <div key={event.id} className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-brand">{event.scope}</p>
                  <p className="mt-1 text-sm text-black/75">{event.message}</p>
                  <p className="mt-2 text-xs text-black/45">
                    {new Date(event.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-black/60">No hay errores recientes registrados.</p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-black/5 bg-canvas p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Auditoría admin reciente
          </p>
          <div className="mt-4 space-y-3">
            {auditEvents.length ? (
              auditEvents.map((event) => (
                <div key={event.id} className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-brand">{event.scope}</p>
                  <p className="mt-1 text-sm text-black/75">{event.message}</p>
                  <p className="mt-1 text-xs text-black/45">
                    {new Date(event.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-black/60">Sin acciones admin recientes.</p>
            )}
          </div>
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        {hasPermission(session.user.role, "catalog.products.view") ? (
          <QuickLink href="/admin/products" label="Gestionar productos" />
        ) : null}
        {hasPermission(session.user.role, "catalog.categories.view") ? (
          <QuickLink href="/admin/categories" label="Gestionar categorías" />
        ) : null}
        {hasPermission(session.user.role, "exports.products") ? (
          <QuickLink href="/api/admin/export/products" label="Exportar productos CSV" />
        ) : null}
        {hasPermission(session.user.role, "exports.categories") ? (
          <QuickLink href="/api/admin/export/categories" label="Exportar categorías CSV" />
        ) : null}
        {hasPermission(session.user.role, "orders.view") ? (
          <QuickLink href="/admin/orders" label="Revisar órdenes" />
        ) : null}
        {hasPermission(session.user.role, "exports.orders") ? (
          <QuickLink href="/api/admin/export/orders" label="Exportar órdenes CSV" />
        ) : null}
        {hasPermission(session.user.role, "observability.view") ? (
          <QuickLink href="/admin/observability" label="Ver observabilidad" />
        ) : null}
        {hasPermission(session.user.role, "exports.logs") ? (
          <QuickLink href="/api/admin/export/logs" label="Exportar logs CSV" />
        ) : null}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : "border-black/5 bg-canvas";

  return (
    <article className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">{label}</p>
      <p className="mt-3 font-display text-4xl">{value}</p>
      <p className="mt-2 text-sm text-black/60">{detail}</p>
    </article>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold transition hover:border-brand hover:text-brand"
    >
      {label}
    </Link>
  );
}
