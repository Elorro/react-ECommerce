import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atelier Commerce",
  description: "Base profesional para un e-commerce moderno, seguro y escalable.",
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
          </div>
        </Providers>
      </body>
    </html>
  );
}
