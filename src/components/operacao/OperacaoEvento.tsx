"use client";

// A Operação: o que se conta neste evento.
//
// Antes do sistema saber contar coisa, a única coisa que ele sabia sobre
// bebida era um campo de texto livre. Aqui o item tem quantidade,
// unidade e ciclo: previ, comprei, entrou, sobrou. E o que sobrou vira
// dinheiro perdido, que é o número que faz alguém mudar de comportamento.
//
// A tela era uma planilha de oito colunas, três delas vazias até o dia da
// festa. Virou painel: três indicadores, o que falta comprar em cima, o
// que já entrou recolhido embaixo, e o progresso por categoria ao lado. A
// contagem do dia saiu da tabela e virou bloco próprio, que só abre
// quando a data chega — antes disso ela seria uma coluna cinza pedindo
// número que ninguém tem.
//
// Três coisas que o desenho não podia saber e o dado exige:
//   * `comprado` é QUANTIDADE, não sim/não. A caixinha marca "comprei
//     tudo" (grava previsto); compra parcial continua na lista de cima,
//     dizendo quanto já entrou.
//   * o custo é POR UNIDADE — é dele que saem a perda e o consumo por
//     pessoa que o sistema aprende entre eventos. Ao lado do campo vai o
//     total calculado, senão digitar 620 pensando no bolo inteiro viraria
//     620 por quilo.
//   * fornecedor, observação e ruptura não cabem numa linha de 44px:
//     moram no detalhe que abre ao clicar no nome.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  consumido,
  custoComprado,
  defasagemDoPublico,
  numero,
  reais,
  textoDaBase,
  veredito,
  type Recurso,
} from "@/lib/recursos-core";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import {
  criarRecurso,
  definirFornecedor,
  marcarRuptura,
  recalcularPrevisto,
  removerRecurso,
  salvarNumero,
  salvarObservacao,
  trazerDoMetodo,
} from "@/app/(app)/eventos/[id]/operacao/actions";

export type FornecedorRef = { id: string; nome: string };

type Resultado = { error?: string } & Record<string, unknown>;

/* ---------------------------------------------------------------- */
/* Tokens — cinza chumbo, sem cor decorativa. Status é texto + pill.  */
/* ---------------------------------------------------------------- */

const C = {
  surface: "#FFFFFF",
  campo: "#FAFAF9",
  pill: "#F4F4F3",
  line: "#E3E3E1",
  line2: "#F1F1EF",
  linhaCard: "#ECECEA",
  track: "#ECECEA",
  text: "#232326",
  text2: "#6E6E6C",
  muted: "#8A8A88",
  disabled: "#A9A9A7",
  graphite: "#3A3A3E",
  graphite900: "#1C1C1F",
  outline: "#D6D6D3",
};

const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const TITULO = "var(--font-title, Inter, sans-serif)";

const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
};

const ALTURA_BOTAO = "h-[38px] md:h-11";

const btnBase: React.CSSProperties = {
  padding: "0 14px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background-color 150ms ease, border-color 150ms ease",
};

/**
 * Comprado é quantidade: o item sai da fila quando entrou tudo.
 *
 * Sem previsto também conta. Item que veio de contrato ("o buffet entrega
 * 20 arranjos") nasce com comprado e sem previsto — ninguém o dimensionou,
 * e ele já está comprado. Exigir previsto o deixaria para sempre na fila
 * de compras, com a caixinha desligada.
 */
function jaComprado(r: Recurso): boolean {
  const comprado = r.comprado ?? 0;
  return comprado > 0 && comprado >= (r.previsto ?? 0);
}

export function OperacaoEvento({
  eventId,
  recursos,
  fornecedores,
  publico,
  temMapa,
  contagemLiberada,
}: {
  eventId: string;
  recursos: Recurso[];
  fornecedores: FornecedorRef[];
  publico: { quantidade: number; origem: string } | null;
  temMapa: boolean;
  /** a data do evento chegou — antes disso não há o que contar */
  contagemLiberada: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);

  function rodar(fn: () => Promise<Resultado>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (typeof r.error === "string") {
        setErro(r.error);
        return;
      }
      // Um número gravado num campo sem borda não muda nada na tela — e
      // sem sinal nenhum a pessoa fica sem saber se aconteceu.
      setSalvoEm(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      router.refresh();
    });
  }

  const pendentes = useMemo(() => recursos.filter((r) => !jaComprado(r)), [recursos]);
  const comprados = useMemo(() => recursos.filter(jaComprado), [recursos]);

  const investido = useMemo(
    () =>
      recursos.reduce((soma, r) => {
        const cc = custoComprado(r);
        return cc == null ? soma : soma + cc;
      }, 0),
    [recursos]
  );

  // o cabeçalho da lista soma o que está NELA; o indicador soma tudo que
  // já custou, inclusive a compra parcial que ainda espera na fila
  const investidoComprados = useMemo(
    () =>
      comprados.reduce((soma, r) => {
        const cc = custoComprado(r);
        return cc == null ? soma : soma + cc;
      }, 0),
    [comprados]
  );

  const contados = useMemo(
    () => recursos.filter((r) => r.entrada != null).length,
    [recursos]
  );

  const categorias = useMemo(() => {
    const m = new Map<string, { total: number; ok: number; custo: number }>();
    for (const r of recursos) {
      const g = r.grupo ?? "Outros itens";
      const c = m.get(g) ?? { total: 0, ok: 0, custo: 0 };
      c.total++;
      if (jaComprado(r)) {
        c.ok++;
        c.custo += custoComprado(r) ?? 0;
      }
      m.set(g, c);
    }
    return [...m.entries()];
  }, [recursos]);

  const defasagem = defasagemDoPublico(recursos, publico);
  const porConvidado =
    publico && publico.quantidade > 0 ? investido / publico.quantidade : null;

  return (
    <section className="mt-6" style={{ color: C.text }}>
      {/* título + as duas ações da tela */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2
            style={{
              margin: 0,
              fontFamily: TITULO,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            O que este evento consome
          </h2>
          <p className="mt-1" style={{ fontSize: 14, color: C.muted }}>
            {publico && publico.quantidade > 0 ? (
              defasagem ? (
                // o público mudou depois do dimensionamento — dizer os
                // dois números, ao lado do botão que resolve
                <>
                  {defasagem.baseAntiga != null ? (
                    <>
                      Dimensionado por{" "}
                      <b style={{ color: C.text }}>{defasagem.baseAntiga}</b>
                      {" — hoje são "}
                      <b style={{ color: C.text }}>
                        {publico.quantidade}{" "}
                        {publico.origem === "confirmados"
                          ? "confirmados"
                          : "estimados"}
                      </b>
                      {defasagem.itens === 1
                        ? " (1 item pelo número antigo)"
                        : ` (${defasagem.itens} itens pelo número antigo)`}
                    </>
                  ) : (
                    <>
                      {defasagem.itens} itens dimensionados por um público antigo
                      {" — hoje são "}
                      <b style={{ color: C.text }}>
                        {publico.quantidade}{" "}
                        {publico.origem === "confirmados"
                          ? "confirmados"
                          : "estimados"}
                      </b>
                    </>
                  )}
                </>
              ) : (
                <>
                  Dimensionado por{" "}
                  <b style={{ color: C.text }}>{publico.quantidade}</b>{" "}
                  {publico.origem === "confirmados" ? "confirmados" : "estimados"}
                </>
              )
            ) : (
              "Sem público informado — os itens por pessoa ficam em zero até o evento ter um número."
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              // Único caminho do sistema que apaga número digitado à mão.
              // Um clique só seria perder trabalho sem aviso.
              const ok = window.confirm(
                "Refazer o previsto de todos os itens pelo público de hoje? Os números definidos à mão ficam como estão."
              );
              if (ok) rodar(() => recalcularPrevisto(eventId, true));
            }}
            disabled={pendente}
            className={ALTURA_BOTAO}
            style={{
              ...btnBase,
              border: `1px solid ${C.outline}`,
              background: C.surface,
              color: C.text,
              opacity: pendente ? 0.5 : 1,
            }}
          >
            Recalcular previsto
          </button>
          <Link
            href={`/imprimir/operacao/${eventId}`}
            target="_blank"
            className={ALTURA_BOTAO}
            style={{
              ...btnBase,
              border: `1px solid ${C.graphite}`,
              background: C.graphite,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Folha de contagem
          </Link>
        </div>
      </div>

      {erro && (
        <p className="mt-3" style={{ fontSize: 13, color: "#A5544B" }}>
          {erro}
        </p>
      )}
      {!erro && salvoEm && (
        <p className="mt-2" style={{ fontFamily: MONO, fontSize: 11.5, color: C.disabled }}>
          salvo às {salvoEm}
        </p>
      )}

      {recursos.length === 0 ? (
        <VazioOperacao
          temMapa={temMapa}
          pendente={pendente}
          rodar={() => rodar(() => trazerDoMetodo(eventId))}
          onCriar={() => setNovoAberto(true)}
        />
      ) : (
        <>
          {/* três indicadores */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Indicador rotulo="A comprar">
              <Cifra>
                {pendentes.length}{" "}
                <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>
                  de {recursos.length} itens
                </span>
              </Cifra>
            </Indicador>

            <Indicador rotulo="Custo até agora">
              <Cifra>{reais(investido)}</Cifra>
              {porConvidado != null && (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: C.muted,
                    marginTop: 2,
                  }}
                >
                  {reais(Math.round(porConvidado))} / convidado
                </div>
              )}
            </Indicador>

            <Indicador rotulo="Contagem no dia">
              {contagemLiberada ? (
                <Cifra>
                  {contados}{" "}
                  <span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>
                    de {recursos.length} registrados
                  </span>
                </Cifra>
              ) : (
                <>
                  <div style={{ marginTop: 10, fontSize: 14, color: C.muted }}>
                    Libera no dia do evento
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: C.track,
                      borderRadius: 4,
                      marginTop: 10,
                    }}
                  />
                </>
              )}
            </Indicador>
          </div>

          {/* duas colunas só no desktop: no tablet — que é onde a contagem
              do dia acontece — a lateral desce e as linhas ganham a
              largura inteira */}
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              {/* ainda a comprar */}
              <div style={card}>
                <CabecalhoCard
                  titulo="Ainda a comprar"
                  meta={`${pendentes.length} ${pendentes.length === 1 ? "item" : "itens"}`}
                />
                {pendentes.length === 0 ? (
                  <p style={{ padding: "14px 16px", fontSize: 14, color: C.muted }}>
                    Tudo comprado.
                  </p>
                ) : (
                  pendentes.map((r) => (
                    <LinhaItem
                      key={r.id}
                      eventId={eventId}
                      r={r}
                      fornecedores={fornecedores}
                      aberto={aberto === r.id}
                      onAbrir={() => setAberto(aberto === r.id ? null : r.id)}
                      pendente={pendente}
                      rodar={rodar}
                    />
                  ))
                )}

                <div
                  className="flex flex-wrap items-center gap-3"
                  style={{ padding: "12px 16px", borderTop: `1px solid ${C.line2}` }}
                >
                  <button
                    onClick={() => setNovoAberto((v) => !v)}
                    style={{ fontSize: 13, fontWeight: 500, color: C.text2 }}
                  >
                    Acrescentar item
                  </button>
                  {temMapa && (
                    <button
                      onClick={() => rodar(() => trazerDoMetodo(eventId))}
                      disabled={pendente}
                      style={{ fontSize: 13, color: C.muted, opacity: pendente ? 0.5 : 1 }}
                    >
                      buscar itens novos do método
                    </button>
                  )}
                </div>
              </div>

              {/* comprados — histórico, recolhido visualmente */}
              {comprados.length > 0 && (
                <div style={card}>
                  <CabecalhoCard
                    titulo="Comprados"
                    esmaecido
                    meta={`${comprados.length} ${comprados.length === 1 ? "item" : "itens"}${
                      investidoComprados > 0 ? ` · ${reais(investidoComprados)}` : ""
                    }`}
                  />
                  {comprados.map((r) => (
                    <LinhaItem
                      key={r.id}
                      eventId={eventId}
                      r={r}
                      fornecedores={fornecedores}
                      aberto={aberto === r.id}
                      onAbrir={() => setAberto(aberto === r.id ? null : r.id)}
                      pendente={pendente}
                      rodar={rodar}
                      comprado
                    />
                  ))}
                </div>
              )}

              {/* a contagem do dia, fora da tabela */}
              {contagemLiberada && (
                <ContagemDoDia
                  eventId={eventId}
                  recursos={recursos}
                  pendente={pendente}
                  rodar={rodar}
                />
              )}
            </div>

            {/* por categoria */}
            <div style={{ ...card, padding: 16 }}>
              <h3
                style={{
                  margin: "0 0 14px",
                  fontFamily: TITULO,
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Por categoria
              </h3>
              {categorias.map(([nome, c]) => (
                <div
                  key={nome}
                  style={{ padding: "10px 0", borderBottom: `1px solid ${C.line2}` }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{nome}</div>
                    <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                      {c.ok}/{c.total} comprados{c.custo > 0 ? ` · ${reais(c.custo)}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: C.track,
                      borderRadius: 4,
                      marginTop: 8,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: C.graphite,
                        borderRadius: 4,
                        width: `${Math.round((100 * c.ok) / Math.max(1, c.total))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 14, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                Marcar um item como comprado atualiza o custo e o progresso da
                categoria.
              </div>
            </div>
          </div>
        </>
      )}

      {novoAberto && (
        <NovoItem
          eventId={eventId}
          pendente={pendente}
          rodar={rodar}
          onFechar={() => setNovoAberto(false)}
        />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- */

function Indicador({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ ...card, padding: "14px 16px" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: C.muted,
          textTransform: "uppercase",
        }}
      >
        {rotulo}
      </div>
      {children}
    </div>
  );
}

function Cifra({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 6,
        fontFamily: TITULO,
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: "-0.02em",
      }}
    >
      {children}
    </div>
  );
}

function CabecalhoCard({
  titulo,
  meta,
  esmaecido,
}: {
  titulo: string;
  meta: string;
  esmaecido?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-2"
      style={{ padding: "14px 16px", borderBottom: `1px solid ${C.linhaCard}` }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: TITULO,
          fontSize: 16,
          fontWeight: 600,
          color: esmaecido ? C.muted : C.text,
        }}
      >
        {titulo}
      </h3>
      <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>{meta}</span>
    </div>
  );
}

/** "6 unidades × 220 estimados" / "12 unidades · definido à mão" */
function specDoItem(r: Recurso): string {
  const base = textoDaBase(r);
  if (r.regra === "fixo") {
    // o pedido da cliente também aparece em item fixo: é ele que explica
    // por que o Recalcular não mexe naquele número
    return `${numero(r.indice)} ${r.unidade}${
      base && r.baseOrigem === "manual" ? ` · ${base}` : ""
    }`;
  }
  return `${numero(r.indice)} ${r.unidade} × ${base ?? "—"}`;
}

function LinhaItem({
  eventId,
  r,
  fornecedores,
  aberto,
  onAbrir,
  pendente,
  rodar,
  comprado,
}: {
  eventId: string;
  r: Recurso;
  fornecedores: FornecedorRef[];
  aberto: boolean;
  onAbrir: () => void;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
  comprado?: boolean;
}) {
  const previsto = r.previsto ?? 0;
  const total = custoComprado(r);
  // compra parcial não tem lugar no desenho, mas tem no evento: some da
  // caixinha e vira número dito na linha
  const parcial = !comprado && (r.comprado ?? 0) > 0 && (r.comprado ?? 0) < previsto;

  return (
    <>
      <div
        className="flex items-center gap-3"
        style={{
          padding: "11px 16px",
          borderBottom: `1px solid ${C.line2}`,
          minHeight: 44,
          boxSizing: "border-box",
        }}
      >
        {/* desmarcar sempre pode; marcar precisa de um número para gravar
            (comprado É a quantidade, não um sim) */}
        <input
          type="checkbox"
          checked={!!comprado}
          disabled={pendente || (!comprado && previsto <= 0)}
          title={
            comprado
              ? "Desmarcar"
              : previsto <= 0
                ? "Informe o previsto para marcar como comprado"
                : "Marcar como comprado"
          }
          onChange={() =>
            rodar(() =>
              salvarNumero(eventId, r.id, "comprado", comprado ? null : previsto)
            )
          }
          style={{ width: 17, height: 17, flex: "none", cursor: "pointer", accentColor: C.graphite }}
        />

        <button onClick={onAbrir} className="min-w-0 flex-1 text-left">
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: comprado ? C.text2 : C.text,
            }}
          >
            {r.nome}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11.5,
              color: comprado ? C.disabled : C.muted,
              marginTop: 1,
            }}
          >
            {specDoItem(r)}
            {r.fornecedorNome ? ` · ${r.fornecedorNome}` : ""}
            {parcial ? ` · ${numero(r.comprado)} de ${numero(previsto)} comprados` : ""}
          </div>
        </button>

        {comprado ? (
          <>
            <span
              style={{
                border: `1px solid ${C.line}`,
                background: C.pill,
                borderRadius: 99,
                padding: "3px 10px",
                fontSize: 12,
                color: C.text2,
                flex: "none",
              }}
            >
              comprado
            </span>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: C.text,
                width: 90,
                textAlign: "right",
                flex: "none",
              }}
            >
              {total == null ? "—" : reais(total)}
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: "right", flex: "none" }}>
              <Campo
                eventId={eventId}
                r={r}
                campo="previsto"
                valor={r.previsto}
                rodar={rodar}
                largura={62}
                alinhado
                peso={600}
                familia={TITULO}
              />
              <div style={{ fontSize: 11, color: C.muted, marginTop: -2 }}>
                {r.unidade}
              </div>
            </div>

            <div
              className="flex items-center justify-end gap-1.5"
              style={{ flex: "none", width: 148 }}
            >
              <span style={{ fontSize: 13, color: C.muted }}>R$</span>
              <Campo
                eventId={eventId}
                r={r}
                campo="custo_unitario"
                valor={r.custoUnitario}
                rodar={rodar}
                moeda
                largura={64}
                caixa
                titulo="Custo por unidade"
              />
              {/* o total aparece assim que ela digita: sem isto, 620 no
                  bolo viraria 620 por quilo sem ninguém perceber. Na fila
                  de compras a conta é sobre o previsto — é o que ela vai
                  comprar. */}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11.5,
                  color: C.muted,
                  width: 60,
                  textAlign: "right",
                }}
              >
                {r.custoUnitario == null || previsto <= 0
                  ? ""
                  : `= ${reais(r.custoUnitario * previsto)}`}
              </span>
            </div>
          </>
        )}
      </div>

      {aberto && (
        <DetalheItem
          eventId={eventId}
          r={r}
          fornecedores={fornecedores}
          pendente={pendente}
          rodar={rodar}
        />
      )}
    </>
  );
}

/** Fornecedor, observação e remover — o que não cabe na linha. */
function DetalheItem({
  eventId,
  r,
  fornecedores,
  pendente,
  rodar,
}: {
  eventId: string;
  r: Recurso;
  fornecedores: FornecedorRef[];
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
}) {
  const entrada = { fontSize: 12, color: C.muted } as const;
  const input = {
    marginTop: 4,
    display: "block",
    borderRadius: 8,
    border: `1px solid ${C.line}`,
    background: C.surface,
    padding: "6px 8px",
    fontSize: 14,
    color: C.text,
  } as const;

  return (
    <div
      style={{
        padding: "12px 16px",
        background: C.campo,
        borderBottom: `1px solid ${C.line2}`,
      }}
    >
      <div className="flex flex-wrap items-end gap-4">
        <label style={entrada}>
          Fornecedor
          <select
            defaultValue={r.supplierId ?? ""}
            onChange={(e) => rodar(() => definirFornecedor(eventId, r.id, e.target.value))}
            disabled={pendente}
            style={{ ...input, width: 224 }}
          >
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-[240px] flex-1" style={entrada}>
          Observação
          <input
            type="text"
            defaultValue={r.observacao ?? ""}
            placeholder="o que aconteceu com este item"
            onBlur={(e) => rodar(() => salvarObservacao(eventId, r.id, e.target.value))}
            disabled={pendente}
            style={{ ...input, width: "100%" }}
          />
        </label>

        <button
          onClick={() => rodar(() => removerRecurso(eventId, r.id))}
          disabled={pendente}
          style={{ fontSize: 12, color: C.muted, paddingBottom: 6 }}
        >
          remover
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* A contagem do dia — bloco próprio, e só depois que a data chega    */
/* ---------------------------------------------------------------- */

function ContagemDoDia({
  eventId,
  recursos,
  pendente,
  rodar,
}: {
  eventId: string;
  recursos: Recurso[];
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
}) {
  const registrados = recursos.filter((r) => r.entrada != null).length;

  return (
    <div style={card}>
      <CabecalhoCard
        titulo="Contagem do dia"
        meta={`${registrados} de ${recursos.length} registrados`}
      />
      {recursos.map((r) => {
        const c = consumido(r);
        const v = veredito(r);
        return (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3"
            style={{
              padding: "11px 16px",
              borderBottom: `1px solid ${C.line2}`,
              minHeight: 44,
              boxSizing: "border-box",
            }}
          >
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 15, fontWeight: 500 }}>{r.nome}</div>
              {/* o que se compara com a contagem: o comprado quando existe,
                  senão o previsto — "— unidades compradas" não é frase */}
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                {(r.comprado ?? 0) > 0
                  ? `${numero(r.comprado)} ${r.unidade} comprados`
                  : (r.previsto ?? 0) > 0
                    ? `${numero(r.previsto)} ${r.unidade} previstos`
                    : "sem quantidade"}
              </div>
            </div>

            <RotuloCampo texto="entrada">
              <Campo
                eventId={eventId}
                r={r}
                campo="entrada"
                valor={r.entrada}
                rodar={rodar}
                largura={64}
                caixa
                alinhado
              />
            </RotuloCampo>

            <RotuloCampo texto="sobra">
              <Campo
                eventId={eventId}
                r={r}
                campo="sobra"
                valor={r.sobra}
                rodar={rodar}
                largura={64}
                caixa
                alinhado
              />
            </RotuloCampo>

            <RotuloCampo texto="acabou às">
              <input
                type="time"
                defaultValue={r.acabouEm ?? ""}
                onBlur={(e) =>
                  rodar(() => marcarRuptura(eventId, r.id, e.target.value || null))
                }
                disabled={pendente}
                style={{
                  width: 92,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${C.line}`,
                  background: C.campo,
                  padding: "0 8px",
                  fontFamily: MONO,
                  fontSize: 13,
                  color: C.text,
                }}
              />
            </RotuloCampo>

            <div style={{ width: 150, textAlign: "right", flex: "none" }}>
              <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                {c == null ? "" : `consumiu ${numero(c)}`}
              </div>
              <PillVeredito v={v} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RotuloCampo({
  texto,
  children,
}: {
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ flex: "none" }}>
      <span style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 3 }}>
        {texto}
      </span>
      {children}
    </label>
  );
}

/** Status é texto em pill neutra — sem verde, âmbar nem vermelho. */
function PillVeredito({ v }: { v: ReturnType<typeof veredito> }) {
  const texto =
    v.tipo === "aguardando"
      ? null
      : v.tipo === "faltou"
        ? `acabou${v.hora ? ` às ${v.hora}` : ""}`
        : v.tipo === "sobrou"
          ? `sobrou ${numero(v.quanto)}${v.perda != null ? ` · ${reais(v.perda)}` : ""}`
          : "na medida";

  if (!texto) return null;

  const forte = v.tipo === "faltou" || v.tipo === "sobrou";
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: 3,
        border: `1px solid ${C.line}`,
        background: C.pill,
        borderRadius: 99,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: forte ? 600 : 400,
        color: forte ? C.text : C.text2,
      }}
    >
      {texto}
    </span>
  );
}

/* ---------------------------------------------------------------- */

function Campo({
  eventId,
  r,
  campo,
  valor,
  rodar,
  moeda,
  largura,
  caixa,
  alinhado,
  peso,
  familia,
  titulo,
}: {
  eventId: string;
  r: Recurso;
  campo: string;
  valor: number | null;
  rodar: (fn: () => Promise<Resultado>) => void;
  /** dinheiro escreve 1.250,00; quantidade escreve 1250 */
  moeda?: boolean;
  largura: number;
  /** com borda e fundo (campos de digitar); sem, o número é só texto */
  caixa?: boolean;
  alinhado?: boolean;
  peso?: number;
  familia?: string;
  titulo?: string;
}) {
  // Um caminho só para gravar, usado pelo Enter e por sair do campo.
  function gravar(bruto: string) {
    const texto = bruto.trim();
    const novo =
      texto === ""
        ? null
        : moeda
          ? desmascararDinheiro(texto)
          : Number(texto.replace(",", "."));
    if (novo === valor) return;
    if (novo != null && !Number.isFinite(novo)) return;
    rodar(() => salvarNumero(eventId, r.id, campo, novo));
  }

  const formatado =
    valor == null
      ? ""
      : moeda
        ? mascararDinheiro(valor.toFixed(2).replace(".", ","))
        : String(valor);

  return (
    <input
      // O input é não controlado: sem esta key, "Recalcular previsto"
      // mudaria o banco e a tela continuaria mostrando o número velho.
      key={`${campo}-${valor ?? ""}`}
      type={moeda ? "text" : "number"}
      min={moeda ? undefined : 0}
      step={moeda ? undefined : "any"}
      inputMode="decimal"
      title={titulo}
      aria-label={titulo}
      placeholder={caixa ? (moeda ? "0,00" : "—") : undefined}
      defaultValue={formatado}
      // Sem `disabled` de propósito: desativar os 60 campos a cada
      // gravação engolia o que ela digitasse no campo seguinte.
      onChange={
        // O input é não controlado (a key o remonta quando o servidor
        // muda). Para o dinheiro sair 4.590,00 enquanto ela digita, a
        // máscara é aplicada no próprio elemento.
        moeda
          ? (e) => {
              e.target.value = mascararDinheiro(e.target.value);
            }
          : undefined
      }
      onKeyDown={(e) => {
        // Numa tela de números, o gesto é digitar e apertar Enter. Sem
        // isto, o valor só era gravado ao SAIR do campo — quem apertava
        // Enter via o número na tela, ia embora e perdia tudo.
        //
        // E o Enter grava DIRETO, não por blur(): blur depende de a
        // janela ter foco, e "depende" não é palavra que se queira entre
        // a contagem do bar e o banco.
        if (e.key === "Enter") {
          e.preventDefault();
          gravar(e.currentTarget.value);
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.value = formatado;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => gravar(e.target.value)}
      style={{
        width: largura,
        height: caixa ? 32 : undefined,
        borderRadius: caixa ? 8 : 6,
        border: caixa ? `1px solid ${C.line}` : "1px solid transparent",
        background: caixa ? C.campo : "transparent",
        padding: caixa ? "0 8px" : "2px 4px",
        fontFamily: caixa || moeda ? MONO : familia ?? MONO,
        fontSize: caixa ? 13 : 15,
        fontWeight: peso,
        color: C.text,
        textAlign: alinhado || moeda ? "right" : "left",
        outline: "none",
      }}
    />
  );
}

/* ---------------------------------------------------------------- */

function VazioOperacao({
  temMapa,
  pendente,
  rodar,
  onCriar,
}: {
  temMapa: boolean;
  pendente: boolean;
  rodar: () => void;
  onCriar: () => void;
}) {
  return (
    <div
      className="mt-6 text-center"
      style={{
        border: `1px dashed ${C.line}`,
        borderRadius: 14,
        padding: "32px 20px",
      }}
    >
      <p style={{ fontSize: 14, color: C.text2 }}>Nada a contar ainda neste evento.</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {temMapa && (
          <button
            onClick={rodar}
            disabled={pendente}
            className={ALTURA_BOTAO}
            style={{
              ...btnBase,
              border: `1px solid ${C.graphite}`,
              background: C.graphite,
              color: "#fff",
              opacity: pendente ? 0.5 : 1,
            }}
          >
            Trazer os itens do método
          </button>
        )}
        <button
          onClick={onCriar}
          className={ALTURA_BOTAO}
          style={{
            ...btnBase,
            border: `1px solid ${C.outline}`,
            background: C.surface,
            color: C.text,
          }}
        >
          Criar um item
        </button>
      </div>
    </div>
  );
}

function NovoItem({
  eventId,
  pendente,
  rodar,
  onFechar,
}: {
  eventId: string;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("unidades");
  const [regra, setRegra] = useState("por_pessoa");
  const [indice, setIndice] = useState("1");

  const rotulo = { fontSize: 12, color: C.muted } as const;
  const input = {
    marginTop: 4,
    display: "block",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: C.surface,
    padding: "8px 10px",
    fontSize: 14,
    color: C.text,
  } as const;

  return (
    <div className="mt-4" style={{ ...card, padding: 16 }}>
      <div className="flex flex-wrap items-end gap-3">
        <label style={rotulo}>
          Item
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Gelo em escama"
            style={{ ...input, width: 208 }}
          />
        </label>
        <label style={rotulo}>
          Unidade
          <input
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            style={{ ...input, width: 112 }}
          />
        </label>
        <label style={rotulo}>
          Como se calcula
          <select
            value={regra}
            onChange={(e) => setRegra(e.target.value)}
            style={{ ...input, width: 160 }}
          >
            <option value="por_pessoa">por pessoa</option>
            <option value="por_unidade">por mesa</option>
            <option value="fixo">quantidade fixa</option>
          </select>
        </label>
        <label style={rotulo}>
          {regra === "fixo" ? "Quantidade" : "Quanto por unidade"}
          <input
            type="number"
            min={0}
            step="any"
            value={indice}
            onChange={(e) => setIndice(e.target.value)}
            style={{ ...input, width: 112, textAlign: "right", fontFamily: MONO }}
          />
        </label>

        <button
          onClick={() =>
            rodar(async () => {
              const r = await criarRecurso(eventId, {
                nome,
                unidade,
                regra,
                indice: Number(indice.replace(",", ".")) || 0,
              });
              if (!("error" in r)) {
                setNome("");
                onFechar();
              }
              return r as Resultado;
            })
          }
          disabled={pendente || !nome.trim()}
          className={ALTURA_BOTAO}
          style={{
            ...btnBase,
            border: `1px solid ${C.graphite}`,
            background: C.graphite,
            color: "#fff",
            opacity: pendente || !nome.trim() ? 0.4 : 1,
          }}
        >
          Acrescentar
        </button>
        <button onClick={onFechar} style={{ fontSize: 13, color: C.muted, padding: "0 4px" }}>
          cancelar
        </button>
      </div>
    </div>
  );
}
