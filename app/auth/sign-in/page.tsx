import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/auth/sign-in-buttons";
import { InlineNotice } from "@/components/ui/inline-notice";
import { auth, getAvailableAuthProviders } from "@/lib/auth";

export const metadata = {
  title: "Ingresar | Atelier Commerce",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/account");
  }

  const providers = getAvailableAuthProviders();
  const { error } = await searchParams;

  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-black/5 bg-white/85 p-8 shadow-card">
      <div className="space-y-4">
        <span className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
          Acceso seguro
        </span>
        <h1 className="font-display text-5xl">Ingresa o crea tu cuenta</h1>
        <p className="max-w-xl text-black/70">
          Accede con tu proveedor seguro preferido. La primera vez que ingresas se crea tu cuenta automáticamente; después, el mismo botón funciona como inicio de sesión.
        </p>
      </div>

      {providers.length ? (
        <div className="mt-8">
          <SignInButtons providers={providers} error={error} />
        </div>
      ) : (
        <div className="mt-8">
          <InlineNotice tone="warn">
            El acceso no está disponible en este momento. Intenta nuevamente más tarde.
          </InlineNotice>
        </div>
      )}
    </section>
  );
}
