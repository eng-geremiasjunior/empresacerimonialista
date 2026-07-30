"use client";

// Visão em raias da execução do evento: o tempo corre na vertical e cada
// fornecedor é uma coluna, então quem trabalha ao mesmo tempo aparece
// lado a lado — que é o que acontece no dia.
//
// Recriado de design/Cronograma/design_handoff_cronograma_paralelo.
// A lógica (raias, empacotamento, choque, janela) mora em
// lib/execucao-evento e é testada à parte; aqui só posiciona.

import { useEffect, useState } from "react";
import { AlertTriangle, Clock3 } from "lucide-react";
import {
  agruparEmRaias,
  empacotarRaia,
  fimMin,
  formatarMin,
  horarioOriginal,
  idsEmChoque,
  inicioMin,
  janelaDoDia,
  raiasEmChoque,
  situacaoPorHorario,
  type ItemExecucao,
} from "@/lib/execucao-evento";

// Pixels por minuto: define a altura da timeline. 1.9 é o padrão do
// handoff; abaixo disso os blocos curtos somem.
const PPM = 1.9;
const COL_HORA = 74;

// Uma cor por raia, girando o matiz. O handoff fixa 5 equipes; aqui a
// quantidade de fornecedores é variável, então o matiz é derivado.
function corDaRaia(indice: number): { forte: string; suave: string } {
  const hue = (285 + indice * 62) % 360;
  return {
    forte: `hsl(${hue} 55% 48%)`,
    suave: `hsl(${hue} 60% 96%)`,
  };
}

export function VisaoRaias({
  itens,
  eventoHoje,
  onAtrasar,
}: {
  itens: ItemExecucao[];
  eventoHoje: boolean;
  onAtrasar: (item: ItemExecucao) => void;
}) {
  // O relógio só entra depois da montagem: renderizar a hora no servidor
  // quebraria a hidratação.
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    if (!eventoHoje) return;
    const tick = () => {
      const d = new Date();
      setAgora(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [eventoHoje]);

  const raias = agruparEmRaias(itens);
  const janela = janelaDoDia(itens);
  const choque = idsEmChoque(itens);
  const conflitos = raiasEmChoque(itens);
  const altura = (janela.fim - janela.inicio) * PPM;

  const horas: number[] = [];
  for (let m = Math.ceil(janela.inicio / 60) * 60; m <= janela.fim; m += 60) {
    horas.push(m);
  }

  if (raias.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-12 text-center">
        <p className="text-stone-600">Nenhum item para exibir em raias.</p>
      </div>
    );
  }

  return (
    <div>
      {conflitos.length > 0 && (
        <div className="mb-4 rounded-xl border border-[#E8B4A8] bg-[#FDECE8] p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#B0553F]">
            <AlertTriangle size={14} /> CHOQUE DE EQUIPE
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {conflitos.map((c) => (
              <li key={c.nome} className="text-[13px] text-[#7A3F30]">
                <strong>{c.nome}</strong> em {c.quantos} itens ao mesmo tempo —
                provável a mesma pessoa em dois lugares.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-[18px] border border-stone-200 bg-white">
        <div className="overflow-auto" style={{ maxHeight: 660 }}>
          <div style={{ minWidth: Math.max(820, 120 + raias.length * 190) }}>
            {/* cabeçalho das raias */}
            <div
              className="sticky top-0 z-20 flex border-b border-stone-200 bg-white"
              style={{ paddingLeft: COL_HORA }}
            >
              {raias.map((r, i) => {
                const cor = corDaRaia(i);
                const temChoque = r.itens.some((x) => choque.has(x.id));
                return (
                  <div
                    key={r.chave}
                    className="flex-1 border-l border-stone-100 px-3 py-2.5"
                  >
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#17162A]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: cor.forte }}
                      />
                      <span className="truncate">{r.nome}</span>
                      {temChoque && (
                        <AlertTriangle size={12} className="shrink-0 text-[#B0553F]" />
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {r.itens.length} {r.itens.length === 1 ? "item" : "itens"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* corpo */}
            <div className="relative" style={{ height: altura }}>
              {/* grade + coluna de horas */}
              {horas.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-stone-100"
                  style={{ top: (h - janela.inicio) * PPM }}
                >
                  <span
                    className="absolute -top-2 left-0 text-[11px] text-stone-400"
                    style={{ width: COL_HORA, textAlign: "center" }}
                  >
                    {formatarMin(h)}
                  </span>
                </div>
              ))}

              <div className="flex h-full" style={{ paddingLeft: COL_HORA }}>
                {raias.map((r, i) => {
                  const cor = corDaRaia(i);
                  const posicoes = empacotarRaia(r.itens);
                  return (
                    <div
                      key={r.chave}
                      className="relative h-full flex-1 border-l border-stone-100"
                    >
                      {posicoes.map((p) => {
                        const ini = inicioMin(p.item);
                        const fim = fimMin(p.item);
                        if (ini === null || fim === null) return null;

                        const emChoque = choque.has(p.item.id);
                        const sit =
                          agora === null
                            ? "pendente"
                            : situacaoPorHorario(p.item, agora);
                        const era = horarioOriginal(p.item);
                        const larguraSlot = 100 / p.colunas;

                        return (
                          <button
                            key={p.item.id}
                            onClick={() => onAtrasar(p.item)}
                            title={`${p.item.title} · ${formatarMin(ini)}–${formatarMin(fim)}`}
                            className="absolute overflow-hidden rounded-[11px] px-2 py-1.5 text-left transition-shadow hover:shadow-md"
                            style={{
                              top: (ini - janela.inicio) * PPM,
                              height: Math.max(26, (fim - ini) * PPM),
                              left: `calc(${p.coluna * larguraSlot}% + 4px)`,
                              width: `calc(${p.span * larguraSlot}% - 8px)`,
                              background:
                                sit === "pendente" ? "#fff" : cor.suave,
                              border: emChoque
                                ? "2px solid #E0503C"
                                : sit === "pendente"
                                  ? "1.5px dashed #D6D3D1"
                                  : `1.5px solid ${cor.forte}`,
                              borderLeft: `4px solid ${emChoque ? "#E0503C" : cor.forte}`,
                              opacity: sit === "concluido" ? 0.72 : 1,
                            }}
                          >
                            <span className="flex items-start gap-1">
                              {emChoque && (
                                <AlertTriangle
                                  size={11}
                                  className="mt-0.5 shrink-0 text-[#B0553F]"
                                />
                              )}
                              <span className="line-clamp-2 text-[12px] font-bold leading-tight text-[#17162A]">
                                {p.item.title}
                              </span>
                            </span>
                            {/* Em slot estreito o horário some: não cabe sem
                                cortar o título, que é o que importa. */}
                            {!p.estreito && (fim - ini) * PPM > 44 && (
                              <span className="mt-0.5 block text-[11px] text-stone-500">
                                {formatarMin(ini)}–{formatarMin(fim)}
                                {era && (
                                  <span className="ml-1 text-[#C55A32] line-through">
                                    {era}
                                  </span>
                                )}
                              </span>
                            )}
                            {!p.estreito && (fim - ini) * PPM > 76 && emChoque && (
                              <span className="mt-1 block text-[11px] font-semibold text-[#B0553F]">
                                Choque de equipe
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* linha do agora */}
              {agora !== null &&
                agora >= janela.inicio &&
                agora <= janela.fim && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-[#7C5CE6]"
                    style={{ top: (agora - janela.inicio) * PPM }}
                  >
                    <span
                      className="absolute -top-2.5 left-1 rounded-full bg-[#7C5CE6] px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ width: COL_HORA - 8, textAlign: "center" }}
                    >
                      {formatarMin(agora)}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-stone-300" /> Pendente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#7C5CE6]" /> Em andamento
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={12} className="text-[#B0553F]" /> Choque de equipe
        </span>
        <span className="flex items-center gap-1.5">
          <Clock3 size={12} /> Clique num bloco para atrasar
        </span>
      </p>
    </div>
  );
}
