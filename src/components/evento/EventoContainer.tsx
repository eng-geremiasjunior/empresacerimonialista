"use client";

import { usePathname } from "next/navigation";

// Container da página do evento. A aba Cronograma usa um layout de
// dashboard (timeline densa + painel de 300px) e precisa de mais largura
// que as demais abas — por isso o max-width é maior só nessa rota.
export function EventoContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const largo = pathname?.includes("/roteiro");

  return (
    <div
      className={`mx-auto space-y-6 ${largo ? "max-w-[1240px]" : "max-w-5xl"}`}
    >
      {children}
    </div>
  );
}
