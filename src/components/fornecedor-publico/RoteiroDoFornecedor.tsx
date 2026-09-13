"use client";

import { Calendar, MapPin } from "lucide-react";
import { ComoChegar } from "@/components/ComoChegar";
import { formatDate } from "@/lib/format";
import type { EventoDoRoteiroPublico } from "@/app/fornecedor/[hash]/page";

/**
 * O roteiro do fornecedor, no link sem login (158).
 *
 * O QUE ELE VÊ É A PARTE DELE, e só ela. O dia inteiro da cerimonialista
 * — 23 linhas, do caminhão da estrutura à desmontagem — não diz respeito
 * ao fotógrafo e não vai ser lido no celular às seis da tarde. Três
 * horários que são dele, sim.
 *
 * SEM CAIXA EM VOLTA DE CADA ITEM. A hora à esquerda já separa uma linha
 * da outra; borda em cada uma transformaria um roteiro de dez horários
 * numa pilha de cartões para rolar. A regra de ouro da interface vale
 * aqui mais do que em qualquer lugar: quem abre isto está de pé, num
 * salão, com uma mão só.
 */
export function RoteiroDoFornecedor({
  roteiro,
}: {
  roteiro: EventoDoRoteiroPublico[];
}) {
  const comItens = roteiro.filter((r) => (r.itens?.length ?? 0) > 0);
  if (comItens.length === 0) return null;

  return (
    <div className="mt-10 space-y-8">
      {comItens.map((bloco, i) => (
        <section key={`${bloco.evento.nome ?? "evento"}-${bloco.evento.data ?? i}`}>
          <h2 className="text-sm font-semibold text-gray-900">
            {bloco.evento.nome ?? "Evento"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {bloco.evento.data && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                {formatDate(bloco.evento.data)}
              </span>
            )}
            {bloco.evento.local && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" />
                {bloco.evento.local}
                {bloco.evento.cidade ? ` · ${bloco.evento.cidade}` : ""}
              </span>
            )}
          </div>
          <ComoChegar endereco={bloco.evento.local} />

          <ol className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {(bloco.itens ?? []).map((item) => (
              <li key={item.id} className="flex gap-3 px-4 py-3">
                <span className="w-12 shrink-0 pt-0.5 font-mono text-sm tabular-nums text-gray-900">
                  {hora(item.hora)}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900">{item.titulo}</span>
                  {item.descricao && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
                      {item.descricao}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** "19:00:00" → "19:00". Item sem hora existe e não pode sumir. */
function hora(valor: string | null): string {
  if (!valor) return "—";
  return valor.slice(0, 5);
}
