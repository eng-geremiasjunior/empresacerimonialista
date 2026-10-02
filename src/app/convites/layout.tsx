import type { Metadata, Viewport } from "next";

// O convite animado ocupa a página inteira, sem o CSS de nenhuma outra
// área: o motor (components/convite-digital) põe o estilo do desenho e
// devolve o resto ao padrão do navegador.

export const metadata: Metadata = {
  title: "Convite",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function ConvitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
