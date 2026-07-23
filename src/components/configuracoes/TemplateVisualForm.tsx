"use client";

// Configurações > Conteúdo da Proposta > Template Visual.
// Dois cards clicáveis com uma miniatura montada com as próprias cores do
// tema — sem screenshot para manter, e o preview nunca fica desatualizado
// em relação à paleta real.

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { TEMAS, type TemaOrcamento } from "@/lib/orcamento-temas";
import { salvarTemplateOrcamento } from "@/lib/conteudo-institucional";

function Miniatura({ tema }: { tema: TemaOrcamento }) {
  const t = TEMAS[tema];
  return (
    <div
      className="h-[86px] w-full overflow-hidden rounded-md"
      style={{ background: t.corFundo, border: `1px solid ${t.corBorda}` }}
    >
      {/* faixa do hero */}
      <div className="h-[30px] w-full" style={{ background: t.gradienteHero }} />
      <div className="flex gap-1.5 p-2">
        {/* "sidebar" */}
        <div
          className="h-[42px] w-[16px] flex-shrink-0 rounded-sm"
          style={{ background: t.corCard, border: `1px solid ${t.corBorda}` }}
        />
        <div className="flex-1 space-y-1.5">
          {/* bloco de destaque + valor */}
          <div
            className="flex h-[20px] items-center rounded-sm px-1.5"
            style={{ background: t.corFundoDestaque }}
          >
            <div
              className="h-[6px] w-[34px] rounded-full"
              style={{ background: t.corAcento }}
            />
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[16px] flex-1 rounded-sm"
                style={{ background: t.corCard, border: `1px solid ${t.corBorda}` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateVisualForm({
  inicial,
}: {
  inicial: TemaOrcamento;
}) {
  const [atual, setAtual] = useState<TemaOrcamento>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function escolher(tema: TemaOrcamento) {
    if (tema === atual || pendente) return;
    const anterior = atual;
    setAtual(tema); // otimista: a troca precisa parecer instantânea
    setErro(null);
    startTransition(async () => {
      const res = await salvarTemplateOrcamento(tema);
      if ("error" in res) {
        setAtual(anterior);
        setErro(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(TEMAS) as TemaOrcamento[]).map((tema) => {
          const t = TEMAS[tema];
          const selecionado = atual === tema;
          return (
            <button
              key={tema}
              onClick={() => escolher(tema)}
              disabled={pendente}
              aria-pressed={selecionado}
              className={`rounded-xl border p-3 text-left transition-colors disabled:opacity-60 ${
                selecionado
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Miniatura tema={tema} />
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {t.nome}
                  </div>
                  <div className="text-xs text-gray-500">{t.descricao}</div>
                </div>
                {selecionado ? (
                  <span className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-gray-900">
                    <Check size={14} /> Em uso
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    Selecionar
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Vale para todas as propostas da empresa — inclusive as já enviadas.
      </p>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
