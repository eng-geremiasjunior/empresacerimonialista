"use client";

// Financeiro do evento — a tela que a cerimonialista mais usa.
//
// Duas telas, nunca as duas ao mesmo tempo: Assessoria (o que ela recebe
// da cliente) e Fornecedores (a verba que ela administra). Trocar de tela
// volta a visão para o calendário e fecha o drawer.
//
// Nenhum bloco daqui calcula status, total ou ordem: tudo vem pronto de
// financeiro-core.ts. Isso é o que permite testar a regra sem browser.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildAlertas,
  buildCalendario,
  buildCategorias,
  buildFila,
  buildResumo,
  fmtData,
  lancamentosDaTela,
  money,
  statusDe,
  type Lancamento,
  type Tone,
} from "@/lib/financeiro-core";
import type { FinanceiroDoEvento } from "@/lib/supabase/financeiro-evento";
import { DrawerLancamento } from "./DrawerLancamento";
import "./financeiro.css";

type Screen = "assessoria" | "fornecedores";
type View = "calendario" | "fila" | "categorias" | "resumo";

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function FinanceiroEvento({
  eventId,
  dados,
  contexto,
}: {
  eventId: string;
  dados: FinanceiroDoEvento;
  contexto: { evento: string; data: string; diasAte: number };
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("fornecedores");
  const [view, setView] = useState<View>("calendario");
  const [drawer, setDrawer] = useState<Lancamento | null>(null);
  const [mes, setMes] = useState(() => dados.hoje.slice(0, 7));

  const hoje = dados.hoje;
  const daTela = useMemo(
    () => lancamentosDaTela(dados.lancamentos, screen),
    [dados.lancamentos, screen]
  );

  const alertas = useMemo(
    () =>
      buildAlertas(daTela, hoje, {
        screen,
        saldoCaixa:
          screen === "fornecedores"
            ? {
                emMaos: dados.saldoCaixa.emMaos,
                compromissado30d: dados.saldoCaixa.compromissado30d,
              }
            : null,
      }),
    [daTela, hoje, screen, dados.saldoCaixa]
  );

  const cells = useMemo(
    () => buildCalendario(daTela, mes, hoje),
    [daTela, mes, hoje]
  );
  const fila = useMemo(() => buildFila(daTela, hoje), [daTela, hoje]);
  const cats = useMemo(
    () => buildCategorias(dados.categorias, hoje),
    [dados.categorias, hoje]
  );
  const resumo = useMemo(
    () =>
      buildResumo(
        {
          lancamentos: dados.lancamentos,
          categorias: dados.categorias,
          verbaTotal: dados.verbaTotal,
          contrato: dados.contrato,
        },
        screen
      ),
    [dados, screen]
  );

  // trocar de tela reseta a visão e fecha o drawer
  function trocarTela(s: Screen) {
    setScreen(s);
    setView("calendario");
    setDrawer(null);
  }

  const views: { chave: View; rotulo: string }[] =
    screen === "fornecedores"
      ? [
          { chave: "calendario", rotulo: "Calendário de pagamentos" },
          { chave: "fila", rotulo: "Fila de vencimentos" },
          { chave: "categorias", rotulo: "Verba por categoria" },
          { chave: "resumo", rotulo: "Resumo" },
        ]
      : [
          { chave: "calendario", rotulo: "Calendário de recebimentos" },
          { chave: "fila", rotulo: "Parcelas e extras" },
          { chave: "resumo", rotulo: "Resumo" },
        ];

  const aReceber = dados.lancamentos
    .filter((l) => l.direcao === "entrada" && !l.pagoEm)
    .reduce((t, l) => t + l.valor, 0);
  const aPagar = dados.lancamentos
    .filter((l) => l.direcao === "saida" && !l.pagoEm)
    .reduce((t, l) => t + l.valor, 0);

  const porId = (id: string) => dados.lancamentos.find((l) => l.id === id) ?? null;
  const [ano, mesNum] = mes.split("-").map(Number);

  return (
    <div className="fin" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* topbar */}
      <div className="fin-topo">
        <div>
          <p className="fin-eyebrow">
            {contexto.evento} · {fmtData(contexto.data)} ·{" "}
            {contexto.diasAte >= 0
              ? `faltam ${contexto.diasAte} dias`
              : `há ${Math.abs(contexto.diasAte)} dias`}
          </p>
          <h1 className="fin-h1">Financeiro</h1>
        </div>
        <div className="fin-topo-acoes">
          <span className="fin-hoje">
            hoje
            <br />
            {fmtData(hoje)}
          </span>
          <button
            type="button"
            className="fin-btn"
            onClick={() => setView("fila")}
          >
            Extrato
          </button>
          <button
            type="button"
            className="fin-btn fin-btn-primario"
            onClick={() => {
              const alvo = fila.find((l) => !l.pagoEm);
              if (alvo) setDrawer(alvo);
              else setView("fila");
            }}
          >
            Anexar comprovante
          </button>
        </div>
      </div>

      {/* seletor de tela — nunca as duas ao mesmo tempo */}
      <div className="fin-telas">
        <button
          type="button"
          className="fin-tela"
          aria-current={screen === "assessoria"}
          onClick={() => trocarTela("assessoria")}
        >
          <span className="fin-tela-nome">Assessoria</span>
          <span className="fin-tela-meta">
            sua receita · a receber {money(aReceber)}
          </span>
        </button>
        <button
          type="button"
          className="fin-tela"
          aria-current={screen === "fornecedores"}
          onClick={() => trocarTela("fornecedores")}
        >
          <span className="fin-tela-nome">Fornecedores</span>
          <span className="fin-tela-meta">
            verba do evento · a pagar {money(aPagar)}
          </span>
        </button>
      </div>

      {/* alertas */}
      <div className="fin-alertas">
        {alertas.map((a, i) => (
          <div
            key={a.kind + i}
            className={`fin-alerta fin-t-${a.tone} ${
              a.kind === "digest" || a.kind === "clear" || a.kind === "capital"
                ? "fin-alerta-larga"
                : ""
            }`}
          >
            <span className="fin-alerta-ponto" aria-hidden />
            <div style={{ minWidth: 0 }}>
              <p className="fin-alerta-titulo">{a.title}</p>
              <p className="fin-alerta-meta">{a.meta}</p>
            </div>
          </div>
        ))}
      </div>

      {/* card de contexto */}
      {screen === "fornecedores" ? (
        <CardVerba dados={dados} totais={cats.totais} eventId={eventId} />
      ) : (
        <CardAssessoria dados={dados} />
      )}

      {/* abas de visão */}
      <div className="fin-abas">
        {views.map((v) => (
          <button
            key={v.chave}
            type="button"
            className={`fin-aba ${v.chave === "calendario" ? "fin-so-pc" : ""}`}
            aria-current={view === v.chave ? "page" : undefined}
            onClick={() => setView(v.chave)}
          >
            {v.rotulo}
          </button>
        ))}
      </div>

      {/* conteúdo */}
      <div className="fin-card">
        {view === "calendario" && (
          <>
            <div className="fin-cal-topo">
              <span className="fin-cal-mes">
                {MESES[mesNum - 1]} {ano}
              </span>
              <span className="fin-cal-nav">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => setMes(deslocarMes(mes, -1))}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  onClick={() => setMes(deslocarMes(mes, 1))}
                >
                  ›
                </button>
              </span>
            </div>
            <div className="fin-cal-semana">
              {SEMANA.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="fin-cal-grade">
              {cells.map((c, i) => (
                <div
                  key={i}
                  className={`fin-cal-celula${c.fora ? " fora" : ""}${c.hoje ? " hoje" : ""}`}
                >
                  <span
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span className="fin-cal-dia">{c.day}</span>
                    {c.hoje && <span className="fin-cal-hoje-tag">hoje</span>}
                  </span>
                  {c.items.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      className={`fin-chip ${ch.direcao === "entrada" ? "entrada" : ""} ${ch.late ? "late" : ""}`}
                      onClick={() => setDrawer(porId(ch.id))}
                    >
                      <span className="fin-chip-valor">{ch.valor}</span>
                      <span className="fin-chip-label">{ch.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "fila" && (
          <>
            {fila.length === 0 ? (
              <p className="fin-vazio">
                {screen === "assessoria"
                  ? "Nenhum recebimento lançado ainda."
                  : "Nenhum pagamento lançado ainda."}
              </p>
            ) : (
              fila.map((l) => {
                const atrasada = l.tone === "late" && !l.pagoEm;
                const [, m, d] = l.vencimento.split("-");
                return (
                  <div
                    key={l.id}
                    className={`fin-fila-linha${atrasada ? " atrasada" : ""}`}
                  >
                    <span className="fin-data-chip">
                      <span className="fin-data-dia">{d}</span>
                      <span className="fin-data-mes">
                        {MESES[Number(m) - 1].slice(0, 3)}
                      </span>
                    </span>
                    <span className="fin-fila-corpo">
                      <span className="fin-fila-titulo">
                        {l.titulo}
                        <span className="fin-pill">
                          {l.direcao === "entrada" ? "entrada" : "saída"}
                        </span>
                      </span>
                      <span className="fin-fila-meta">
                        {[
                          l.categoria,
                          l.fornecedor !== "—" ? l.fornecedor : null,
                          l.origem === "caixa" ? "do seu caixa" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="fin-fila-valor">{money(l.valor)}</span>
                    <span className={`fin-badge ${l.tone}`}>{l.status}</span>
                    {l.pagoEm ? (
                      <span className="fin-fila-meta" style={{ minWidth: 120 }}>
                        {l.comprovante?.nome ?? "sem comprovante"}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="fin-btn"
                        style={{ minHeight: 36 }}
                        onClick={() => setDrawer(l)}
                      >
                        Anexar comprovante
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {view === "categorias" && screen === "fornecedores" && (
          <div className="fin-tabela-rolar">
            {cats.linhas.length === 0 ? (
              <p className="fin-vazio">
                Nenhuma verba alocada ainda. A alocação nasce quando você
                fecha um fornecedor no Planejamento.
              </p>
            ) : (
              <table className="fin-tabela">
                <thead>
                  <tr>
                    <th>Categoria · fornecedor</th>
                    <th style={{ textAlign: "right" }}>Alocado</th>
                    <th style={{ textAlign: "right" }}>Pago</th>
                    <th style={{ textAlign: "right" }}>A pagar</th>
                    <th>Andamento</th>
                    <th style={{ textAlign: "right" }}>Próx.</th>
                  </tr>
                </thead>
                <tbody>
                  {cats.linhas.map((c) => (
                    <tr
                      key={c.id}
                      className={c.proxLancamento ? "clicavel" : undefined}
                      onClick={() =>
                        c.proxLancamento && setDrawer(c.proxLancamento)
                      }
                    >
                      <td>
                        <span className="fin-cat-nome">{c.nome}</span>
                        <span className="fin-cat-forn">{c.fornecedor}</span>
                      </td>
                      <td className="fin-num">{money(c.alocado)}</td>
                      <td className="fin-num">{money(c.pago)}</td>
                      <td className="fin-num">{money(c.aPagar)}</td>
                      <td>
                        <span className="fin-and">
                          <i style={{ width: `${Math.min(100, c.pct)}%` }} />
                        </span>
                      </td>
                      <td
                        className="fin-num"
                        style={{
                          fontSize: 13,
                          color:
                            c.proxTone === "late"
                              ? "var(--state-late)"
                              : c.proxTone === "wait"
                                ? "var(--state-wait)"
                                : "var(--cinza)",
                        }}
                      >
                        {c.prox}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total alocado</td>
                    <td className="fin-num">{money(cats.totais.alocado)}</td>
                    <td className="fin-num">{money(cats.totais.pago)}</td>
                    <td className="fin-num">{money(cats.totais.aPagar)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {view === "resumo" && (
          <>
            <p className="fin-rotulo" style={{ marginBottom: 8 }}>
              {screen === "assessoria"
                ? "Sua receita neste evento"
                : "Verba administrada"}
            </p>
            {resumo.map((r) => (
              <div key={r.label} className="fin-resumo-linha">
                <span>
                  <span className="fin-resumo-label">{r.label}</span>
                  <span className="fin-resumo-meta">{r.meta}</span>
                </span>
                <span className="fin-resumo-valor">{r.valor}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {drawer && (
        <DrawerLancamento
          eventId={eventId}
          lancamento={drawer}
          hoje={hoje}
          cronograma={dados.lancamentos.filter(
            (l) =>
              drawer.supplierId != null && l.supplierId === drawer.supplierId
          )}
          onFechar={() => setDrawer(null)}
          onMudou={() => router.refresh()}
        />
      )}
    </div>
  );
}

function deslocarMes(mes: string, delta: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CardVerba({
  dados,
  totais,
  eventId,
}: {
  dados: FinanceiroDoEvento;
  totais: { alocado: number; pago: number; aPagar: number };
  eventId: string;
}) {
  const teto = dados.verbaTotal;
  const livre = teto == null ? null : teto - totais.alocado;
  const base = teto ?? totais.alocado;
  const pctPago = base ? (totais.pago / base) * 100 : 0;
  const pctComp = base ? (totais.aPagar / base) * 100 : 0;

  return (
    <div className="fin-card">
      <div className="fin-card-topo">
        <div>
          <p className="fin-rotulo">Fornecedores</p>
          <h2 className="fin-h2">Verba do evento que você administra</h2>
        </div>
        <a className="fin-link" href={`/eventos/${eventId}/financeiro/verba`}>
          Ajustar verba
        </a>
      </div>

      <div className="fin-kpis">
        <div className="fin-kpi">
          <span className="fin-rotulo">Verba total</span>
          <p className="fin-kpi-valor">{teto == null ? "—" : money(teto)}</p>
        </div>
        <div className="fin-kpi">
          <span className="fin-rotulo">Pago</span>
          <p className="fin-kpi-valor">{money(totais.pago)}</p>
        </div>
        <div className="fin-kpi fin-kpi-destaque">
          <span className="fin-rotulo">A pagar</span>
          <p className="fin-kpi-valor">{money(totais.aPagar)}</p>
        </div>
        <div className="fin-kpi">
          <span className="fin-rotulo">Livre</span>
          <p className="fin-kpi-valor">{livre == null ? "—" : money(livre)}</p>
        </div>
      </div>

      <div className="fin-barra">
        <span className="fin-barra-pago" style={{ width: `${pctPago}%` }} />
        <span
          className="fin-barra-comprometido"
          style={{ width: `${pctComp}%` }}
        />
      </div>
      <div className="fin-barra-legenda">
        <span>
          <i style={{ background: "var(--tinta)" }} />
          pago {Math.round(pctPago)}%
        </span>
        <span>
          <i style={{ background: "var(--cinza-2)" }} />
          comprometido {Math.round(pctComp)}%
        </span>
        {teto != null && (
          <span>
            <i style={{ background: "var(--nevoa)" }} />
            livre {Math.round(100 - pctPago - pctComp)}%
          </span>
        )}
        {/* o dinheiro que ela administra de terceiro: some quando é zero,
            porque nem toda cerimonialista opera com caixa */}
        {dados.saldoCaixa.recebidoDaCliente > 0 && (
          <span className="fin-mono">
            em caixa {money(dados.saldoCaixa.emMaos)}
          </span>
        )}
      </div>
    </div>
  );
}

function CardAssessoria({ dados }: { dados: FinanceiroDoEvento }) {
  const entradas = dados.lancamentos.filter((l) => l.direcao === "entrada");
  const recebido = entradas
    .filter((l) => l.pagoEm)
    .reduce((t, l) => t + l.valor, 0);
  const total = dados.contrato.valor + dados.contrato.extras;

  return (
    <div className="fin-card">
      <div className="fin-card-topo">
        <div>
          <p className="fin-rotulo">Assessoria</p>
          <h2 className="fin-h2">O que você recebe da cliente</h2>
        </div>
      </div>
      <div className="fin-kpis">
        <div className="fin-kpi">
          <span className="fin-rotulo">Contratado</span>
          <p className="fin-kpi-valor">{money(total)}</p>
        </div>
        <div className="fin-kpi">
          <span className="fin-rotulo">Recebido</span>
          <p className="fin-kpi-valor">{money(recebido)}</p>
        </div>
        <div className="fin-kpi fin-kpi-destaque">
          <span className="fin-rotulo">A receber</span>
          <p className="fin-kpi-valor">{money(total - recebido)}</p>
        </div>
        <div className="fin-kpi">
          <span className="fin-rotulo">Parcelas</span>
          <p className="fin-kpi-valor">
            {entradas.filter((l) => l.pagoEm).length}/{entradas.length}
          </p>
        </div>
      </div>
    </div>
  );
}
