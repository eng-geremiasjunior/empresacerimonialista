"use client";

// A conferência de uma proposta, linha a linha — genérica.
//
// Molde visual de ConferenciaExtracao (contratos): uma caixinha por item,
// o interruptor `manter` na frente, o trecho de onde o dado saiu logo
// abaixo em itálico, e o que é editável desabilitado quando a linha está
// desmarcada. A diferença é que aqui o componente NÃO sabe o que é verba,
// fornecedor ou recurso: recebe os grupos prontos e devolve as escolhas.
// Quem traduz proposta em linhas é briefing-aplicacao; quem escreve são
// as actions.

import type { ReactNode } from "react";

export type ItemProposta = {
  id: string;
  /** o sujeito — "Buffet — Sabor & Arte" */
  rotulo: string;
  /** a leitura — "R$ 32.500 (contratado)" */
  valor: string;
  /** a citação de onde o dado saiu (já redigida na origem) */
  trecho: string | null;
  /** o que só aquela linha precisa decidir (o cadastro do fornecedor) */
  extra?: ReactNode;
};

export type GrupoProposta = {
  chave: string;
  rotulo: string;
  itens: ItemProposta[];
};

const BOTAO_APLICAR =
  "rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60";

export function ConferenciaProposta({
  grupos,
  escolhas,
  aoMudar,
  aoAplicar,
  aoDescartar,
  pendente,
  aviso,
}: {
  grupos: GrupoProposta[];
  /** id do item → marcado */
  escolhas: Record<string, boolean>;
  aoMudar: (id: string, manter: boolean) => void;
  aoAplicar: () => void;
  aoDescartar: () => void;
  pendente: boolean;
  /** o que impediu a aplicação — sempre acima dos botões, nunca escondido */
  aviso: string | null;
}) {
  const marcados = grupos.reduce(
    (n, g) => n + g.itens.filter((i) => escolhas[i.id]).length,
    0
  );

  return (
    <div className="space-y-3">
      {grupos.map((g) => (
        <div key={g.chave}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {g.rotulo}
          </p>
          <div className="mt-1.5 space-y-1.5">
            {g.itens.map((item) => {
              const manter = escolhas[item.id] ?? false;
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-gray-100 bg-white px-2 py-1.5"
                >
                  <label className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={manter}
                      disabled={pendente}
                      onChange={(e) => aoMudar(item.id, e.target.checked)}
                    />
                    <span
                      className={`min-w-0 flex-1 text-[12.5px] ${
                        manter ? "text-gray-900" : "text-gray-400"
                      }`}
                    >
                      {item.rotulo}
                      {item.valor && (
                        <span className={manter ? "text-gray-600" : ""}>
                          {" "}
                          — {item.valor}
                        </span>
                      )}
                    </span>
                  </label>
                  {/* fora do <label>: um clique no select não pode desmarcar a linha */}
                  {item.extra && <div className="mt-1 pl-6">{item.extra}</div>}
                  {item.trecho && (
                    <p
                      className="mt-0.5 truncate pl-6 text-[10.5px] italic text-gray-400"
                      title={item.trecho}
                    >
                      “{item.trecho}”
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {aviso && <p className="text-[12px] text-red-600">{aviso}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <button
          onClick={aoAplicar}
          disabled={pendente || marcados === 0}
          className={BOTAO_APLICAR}
        >
          {pendente ? "Aplicando…" : "Aplicar o que está marcado"}
        </button>
        <button
          onClick={() => {
            // um clique apagava a leitura inteira da conversa, sem volta:
            // o texto colado não fica guardado em lugar nenhum
            if (confirm("Descartar a leitura desta conversa? Ela não volta.")) {
              aoDescartar();
            }
          }}
          disabled={pendente}
          className="rounded px-2 py-1.5 text-[12.5px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
        >
          Descartar
        </button>
        {/* a metade que explicava a mecânica dos checkboxes saiu; ficou a
            que é promessa sobre dinheiro, e essa vale a linha */}
        <span className="text-[11px] text-gray-400">Nada entra como pago.</span>
      </div>
    </div>
  );
}
