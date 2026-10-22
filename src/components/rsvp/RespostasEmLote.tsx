"use client";

// As respostas em lote (21/10/2026, C2 do plano do RSVP): ela cola o que
// chegou no WhatsApp (ou grava um áudio), a leitura propõe as mudanças, ela
// confere uma a uma e grava. Quem a leitura não casou com certeza fica
// desmarcado até ela escolher o convidado. Desfazer por 24 h.

import { useMemo, useState, useTransition } from "react";
import { MarcaDaIa } from "@/components/MarcaDaIa";
import { AudioParaTexto } from "@/components/AudioParaTexto";
import { mudancaEmPalavras, type ItemDasRespostas, type PacoteDasRespostas } from "@/lib/ia-rsvp";
import { confirmarRespostas, descartarRespostas, desfazerRespostas } from "@/app/(app)/eventos/[id]/rsvp/ia-actions";

type Convidado = { id: string; nome: string; confirmacao: "aguardando" | "confirmado" | "nao_vai"; acompanhantes: number; criancas: number };

const HOJE: Record<Convidado["confirmacao"], string> = { aguardando: "sem resposta", confirmado: "confirmado", nao_vai: "não vai" };
const hojeEmPalavras = (c: Convidado) =>
  `${HOJE[c.confirmacao]}${c.acompanhantes ? ` +${c.acompanhantes}` : ""}${c.criancas ? ` · ${c.criancas} ${c.criancas === 1 ? "criança" : "crianças"}` : ""}`;
const SELO: Record<ItemDasRespostas["casamento"], string | null> = {
  certo: null,
  provavel: "confira o nome",
  escolher: "mais de um parecido",
  nao_achei: "não achei na lista",
};

export function RespostasEmLote({
  eventId,
  convidados,
  aoFechar,
  aoTerminar,
}: {
  eventId: string;
  convidados: Convidado[];
  aoFechar: () => void;
  /** gravou ou desfez: a lista recarrega */
  aoTerminar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [trabalho, setTrabalho] = useState<{ id: string; pacote: PacoteDasRespostas } | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [feito, setFeito] = useState<{ gravadas: number; recusadas: string[] } | null>(null);
  const [desfeito, setDesfeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const porId = useMemo(() => new Map(convidados.map((c) => [c.id, c])), [convidados]);
  const emOrdem = useMemo(() => [...convidados].sort((a, b) => a.nome.localeCompare(b.nome)), [convidados]);

  async function ler() {
    setErro(null);
    setLendo(true);
    try {
      const r = await fetch("/api/ai/rsvp-respostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, texto }),
      });
      const j = (await r.json().catch(() => ({}))) as { trabalhoId?: string; pacote?: PacoteDasRespostas; error?: string };
      if (!r.ok || !j.trabalhoId || !j.pacote) throw new Error(j.error ?? "A leitura não respondeu agora.");
      setTrabalho({ id: j.trabalhoId, pacote: j.pacote });
      setMarcadas(new Set(j.pacote.itens.filter((i) => i.marcada).map((i) => i.chave)));
      setEscolha(Object.fromEntries(j.pacote.itens.filter((i) => i.convidadoId).map((i) => [i.chave, i.convidadoId!])));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler.");
    } finally {
      setLendo(false);
    }
  }

  function alternar(chave: string) {
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });
  }

  const prontas = trabalho ? trabalho.pacote.itens.filter((i) => marcadas.has(i.chave) && escolha[i.chave]) : [];

  function gravar() {
    if (!trabalho) return;
    setErro(null);
    iniciar(async () => {
      const r = await confirmarRespostas(
        eventId,
        trabalho.id,
        prontas.map((i) => ({ chave: i.chave, convidadoId: escolha[i.chave] }))
      );
      if ("error" in r) setErro(r.error);
      else {
        setFeito({ gravadas: r.gravadas, recusadas: r.recusadas });
        aoTerminar();
      }
    });
  }

  function fechar() {
    if (trabalho && !feito) void descartarRespostas(eventId, trabalho.id);
    aoFechar();
  }

  function desfazer() {
    if (!trabalho) return;
    iniciar(async () => {
      const r = await desfazerRespostas(eventId, trabalho.id);
      if (r.error) setErro(r.error);
      else {
        setDesfeito(r.mantidos ? `Desfeito. ${r.mantidos} ${r.mantidos === 1 ? "convidado mudou" : "convidados mudaram"} de novo depois e ficaram como estão.` : "Desfeito.");
        aoTerminar();
      }
    });
  }

  return (
    <>
      <div className="rp-veu" onClick={fechar} aria-hidden />
      <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Respostas em lote">
        <header>
          <h3>Colar respostas</h3>
          <MarcaDaIa tamanho={12} titulo="Leitura por inteligência artificial" />
          <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={fechar}>
            Fechar
          </button>
        </header>

        <div className="rp-corpo">
          {!trabalho ? (
            <>
              <textarea
                className="rp-in"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={"Cole as mensagens do WhatsApp ou escreva o que ouviu.\nEx.: Tia Lu vai com o marido. O primo João não vai. A Carla é vegetariana."}
                aria-label="Respostas dos convidados"
              />
              <AudioParaTexto onTexto={(t) => setTexto((x) => (x.trim() ? `${x.trim()}\n${t}` : t))} />
              <div className="rp-par" style={{ alignItems: "center" }}>
                <button type="button" className="rp-btn p" onClick={() => void ler()} disabled={lendo || texto.trim().length < 8}>
                  {lendo ? "Lendo…" : "Ler as respostas"}
                </button>
              </div>
            </>
          ) : feito ? (
            <>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--tinta)" }}>
                {feito.gravadas} {feito.gravadas === 1 ? "resposta gravada" : "respostas gravadas"}
              </p>
              {feito.recusadas.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--alerta)" }}>
                  {feito.recusadas.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
              {desfeito ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--cinza3)" }}>{desfeito}</p>
              ) : (
                feito.gravadas > 0 && (
                  <div className="rp-par" style={{ alignItems: "center" }}>
                    <button type="button" className="rp-btn" onClick={desfazer} disabled={pendente}>
                      Desfazer
                    </button>
                  </div>
                )
              )}
            </>
          ) : (
            <>
              <p className="rp-mono" style={{ margin: 0, fontSize: 12, color: "var(--cinza)" }}>
                {trabalho.pacote.itens.length} {trabalho.pacote.itens.length === 1 ? "resposta lida" : "respostas lidas"}
                {trabalho.pacote.iguais ? ` · ${trabalho.pacote.iguais} já ${trabalho.pacote.iguais === 1 ? "estava" : "estavam"} assim na lista` : ""}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
                {trabalho.pacote.itens.map((i) => {
                  const id = escolha[i.chave] ?? "";
                  const c = id ? porId.get(id) : null;
                  const selo = SELO[i.casamento];
                  const candidatos = new Set(i.candidatos.map((x) => x.id));
                  return (
                    <li
                      key={i.chave}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "20px minmax(0,1fr)",
                        gap: "4px 10px",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--linha)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={marcadas.has(i.chave)}
                        onChange={() => alternar(i.chave)}
                        disabled={!id}
                        aria-label={`Gravar a resposta de ${i.citado}`}
                        style={{ marginTop: 7 }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 10px" }}>
                          <select
                            className="rp-in"
                            value={id}
                            onChange={(e) => {
                              const v = e.target.value;
                              setEscolha((x) => ({ ...x, [i.chave]: v }));
                              setMarcadas((m) => {
                                const n = new Set(m);
                                if (v) n.add(i.chave);
                                else n.delete(i.chave);
                                return n;
                              });
                            }}
                            aria-label={`Convidado de "${i.citado}"`}
                            style={{ maxWidth: 260 }}
                          >
                            <option value="">Escolher o convidado…</option>
                            {i.candidatos.length > 0 && (
                              <optgroup label="Parecidos">
                                {i.candidatos.map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.nome}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Toda a lista">
                              {emOrdem
                                .filter((x) => !candidatos.has(x.id))
                                .map((x) => (
                                  <option key={x.id} value={x.id}>
                                    {x.nome}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: i.resposta === "confirmado" ? "var(--ok)" : "var(--cinza3)" }}>
                            {mudancaEmPalavras(i)}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--cinza)" }}>
                          na conversa: {i.citado}
                          {selo ? ` · ${selo}` : ""}
                          {c ? ` · hoje: ${hojeEmPalavras(c)}` : ""}
                        </span>
                        {i.trecho && (
                          <span style={{ fontSize: 12.5, fontStyle: "italic", color: "var(--cinza3)", overflowWrap: "anywhere" }}>“{i.trecho}”</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {erro && <p style={{ margin: 0, fontSize: 13, color: "var(--alerta)" }}>{erro}</p>}
        </div>

        {trabalho && !feito && (
          <footer>
            <button type="button" className="rp-btn p" onClick={gravar} disabled={pendente || prontas.length === 0}>
              {pendente ? "Gravando…" : `Gravar ${prontas.length} ${prontas.length === 1 ? "resposta" : "respostas"}`}
            </button>
            <button type="button" className="rp-btn" onClick={fechar} disabled={pendente}>
              Descartar
            </button>
          </footer>
        )}
      </div>
    </>
  );
}
