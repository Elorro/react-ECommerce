import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/account");
  }

  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  if (!hasPermission(session.user.role, permission)) {
    redirect("/account");
  }

  return session;
}
