import type { Metadata } from "next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier Commerce",
  description: "Descubre productos seleccionados con pago seguro, compra clara y seguimiento de tus pedidos en un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans text-ink antialiased">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
            <Header />
            <main className="flex-1 py-10">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
