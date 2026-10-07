"use client";

// "Contas semelhantes" (07/10/2026): os grupos que parecem a mesma pessoa,
// com o motivo de cada ligação, e o botão que mantém uma e encerra as
// outras. Quem decide é o dono; a sugestão é a conta mais usada.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GrupoSemelhante } from "@/lib/contas-semelhantes";
import { encerrarSemelhantes } from "../actions";

function quando(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ContasSemelhantes({ grupos }: { grupos: GrupoSemelhante[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [recado, setRecado] = useState<string | null>(null);

  if (grupos.length === 0) return null;

  function manter(g: GrupoSemelhante, empresaId: string) {
    const fica = g.contas.find((c) => c.empresaId === empresaId);
    const saem = g.contas.filter((c) => c.empresaId !== empresaId && !c.banida);
    const texto =
      `Manter "${fica?.nome}" e encerrar ${saem.length === 1 ? "a outra" : `as outras ${saem.length}`}?\n\n` +
      saem.map((c) => `· ${c.nome}`).join("\n") +
      "\n\nOs logins delas ficam bloqueados (nada é apagado; dá para reativar na ficha).";
    if (!confirm(texto)) return;
    setRecado(null);
    iniciar(async () => {
      const r = await encerrarSemelhantes(empresaId);
      if (r.error) setRecado(r.error);
      else {
        setRecado(`${r.encerradas ?? 0} ${r.encerradas === 1 ? "conta encerrada" : "contas encerradas"}.`);
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-lg border border-[#e7d6c4] bg-[#fdf9f3] px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[14px] font-semibold text-[#1c1d21]">
          Contas semelhantes · {grupos.length} {grupos.length === 1 ? "grupo" : "grupos"}
        </h2>
        {recado && <span className="text-[12.5px] text-[#5c5d63]">{recado}</span>}
      </div>

      <div className="mt-3 flex flex-col gap-4">
        {grupos.map((g) => (
          <div key={g.contas.map((c) => c.empresaId).join("-")} className="rounded-md border border-[#ece4d8] bg-white">
            <ul>
              {g.contas.map((c) => (
                <li
                  key={c.empresaId}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#f1ece4] px-3 py-2.5 text-[13px] last:border-b-0"
                >
                  <span className="min-w-[150px] font-semibold text-[#1c1d21]">
                    {c.nome}
                    {c.banida && <span className="ml-2 text-[11.5px] font-normal text-[#a3423f]">encerrada</span>}
                  </span>
                  <span className="min-w-[200px] text-[#5c5d63]">
                    {c.dona ?? "—"} · {c.email ?? "sem e-mail"}
                  </span>
                  <span className="text-[#84858b]">criada {quando(c.criadaEm)}</span>
                  <span className="text-[#84858b]">{c.minutos} min de uso</span>
                  <span className="ml-auto">
                    {!c.banida && (
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => manter(g, c.empresaId)}
                        className={
                          c.empresaId === g.sugerida
                            ? "rounded-md bg-[#1c1d21] px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50"
                            : "rounded-md border border-[#d4d4d0] px-3 py-1.5 text-[12.5px] text-[#3d3e44] disabled:opacity-50"
                        }
                      >
                        Manter esta e encerrar as outras
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-[#f1ece4] px-3 py-2 text-[12px] leading-snug text-[#84858b]">
              {g.motivos.join(" · ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
