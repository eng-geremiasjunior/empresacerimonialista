import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vela",
  description: "Gestão simples para cerimonialistas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
