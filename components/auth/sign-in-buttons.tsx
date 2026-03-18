"use client";

import { signIn } from "next-auth/react";

type ProviderButton = {
  id: string;
  name: string;
};

export function SignInButtons({ providers }: { providers: ProviderButton[] }) {
  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => signIn(provider.id, { callbackUrl: "/account" })}
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand"
        >
          Ingresar o crear cuenta con {provider.name}
        </button>
      ))}
    </div>
  );
}
