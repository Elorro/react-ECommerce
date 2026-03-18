import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { auth, getAvailableAuthProviders } from "@/lib/auth";

export const metadata = {
  title: "Ingresar | Atelier Commerce",
};

export default async function SignInPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/account");
  }

  const providers = getAvailableAuthProviders();

  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-4">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Acceso seguro
        </span>
        <h1 className="font-display text-5xl">Ingresa o crea tu cuenta con Google</h1>
        <p className="max-w-xl text-black/70">
          No usamos registro manual ni contraseñas propias. La primera vez que entras con
          Google se crea tu cuenta automáticamente; después, el mismo botón funciona como
          inicio de sesión.
        </p>
      </div>

      {providers.length ? (
        <div className="mt-8">
          <SignInButtons providers={providers} />
        </div>
      ) : (
        <p className="mt-8 rounded-3xl bg-brand/10 px-5 py-4 text-sm font-medium text-brand">
          No hay proveedores OAuth configurados. Define `AUTH_GOOGLE_*` o `AUTH_GITHUB_*`
          en `.env` para habilitar el login.
        </p>
      )}
    </section>
  );
}
