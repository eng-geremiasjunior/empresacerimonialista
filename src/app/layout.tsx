import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Inter } from "next/font/google";
import "./globals.css";

// Faces reais do Celebra Pro Design System. Antes disto o app declarava as
// famílias nos componentes mas nunca as carregava — caía no fallback do
// sistema, e a distância entre mockup e tela vinha muito daqui.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-title",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// O ícone da aba do navegador, declarado na RAIZ para valer em tudo: a
// área profissional, o portal e as telas públicas (convite, guia, posto
// da recepção). Antes disto só o portal instalado no celular tinha
// ícone; no computador a aba do sistema abria com o globo cinza do
// navegador, ao lado de dez outras abas iguais.
//
// O SVG vem primeiro porque é nítido em qualquer tela e não pesa nada; o
// PNG fica para quem não lê SVG, e o favicon.ico para quem nem lê a
// etiqueta e pede /favicon.ico direto (leitores de link, o Slack, o
// WhatsApp montando a prévia).
export const metadata: Metadata = {
  title: "eorganizei",
  description: "Gestão simples para cerimonialistas",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${instrumentSans.variable} ${plexMono.variable} min-h-screen bg-stone-50 font-sans text-stone-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
