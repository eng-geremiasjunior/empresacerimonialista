"use client";

// A lista de contas do painel repaginado. Os textos chegam prontos do
// servidor (tempo relativo calculado lá: calculado aqui, o texto do
// servidor e o do navegador divergiriam na hidratação). Só o "ao vivo" se
// renova aqui, a cada 30 s e com a aba à vista, sem recarregar a tela.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AgoraDaConta } from "@/lib/supabase/admin-painel";
import type { LinhaDeConta } from "@/lib/admin/lista-de-contas";
import { agoraDasContas } from "../actions";

const MONO = "var(--font-mono), ui-monospace, monospace";

function AoVivo({ agora, reserva }: { agora: AgoraDaConta | null; reserva: string }) {
  if (agora?.aoVivo) {
    return (
      <span className="flex flex-wrap items-center gap-x-1.5">
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <span className="font-medium text-emerald-700">ao vivo</span>
        <span className="text-[#5c5d63]">· {agora.area}</span>
      </span>
    );
  }
  return <span>{reserva}</span>;
}

export function ListaDeContas({
  linhas,
  agoraInicial,
  resumoAoVivo,
}: {
  linhas: LinhaDeConta[];
  agoraInicial: Record<string, AgoraDaConta | null>;
  /** só na lista de clientes: "N contas de clientes no sistema agora" */
  resumoAoVivo: boolean;
}) {
  const [agoraPor, setAgoraPor] = useState(agoraInicial);

  useEffect(() => {
    let vivo = true;
    const renovar = () => {
      if (document.visibilityState !== "visible") return;
      void agoraDasContas().then((r) => {
        if (!vivo || !r) return;
        setAgoraPor(Object.fromEntries(linhas.map((l) => [l.id, r[l.id] ?? null])));
      });
    };
    const relogio = window.setInterval(renovar, 30_000);
    document.addEventListener("visibilitychange", renovar);
    return () => {
      vivo = false;
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", renovar);
    };
  }, [linhas]);

  const aoVivo = linhas.filter((l) => agoraPor[l.id]?.aoVivo);

  return (
    <div className="flex flex-col gap-3">
      {resumoAoVivo && (
        <p className="flex flex-wrap items-center gap-x-2 text-[13px]">
          <span
            aria-hidden
            className={`h-2 w-2 shrink-0 rounded-full ${aoVivo.length ? "bg-emerald-500" : "bg-stone-300"}`}
          />
          <span className="font-medium text-[#1c1d21]">
            {aoVivo.length === 0
              ? "Nenhuma conta de cliente no sistema agora"
              : `${aoVivo.length} ${aoVivo.length === 1 ? "conta de cliente" : "contas de clientes"} no sistema agora: ${aoVivo
                  .map((l) => `${l.nome} (${agoraPor[l.id]?.area})`)
                  .join(", ")}`}
          </span>
          <span className="text-[12px] text-[#84858b]">atualiza a cada 30 s</span>
        </p>
      )}

      {/* computador: tabela */}
      <div className="hidden overflow-x-auto rounded-lg border border-[#dededa] bg-white lg:block">
        <table className="w-full min-w-[980px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#dededa] text-left text-[10.5px] uppercase tracking-[0.08em] text-[#84858b]" style={{ fontFamily: MONO }}>
              <th className="px-3 py-2 font-medium">Conta</th>
              <th className="px-3 py-2 font-medium">Situação</th>
              <th className="px-3 py-2 font-medium">Teste ou plano</th>
              <th className="px-3 py-2 font-medium">Último acesso</th>
              <th className="px-3 py-2 font-medium">Última ação útil</th>
              <th className="px-3 py-2 font-medium">Eventos</th>
              <th className="px-3 py-2 font-medium">Uso em 7 dias</th>
              <th className="px-3 py-2 font-medium">Origem</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b border-[#ecece8] align-top last:border-0 hover:bg-[#fafaf8]">
                <td className="max-w-[240px] px-3 py-2.5">
                  <Link href={`/admin/contas/${l.id}`} className="font-semibold text-[#1c1d21] hover:underline">
                    {l.nome}
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-[#84858b]">
                    {[l.responsavel, l.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-[11px] text-[#9a9ba1]">desde {l.criada}</p>
                </td>
                <td className="max-w-[240px] px-3 py-2.5">
                  <p className="text-[#1c1d21]">{l.situacao}</p>
                  {l.motivo && <p className="mt-0.5 text-[12px] leading-snug text-[#6e3f5f]">{l.motivo}</p>}
                </td>
                <td className="px-3 py-2.5 text-[#3d3e44]">{l.planoOuTeste}</td>
                <td className="px-3 py-2.5 text-[#3d3e44]">
                  <AoVivo agora={agoraPor[l.id] ?? null} reserva={l.ultimoAcesso} />
                </td>
                <td className="px-3 py-2.5 text-[#3d3e44]">{l.ultimaAcao}</td>
                <td className="px-3 py-2.5 text-[#3d3e44]">{l.eventos}</td>
                <td className="px-3 py-2.5 text-[#3d3e44]">{l.uso7}</td>
                <td className="max-w-[180px] px-3 py-2.5 text-[12px] text-[#5c5d63]">{l.origem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* celular e tela média: cartões, tudo à vista, sem rolagem lateral */}
      <ul className="flex flex-col gap-2 lg:hidden">
        {linhas.map((l) => (
          <li key={l.id} className="rounded-lg border border-[#dededa] bg-white px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <Link href={`/admin/contas/${l.id}`} className="text-[15px] font-semibold text-[#1c1d21] hover:underline">
                {l.nome}
              </Link>
              <span className="text-[12px] text-[#5c5d63]">{l.situacao}</span>
            </div>
            <p className="mt-0.5 break-words text-[12px] text-[#84858b]">
              {[l.responsavel, l.email].filter(Boolean).join(" · ") || "—"} · desde {l.criada}
            </p>
            {l.motivo && <p className="mt-1.5 text-[13px] leading-snug text-[#6e3f5f]">{l.motivo}</p>}
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
              <dt className="text-[#84858b]">Teste ou plano</dt>
              <dd className="text-[#3d3e44]">{l.planoOuTeste}</dd>
              <dt className="text-[#84858b]">Último acesso</dt>
              <dd className="text-[#3d3e44]">
                <AoVivo agora={agoraPor[l.id] ?? null} reserva={l.ultimoAcesso} />
              </dd>
              <dt className="text-[#84858b]">Última ação</dt>
              <dd className="text-[#3d3e44]">{l.ultimaAcao}</dd>
              <dt className="text-[#84858b]">Eventos</dt>
              <dd className="text-[#3d3e44]">{l.eventos}</dd>
              <dt className="text-[#84858b]">Uso em 7 dias</dt>
              <dd className="text-[#3d3e44]">{l.uso7}</dd>
              <dt className="text-[#84858b]">Origem</dt>
              <dd className="break-words text-[#3d3e44]">{l.origem}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
