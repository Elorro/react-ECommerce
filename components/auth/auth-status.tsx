"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="rounded-full border border-black/10 bg-canvas px-4 py-2 text-sm">
        Cargando...
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/auth/sign-in"
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
      >
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.role !== "CUSTOMER" ? (
        <>
          {hasPermission(session.user.role, "admin.dashboard.view") ? (
            <Link
              href="/admin"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
            >
              Dashboard
            </Link>
          ) : null}
          {hasPermission(session.user.role, "catalog.products.view") ? (
            <Link
              href="/admin/products"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
            >
              Admin productos
            </Link>
          ) : null}
          {hasPermission(session.user.role, "catalog.categories.view") ? (
            <Link
              href="/admin/categories"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
            >
              Admin categorias
            </Link>
          ) : null}
          {hasPermission(session.user.role, "orders.view") ? (
            <>
              <Link
                href="/admin/orders"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Admin ordenes
              </Link>
            </>
          ) : null}
          {hasPermission(session.user.role, "observability.view") ? (
            <Link
              href="/admin/observability"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
            >
              Observabilidad
            </Link>
          ) : null}
        </>
      ) : null}
      <Link
        href="/account"
        className="rounded-full border border-black/10 bg-canvas px-4 py-2 text-sm font-semibold"
      >
        Mi cuenta
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold"
      >
        Salir
      </button>
    </div>
  );
}
