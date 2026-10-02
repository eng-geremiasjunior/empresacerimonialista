import type { Metadata, Viewport } from "next";

// A lista de presentes do convidado (/c/<endereço>/presentes, reescrito
// para cá pelo next.config): outra página, sem o layout nem o CSS do site.
// Fora do buscador, como o site.

export const metadata: Metadata = {
  title: "Lista de presentes",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function PresentesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
