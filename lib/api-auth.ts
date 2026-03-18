import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function requireApiPermission(permission: Permission) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  if (!hasPermission(session.user.role, permission)) {
    return null;
  }

  return session as Session;
}
