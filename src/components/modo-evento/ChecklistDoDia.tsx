"use client";

// O checklist no dia: ela está de pé, com uma mão, com pressa.
// Um toque risca, outro desfaz, sem confirmação. Quem marcou e quando
// ficam visíveis — com três assistentes, "quem conferiu o som?" é
// pergunta real no meio da festa.

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ModoTheme } from "@/lib/modo-tema";

export type ItemChecklistDia = {
  id: string;
  bloco: "montagem" | "colacao" | "cerimonia" | "recepcao" | "desmontagem";
  titulo: string;
  ordem: number;
  horario: string | null;
  responsavelNome: string | null;
  conferidoEm: string | null;
  conferidoPorNome: string | null;
};

const BLOCOS: { key: ItemChecklistDia["bloco"]; label: string }[] = [
  { key: "montagem", label: "Montagem" },
  { key: "colacao", label: "Colação" },
  { key: "cerimonia", label: "Cerimônia" },
  { key: "recepcao", label: "Recepção" },
  { key: "desmontagem", label: "Desmontagem" },
];

/**
 * O chip inicial vem da âncora (hora da cerimônia): antes de âncora−45min
 * é montagem; até âncora+90min é cerimônia; depois, recepção. Desmontagem
 * é sempre escolha dela. Sem âncora: o primeiro bloco com pendências.
 * Depois do primeiro toque num chip, a escolha DELA é que vale.
 */
function blocoSugerido(
  ancora: string | null,
  eventDate: string,
  itens: ItemChecklistDia[]
): ItemChecklistDia["bloco"] {
  const pendentesEm = (b: string) =>
    itens.some((i) => i.bloco === b && !i.conferidoEm);

  if (ancora) {
    const agora = new Date();
    const hojeLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
    if (eventDate === hojeLocal) {
      const [h, m] = ancora.split(":").map(Number);
      const minAncora = h * 60 + m;
      const minAgora = agora.getHours() * 60 + agora.getMinutes();
      const temItens = (b: ItemChecklistDia["bloco"]) =>
        itens.some((i) => i.bloco === b);
      if (minAgora < minAncora - 45) return "montagem";
      if (minAgora <= minAncora + 90) {
        // o bloco solene em torno da âncora: cerimônia no casamento,
        // colação na formatura; num baile sem parte solene (colação em
        // outra data), a âncora é a abertura — recepção
        if (temItens("cerimonia")) return "cerimonia";
        if (temItens("colacao")) return "colacao";
        if (temItens("recepcao")) return "recepcao";
      } else if (temItens("recepcao")) {
        return "recepcao";
      }
    }
  }
  for (const b of BLOCOS) if (pendentesEm(b.key)) return b.key;
  return "montagem";
}

export function ChecklistDoDia({
  eventId,
  eventDate,
  ancora,
  initial,
  t,
}: {
  eventId: string;
  eventDate: string;
  ancora: string | null;
  initial: ItemChecklistDia[];
  t: ModoTheme;
}) {
  const [itens, setItens] = useState(initial);
  const [bloco, setBloco] = useState<ItemChecklistDia["bloco"] | null>(null);
  const [meuNome, setMeuNome] = useState<string | null>(null);

  // O bloco escolhido sobrevive a recargas no meio da festa.
  const chave = `vela:bloco-dia:${eventId}`;
  useEffect(() => {
    const salvo = window.localStorage.getItem(chave);
    if (salvo && BLOCOS.some((b) => b.key === salvo)) {
      setBloco(salvo as ItemChecklistDia["bloco"]);
    } else {
      setBloco(blocoSugerido(ancora, eventDate, initial));
    }
    // o nome de quem está com o aparelho, para o risco otimista já
    // mostrar a autoria certa antes de o servidor confirmar
    const supabase = createClient();
    supabase
      .from("membros_equipe")
      .select("nome, user_id")
      .eq("status", "ativo")
      .then(async ({ data }) => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const eu = (data ?? []).find((m) => m.user_id === user?.id);
        if (eu) setMeuNome(eu.nome);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function escolher(b: ItemChecklistDia["bloco"]) {
    setBloco(b);
    window.localStorage.setItem(chave, b);
  }

  const pendentesPorBloco = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of BLOCOS) m[b.key] = 0;
    for (const i of itens) if (!i.conferidoEm) m[i.bloco] += 1;
    return m;
  }, [itens]);

  const doBloco = useMemo(
    () =>
      itens
        .filter((i) => i.bloco === bloco)
        .sort((a, b) => a.ordem - b.ordem),
    [itens, bloco]
  );

  async function alternar(item: ItemChecklistDia) {
    const conferir = !item.conferidoEm;
    // otimista: risca na hora; o servidor grava a autoria de verdade
    setItens((atual) =>
      atual.map((i) =>
        i.id === item.id
          ? {
              ...i,
              conferidoEm: conferir ? new Date().toISOString() : null,
              conferidoPorNome: conferir ? meuNome : null,
            }
          : i
      )
    );
    const supabase = createClient();
    const { error } = await supabase.rpc("conferir_item_dia", {
      p_item_id: item.id,
      p_conferido: conferir,
    });
    if (error) {
      // reverte — melhor a lista voltar do que mentir que conferiu
      setItens((atual) =>
        atual.map((i) =>
          i.id === item.id
            ? {
                ...i,
                conferidoEm: item.conferidoEm,
                conferidoPorNome: item.conferidoPorNome,
              }
            : i
        )
      );
    }
  }

  if (itens.length === 0) {
    return (
      <p className={`text-sm ${t.sub}`}>
        O checklist deste evento está vazio. Monte-o na página do Cronograma.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {/* só blocos que existem NESTE evento: casamento não tem colação,
            colação não tem o bloco do baile */}
        {BLOCOS.filter((b) => itens.some((i) => i.bloco === b.key)).map((b) => {
          const ativo = bloco === b.key;
          const pendentes = pendentesPorBloco[b.key];
          return (
            <button
              key={b.key}
              onClick={() => escolher(b.key)}
              className={`flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
                ativo
                  ? "bg-emerald-600 text-white"
                  : `${t.chip} ${t.text} opacity-80`
              }`}
            >
              {b.label}
              {pendentes > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    ativo ? "bg-emerald-700" : "bg-black/20"
                  }`}
                >
                  {pendentes}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 space-y-2">
        {doBloco.length === 0 && (
          <li className={`text-sm ${t.sub}`}>Nada neste bloco.</li>
        )}
        {doBloco.map((i) => {
          const feito = !!i.conferidoEm;
          return (
            <li key={i.id}>
              <button
                onClick={() => alternar(i)}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${t.panel} ${
                  feito ? "opacity-55" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                    feito
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : `${t.border}`
                  }`}
                >
                  {feito ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-base font-medium leading-snug ${
                      feito ? "line-through" : ""
                    }`}
                  >
                    {i.titulo}
                  </span>
                  {feito && i.conferidoPorNome && i.conferidoEm && (
                    <span className={`mt-0.5 block text-xs ${t.sub}`}>
                      {i.conferidoPorNome.split(" ")[0]} ·{" "}
                      {new Date(i.conferidoEm).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </span>
                {!feito && (i.horario || i.responsavelNome) && (
                  <span className={`shrink-0 text-right text-xs ${t.sub}`}>
                    {i.horario && (
                      <span className="block tabular-nums">
                        {i.horario.slice(0, 5)}
                      </span>
                    )}
                    {i.responsavelNome && (
                      <span className="block">
                        {i.responsavelNome.split(" ")[0]}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
