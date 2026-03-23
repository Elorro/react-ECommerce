"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { InlineNotice } from "@/components/ui/inline-notice";

type ProviderButton = {
  id: string;
  name: string;
};

function humanizeAuthError(error?: string) {
  if (!error) {
    return null;
  }

  switch (error) {
    case "OAuthAccountNotLinked":
      return "Ya existe una cuenta con este correo. Inicia sesión con el método que usaste originalmente.";
    case "AccessDenied":
      return "No pudimos completar el acceso. Intenta nuevamente o usa otra cuenta.";
    case "Configuration":
      return "El acceso no está disponible en este momento. Intenta nuevamente más tarde.";
    default:
      return "No pudimos iniciar sesión. Intenta nuevamente en unos segundos.";
  }
}

export function SignInButtons({
  providers,
  error,
}: {
  providers: ProviderButton[];
  error?: string;
}) {
  const [pendingProviderId, setPendingProviderId] = useState<string | null>(null);
  const authError = humanizeAuthError(error);

  return (
    <div className="grid gap-3">
      {authError ? <InlineNotice tone="error">{authError}</InlineNotice> : null}
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          disabled={pendingProviderId !== null}
          onClick={async () => {
            setPendingProviderId(provider.id);
            try {
              await signIn(provider.id, { callbackUrl: "/account" });
            } finally {
              setPendingProviderId(null);
            }
          }}
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingProviderId === provider.id
            ? `Conectando con ${provider.name}...`
            : `Ingresar o crear cuenta con ${provider.name}`}
        </button>
      ))}
    </div>
  );
}
