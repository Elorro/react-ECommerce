import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { getRolePermissions, type AppRole } from "@/lib/permissions";

type ProviderDescriptor = {
  id: string;
  name: string;
};

declare module "next-auth" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      permissions: ReturnType<typeof getRolePermissions>;
    };
  }
}

const providers: NonNullable<NextAuthOptions["providers"]> = [];
const providerDescriptors: ProviderDescriptor[] = [];
const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);
const operationsEmails = new Set(
  (process.env.OPERATIONS_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
  providerDescriptors.push({ id: "google", name: "Google" });
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
  providerDescriptors.push({ id: "github", name: "GitHub" });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/auth/sign-in",
  },
  providers,
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.permissions = getRolePermissions(user.role);
      }

      return session;
    },
  },
  events: {
    signIn: async ({ user }) => {
      if (!user.email) {
        return;
      }

      const email = user.email.toLowerCase();
      const role: AppRole = adminEmails.has(email)
        ? "ADMIN"
        : operationsEmails.has(email)
          ? "OPERATIONS"
          : "CUSTOMER";

      await db.user.update({
        where: { id: user.id },
        data: { role },
      });
    },
  },
};

export function getAvailableAuthProviders() {
  return providerDescriptors;
}

export function auth() {
  return getServerSession(authOptions);
}
