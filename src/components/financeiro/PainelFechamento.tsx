"use client";

// Fechamento do evento: previsto × realizado, a sobra e o lucro.
//
// É a prestação de contas final e o único lugar do sistema que responde
// "esse evento deu quanto?". Os números são copiados no ato de fechar —
// editar um lançamento antigo depois não pode mudar o que já foi
// entregue à cliente.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/financeiro-core";
import {
  fecharEvento,
  reabrirFechamento,
} from "@/app/(app)/eventos/[id]/financeiro/lancamento-actions";

export type NumerosFechamento = {
  verba_total: number | null;
  alocado: number;
  pago_fornecedores: number;
  a_pagar_fornecedores: number;
  receita_assessoria: number;
  a_receber_assessoria: number;
  custos_diretos: number;
  ja_fechado: boolean;
};

export function PainelFechamento({
  eventId,
  numeros,
  fechamento,
}: {
  eventId: string;
  numeros: NumerosFechamento;
  fechamento: {
    fechadoEm: string;
    sobraDestino: string;
    observacao: string | null;
    verbaRealizada: number;
    receitaAssessoria: number;
    custosDiretos: number;
  } | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState<
    "devolvida" | "virou_extra" | "nao_houve"
  >("nao_houve");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const teto = numeros.verba_total ?? numeros.alocado;
  const sobra = teto - numeros.pago_fornecedores - numeros.a_pagar_fornecedores;
  const lucro = numeros.receita_assessoria - numeros.custos_diretos;
  const pendencias = numeros.a_pagar_fornecedores + numeros.a_receber_assessoria;

  if (fechamento) {
    return (
      <div className="fin-card">
        <div className="fin-card-topo">
          <div>
            <p className="fin-rotulo">Encerrado</p>
            <h2 className="fin-h2">Evento fechado</h2>
          </div>
          <button
            type="button"
            className="fin-link"
            onClick={() =>
              iniciar(async () => {
                await reabrirFechamento(eventId);
                router.refresh();
              })
            }
          >
            Reabrir
          </button>
        </div>
        <div className="fin-kpis">
          <div className="fin-kpi">
            <span className="fin-rotulo">Verba realizada</span>
            <p className="fin-kpi-valor">{money(fechamento.verbaRealizada)}</p>
          </div>
          <div className="fin-kpi">
            <span className="fin-rotulo">Sua receita</span>
            <p className="fin-kpi-valor">{money(fechamento.receitaAssessoria)}</p>
          </div>
          <div className="fin-kpi">
            <span className="fin-rotulo">Seus custos</span>
            <p className="fin-kpi-valor">{money(fechamento.custosDiretos)}</p>
          </div>
          <div className="fin-kpi fin-kpi-destaque">
            <span className="fin-rotulo">Lucro do evento</span>
            <p className="fin-kpi-valor">
              {money(fechamento.receitaAssessoria - fechamento.custosDiretos)}
            </p>
          </div>
        </div>
        <p style={{ marginTop: 14, fontSize: 13, color: "var(--cinza)" }}>
          Fechado em {fechamento.fechadoEm.slice(0, 10).split("-").reverse().join("/")}
          {fechamento.sobraDestino === "devolvida" && " · sobra devolvida à cliente"}
          {fechamento.sobraDestino === "virou_extra" && " · sobra virou extra"}
          {fechamento.observacao && ` · ${fechamento.observacao}`}
        </p>
      </div>
    );
  }

  return (
    <div className="fin-card">
      <div className="fin-card-topo">
        <div>
          <p className="fin-rotulo">Encerramento</p>
          <h2 className="fin-h2">Fechar o evento</h2>
        </div>
        {!aberto && (
          <button
            type="button"
            className="fin-btn"
            onClick={() => setAberto(true)}
          >
            Ver o balanço
          </button>
        )}
      </div>

      {!aberto ? (
        <p style={{ fontSize: 14, color: "var(--cinza)" }}>
          Previsto contra realizado, o destino da sobra e quanto o evento deu
          de lucro. Depois de fechado, os números param no tempo.
        </p>
      ) : (
        <>
          <div className="fin-kpis">
            <div className="fin-kpi">
              <span className="fin-rotulo">Verba prevista</span>
              <p className="fin-kpi-valor">{money(teto)}</p>
            </div>
            <div className="fin-kpi">
              <span className="fin-rotulo">Pago</span>
              <p className="fin-kpi-valor">{money(numeros.pago_fornecedores)}</p>
            </div>
            <div className="fin-kpi">
              <span className="fin-rotulo">Sobra</span>
              <p className="fin-kpi-valor">{money(sobra)}</p>
            </div>
            <div className="fin-kpi fin-kpi-destaque">
              <span className="fin-rotulo">Seu lucro</span>
              <p className="fin-kpi-valor">{money(lucro)}</p>
            </div>
          </div>

          <p style={{ marginTop: 12, fontSize: 13, color: "var(--cinza)" }}>
            Sua receita {money(numeros.receita_assessoria)} menos seus custos{" "}
            {money(numeros.custos_diretos)}.
          </p>

          {pendencias > 0 && (
            <div
              className="fin-alerta fin-t-wait"
              style={{ marginTop: 14 }}
            >
              <span className="fin-alerta-ponto" aria-hidden />
              <div>
                <p className="fin-alerta-titulo">
                  Ainda há {money(pendencias)} em aberto
                </p>
                <p className="fin-alerta-meta">
                  {numeros.a_pagar_fornecedores > 0 &&
                    `${money(numeros.a_pagar_fornecedores)} a pagar`}
                  {numeros.a_pagar_fornecedores > 0 &&
                    numeros.a_receber_assessoria > 0 &&
                    " · "}
                  {numeros.a_receber_assessoria > 0 &&
                    `${money(numeros.a_receber_assessoria)} a receber`}
                  {" · fechar agora congela esses números como estão"}
                </p>
              </div>
            </div>
          )}

          {sobra > 0 && (
            <div style={{ marginTop: 16 }}>
              <span className="fin-rotulo">O que houve com a sobra</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {(
                  [
                    ["devolvida", "Devolvida à cliente"],
                    ["virou_extra", "Virou extra/upgrade"],
                    ["nao_houve", "Não se aplica"],
                  ] as const
                ).map(([v, r]) => (
                  <button
                    key={v}
                    type="button"
                    className="fin-btn"
                    style={{
                      fontSize: 13,
                      background: destino === v ? "var(--nevoa)" : "var(--papel)",
                      borderColor: destino === v ? "var(--cinza-2)" : "var(--linha)",
                    }}
                    onClick={() => setDestino(v)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label style={{ display: "block", marginTop: 14 }}>
            <span className="fin-rotulo">Observação (opcional)</span>
            <textarea
              rows={2}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="O que ficou combinado no encerramento"
              style={{
                width: "100%",
                marginTop: 6,
                padding: 10,
                border: "1px solid var(--linha)",
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "inherit",
                color: "var(--tinta)",
              }}
            />
          </label>

          {erro && (
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--state-late)" }}>
              {erro}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="fin-btn fin-btn-primario"
              disabled={pendente}
              onClick={() => {
                setErro(null);
                iniciar(async () => {
                  const r = await fecharEvento(eventId, {
                    sobraDestino: destino,
                    observacao: obs,
                  });
                  if ("error" in r) {
                    setErro(r.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              {pendente ? "Fechando…" : "Fechar o evento"}
            </button>
            <button
              type="button"
              className="fin-btn"
              onClick={() => setAberto(false)}
            >
              Agora não
            </button>
          </div>
        </>
      )}
    </div>
  );
}
