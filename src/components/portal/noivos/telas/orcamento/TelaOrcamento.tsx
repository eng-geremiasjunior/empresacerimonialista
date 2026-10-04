"use client";

// O Orçamento da noiva que abriu a conta sozinha (04/10/2026), na aba
// Financeiro do portal. De cima para baixo:
//   1. quanto querem gastar, e quanto já foi (gastos, pago, falta, sobra);
//   2. os próximos pagamentos, em tempo, com "Paguei" em um toque;
//   3. os gastos — tocar abre os pagamentos de cada um; "Novo gasto";
//   4. quanto cada capítulo do planejamento leva, quando há orçamento.
// As contas vêm prontas do servidor (o motor do Financeiro da
// cerimonialista); aqui só se desenha e se chama a ação.

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GastoDaNoiva, OrcamentoDaNoiva, PagamentoDaNoiva } from "@/lib/supabase/portal-orcamento";
import { desmascararDinheiro, mascararDinheiro } from "@/lib/format";
import { brl } from "@/components/planejamento/celebra";
import {
  apagarGastoDaNoiva,
  desfazerPagoDaNoiva,
  marcarPagoDaNoiva,
  salvarOrcamentoDaNoiva,
} from "@/app/(portal)/portal/[eventoId]/investimento/orcamento-actions";
import { usePortalNoivos } from "../../contexto";
import { Eyebrow, Trilho } from "../../primitivas";
import { NovoGasto, type InicioDoGasto } from "./NovoGasto";
import "../financeiro/financeiro.css";
import "./orcamento.css";

type Retorno = { ok: true } | { error: string };

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function LinhaPagamento({
  p,
  enviando,
  pagar,
  desfazer,
}: {
  p: PagamentoDaNoiva;
  enviando: boolean;
  pagar: () => void;
  desfazer: () => void;
}) {
  return (
    <li className={`pn-orc-pag${p.pago ? " pago" : p.atrasada ? " atrasada" : ""}`}>
      <div className="pn-t pn-orc-pag-data">{ddmm(p.vencimento)}</div>
      <div className="pn-orc-pag-texto">{p.titulo}</div>
      <div className="pn-orc-pag-quanto">
        <strong>{brl(p.valor)}</strong>
        <span className={`pn-orc-quando${p.pago ? " ok" : p.perto ? "" : " longe"}`}>{p.quando}</span>
      </div>
      <div className="pn-orc-pag-acao">
        {p.pago ? (
          <button type="button" className="pn-orc-link" disabled={enviando} onClick={desfazer}>
            Desfazer
          </button>
        ) : (
          <button type="button" className="pn-orc-paguei" disabled={enviando} onClick={pagar} aria-label={`Paguei: ${p.titulo}`}>
            Paguei
          </button>
        )}
      </div>
    </li>
  );
}

/** A linha de baixo de cada gasto: o assunto e a situação, em palavras. */
function situacao(g: GastoDaNoiva): string {
  const partes: string[] = [];
  if (g.assunto) partes.push(g.assunto);
  if (g.total <= 0) partes.push("sem valor ainda");
  else if (g.falta <= 0) partes.push("quitado");
  else if (g.faltaLancar > 0 && !g.pagamentos.some((p) => !p.pago)) partes.push(`falta lançar ${brl(g.faltaLancar)}`);
  else partes.push(`falta ${brl(g.falta)}`);
  return partes.join(" · ");
}

export function TelaOrcamento({ orcamento }: { orcamento: OrcamentoDaNoiva }) {
  const { eventoId, avisar } = usePortalNoivos();
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [mudandoVerba, setMudandoVerba] = useState(false);
  const [verbaTexto, setVerbaTexto] = useState(orcamento.verba ? mascararDinheiro(String(Math.round(orcamento.verba))) : "");
  const [novo, setNovo] = useState<InicioDoGasto | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [apagando, setApagando] = useState<string | null>(null);
  const [todos, setTodos] = useState(false);

  function rodar(acao: () => Promise<Retorno>, aviso: string, depois?: () => void) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar(aviso);
      depois?.();
      router.refresh();
    });
  }

  function salvarVerba(e: FormEvent) {
    e.preventDefault();
    const valor = desmascararDinheiro(verbaTexto);
    if (!valor || valor <= 0) return avisar("Diga quanto querem gastar.", true);
    rodar(() => salvarOrcamentoDaNoiva(eventoId, valor), "Orçamento salvo", () => setMudandoVerba(false));
  }

  const pagar = (p: PagamentoDaNoiva) => () => rodar(() => marcarPagoDaNoiva(eventoId, p.id), "Pagamento marcado");
  const desfazer = (p: PagamentoDaNoiva) => () => rodar(() => desfazerPagoDaNoiva(eventoId, p.id), "Pagamento desfeito");

  const { verba, gastos, pago, falta, livre, proximos, lista, capitulos } = orcamento;
  const pedirVerba = verba === null || mudandoVerba;
  const pct = gastos > 0 ? Math.round((pago / gastos) * 100) : 0;
  const vistos = todos ? proximos : proximos.slice(0, 5);

  return (
    <section className="pn-orc" aria-label="Orçamento">
      {/* 1. o orçamento */}
      <div className="pn-financeiro-resumo">
        <Eyebrow>Orçamento</Eyebrow>
        {pedirVerba ? (
          <form onSubmit={salvarVerba}>
            <label htmlFor="pn-orc-verba" className="pn-t pn-orc-pergunta">
              Quanto vocês querem gastar no casamento?
            </label>
            <div className="pn-orc-dinheiro">
              <span aria-hidden="true">R$</span>
              <input
                id="pn-orc-verba"
                inputMode="decimal"
                value={verbaTexto}
                onChange={(e) => setVerbaTexto(mascararDinheiro(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="pn-orc-acoes">
              <button type="submit" className="pn-btn" disabled={enviando}>
                Salvar
              </button>
              {verba !== null && (
                <button type="button" className="pn-orc-link" onClick={() => setMudandoVerba(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="pn-orc-verba">
            <div className="pn-t pn-orc-verba-valor">{brl(verba)}</div>
            <div className="pn-orc-verba-rot">
              é o que vocês querem gastar ·{" "}
              <button type="button" className="pn-orc-link" onClick={() => setMudandoVerba(true)}>
                Mudar
              </button>
            </div>
          </div>
        )}

        {gastos > 0 && (
          <>
            <div className="pn-financeiro-numeros">
              <div className="pn-financeiro-numero">
                <div className="pn-financeiro-rot">Gastos</div>
                <div className="pn-t pn-financeiro-valor">{brl(gastos)}</div>
              </div>
              <div className="pn-financeiro-numero">
                <div className="pn-financeiro-rot">Já pago</div>
                <div className="pn-t pn-financeiro-valor pago">{brl(pago)}</div>
              </div>
              <div className="pn-financeiro-numero">
                <div className="pn-financeiro-rot">Falta pagar</div>
                <div className="pn-t pn-financeiro-valor falta">{brl(falta)}</div>
              </div>
            </div>
            <div className="pn-financeiro-barra">
              <Trilho pct={pct} altura={10} fundo="var(--pn-trilho)" cor="var(--pn-verde)" duracao={1.4} />
            </div>
            {livre !== null && (
              <p className={`pn-orc-livre${livre < 0 ? " passou" : ""}`}>
                {livre >= 0 ? `Sobram ${brl(livre)} do orçamento` : `Passou ${brl(-livre)} do orçamento`}
              </p>
            )}
          </>
        )}
      </div>

      {/* 2. os próximos pagamentos */}
      {proximos.length > 0 && (
        <div className="pn-financeiro-parcelas">
          <div className="pn-financeiro-cabeca">
            <h2 className="pn-t pn-financeiro-titulo">Próximos pagamentos</h2>
            <div className="pn-financeiro-conta">{proximos.length === 1 ? "1 em aberto" : `${proximos.length} em aberto`}</div>
          </div>
          <ul className="pn-orc-pagamentos">
            {vistos.map((p) => (
              <LinhaPagamento key={p.id} p={p} enviando={enviando} pagar={pagar(p)} desfazer={desfazer(p)} />
            ))}
          </ul>
          {proximos.length > vistos.length && (
            <div className="pn-orc-acoes">
              <button type="button" className="pn-orc-link" onClick={() => setTodos(true)}>
                Ver os {proximos.length}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. os gastos */}
      <div className="pn-financeiro-parcelas" id="gastos">
        <div className="pn-financeiro-cabeca pn-orc-cabeca-gastos">
          <h2 className="pn-t pn-financeiro-titulo">Gastos</h2>
          {!novo && (
            <button type="button" className="pn-btn" onClick={() => setNovo({ contrato: "somar" })}>
              Novo gasto
            </button>
          )}
        </div>
        {novo && (
          <NovoGasto
            inicio={novo}
            assuntos={orcamento.assuntos}
            fornecedores={orcamento.fornecedores}
            hoje={orcamento.hoje}
            fechar={() => setNovo(null)}
          />
        )}
        {lista.length === 0 && !novo && <p className="pn-orc-vazio">Nenhum gasto ainda.</p>}
        {lista.length > 0 && (
          <ul className="pn-orc-lista">
            {lista.map((g) => {
              const estaAberto = aberto === g.chave;
              return (
                <li key={g.chave} className={`pn-orc-gasto${estaAberto ? " aberto" : ""}`}>
                  <button
                    type="button"
                    className="pn-orc-gasto-linha"
                    aria-expanded={estaAberto}
                    onClick={() => {
                      setAberto(estaAberto ? null : g.chave);
                      setApagando(null);
                    }}
                  >
                    <span className="pn-orc-gasto-texto">
                      <span className="nome">{g.nome}</span>
                      <span className="sub">{situacao(g)}</span>
                    </span>
                    {g.total > 0 && <span className="pn-orc-gasto-valor">{brl(g.total)}</span>}
                    <span className="pn-ic seta" aria-hidden="true">
                      expand_more
                    </span>
                  </button>
                  {estaAberto && (
                    <div className="pn-orc-gasto-corpo">
                      {g.pagamentos.length > 0 && (
                        <ul className="pn-orc-pagamentos">
                          {g.pagamentos.map((p) => (
                            <LinhaPagamento key={p.id} p={p} enviando={enviando} pagar={pagar(p)} desfazer={desfazer(p)} />
                          ))}
                        </ul>
                      )}
                      <div className="pn-orc-acoes">
                        {g.tipo === "fornecedor" && g.faltaLancar > 0 && !novo && (
                          <button
                            type="button"
                            className="pn-btn"
                            onClick={() => {
                              setNovo({
                                oQue: g.nome,
                                fornecedor: g.nome,
                                objetivoId: g.objetivoId,
                                valor: g.faltaLancar,
                                modo: "parcelado",
                                contrato: "manter",
                              });
                              document.getElementById("gastos")?.scrollIntoView({ block: "start", behavior: "smooth" });
                            }}
                          >
                            Lançar os pagamentos
                          </button>
                        )}
                        {apagando === g.chave ? (
                          <>
                            <span className="pn-orc-confirma">
                              {g.tipo === "fornecedor" && g.pagamentos.length > 0
                                ? `Apagar ${g.nome} e ${g.pagamentos.length === 1 ? "o pagamento" : `os ${g.pagamentos.length} pagamentos`}?`
                                : `Apagar ${g.nome}?`}
                            </span>
                            <button
                              type="button"
                              className="pn-orc-link perigo"
                              disabled={enviando}
                              onClick={() =>
                                rodar(() => apagarGastoDaNoiva(eventoId, { tipo: g.tipo, chave: g.chave }), "Gasto apagado", () => {
                                  setApagando(null);
                                  setAberto(null);
                                })
                              }
                            >
                              Apagar
                            </button>
                            <button type="button" className="pn-orc-link" onClick={() => setApagando(null)}>
                              Não
                            </button>
                          </>
                        ) : (
                          <button type="button" className="pn-orc-link" onClick={() => setApagando(g.chave)}>
                            Apagar este gasto
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 4. quanto cada capítulo leva */}
      {verba !== null && capitulos.length > 0 && (
        <div className="pn-financeiro-parcelas">
          <div className="pn-financeiro-cabeca">
            <h2 className="pn-t pn-financeiro-titulo">Por capítulo</h2>
          </div>
          <ul className="pn-orc-caps">
            {capitulos.map((c) => (
              <li key={c.id}>
                <div className="pn-orc-cap-linha">
                  <span className="nome">{c.nome}</span>
                  <span className="quanto">
                    {!c.previsto ? brl(c.gasto) : c.gasto > 0 ? `${brl(c.gasto)} de ${brl(c.previsto)}` : `${brl(c.previsto)} previstos`}
                  </span>
                </div>
                {c.previsto ? (
                  <Trilho
                    pct={(c.gasto / c.previsto) * 100}
                    altura={6}
                    fundo="var(--pn-trilho)"
                    cor={c.gasto > c.previsto ? "var(--pn-marrom)" : "var(--pn-verde)"}
                  />
                ) : null}
                {c.previsto && c.gasto > c.previsto ? <div className="pn-orc-cap-passou">passou {brl(c.gasto - c.previsto)}</div> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
