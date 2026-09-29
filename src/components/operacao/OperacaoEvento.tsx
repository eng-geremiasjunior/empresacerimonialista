"use client";

// A Operação: o que a festa usa.
//
// Antes do sistema saber contar coisa, a única coisa que ele sabia sobre
// bebida era um campo de texto livre. Aqui o item tem quantidade,
// unidade e ciclo: previ, comprei, entrou, sobrou. E o que sobrou vira
// dinheiro perdido, que é o número que faz alguém mudar de comportamento.
//
// Refeita em 28/09/2026 (184): a tela tinha três cartões de número e
// duas listas antes de qualquer ação, e ele achou confusa. Agora é UMA
// lista, agrupada pelo assunto do método, e cada linha diz de onde o
// item vem e tem uma ação:
//   * comprar para a festa (o de sempre: previsto, custo, "comprei");
//   * do estoque da empresa (reserva do acervo; "separado" no dia);
//   * o fornecedor entrega (vem no contrato);
//   * o que não se compra (garçom, mesa do buffet) só se confere.
// Os três cartões viraram uma frase de radar, que some quando não há
// nada. A contagem do dia continua, e agora devolve ao estoque o que
// voltou.
//
// Três coisas que o desenho não podia saber e o dado exige:
//   * `comprado` é QUANTIDADE, não sim/não. "Comprei tudo" grava o
//     previsto; compra parcial continua na fila, dizendo quanto entrou.
//   * o custo é POR UNIDADE — é dele que saem a perda e o consumo por
//     pessoa que o sistema aprende entre eventos. Ao lado do campo vai o
//     total calculado, senão digitar 620 pensando no bolo inteiro viraria
//     620 por quilo.
//   * fornecedor, observação e remover não cabem numa linha: moram no
//     detalhe que abre ao clicar no nome.

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
import { fraseDoConflito, type ConflitoDeEstoque } from "@/lib/estoque-core";
import type { ItemParaOperacao } from "@/lib/supabase/recursos";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import {
  criarRecurso,
  definirFornecedor,
  definirOrigem,
  desfazerReserva,
  fecharReserva,
  marcarRuptura,
  marcarSeparado,
  recalcularPrevisto,
  removerRecurso,
  salvarNumero,
  salvarObservacao,
  trazerDoMetodo,
  usarDoEstoque,
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
  text: "#232326",
  text2: "#6E6E6C",
  muted: "#8A8A88",
  disabled: "#A9A9A7",
  graphite: "#3A3A3E",
  outline: "#D6D6D3",
  alerta: "#A5544B",
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

const btnForte: React.CSSProperties = {
  ...btnBase,
  border: `1px solid ${C.graphite}`,
  background: C.graphite,
  color: "#fff",
};

const btnLeve: React.CSSProperties = {
  ...btnBase,
  border: `1px solid ${C.outline}`,
  background: C.surface,
  color: C.text,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  border: `1px solid ${C.line}`,
  background: C.pill,
  borderRadius: 99,
  padding: "3px 10px",
  fontSize: 12,
  color: C.text2,
  whiteSpace: "nowrap",
};

/**
 * Comprado é quantidade: o item sai da fila quando entrou tudo.
 *
 * Sem previsto também conta. Item que veio de contrato ("o buffet entrega
 * 20 arranjos") nasce com comprado e sem previsto — ninguém o dimensionou,
 * e ele já está comprado. Exigir previsto o deixaria para sempre na fila
 * de compras.
 */
function jaComprado(r: Recurso): boolean {
  const comprado = r.comprado ?? 0;
  return comprado > 0 && comprado >= (r.previsto ?? 0);
}

type Estado = "conferir" | "estoque" | "fornecedor" | "comprado" | "comprar";

/** O estado da linha decide o que ela diz e a ação que oferece. */
function estadoDe(r: Recurso): Estado {
  if (r.reserva) return "estoque";
  if (r.origemSuprimento === "fornecedor") return "fornecedor";
  if (!r.compravel) return "conferir";
  if (jaComprado(r)) return "comprado";
  return "comprar";
}

/** Os itens do acervo mais parecidos com esta linha, primeiro os iguais. */
function candidatos(r: Recurso, itens: ItemParaOperacao[], busca: string): ItemParaOperacao[] {
  const q = busca.trim().toLowerCase();
  const palavras = r.codigo.split("_").filter((p) => p.length > 2);
  const pontos = (i: ItemParaOperacao) => {
    if (i.codigo === r.codigo) return 3;
    if (i.codigo.startsWith(r.codigo) || r.codigo.startsWith(i.codigo)) return 2;
    return palavras.some((p) => i.codigo.includes(p)) ? 1 : 0;
  };
  const lista = q ? itens.filter((i) => i.nome.toLowerCase().includes(q)) : itens;
  return lista
    .map((i) => ({ i, p: pontos(i) }))
    .sort((a, b) => b.p - a.p || a.i.nome.localeCompare(b.i.nome, "pt"))
    .slice(0, q ? 12 : 6)
    .map((x) => x.i);
}

export function OperacaoEvento({
  eventId,
  recursos,
  fornecedores,
  publico,
  temMapa,
  contagemLiberada,
  eventoData,
  itensDoEstoque,
  conflitos,
}: {
  eventId: string;
  recursos: Recurso[];
  fornecedores: FornecedorRef[];
  publico: { quantidade: number; origem: string } | null;
  temMapa: boolean;
  /** a data do evento chegou — antes disso não há o que contar */
  contagemLiberada: boolean;
  eventoData: string | null;
  itensDoEstoque: ItemParaOperacao[];
  conflitos: ConflitoDeEstoque[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
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
      setSalvoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      router.refresh();
    });
  }

  const grupos = useMemo(() => {
    const m = new Map<string, Recurso[]>();
    for (const r of recursos) {
      const g = r.grupo ?? "Outros itens";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(r);
    }
    return [...m.entries()];
  }, [recursos]);

  // o radar: só o que pede ação, e só quando existe
  const aComprar = recursos.filter((r) => estadoDe(r) === "comprar" && (r.previsto ?? 0) > 0).length;
  const aSeparar = recursos.filter((r) => r.reserva && !r.reserva.separadoEm && !r.reserva.fechadoEm).length;
  const doEstoque = recursos.filter((r) => r.reserva).length;
  const investido = recursos.reduce((s, r) => {
    if (r.origemSuprimento !== "compra") return s;
    return s + (custoComprado(r) ?? 0);
  }, 0);
  const radar = [
    aComprar > 0 ? `${aComprar} ${aComprar === 1 ? "item ainda a comprar" : "itens ainda a comprar"}` : null,
    aSeparar > 0 ? `${aSeparar} do estoque ${aSeparar === 1 ? "a separar" : "a separar"}` : null,
    investido > 0 ? `${reais(investido)} em compras` : null,
  ].filter(Boolean) as string[];

  const defasagem = defasagemDoPublico(recursos, publico);
  const temEstoque = itensDoEstoque.length > 0;

  return (
    <section className="mt-6" style={{ color: C.text }}>
      {/* título + as ações da tela */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 style={{ margin: 0, fontFamily: TITULO, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
            O que a festa usa
          </h2>
          <p className="mt-1" style={{ fontSize: 14, color: C.muted }}>
            {publico && publico.quantidade > 0 ? (
              defasagem ? (
                // o público mudou depois do dimensionamento — dizer os
                // dois números, ao lado do botão que resolve
                <>
                  {defasagem.baseAntiga != null ? (
                    <>
                      Dimensionado por <b style={{ color: C.text }}>{defasagem.baseAntiga}</b>
                      {" — hoje são "}
                    </>
                  ) : (
                    <>{defasagem.itens} itens dimensionados por um público antigo{" — hoje são "}</>
                  )}
                  <b style={{ color: C.text }}>
                    {publico.quantidade} {publico.origem === "confirmados" ? "confirmados" : "estimados"}
                  </b>
                </>
              ) : (
                <>
                  Para <b style={{ color: C.text }}>{publico.quantidade}</b>{" "}
                  {publico.origem === "confirmados" ? "confirmados" : "estimados"}
                </>
              )
            ) : (
              "Sem público informado — os itens por pessoa ficam em zero até o evento ter um número."
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            style={{ ...btnLeve, opacity: pendente ? 0.5 : 1 }}
          >
            Recalcular previsto
          </button>
          <Link
            href={`/imprimir/operacao/${eventId}`}
            target="_blank"
            className={`${ALTURA_BOTAO} inline-flex items-center`}
            style={btnLeve}
          >
            Folha de contagem
          </Link>
          {doEstoque > 0 && (
            <Link
              href={`/imprimir/separacao/${eventId}`}
              target="_blank"
              className={`${ALTURA_BOTAO} inline-flex items-center`}
              style={btnForte}
            >
              Lista de separação
            </Link>
          )}
        </div>
      </div>

      {/* o radar: uma frase, e só quando há o que dizer */}
      {(radar.length > 0 || conflitos.length > 0) && (
        <div className="mt-4" style={{ fontSize: 14, lineHeight: 1.6 }}>
          {radar.length > 0 && <div style={{ color: C.text2 }}>{radar.join(" · ")}</div>}
          {conflitos.map((c) => (
            <div key={c.itemId} style={{ color: C.alerta }}>
              {c.comQuem ? `${fraseDoConflito(c)} na data da festa` : `${fraseDoConflito(c)} no estoque`}
            </div>
          ))}
        </div>
      )}

      {erro && (
        <p className="mt-3" style={{ fontSize: 13, color: C.alerta }}>
          {erro}
        </p>
      )}
      {!erro && aviso && (
        <p className="mt-3" style={{ fontSize: 13, color: C.text2 }}>
          {aviso}
        </p>
      )}
      {!erro && !aviso && salvoEm && (
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
        <div className="mt-5 flex flex-col gap-5">
          <div style={card}>
            {grupos.map(([nome, lista]) => (
              <div key={nome}>
                <div
                  className="flex items-baseline justify-between gap-2"
                  style={{ padding: "12px 16px 6px", borderBottom: `1px solid ${C.linhaCard}` }}
                >
                  <h3 style={{ margin: 0, fontFamily: TITULO, fontSize: 15, fontWeight: 600 }}>{nome}</h3>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                    {lista.filter((r) => estadoDe(r) !== "comprar").length}/{lista.length} resolvidos
                  </span>
                </div>
                {lista.map((r) => (
                  <LinhaItem
                    key={r.id}
                    eventId={eventId}
                    r={r}
                    estado={estadoDe(r)}
                    fornecedores={fornecedores}
                    itensDoEstoque={itensDoEstoque}
                    temEstoque={temEstoque}
                    eventoData={eventoData}
                    aberto={aberto === r.id}
                    onAbrir={() => setAberto(aberto === r.id ? null : r.id)}
                    escolhendo={escolhendo === r.id}
                    onEscolher={(v) => setEscolhendo(v ? r.id : null)}
                    pendente={pendente}
                    rodar={rodar}
                    avisar={setAviso}
                  />
                ))}
              </div>
            ))}

            <div
              className="flex flex-wrap items-center gap-3"
              style={{ padding: "12px 16px", borderTop: `1px solid ${C.line2}` }}
            >
              <button onClick={() => setNovoAberto((v) => !v)} style={{ fontSize: 13, fontWeight: 500, color: C.text2 }}>
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
              {!temEstoque && (
                <Link href="/estoque" style={{ fontSize: 13, color: C.muted, textDecoration: "underline", textUnderlineOffset: 2 }}>
                  cadastrar o estoque da empresa
                </Link>
              )}
            </div>
          </div>

          {/* a contagem do dia, fora da tabela */}
          {contagemLiberada && (
            <ContagemDoDia eventId={eventId} recursos={recursos} pendente={pendente} rodar={rodar} />
          )}
        </div>
      )}

      {novoAberto && (
        <NovoItem eventId={eventId} pendente={pendente} rodar={rodar} onFechar={() => setNovoAberto(false)} />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- */

/** "6 unidades × 220 estimados" / "12 unidades · definido à mão" */
function specDoItem(r: Recurso): string {
  const base = textoDaBase(r);
  if (r.regra === "fixo") {
    // o pedido da cliente também aparece em item fixo: é ele que explica
    // por que o Recalcular não mexe naquele número
    return `${numero(r.indice)} ${r.unidade}${base && r.baseOrigem === "manual" ? ` · ${base}` : ""}`;
  }
  return `${numero(r.indice)} ${r.unidade} × ${base ?? "—"}`;
}

function LinhaItem({
  eventId,
  r,
  estado,
  fornecedores,
  itensDoEstoque,
  temEstoque,
  eventoData,
  aberto,
  onAbrir,
  escolhendo,
  onEscolher,
  pendente,
  rodar,
  avisar,
}: {
  eventId: string;
  r: Recurso;
  estado: Estado;
  fornecedores: FornecedorRef[];
  itensDoEstoque: ItemParaOperacao[];
  temEstoque: boolean;
  eventoData: string | null;
  aberto: boolean;
  onAbrir: () => void;
  escolhendo: boolean;
  onEscolher: (v: boolean) => void;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
  avisar: (texto: string | null) => void;
}) {
  const previsto = r.previsto ?? 0;
  const total = custoComprado(r);
  // compra parcial não tem lugar no desenho, mas tem no evento: some da
  // caixinha e vira número dito na linha
  const parcial = estado === "comprar" && (r.comprado ?? 0) > 0 && (r.comprado ?? 0) < previsto;
  const res = r.reserva;
  const resolvido = estado === "comprado" || estado === "fornecedor" || (estado === "estoque" && !!res?.fechadoEm);

  const origemTexto =
    estado === "estoque" && res
      ? `${numero(res.quantidade)} ${r.unidade} · do estoque${res.itemNome !== r.nome ? ` (${res.itemNome})` : ""}`
      : estado === "fornecedor"
        ? `${numero(previsto)} ${r.unidade} · o fornecedor entrega`
        : estado === "conferir"
          ? `conferir com ${r.fornecedorNome ?? "o fornecedor"}`
          : null;

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
        style={{ padding: "11px 16px", borderBottom: `1px solid ${C.line2}`, minHeight: 44, boxSizing: "border-box" }}
      >
        <button onClick={onAbrir} className="min-w-[180px] flex-1 text-left">
          <div style={{ fontSize: 15, fontWeight: 500, color: resolvido ? C.text2 : C.text }}>{r.nome}</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: resolvido ? C.disabled : C.muted, marginTop: 1 }}>
            {origemTexto ?? specDoItem(r)}
            {!origemTexto && r.fornecedorNome ? ` · ${r.fornecedorNome}` : ""}
            {parcial ? ` · ${numero(r.comprado)} de ${numero(previsto)} comprados` : ""}
          </div>
        </button>

        {estado === "estoque" && res ? (
          <div className="flex items-center gap-2">
            <span style={{ ...pill, fontWeight: res.fechadoEm ? 400 : 600, color: res.fechadoEm ? C.text2 : C.text }}>
              {res.fechadoEm
                ? res.reutilizavel
                  ? `voltou ${numero(res.devolvido)}${(res.perdido ?? 0) > 0 ? ` · perdeu ${numero(res.perdido)}` : ""}`
                  : `consumiu ${numero(res.consumido)}`
                : res.separadoEm
                  ? "separado"
                  : "a separar"}
            </span>
            {!res.fechadoEm && (
              <button
                onClick={() => rodar(() => marcarSeparado(eventId, res.id, !res.separadoEm))}
                disabled={pendente}
                className="h-8"
                style={{ ...(res.separadoEm ? btnLeve : btnForte), fontSize: 13, padding: "0 12px", borderRadius: 8 }}
              >
                {res.separadoEm ? "Voltou à prateleira" : "Separado"}
              </button>
            )}
          </div>
        ) : estado === "fornecedor" ? (
          <span style={pill}>garantido</span>
        ) : estado === "comprado" ? (
          <>
            <span style={pill}>comprado</span>
            <div style={{ fontFamily: MONO, fontSize: 13, color: C.text, width: 90, textAlign: "right", flex: "none" }}>
              {total == null ? "—" : reais(total)}
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: "right", flex: "none" }}>
              <Campo eventId={eventId} r={r} campo="previsto" valor={r.previsto} rodar={rodar} largura={62} alinhado peso={600} familia={TITULO} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: -2 }}>{r.unidade}</div>
            </div>

            {estado === "comprar" && (
              <div className="flex items-center justify-end gap-1.5" style={{ flex: "none" }}>
                <span style={{ fontSize: 13, color: C.muted }}>R$</span>
                <Campo eventId={eventId} r={r} campo="custo_unitario" valor={r.custoUnitario} rodar={rodar} moeda largura={64} caixa titulo="Custo por unidade" />
                {/* o total aparece assim que ela digita: sem isto, 620 no
                    bolo viraria 620 por quilo sem ninguém perceber */}
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, width: 60, textAlign: "right" }}>
                  {r.custoUnitario == null || previsto <= 0 ? "" : `= ${reais(r.custoUnitario * previsto)}`}
                </span>
              </div>
            )}

            {/* uma ação por linha: o menu resolve de onde vem */}
            <details className="relative" style={{ flex: "none" }}>
              <summary
                className="list-none cursor-pointer select-none h-8 inline-flex items-center"
                style={{ ...btnLeve, fontSize: 13, padding: "0 12px", borderRadius: 8 }}
              >
                {estado === "conferir" ? "Do estoque ▾" : "Resolver ▾"}
              </summary>
              <div
                className="absolute right-0 z-20 mt-1 flex min-w-[200px] flex-col"
                style={{ ...card, padding: 6, boxShadow: "0 12px 28px -14px rgba(0,0,0,.35)" }}
              >
                {estado === "comprar" && (
                  <button
                    disabled={pendente || previsto <= 0}
                    title={previsto <= 0 ? "Informe o previsto para marcar como comprado" : undefined}
                    onClick={(e) => {
                      e.currentTarget.closest("details")?.removeAttribute("open");
                      rodar(() => salvarNumero(eventId, r.id, "comprado", previsto));
                    }}
                    style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, fontSize: 14, opacity: previsto <= 0 ? 0.5 : 1 }}
                  >
                    Comprei tudo
                  </button>
                )}
                {temEstoque && (
                  <button
                    disabled={pendente}
                    onClick={(e) => {
                      e.currentTarget.closest("details")?.removeAttribute("open");
                      onEscolher(true);
                    }}
                    style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, fontSize: 14 }}
                  >
                    Usar do estoque
                  </button>
                )}
                {estado === "comprar" && (
                  <button
                    disabled={pendente}
                    onClick={(e) => {
                      e.currentTarget.closest("details")?.removeAttribute("open");
                      rodar(() => definirOrigem(eventId, r.id, "fornecedor"));
                    }}
                    style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, fontSize: 14 }}
                  >
                    O fornecedor entrega
                  </button>
                )}
                {!temEstoque && estado === "conferir" && (
                  <Link href="/estoque" style={{ padding: "8px 10px", fontSize: 14, color: C.text2 }}>
                    Cadastrar o estoque
                  </Link>
                )}
              </div>
            </details>
          </>
        )}
      </div>

      {escolhendo && (
        <EscolherDoEstoque
          eventId={eventId}
          r={r}
          itens={itensDoEstoque}
          eventoData={eventoData}
          pendente={pendente}
          rodar={rodar}
          avisar={avisar}
          onFechar={() => onEscolher(false)}
        />
      )}

      {aberto && (
        <DetalheItem eventId={eventId} r={r} estado={estado} fornecedores={fornecedores} pendente={pendente} rodar={rodar} />
      )}
    </>
  );
}

/** Escolher o item do acervo que supre esta linha, com o disponível na data. */
function EscolherDoEstoque({
  eventId,
  r,
  itens,
  eventoData,
  pendente,
  rodar,
  avisar,
  onFechar,
}: {
  eventId: string;
  r: Recurso;
  itens: ItemParaOperacao[];
  eventoData: string | null;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
  avisar: (texto: string | null) => void;
  onFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<ItemParaOperacao | null>(null);
  const faltaComprar = Math.max(0, (r.previsto ?? 0) - (r.comprado ?? 0));
  const [qtd, setQtd] = useState(String(faltaComprar || r.previsto || ""));
  const lista = candidatos(r, itens, busca);
  const quantidade = Number(qtd.replace(",", "."));

  return (
    <div style={{ padding: "12px 16px", background: C.campo, borderBottom: `1px solid ${C.line2}` }}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no estoque"
          aria-label="Buscar no estoque"
          style={{ ...input, width: 220, marginTop: 0 }}
        />
        <span style={{ fontSize: 12.5, color: C.muted }}>
          {eventoData ? "disponível na data da festa" : "disponível hoje"}
        </span>
      </div>
      <div className="mt-2 flex flex-col">
        {lista.length === 0 && <span style={{ fontSize: 13, color: C.muted, padding: "6px 0" }}>Nada com esse nome no estoque.</span>}
        {lista.map((i) => {
          const on = escolhido?.id === i.id;
          return (
            <button
              key={i.id}
              onClick={() => setEscolhido(i)}
              className="flex items-baseline justify-between gap-3 text-left"
              style={{ padding: "7px 8px", borderRadius: 8, background: on ? C.surface : "transparent", border: `1px solid ${on ? C.outline : "transparent"}` }}
            >
              <span style={{ fontSize: 14, color: C.text }}>
                {i.nome}
                {i.categoriaNome ? <span style={{ color: C.muted }}> · {i.categoriaNome}</span> : null}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: i.disponivel < quantidade ? C.alerta : C.text2, whiteSpace: "nowrap" }}>
                {numero(i.disponivel)} disponíveis · {numero(i.saldo)} {i.unidade}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label style={{ fontSize: 12, color: C.muted }}>
          Quantidade
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            style={{ ...input, width: 110, textAlign: "right", fontFamily: MONO }}
          />
        </label>
        <button
          disabled={pendente || !escolhido || !(quantidade > 0)}
          onClick={() =>
            rodar(async () => {
              const res = await usarDoEstoque(eventId, escolhido!.id, quantidade, r.id);
              if ("error" in res) return res;
              avisar(
                res.falta > 0
                  ? `Reservado. Faltam ${numero(res.falta)} de ${escolhido!.nome} na data — veja Estoque › Por evento.`
                  : null
              );
              onFechar();
              return res as unknown as Resultado;
            })
          }
          className="h-9"
          style={{ ...btnForte, fontSize: 13, opacity: pendente || !escolhido || !(quantidade > 0) ? 0.4 : 1 }}
        >
          Reservar
        </button>
        <button onClick={onFechar} style={{ fontSize: 13, color: C.muted, padding: "0 4px 8px" }}>
          cancelar
        </button>
      </div>
    </div>
  );
}

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

/** Fornecedor, observação, desfazer e remover — o que não cabe na linha. */
function DetalheItem({
  eventId,
  r,
  estado,
  fornecedores,
  pendente,
  rodar,
}: {
  eventId: string;
  r: Recurso;
  estado: Estado;
  fornecedores: FornecedorRef[];
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
}) {
  const entrada = { fontSize: 12, color: C.muted } as const;
  const link = { fontSize: 12, color: C.muted, paddingBottom: 6 } as const;

  return (
    <div style={{ padding: "12px 16px", background: C.campo, borderBottom: `1px solid ${C.line2}` }}>
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

        {estado === "estoque" && r.reserva && !r.reserva.fechadoEm && (
          <button onClick={() => rodar(() => desfazerReserva(eventId, r.reserva!.id))} disabled={pendente} style={link}>
            desfazer a reserva
          </button>
        )}
        {estado === "fornecedor" && (
          <button onClick={() => rodar(() => definirOrigem(eventId, r.id, "compra"))} disabled={pendente} style={link}>
            voltar a comprar
          </button>
        )}
        {estado === "comprado" && (
          <button onClick={() => rodar(() => salvarNumero(eventId, r.id, "comprado", null))} disabled={pendente} style={link}>
            desmarcar comprado
          </button>
        )}
        <button onClick={() => rodar(() => removerRecurso(eventId, r.id))} disabled={pendente} style={link}>
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
  const registrados = recursos.filter((r) => r.entrada != null || r.reserva?.fechadoEm).length;

  return (
    <div style={card}>
      <div
        className="flex items-baseline justify-between gap-2"
        style={{ padding: "14px 16px", borderBottom: `1px solid ${C.linhaCard}` }}
      >
        <h3 style={{ margin: 0, fontFamily: TITULO, fontSize: 16, fontWeight: 600 }}>Contagem do dia</h3>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>
          {registrados} de {recursos.length} registrados
        </span>
      </div>
      {recursos.map((r) =>
        r.reserva ? (
          <LinhaDevolucao key={r.id} eventId={eventId} r={r} pendente={pendente} rodar={rodar} />
        ) : (
          <LinhaContagem key={r.id} eventId={eventId} r={r} pendente={pendente} rodar={rodar} />
        )
      )}
    </div>
  );
}

function LinhaContagem({
  eventId,
  r,
  pendente,
  rodar,
}: {
  eventId: string;
  r: Recurso;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
}) {
  const c = consumido(r);
  const v = veredito(r);
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      style={{ padding: "11px 16px", borderBottom: `1px solid ${C.line2}`, minHeight: 44, boxSizing: "border-box" }}
    >
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 15, fontWeight: 500 }}>{r.nome}</div>
        {/* o que se compara com a contagem: o comprado quando existe,
            senão o previsto — "— unidades compradas" não é frase */}
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 1 }}>
          {(r.comprado ?? 0) > 0
            ? `${numero(r.comprado)} ${r.unidade} ${r.origemSuprimento === "fornecedor" ? "entregues" : "comprados"}`
            : (r.previsto ?? 0) > 0
              ? `${numero(r.previsto)} ${r.unidade} previstos`
              : "sem quantidade"}
        </div>
      </div>

      <RotuloCampo texto="entrada">
        <Campo eventId={eventId} r={r} campo="entrada" valor={r.entrada} rodar={rodar} largura={64} caixa alinhado />
      </RotuloCampo>

      <RotuloCampo texto="sobra">
        <Campo eventId={eventId} r={r} campo="sobra" valor={r.sobra} rodar={rodar} largura={64} caixa alinhado />
      </RotuloCampo>

      <RotuloCampo texto="acabou às">
        <input
          type="time"
          defaultValue={r.acabouEm ?? ""}
          onBlur={(e) => rodar(() => marcarRuptura(eventId, r.id, e.target.value || null))}
          disabled={pendente}
          style={{ width: 92, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: C.campo, padding: "0 8px", fontFamily: MONO, fontSize: 13, color: C.text }}
        />
      </RotuloCampo>

      <div style={{ width: 150, textAlign: "right", flex: "none" }}>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>{c == null ? "" : `consumiu ${numero(c)}`}</div>
        <PillVeredito v={v} />
      </div>
    </div>
  );
}

/** O item que veio do estoque: o que voltou (acervo) ou o que sobrou (consumível). */
function LinhaDevolucao({
  eventId,
  r,
  pendente,
  rodar,
}: {
  eventId: string;
  r: Recurso;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
}) {
  const res = r.reserva!;
  const [voltou, setVoltou] = useState(String(res.quantidade));
  const [sobrou, setSobrou] = useState("0");
  const n = (s: string) => Number(s.replace(",", "."));

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      style={{ padding: "11px 16px", borderBottom: `1px solid ${C.line2}`, minHeight: 44, boxSizing: "border-box" }}
    >
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 15, fontWeight: 500 }}>{r.nome}</div>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 1 }}>
          {numero(res.quantidade)} {r.unidade} do estoque{res.separadoEm ? "" : " · não foi separado"}
        </div>
      </div>

      {res.fechadoEm ? (
        <span style={pill}>
          {res.reutilizavel
            ? `voltou ${numero(res.devolvido)}${(res.perdido ?? 0) > 0 ? ` · perdeu ${numero(res.perdido)}` : ""}`
            : `consumiu ${numero(res.consumido)}${(res.devolvido ?? 0) > 0 ? ` · voltou ${numero(res.devolvido)}` : ""}`}
        </span>
      ) : (
        <>
          <RotuloCampo texto={res.reutilizavel ? "voltou" : "sobrou"}>
            <input
              type="number"
              min={0}
              max={res.quantidade}
              step="any"
              inputMode="decimal"
              value={res.reutilizavel ? voltou : sobrou}
              onChange={(e) => (res.reutilizavel ? setVoltou(e.target.value) : setSobrou(e.target.value))}
              style={{ width: 64, height: 32, borderRadius: 8, border: `1px solid ${C.line}`, background: C.campo, padding: "0 8px", fontFamily: MONO, fontSize: 13, color: C.text, textAlign: "right" }}
            />
          </RotuloCampo>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, width: 110, textAlign: "right" }}>
            {res.reutilizavel
              ? n(voltou) < res.quantidade
                ? `perdeu ${numero(res.quantidade - n(voltou))}`
                : ""
              : `consumiu ${numero(Math.max(0, res.quantidade - n(sobrou)))}`}
          </div>
          <button
            disabled={pendente}
            onClick={() =>
              rodar(() =>
                fecharReserva(
                  eventId,
                  res.id,
                  res.reutilizavel
                    ? { devolvido: n(voltou), perdido: Math.max(0, res.quantidade - n(voltou)) }
                    : { consumido: Math.max(0, res.quantidade - n(sobrou)), devolvido: n(sobrou) }
                )
              )
            }
            className="h-8"
            style={{ ...btnForte, fontSize: 13, padding: "0 12px", borderRadius: 8 }}
          >
            Devolver ao estoque
          </button>
        </>
      )}
    </div>
  );
}

function RotuloCampo({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <label style={{ flex: "none" }}>
      <span style={{ display: "block", fontSize: 11, color: C.muted, marginBottom: 3 }}>{texto}</span>
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
    <span style={{ ...pill, marginTop: 3, fontWeight: forte ? 600 : 400, color: forte ? C.text : C.text2 }}>{texto}</span>
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
    const novo = texto === "" ? null : moeda ? desmascararDinheiro(texto) : Number(texto.replace(",", "."));
    if (novo === valor) return;
    if (novo != null && !Number.isFinite(novo)) return;
    rodar(() => salvarNumero(eventId, r.id, campo, novo));
  }

  const formatado = valor == null ? "" : moeda ? mascararDinheiro(valor.toFixed(2).replace(".", ",")) : String(valor);

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
        moeda
          ? (e) => {
              e.target.value = mascararDinheiro(e.target.value);
            }
          : undefined
      }
      onKeyDown={(e) => {
        // Numa tela de números, o gesto é digitar e apertar Enter. E o
        // Enter grava DIRETO, não por blur(): blur depende de a janela
        // ter foco, e "depende" não é palavra que se queira entre a
        // contagem do bar e o banco.
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
    <div className="mt-6 text-center" style={{ border: `1px dashed ${C.line}`, borderRadius: 14, padding: "32px 20px" }}>
      <p style={{ fontSize: 14, color: C.text2 }}>Nada a contar ainda neste evento.</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {temMapa && (
          <button onClick={rodar} disabled={pendente} className={ALTURA_BOTAO} style={{ ...btnForte, opacity: pendente ? 0.5 : 1 }}>
            Trazer os itens do método
          </button>
        )}
        <button onClick={onCriar} className={ALTURA_BOTAO} style={btnLeve}>
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
  const campo = { ...input, borderRadius: 10, padding: "8px 10px" } as const;

  return (
    <div className="mt-4" style={{ ...card, padding: 16 }}>
      <div className="flex flex-wrap items-end gap-3">
        <label style={rotulo}>
          Item
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Gelo em escama" style={{ ...campo, width: 208 }} />
        </label>
        <label style={rotulo}>
          Unidade
          <input value={unidade} onChange={(e) => setUnidade(e.target.value)} style={{ ...campo, width: 112 }} />
        </label>
        <label style={rotulo}>
          Como se calcula
          <select value={regra} onChange={(e) => setRegra(e.target.value)} style={{ ...campo, width: 160 }}>
            <option value="por_pessoa">por pessoa</option>
            <option value="por_unidade">por mesa</option>
            <option value="fixo">quantidade fixa</option>
          </select>
        </label>
        <label style={rotulo}>
          {regra === "fixo" ? "Quantidade" : "Quanto por unidade"}
          <input type="number" min={0} step="any" value={indice} onChange={(e) => setIndice(e.target.value)} style={{ ...campo, width: 112, textAlign: "right", fontFamily: MONO }} />
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
          style={{ ...btnForte, opacity: pendente || !nome.trim() ? 0.4 : 1 }}
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
