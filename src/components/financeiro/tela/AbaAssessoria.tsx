"use client";

// Aba "Minha assessoria" — a receita dela.
//
// Mesma gramática da verba, dinheiro diferente: aqui o valor entra no
// bolso dela. A meta do card diz isso com todas as letras, porque
// misturar as duas contas é o erro que a tela antiga induzia.

import { useMemo } from "react";
import { fmtData, money } from "@/lib/financeiro-core";
import { soma, type ItemFinanceiro } from "@/lib/financeiro-tela";
import type { Operacao } from "./ModalFinanceiro";

export function AbaAssessoria({
  parcelas,
  custos,
  contrato,
  assinadoEm,
  abrir,
  extra,
}: {
  /** o que o casal tem a pagar a ela */
  parcelas: ItemFinanceiro[];
  /** o que ela gastou do próprio bolso neste evento */
  custos: ItemFinanceiro[];
  contrato: number | null;
  assinadoEm: string | null;
  abrir: (op: Operacao) => void;
  /** os itens do orçamento que originou o evento, quando houver */
  extra?: React.ReactNode;
}) {
  const recebido = useMemo(
    () => soma(parcelas.filter((p) => p.pagoEm)),
    [parcelas]
  );
  const abertas = useMemo(() => parcelas.filter((p) => !p.pagoEm), [parcelas]);
  const lancado = useMemo(() => soma(parcelas), [parcelas]);
  // o contrato manda; sem ele, vale a soma do que foi lançado
  const total = contrato ?? lancado;
  const aReceber = Math.max(0, total - recebido);
  const proxima = abertas[0] ?? null;
  // o que o contrato prevê e ainda não virou vencimento nenhum
  const faltaLancar = Math.max(0, total - lancado);
  const pctRecebido = total > 0 ? Math.round((recebido / total) * 100) : 0;

  return (
    <div className="fe-colunas">
      <div className="fe-financeiro">
        <div className="fe-card">
          <div className="fe-numeros">
            <button
              type="button"
              className="fe-numero"
              onClick={() => abrir({ tipo: "assContrato" })}
            >
              <span className="fe-rotulo">Contrato de assessoria</span>
              <p className="fe-numero-valor">{total > 0 ? money(total) : "—"}</p>
              <p className="fe-numero-nota fe-acao">
                {assinadoEm ? `assinado ${fmtData(assinadoEm)}` : "definir"}
              </p>
            </button>

            <button type="button" className="fe-numero" disabled>
              <span className="fe-rotulo">Recebido</span>
              <p className="fe-numero-valor">{money(recebido)}</p>
              <p className="fe-numero-nota">{pctRecebido}% do contrato</p>
            </button>

            <button type="button" className="fe-numero fe-destaque" disabled>
              <span className="fe-rotulo">A receber</span>
              <p className="fe-numero-valor">{money(aReceber)}</p>
              <p className="fe-numero-nota">
                {abertas.length === 0 && aReceber > 0
                  ? "ainda sem parcela lançada"
                  : `${abertas.length} ${
                      abertas.length === 1
                        ? "parcela em aberto"
                        : "parcelas em aberto"
                    }`}
              </p>
            </button>

            <button type="button" className="fe-numero" disabled>
              <span className="fe-rotulo">Próximo recebimento</span>
              <p className="fe-numero-valor">
                {proxima ? money(proxima.valor) : "—"}
              </p>
              <p
                className="fe-numero-nota"
                style={proxima ? { color: "var(--state-wait)" } : undefined}
              >
                {proxima
                  ? `${proxima.dataCurta} · ${proxima.titulo}`
                  : "nada em aberto"}
              </p>
            </button>
          </div>
        </div>

        <div className="fe-card" style={{ maxWidth: 820 }}>
          <div className="fe-card-topo">
            <div>
              <h2 className="fe-h2">Parcelas do casal para você</h2>
              <p className="fe-meta">
                este dinheiro é seu · não entra na verba do evento
              </p>
            </div>
            <div className="fe-acoes">
              {faltaLancar > 0 && (
                <button
                  type="button"
                  className="fe-btn"
                  onClick={() =>
                    abrir({
                      tipo: "gerarAssessoria",
                      falta: faltaLancar,
                      jaLancadas: parcelas.length,
                    })
                  }
                >
                  Gerar parcelas
                </button>
              )}
              <button
                type="button"
                className="fe-btn"
                onClick={() => abrir({ tipo: "parcelaAssessoria" })}
              >
                + Lançar parcela
              </button>
              <button
                type="button"
                className="fe-btn fe-btn-primario"
                onClick={() => abrir({ tipo: "receber" })}
              >
                Registrar recebimento
              </button>
            </div>
          </div>

          {parcelas.length === 0 ? (
            <p className="fe-vazio">
              Nenhuma parcela lançada. Lance o que o casal tem a pagar a você.
            </p>
          ) : (
            parcelas.map((p) => (
              <div className="fe-linha" key={p.id}>
                <span className={`fe-linha-data ${p.grupo}`}>{p.dataCurta}</span>
                <span className="fe-linha-texto">
                  <p className="fe-linha-titulo">{p.titulo}</p>
                  <p className="fe-linha-meta">
                    {p.pagoEm && p.comprovante
                      ? `do casal para você · ${p.comprovante.nome}`
                      : "do casal para você"}
                  </p>
                </span>
                <span className="fe-linha-valor">{money(p.valor)}</span>
                <span className={`fe-badge ${p.tone}`}>
                  {p.pagoEm
                    ? p.statusTexto
                    : p.grupo === "depois"
                      ? "previsto"
                      : p.statusTexto}
                </span>
                {!p.pagoEm && (
                  <button
                    type="button"
                    className={`fe-btn fe-btn-sm${
                      p.grupo === "atrasados" ? " fe-btn-primario" : ""
                    }`}
                    onClick={() => abrir({ tipo: "receber", item: p })}
                  >
                    Receber e anexar
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {custos.length > 0 && (
          <div className="fe-card" style={{ maxWidth: 820 }}>
            <div className="fe-card-topo">
              <div>
                <h2 className="fe-h2 fe-h2-menor">Custos seus neste evento</h2>
                <p className="fe-meta">
                  o que saiu do seu bolso · {money(soma(custos))}
                </p>
              </div>
            </div>
            {custos.map((c) => (
              <div className="fe-linha" key={c.id}>
                <span className={`fe-linha-data ${c.grupo}`}>{c.dataCurta}</span>
                <span className="fe-linha-texto">
                  <p className="fe-linha-titulo">{c.titulo}</p>
                  <p className="fe-linha-meta">{c.categoria}</p>
                </span>
                <span className="fe-linha-valor">{money(c.valor)}</span>
                <span className={`fe-badge ${c.tone}`}>{c.statusTexto}</span>
              </div>
            ))}
          </div>
        )}

        {extra}
      </div>
    </div>
  );
}
