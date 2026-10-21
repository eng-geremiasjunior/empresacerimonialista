"use client";

// A IA que trabalha (220, 21/10/2026): o dono liga, libera e ajusta as
// cotas aqui, sem publicar nada. Enquanto "para todas as contas" estiver
// desligado, os trabalhos novos só aparecem nas contas da casa.

import { useFormState, useFormStatus } from "react-dom";
import { salvarAjustesDaIa, type ResultadoAdmin } from "./actions";
import type { AjustesDaIa } from "@/lib/ia-cota";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-[#33343a] px-3.5 py-[7px] text-[12px] font-semibold text-white hover:bg-[#4d4e55] disabled:opacity-50"
    >
      {pending ? "…" : "Salvar"}
    </button>
  );
}

const CAMPO = "h-8 w-24 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21] tabular-nums";

const PLANOS = [
  { nome: "Essencial", acoes: "cota_essencial", audio: "audio_min_essencial", chaveAcoes: "cotaEssencial", chaveAudio: "audioMinEssencial" },
  { nome: "Profissional", acoes: "cota_profissional", audio: "audio_min_profissional", chaveAcoes: "cotaProfissional", chaveAudio: "audioMinProfissional" },
  { nome: "Master", acoes: "cota_master", audio: "audio_min_master", chaveAcoes: "cotaMaster", chaveAudio: "audioMinMaster" },
] as const;

export function FormIa({ atual, usoDoMes }: { atual: AjustesDaIa; usoDoMes: { contas: number; acoes: number } }) {
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(salvarAjustesDaIa, {});
  return (
    <form action={agir} className="space-y-4">
      <div className="flex flex-col gap-2 text-[13px] text-[#1c1d21]">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ligada" defaultChecked={atual.ligada} className="h-4 w-4" />
          Trabalhos de IA ligados
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="para_todos" defaultChecked={atual.paraTodos} className="h-4 w-4" />
          Liberada para todas as contas pagas
          <span className="text-[12px] text-[#84858b]">(desligado: só as contas da casa)</span>
        </label>
      </div>

      <table className="text-[13px]">
        <thead>
          <tr className="text-left text-[11.5px] text-[#84858b]">
            <th className="pb-1 pr-6 font-medium">Plano</th>
            <th className="pb-1 pr-6 font-medium">Ações por mês</th>
            <th className="pb-1 font-medium">Áudio por mês (min)</th>
          </tr>
        </thead>
        <tbody>
          {PLANOS.map((p) => (
            <tr key={p.nome}>
              <td className="py-1 pr-6 text-[#3d3e44]">{p.nome}</td>
              <td className="py-1 pr-6">
                <input type="number" name={p.acoes} min={0} max={100000} required defaultValue={atual[p.chaveAcoes]} className={CAMPO} />
              </td>
              <td className="py-1">
                <input type="number" name={p.audio} min={0} max={100000} required defaultValue={atual[p.chaveAudio]} className={CAMPO} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-[12px] text-[#84858b]">
        Este mês: {usoDoMes.acoes} {usoDoMes.acoes === 1 ? "ação" : "ações"} em {usoDoMes.contas}{" "}
        {usoDoMes.contas === 1 ? "conta" : "contas"}. O Gratuito não tem IA; as contas da casa não têm limite.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Botao />
        {estado.ok && <span className="text-[12px] text-[#57534e]">Salvo. Vale na próxima ação de cada conta.</span>}
        {estado.error && <span className="text-[12px] text-[#b91c1c]">{estado.error}</span>}
      </div>
    </form>
  );
}
