"use client";

// Aba "Verba do evento" — o dinheiro do casal que ela administra.
//
// Duas colunas: a financeira (papel branco) e o trilho auxiliar (névoa).
// A distinção de superfície é a regra do desenho: tudo que é dinheiro é
// branco, tudo que só ajuda a achar e ler é névoa.
//
// A ordem de cima para baixo responde à pergunta do dia a dia — "o que
// eu preciso pagar agora?" —, por isso a agenda é organizada pelo TEMPO
// (atrasados → próximos dias → depois → pagos), e não por fornecedor.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmtData, money } from "@/lib/financeiro-core";
import {
  desmarcarPago,
  excluirTransacao,
  fecharPendencia,
} from "@/app/(app)/eventos/[id]/financeiro/actions";
import { excluirVerbaFornecedor } from "@/app/(app)/eventos/[id]/financeiro/verba-actions";
import {
  MESES,
  agrupar,
  autorPorLancamento,
  caixaDoEvento,
  filtrarItens,
  linhasDeFornecedor,
  miniCalendario,
  numerosDaVerba,
  precisaDeAcao,
  resumoDosProximosMeses,
  soma,
  type ContratoFornecedor,
  type Filtro,
  type ItemFinanceiro,
  type LinhaDeFornecedor,
  type PendenciaAberta,
  type RegistroFinanceiro,
} from "@/lib/financeiro-tela";
import type { Operacao } from "./ModalFinanceiro";

const SEMANA = ["s", "t", "q", "q", "s", "s", "d"];

const COR_DO_PONTO: Record<string, string> = {
  atrasado: "var(--state-late)",
  semana: "var(--state-wait)",
  aberto: "var(--cinza-3)",
  quitado: "var(--salvia-300)",
};

export function AbaVerba({
  eventId,
  hoje,
  janela,
  agenda,
  entradas,
  contratos,
  objetivos,
  verbaTotal,
  registros,
  pendencias,
  mostrarCalendario = true,
  linkCobranca,
  abrir,
}: {
  eventId: string;
  hoje: string;
  janela: number;
  agenda: ItemFinanceiro[];
  entradas: ItemFinanceiro[];
  contratos: ContratoFornecedor[];
  objetivos: { id: string; nome: string; previsto: number }[];
  verbaTotal: number | null;
  registros: RegistroFinanceiro[];
  pendencias: PendenciaAberta[];
  mostrarCalendario?: boolean;
  /** wa.me da cliente, quando o cadastro tem telefone */
  linkCobranca: string | null;
  abrir: (op: Operacao) => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>("aberto");
  const [dia, setDia] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [depoisAberto, setDepoisAberto] = useState(false);
  const [pagosAberto, setPagosAberto] = useState(false);
  const [histAberto, setHistAberto] = useState(false);
  const [avulsosAberto, setAvulsosAberto] = useState(false);
  const [mes, setMes] = useState(() => {
    const [a, m] = hoje.split("-").map(Number);
    return { ano: a, mes: m };
  });

  const refAgenda = useRef<HTMLDivElement>(null);
  const refFornecedores = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, transicao] = useTransition();

  /*
   * Desfazer e excluir não estão no desenho, e são o que faz falta no
   * dia em que ela erra o valor. Ficam fora da agenda — só dentro do
   * painel do fornecedor e nos avulsos —, e cada um deixa linha no
   * histórico (167): nada some sem rastro.
   */
  function desfazer(id: string) {
    if (!confirm("Desfazer este pagamento? A parcela volta para a agenda.")) return;
    transicao(async () => {
      await desmarcarPago(eventId, id);
      router.refresh();
    });
  }
  function excluir(id: string) {
    if (!confirm("Excluir este lançamento? Ele sai da verba e da prestação.")) return;
    transicao(async () => {
      await excluirTransacao(eventId, id);
      router.refresh();
    });
  }
  function remover(orcamentoId: string) {
    if (!confirm("Tirar este fornecedor da verba do evento?")) return;
    transicao(async () => {
      await excluirVerbaFornecedor(eventId, orcamentoId);
      router.refresh();
    });
  }
  function descartarPendencia(id: string) {
    transicao(async () => {
      await fecharPendencia(eventId, id, "descartada");
      router.refresh();
    });
  }

  const numeros = useMemo(
    () => numerosDaVerba(contratos, agenda, verbaTotal),
    [contratos, agenda, verbaTotal]
  );
  const caixa = useMemo(
    () => caixaDoEvento(entradas, agenda, hoje),
    [entradas, agenda, hoje]
  );
  const fornecedores = useMemo(
    () => linhasDeFornecedor(contratos, agenda),
    [contratos, agenda]
  );
  const visiveis = useMemo(
    () => filtrarItens(agenda, { filtro, dia, busca }),
    [agenda, filtro, dia, busca]
  );
  const grupos = useMemo(() => agrupar(visiveis, janela), [visiveis, janela]);
  const avulsos = useMemo(() => agenda.filter((i) => i.avulso), [agenda]);
  const autores = useMemo(() => autorPorLancamento(registros), [registros]);

  const semFornecedor = useMemo(
    () =>
      objetivos.filter(
        (o) =>
          o.previsto > 0 &&
          !contratos.some((c) => c.objetivoId === o.id && c.valor != null)
      ),
    [objetivos, contratos]
  );

  const acoes = useMemo(
    () => precisaDeAcao(agenda, fornecedores, semFornecedor, pendencias, janela),
    [agenda, fornecedores, semFornecedor, pendencias, janela]
  );

  const celulas = useMemo(
    () => miniCalendario(agenda, mes.ano, mes.mes, hoje),
    [agenda, mes, hoje]
  );
  const proximosMeses = useMemo(
    () => resumoDosProximosMeses(agenda, mes.ano, mes.mes),
    [agenda, mes]
  );

  function rolarAte(alvo: React.RefObject<HTMLDivElement>) {
    const el = alvo.current;
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 16,
      behavior: "smooth",
    });
  }

  function irParaAgenda(novoFiltro: Filtro) {
    setFiltro(novoFiltro);
    setDia(null);
    setBusca("");
    if (novoFiltro !== "aberto") setPagosAberto(true);
    setTimeout(() => rolarAte(refAgenda), 40);
  }

  const abertos = agenda.filter((i) => !i.pagoEm);
  const metaAgenda = dia
    ? "1 dia selecionado"
    : filtro === "pagos"
      ? `${agenda.length - abertos.length} pagamentos feitos`
      : `${abertos.length} em aberto · ${money(numeros.aPagar)}`;

  return (
    <div className="fe-colunas">
      <div className="fe-financeiro">
        {/* ---------- a faixa de números ---------- */}
        <div className="fe-card">
          <div className="fe-numeros">
            <button
              type="button"
              className="fe-numero"
              onClick={() => abrir({ tipo: "verba" })}
            >
              <span className="fe-rotulo">Verba total</span>
              <p className="fe-numero-valor">
                {numeros.verba == null ? "—" : money(numeros.verba)}
              </p>
              <p className="fe-numero-nota fe-acao">
                {numeros.verba == null ? "definir" : "ajustar"}
              </p>
            </button>

            <button
              type="button"
              className="fe-numero"
              onClick={() => rolarAte(refFornecedores)}
            >
              <span className="fe-rotulo">Contratado</span>
              <p className="fe-numero-valor">{money(numeros.contratado)}</p>
              <p className="fe-numero-nota">
                {numeros.fornecedores}{" "}
                {numeros.fornecedores === 1 ? "fornecedor" : "fornecedores"}
              </p>
            </button>

            <button
              type="button"
              className="fe-numero"
              onClick={() => irParaAgenda("pagos")}
            >
              <span className="fe-rotulo">Pago</span>
              <p className="fe-numero-valor">{money(numeros.pago)}</p>
              <p className="fe-numero-nota">
                {numeros.pctPago == null
                  ? "aos fornecedores"
                  : `${numeros.pctPago}% da verba`}
              </p>
            </button>

            <button
              type="button"
              className="fe-numero fe-destaque"
              onClick={() => irParaAgenda("aberto")}
            >
              <span className="fe-rotulo">A pagar</span>
              <p className="fe-numero-valor">{money(numeros.aPagar)}</p>
              <p
                className={`fe-numero-nota${numeros.atrasado > 0 ? " fe-atrasado" : ""}`}
              >
                {numeros.atrasado > 0
                  ? `${money(numeros.atrasado)} atrasado`
                  : "nada atrasado"}
              </p>
            </button>

            <button type="button" className="fe-numero" disabled>
              <span className="fe-rotulo">Livre</span>
              <p className="fe-numero-valor">
                {numeros.livre == null ? "—" : money(numeros.livre)}
              </p>
              <p className="fe-numero-nota">verba − contratado</p>
            </button>
          </div>
        </div>

        {/* ---------- caixa do evento ---------- */}
        {caixa.existe && (
          <div className="fe-card">
            <div className="fe-card-topo fe-caixa-topo">
              <div>
                <h2 className="fe-h2 fe-h2-menor">Caixa do evento</h2>
                <p className="fe-meta">
                  o que o casal já repassou para você pagar os fornecedores
                </p>
              </div>
              <button
                type="button"
                className="fe-btn fe-btn-sm"
                onClick={() => abrir({ tipo: "entrada" })}
              >
                Registrar entrada do casal
              </button>
            </div>

            <div className="fe-caixa-numeros">
              <div className="fe-caixa-numero">
                <span className="fe-rotulo">Recebido do casal</span>
                <p className="fe-caixa-valor">{money(caixa.recebido)}</p>
              </div>
              <div className="fe-caixa-numero">
                <span className="fe-rotulo">Já pago do caixa</span>
                <p className="fe-caixa-valor">− {money(caixa.pagoDoCaixa)}</p>
              </div>
              <div className="fe-caixa-numero">
                <span className="fe-rotulo">Em caixa</span>
                <p
                  className={`fe-caixa-valor forte${caixa.emCaixa < 0 ? " negativo" : ""}`}
                >
                  {money(caixa.emCaixa)}
                </p>
              </div>
              <div className="fe-caixa-numero">
                <span className="fe-rotulo">Sai em 30 dias</span>
                <p className="fe-caixa-valor">{money(caixa.sai30)}</p>
              </div>
            </div>

            {/* Sem repasse nenhum, "peça X à cliente" seria alarme falso:
                pode ser um evento em que o casal paga cada fornecedor
                direto. A faixa só cobra quando existe caixa de verdade. */}
            <div
              className={`fe-faixa ${
                caixa.recebido === 0 ? "" : caixa.pedir > 0 ? "pedir" : "ok"
              }`}
            >
              <span className="fe-faixa-ponto" aria-hidden />
              <div className="fe-faixa-texto">
                <p className="fe-faixa-titulo">
                  {caixa.recebido === 0
                    ? "Nenhum repasse do casal registrado"
                    : caixa.pedir > 0
                      ? `Peça ${money(caixa.pedir)} à cliente`
                      : "Caixa suficiente para os próximos 30 dias"}
                </p>
                <p className="fe-faixa-detalhe">
                  {caixa.recebido === 0
                    ? "quando o casal te passar dinheiro para pagar fornecedor, registre aqui"
                    : caixa.pedir > 0
                      ? `saem ${money(caixa.sai30)} até ${fmtData(caixa.ate)} e há ${money(
                          caixa.emCaixa
                        )} em caixa`
                      : `saem ${money(caixa.sai30)} até ${fmtData(caixa.ate)}`}
                </p>
              </div>
              {caixa.recebido > 0 && caixa.pedir > 0 && linkCobranca && (
                <a
                  className="fe-btn fe-btn-fantasma fe-btn-sm"
                  href={linkCobranca}
                  target="_blank"
                  rel="noreferrer"
                >
                  Cobrar no WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {/* ---------- agenda de pagamentos ---------- */}
        <div className="fe-card" ref={refAgenda}>
          <div className="fe-card-topo">
            <div>
              <h2 className="fe-h2">Agenda de pagamentos</h2>
              <p className="fe-meta">{metaAgenda}</p>
            </div>
            <div className="fe-acoes">
              <button
                type="button"
                className="fe-btn"
                onClick={() => abrir({ tipo: "despesa" })}
              >
                Lançar despesa
              </button>
              <button
                type="button"
                className="fe-btn fe-btn-primario"
                onClick={() => abrir({ tipo: "pagar" })}
              >
                Marcar pagamento
              </button>
            </div>
          </div>

          {dia && (
            <div className="fe-filtro-dia">
              <span>
                Mostrando só <b>{fmtData(dia)}</b>
              </span>
              <button type="button" className="fe-link" onClick={() => setDia(null)}>
                ver tudo
              </button>
            </div>
          )}

          {grupos.length === 0 ? (
            <p className="fe-vazio">Nada a pagar neste recorte.</p>
          ) : (
            grupos.map((g) => {
              const recolhido =
                (g.chave === "depois" && !depoisAberto && !dia) ||
                (g.chave === "pagos" && !pagosAberto && !dia);
              return (
                <div key={g.chave}>
                  <div className={`fe-grupo ${g.chave}`}>
                    {g.chave === "depois" || g.chave === "pagos" ? (
                      <button
                        type="button"
                        className="fe-grupo-botao"
                        onClick={() =>
                          g.chave === "depois"
                            ? setDepoisAberto((v) => !v)
                            : setPagosAberto((v) => !v)
                        }
                      >
                        <span>
                          {g.rotulo} · {g.itens.length}
                        </span>
                        <span>
                          {money(g.total)} {recolhido ? "mostrar ▾" : "ocultar ▴"}
                        </span>
                      </button>
                    ) : (
                      <>
                        <span>
                          {g.rotulo} · {g.itens.length}
                        </span>
                        <span>{money(g.total)}</span>
                      </>
                    )}
                  </div>

                  {!recolhido &&
                    g.itens.map((i) => (
                      <Linha key={i.id} item={i} abrir={abrir} />
                    ))}
                </div>
              );
            })
          )}
        </div>

        {/* ---------- fornecedores ---------- */}
        <div className="fe-card" ref={refFornecedores}>
          <div className="fe-card-topo">
            <div>
              <h2 className="fe-h2">Fornecedores</h2>
              <p className="fe-meta">
                contratos e parcelas · clique na linha para abrir
              </p>
            </div>
            <button
              type="button"
              className="fe-btn"
              onClick={() => abrir({ tipo: "contrato" })}
            >
              + Adicionar fornecedor à verba
            </button>
          </div>

          {fornecedores.length === 0 ? (
            <p className="fe-vazio">
              Nenhum fornecedor na verba ainda. O contrato de cada um entra aqui.
            </p>
          ) : (
            <>
              <div className="fe-colunas-forn">
                <span className="fe-col-nome">Fornecedor</span>
                <span className="fe-col-valores">A pagar · pago</span>
                <span className="fe-col-prox">Próx. venc.</span>
                <span className="fe-col-chevron" />
              </div>

              {fornecedores.map((f) => (
                <Fornecedor
                  key={f.id}
                  linha={f}
                  aberto={expandido === f.id}
                  alternar={() => setExpandido(expandido === f.id ? null : f.id)}
                  abrir={abrir}
                  desfazer={desfazer}
                  excluir={excluir}
                  remover={remover}
                />
              ))}

              <div className="fe-total">
                <span className="fe-col-nome">Total</span>
                <span className="fe-col-valores">
                  <span className="fe-valores-a-pagar">{money(numeros.aPagar)}</span>
                  <span className="fe-valores-pago">pago {money(numeros.pago)}</span>
                </span>
                <span className="fe-col-prox" />
                <span className="fe-col-chevron" />
              </div>
            </>
          )}
        </div>

        {/* ---------- lançamentos avulsos ---------- */}
        {avulsos.length > 0 && (
          <div className="fe-card">
            <button
              type="button"
              className="fe-recolhivel"
              onClick={() => setAvulsosAberto((v) => !v)}
            >
              <span>
                <span className="fe-h2 fe-h2-menor">Lançamentos avulsos</span>
                <span className="fe-meta" style={{ display: "block" }}>
                  despesas fora de fornecedor · {avulsos.length}{" "}
                  {avulsos.length === 1 ? "registro" : "registros"} ·{" "}
                  {money(soma(avulsos))}
                </span>
              </span>
              <span className="fe-chevron">
                {avulsosAberto ? "ocultar ▴" : "abrir ▾"}
              </span>
            </button>
            {avulsosAberto &&
              avulsos.map((i) => (
                <Linha
                  key={i.id}
                  item={i}
                  abrir={abrir}
                  desfazer={desfazer}
                  excluir={excluir}
                />
              ))}
          </div>
        )}

        {/* ---------- histórico ---------- */}
        <div className="fe-card">
          <button
            type="button"
            className="fe-recolhivel"
            onClick={() => setHistAberto((v) => !v)}
          >
            <span>
              <span className="fe-h2 fe-h2-menor">Histórico de lançamentos</span>
              <span className="fe-meta" style={{ display: "block" }}>
                quem registrou, quando e com qual comprovante ·{" "}
                {registros.length === 0 ? "nada ainda" : `${registros.length} registros`}
              </span>
            </span>
            <span className="fe-chevron">{histAberto ? "ocultar ▴" : "abrir ▾"}</span>
          </button>
          {histAberto &&
            (registros.length === 0 ? (
              <p className="fe-vazio">
                O histórico começa a ser gravado no próximo lançamento.
              </p>
            ) : (
              registros.slice(0, 40).map((r) => (
                <div key={r.id} className="fe-registro">
                  <span className="fe-registro-quando">{quandoBR(r.em)}</span>
                  <span className="fe-registro-texto">
                    <p className="fe-registro-titulo">{r.texto}</p>
                    <p className="fe-registro-detalhe">{r.detalhe ?? "—"}</p>
                  </span>
                  <span className="fe-registro-quem">{r.autor}</span>
                </div>
              ))
            ))}
        </div>
      </div>

      {/* ---------- trilho auxiliar ---------- */}
      <div className="fe-trilho">
        <p className="fe-trilho-rotulo">apoio à leitura</p>

        <div className="fe-aux fe-acao-card">
          <p className="fe-aux-rotulo">Precisa de ação</p>
          {acoes.length === 0 ? (
            <p className="fe-tudo-em-dia">
              Tudo em dia. Nada vence nos próximos {janela} dias.
            </p>
          ) : (
            acoes.map((a) => (
              <div key={a.chave}>
              <button
                type="button"
                className="fe-acao-item"
                onClick={() => {
                  if (a.destino.tipo === "agenda") irParaAgenda(a.destino.filtro);
                  if (a.destino.tipo === "fornecedor") {
                    setExpandido(a.destino.id);
                    setTimeout(() => rolarAte(refFornecedores), 40);
                  }
                  if (a.destino.tipo === "contrato") {
                    abrir({
                      tipo: "contrato",
                      objetivoId: a.destino.objetivoId,
                    });
                  }
                  if (a.destino.tipo === "pendencia") {
                    abrir({
                      tipo: "despesa",
                      descricao: a.titulo,
                      pendenciaId: a.destino.id,
                    });
                  }
                }}
              >
                <span className={`fe-badge ${a.tone}`}>{a.pill}</span>
                <p className="fe-acao-titulo">{a.titulo}</p>
                <p className="fe-acao-meta">{a.meta}</p>
              </button>
              {a.destino.tipo === "pendencia" && (
                <span className="fe-acao-descartar">
                  <button
                    type="button"
                    className="fe-link"
                    onClick={() =>
                      a.destino.tipo === "pendencia" &&
                      descartarPendencia(a.destino.id)
                    }
                  >
                    não se aplica
                  </button>
                </span>
              )}
              </div>
            ))
          )}
        </div>

        {mostrarCalendario && (
          <div className="fe-aux">
            <div className="fe-cal-topo">
              <span className="fe-cal-mes">
                {MESES[mes.mes - 1]} {mes.ano}
              </span>
              <span className="fe-cal-nav">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => setMes(deslocar(mes, -1))}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  onClick={() => setMes(deslocar(mes, 1))}
                >
                  ›
                </button>
              </span>
            </div>
            <div className="fe-cal-semana">
              {SEMANA.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="fe-cal-grade">
              {celulas.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={[
                    "fe-cal-dia",
                    c.status ? "tem" : "",
                    c.hoje && dia !== c.iso ? "hoje" : "",
                    dia && dia === c.iso ? "sel" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!c.status}
                  onClick={() => {
                    if (!c.iso || !c.status) return;
                    setDia(dia === c.iso ? null : c.iso);
                    setFiltro("todos");
                    setDepoisAberto(true);
                    setPagosAberto(true);
                  }}
                >
                  <span>{c.dia ?? ""}</span>
                  <span
                    className="fe-cal-ponto"
                    style={{
                      background:
                        dia === c.iso && c.iso
                          ? "#fff"
                          : c.status
                            ? COR_DO_PONTO[c.status]
                            : "transparent",
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="fe-cal-resumo">
              {proximosMeses.map((m) => (
                <div key={m.nome}>
                  <span>{m.nome}</span>
                  <span>{m.resumo}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="fe-aux">
          <p className="fe-aux-rotulo">Mostrar</p>
          <div className="fe-segmented">
            {(
              [
                ["aberto", "Em aberto"],
                ["pagos", "Pagos"],
                ["todos", "Todos"],
              ] as [Filtro, string][]
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                aria-current={filtro === chave}
                onClick={() => {
                  setFiltro(chave);
                  if (chave === "todos") {
                    setDepoisAberto(true);
                    setPagosAberto(true);
                  }
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <input
            className="fe-busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="buscar fornecedor, valor…"
            aria-label="Buscar na agenda"
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- linha da agenda ---------------- */

function Linha({
  item,
  abrir,
  desfazer,
  excluir,
}: {
  item: ItemFinanceiro;
  abrir: (op: Operacao) => void;
  /** presentes só onde desfazer não atrapalha a leitura da agenda */
  desfazer?: (id: string) => void;
  excluir?: (id: string) => void;
}) {
  return (
    <div className="fe-linha">
      <span className={`fe-linha-data ${item.grupo}`}>{item.dataCurta}</span>
      <span className="fe-linha-texto">
        <p className="fe-linha-titulo">
          {item.avulso ? item.titulo : `${item.fornecedor} · ${item.titulo}`}
        </p>
        <p className="fe-linha-meta">
          {[
            // "Outro" é o rótulo de quem não tem categoria nenhuma: dizer
            // isso na linha é gastar pixel para não informar nada
            item.categoria === "Outro" ? null : item.categoria,
            item.avulso ? "avulso" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "sem categoria"}
        </p>
      </span>
      <span className="fe-linha-valor">{money(item.valor)}</span>
      <span className={`fe-badge ${item.tone}`}>{item.statusTexto}</span>
      {!item.pagoEm && (
        <button
          type="button"
          className={`fe-btn fe-btn-sm${
            item.grupo === "atrasados" ? " fe-btn-primario" : ""
          }`}
          onClick={() => abrir({ tipo: "pagar", item })}
        >
          Pagar e anexar
        </button>
      )}
      {item.pagoEm && desfazer && (
        <button type="button" className="fe-link" onClick={() => desfazer(item.id)}>
          desfazer
        </button>
      )}
      {!item.pagoEm && excluir && (
        <button type="button" className="fe-link" onClick={() => excluir(item.id)}>
          excluir
        </button>
      )}
    </div>
  );
}

/* ---------------- linha de fornecedor ---------------- */

function Fornecedor({
  linha,
  aberto,
  alternar,
  abrir,
  desfazer,
  excluir,
  remover,
}: {
  linha: LinhaDeFornecedor;
  aberto: boolean;
  alternar: () => void;
  abrir: (op: Operacao) => void;
  desfazer: (id: string) => void;
  excluir: (id: string) => void;
  remover: (id: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        className="fe-forn-linha"
        aria-expanded={aberto}
        onClick={alternar}
      >
        <span className="fe-col-nome" style={{ minWidth: 0 }}>
          <span className="fe-forn-nome">{linha.nome}</span>
          <span className="fe-forn-sub">
            {[
              linha.categoria,
              `${linha.parcelas.length} ${
                linha.parcelas.length === 1 ? "parcela" : "parcelas"
              }`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className="fe-col-valores">
          <span className="fe-valores-a-pagar">
            {linha.aPagar > 0 ? money(linha.aPagar) : "—"}
          </span>
          <span className="fe-valores-pago">pago {money(linha.pago)}</span>
        </span>
        <span className="fe-col-prox">
          <span className={`fe-badge ${linha.proximoTone}`}>{linha.proximoTexto}</span>
        </span>
        <span className="fe-col-chevron fe-chevron">{aberto ? "▴" : "▾"}</span>
      </button>

      {aberto && (
        <div className="fe-painel">
          <div className="fe-contrato-linha">
            <span>
              <span className="fe-rotulo">Contrato</span>
              <p className="fe-par-valor fe-mono">
                {linha.contrato == null ? "não fechado" : money(linha.contrato)}
              </p>
            </span>
            <span>
              <span className="fe-rotulo">Assinado em</span>
              <p className="fe-par-valor fe-mono">
                {linha.assinadoEm ? fmtData(linha.assinadoEm) : "—"}
              </p>
            </span>
            <span>
              <span className="fe-rotulo">Categoria</span>
              <p className="fe-par-valor">{linha.categoria ?? "sem categoria"}</p>
            </span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {/* tirar da verba só enquanto não há parcela: com parcela
                  lançada, o dinheiro já se moveu e a linha tem de ficar */}
              {linha.parcelas.length === 0 && !linha.id.startsWith("sem-contrato-") && (
                <button
                  type="button"
                  className="fe-link"
                  onClick={() => remover(linha.id)}
                >
                  remover da verba
                </button>
              )}
              <button
                type="button"
                className="fe-btn fe-btn-sm"
                onClick={() => abrir({ tipo: "contrato", fornecedor: linha })}
              >
                Editar contrato
              </button>
            </span>
          </div>

          {linha.parcelas.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--cinza)", margin: "0 0 12px" }}>
              Nenhuma parcela lançada. Gere as parcelas ou lance uma a uma.
            </p>
          ) : (
            <div className="fe-tabela-parcelas">
              {linha.parcelas.map((p) => (
                <div className="fe-linha" key={p.id}>
                  <span className={`fe-linha-data ${p.grupo}`}>{p.dataCurta}</span>
                  <span className="fe-linha-texto">
                    <p className="fe-linha-titulo">{p.titulo}</p>
                    {p.pagoEm && (
                      <p className="fe-parcela-hist">
                        pago · {fmtData(p.pagoEm)} ·{" "}
                        {p.pagoPelaFamilia ? `${p.pagoPelaFamilia.split(" ")[0]} marcou no portal · ` : ""}
                        {p.comprovante?.nome ?? "sem comprovante"}
                      </p>
                    )}
                  </span>
                  <span className="fe-linha-valor">{money(p.valor)}</span>
                  <span className={`fe-badge ${p.tone}`}>{p.statusTexto}</span>
                  {p.pagoEm ? (
                    <button
                      type="button"
                      className="fe-link"
                      onClick={() => desfazer(p.id)}
                    >
                      desfazer
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`fe-btn fe-btn-sm${
                          p.grupo === "atrasados" ? " fe-btn-primario" : ""
                        }`}
                        onClick={() => abrir({ tipo: "pagar", item: p })}
                      >
                        Pagar e anexar
                      </button>
                      <button
                        type="button"
                        className="fe-link"
                        onClick={() => excluir(p.id)}
                      >
                        excluir
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {linha.faltaLancar > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--cinza)", margin: "10px 0 0" }}>
              Falta lançar {money(linha.faltaLancar)} deste contrato.
            </p>
          )}

          <div className="fe-acoes" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="fe-btn fe-btn-sm"
              onClick={() => abrir({ tipo: "parcela", fornecedor: linha })}
            >
              + Lançar parcela
            </button>
            <button
              type="button"
              className="fe-btn fe-btn-sm"
              onClick={() => abrir({ tipo: "gerar", fornecedor: linha })}
            >
              Gerar parcelas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- utilidades ---------------- */

function deslocar(
  atual: { ano: number; mes: number },
  passo: number
): { ano: number; mes: number } {
  const total = atual.ano * 12 + (atual.mes - 1) + passo;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/** "01/08 09:12" — o horário do servidor, já em Brasília. */
function quandoBR(iso: string): string {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return f.format(d).replace(",", "");
}
