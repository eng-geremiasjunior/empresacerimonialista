"use client";

import { usePathname } from "next/navigation";

// Container da página do evento. Cronograma e Planejamento usam layout de
// dashboard (timeline densa; mapa mental + trilho do Copiloto) e precisam
// de mais largura que as demais — por isso o max-width é maior nessas rotas.
export function EventoContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const largo =
    pathname?.includes("/roteiro") || pathname?.includes("/planejamento");

  return (
    <div
      className={`mx-auto space-y-6 ${largo ? "max-w-[1240px]" : "max-w-5xl"}`}
    >
      {children}
    </div>
  );
}
