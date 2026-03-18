import { PaginationLinks } from "@/components/ui/pagination-links";
import Link from "next/link";
import { requirePermission } from "@/lib/admin";
import {
  getOperationalAlerts,
  getObservabilityMetrics,
  listAdminAuditEvents,
  listOperationalEvents,
} from "@/lib/observability";
import { parsePage } from "@/lib/pagination";
import { hasPermission } from "@/lib/permissions";

export const metadata = {
  title: "Admin Observabilidad | Atelier Commerce",
};

export default async function AdminObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    level?: string;
    scope?: string;
  }>;
}) {
  const session = await requirePermission("observability.view");
  const params = await searchParams;
  const page = parsePage(params.page);
  const level =
    params.level === "INFO" || params.level === "WARN" || params.level === "ERROR"
      ? params.level
      : undefined;
  const [events, metrics, auditEvents] = await Promise.all([
    listOperationalEvents({
      page,
      level,
      scope: params.scope,
    }),
    getObservabilityMetrics(),
    listAdminAuditEvents(8),
  ]);
  const alerts = await getOperationalAlerts(metrics);

  return (
    <section className="space-y-8 rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-2">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Admin
        </span>
        <h1 className="font-display text-4xl">Observabilidad</h1>
        <p className="max-w-2xl text-black/70">
          Eventos operativos persistidos para auditar errores, abuso, cambios de órdenes y
          fallos de pago sin depender solo de la consola.
        </p>
        {hasPermission(session.user.role, "exports.logs") ? (
          <Link
            href={{
              pathname: "/api/admin/export/logs",
              query: {
                level,
                scope: params.scope,
              },
            }}
            className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
          >
            Exportar vista CSV
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Errores 24h
          </p>
          <p className="mt-3 font-display text-4xl">{metrics.last24Hours.errors}</p>
          <p className="mt-2 text-sm text-black/60">{metrics.total.errors} acumulados</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Warnings 24h
          </p>
          <p className="mt-3 font-display text-4xl">{metrics.last24Hours.warnings}</p>
          <p className="mt-2 text-sm text-black/60">
            {metrics.last24Hours.rateLimits} rate limits recientes
          </p>
        </article>
        <article className="rounded-3xl border border-black/5 bg-canvas p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Fallos pago 24h
          </p>
          <p className="mt-3 font-display text-4xl">{metrics.last24Hours.paymentFailures}</p>
          <p className="mt-2 text-sm text-black/60">Scopes `payments.*` con error</p>
        </article>
        <article className="rounded-3xl border border-black/5 bg-canvas p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Pagos vencidos
          </p>
          <p className="mt-3 font-display text-4xl">{metrics.stalePendingPayments}</p>
          <p className="mt-2 text-sm text-black/60">Órdenes aún sin reconciliar</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Alertas activas
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
              <p className="text-sm text-black/60">Sin alertas activas.</p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Últimos errores persistidos
          </p>
          <div className="mt-4 space-y-3">
            {metrics.recentErrors.length ? (
              metrics.recentErrors.map((event) => (
                <div key={event.id} className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-sm font-semibold text-brand">{event.scope}</p>
                  <p className="mt-1 text-sm text-black/75">{event.message}</p>
                  <p className="mt-2 text-xs text-black/45">
                    {new Date(event.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-black/60">No hay errores recientes.</p>
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
            Scopes con más errores
          </p>
          <div className="mt-4 space-y-3">
            {metrics.topErrorScopes.length ? (
              metrics.topErrorScopes.map((entry) => (
                <div key={entry.scope} className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-sm font-semibold text-brand">{entry.scope}</p>
                  <p className="mt-1 text-sm text-black/75">{entry.count} errores en 24h</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-black/60">No hay agrupaciones de error recientes.</p>
            )}
          </div>
        </article>
      </div>

      <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-black/45">
          Auditoría admin reciente
        </p>
        <div className="mt-4 grid gap-3">
          {auditEvents.length ? (
            auditEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-canvas px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-brand">{event.scope}</p>
                  <p className="text-xs text-black/45">
                    {new Date(event.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-black/75">{event.message}</p>
                {event.metadata ? (
                  <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink p-4 text-xs text-white">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-black/60">No hay acciones admin auditadas todavía.</p>
          )}
        </div>
      </article>

      <form
        action="/admin/observability"
        className="grid gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-card md:grid-cols-[1fr_0.8fr_auto]"
      >
        <input
          type="search"
          name="scope"
          defaultValue={params.scope ?? ""}
          placeholder="Filtrar por scope"
          className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        />
        <select
          name="level"
          defaultValue={level ?? ""}
          className="rounded-2xl border border-black/10 bg-canvas px-4 py-3"
        >
          <option value="">Todos los niveles</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      <div className="grid gap-4">
        {events.items.map((event) => (
          <article
            key={event.id}
            className="grid gap-3 rounded-3xl border border-black/5 bg-canvas p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                {event.level}
              </span>
              <span className="text-sm font-semibold text-brand">{event.scope}</span>
              <span className="text-sm text-black/50">
                {new Date(event.createdAt).toLocaleString("es-CO")}
              </span>
            </div>
            <p className="font-medium text-ink">{event.message}</p>
            <div className="flex flex-wrap gap-3 text-xs text-black/55">
              {event.route ? <span>ruta: {event.route}</span> : null}
              {event.requestId ? <span>requestId: {event.requestId}</span> : null}
              {event.userId ? <span>userId: {event.userId}</span> : null}
              {event.orderId ? <span>orderId: {event.orderId}</span> : null}
            </div>
            {event.metadata ? (
              <pre className="overflow-x-auto rounded-2xl bg-ink p-4 text-xs text-white">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            ) : null}
          </article>
        ))}
      </div>

      <PaginationLinks
        currentPage={events.currentPage}
        totalPages={events.totalPages}
        basePath="/admin/observability"
        query={{
          level,
          scope: params.scope,
        }}
      />
    </section>
  );
}
