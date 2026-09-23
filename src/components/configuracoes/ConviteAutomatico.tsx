"use client";

import { useState, useTransition } from "react";
import { alternarConviteAutomatico } from "@/app/(app)/configuracoes/portal-actions";

// O convite para o portal sai sozinho quando a cliente aceita a proposta
// (173). Ligado por padrão; aqui ela desliga.
export function ConviteAutomatico({ ligado }: { ligado: boolean }) {
  const [valor, setValor] = useState(ligado);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={valor}
          disabled={pendente}
          onChange={(e) => {
            const novo = e.target.checked;
            setValor(novo);
            setErro(null);
            iniciar(async () => {
              const r = await alternarConviteAutomatico(novo);
              if ("error" in r) {
                setErro(r.error);
                setValor(!novo);
              }
            });
          }}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-semibold text-gray-900">Convidar a cliente para o portal</span>
          <span className="mt-0.5 block text-xs text-gray-500">
            Quando ela aceita a proposta, recebe por e-mail o acesso para criar a senha dela.
          </span>
        </span>
      </label>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </section>
  );
}
