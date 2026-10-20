"use client";

// A paleta do sistema (218, 19/10/2026): o dono escolhe a cor do app aqui,
// sem publicar nada. Cada opção mostra o destaque, o tom claro e um botão
// de exemplo, do jeito que aparece no sistema.

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { salvarPaletaDoSistema, type ResultadoAdmin } from "./actions";
import { PALETAS, type ChaveDaPaleta } from "@/lib/paletas-do-sistema";

function Botao({ mudou }: { mudou: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !mudou}
      className="rounded-md bg-[#33343a] px-3.5 py-[7px] text-[12px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50"
    >
      {pending ? "…" : "Usar esta paleta"}
    </button>
  );
}

export function FormPaleta({ atual }: { atual: ChaveDaPaleta }) {
  const [escolha, setEscolha] = useState<ChaveDaPaleta>(atual);
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarPaletaDoSistema, {});
  return (
    <form action={agir} className="space-y-3">
      <input type="hidden" name="paleta" value={escolha} />
      <div role="radiogroup" aria-label="Paleta do sistema" className="grid gap-2 sm:grid-cols-3">
        {PALETAS.map((p) => {
          const marcada = escolha === p.chave;
          return (
            <button
              key={p.chave}
              type="button"
              role="radio"
              aria-checked={marcada}
              onClick={() => setEscolha(p.chave)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                marcada ? "border-[#33343a] ring-1 ring-[#33343a]" : "border-[#e7e5e4] hover:border-[#a8a29e]"
              }`}
              style={{ background: "#F7F5F0" }}
            >
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 rounded" style={{ background: p.destaque }} aria-hidden />
                <span className="h-5 w-5 rounded" style={{ background: p.claro }} aria-hidden />
                <span className="text-[12.5px] font-semibold" style={{ color: p.tinta }}>
                  {p.nome}
                  {p.chave === atual && <span className="ml-1 font-normal text-[#78716c]">(em uso)</span>}
                </span>
              </span>
              <span className="mt-2.5 flex items-center gap-2">
                <span className="rounded px-2 py-1 text-[11px] font-semibold text-white" style={{ background: p.destaque }}>
                  Responder com proposta
                </span>
                <span
                  className="rounded px-2 py-1 text-[11px] font-semibold"
                  style={{ background: p.claro, color: p.escuro }}
                >
                  2 novos
                </span>
              </span>
              <span className="mt-1.5 block text-[11px]" style={{ color: p.cinza1 }}>
                texto de apoio e menu
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Botao mudou={escolha !== atual} />
        {estado.ok && <span className="text-[12px] text-[#57534e]">Paleta trocada. Vale na próxima tela que cada pessoa abrir.</span>}
        {estado.error && <span className="text-[12px] text-[#b91c1c]">{estado.error}</span>}
      </div>
    </form>
  );
}
