"use client";

import { useState, useTransition } from "react";
import { salvarDiasAntecedencia } from "@/app/(app)/eventos/[id]/fornecedores/actions";

export function ConfigAntecedencia({
  eventId,
  diasAtual,
}: {
  eventId: string;
  diasAtual: number;
}) {
  const [dias, setDias] = useState(diasAtual);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar(valor: number) {
    setDias(valor);
    setSalvo(false);
    setErro(null);
    startTransition(async () => {
      const r = await salvarDiasAntecedencia(eventId, valor);
      if (r.error) setErro(r.error);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
      <span>Enviar confirmação automática</span>
      <select
        value={dias}
        onChange={(e) => salvar(Number(e.target.value))}
        disabled={pending}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-800 focus:border-gray-500 focus:outline-none disabled:opacity-60"
      >
        {Array.from(new Set([3, 5, 7, 10, 14, 21, 30, dias]))
          .sort((a, b) => a - b)
          .map((n) => (
          <option key={n} value={n}>
            {n} dias
          </option>
        ))}
      </select>
      <span>antes do evento</span>
      {salvo && <span className="text-xs font-medium text-emerald-600">Salvo</span>}
      {erro && <span className="text-xs font-medium text-red-600">{erro}</span>}
    </div>
  );
}
