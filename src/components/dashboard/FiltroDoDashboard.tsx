"use client";

// O filtro do Dashboard (16/10/2026): todos os eventos ou um só. Muda o
// endereço (?evento=) e a página inteira refaz os cartões para aquele evento.

import { useRouter, useSearchParams } from "next/navigation";

export function FiltroDoDashboard({ eventos }: { eventos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const atual = params?.get("evento") ?? "";
  return (
    <label className="db-filtro">
      Visualização
      <select
        value={atual}
        onChange={(e) => {
          const v = e.target.value;
          router.push(v ? `/eventos/dashboard?evento=${v}` : "/eventos/dashboard");
        }}
      >
        <option value="">Todos os eventos</option>
        {eventos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
