"use client";

// A tela Documentos do portal dos noivos (desenho v4, README §12;
// protótipo, template 567–610 e lógica 1081–1094). Duas colunas:
//   · Contratos e comprovantes — cada um abre o arquivo ("Ver");
//   · Decisões esperando vocês — Aprovar / Pedir mudança, pelas ações que
//     o portal já tem (curadoria 092, guia de estilo 096). Curadoria de
//     várias opções não se aprova de uma vez: "Escolher" leva às opções;
//   · Histórico de aprovações — a hora é a do servidor; "por quem" só
//     onde o banco grava (o guia).
// Aprovar e pedir mudança respondem na hora (otimista) e o servidor
// confirma pelo refresh; o otimista vale só enquanto os dados são os
// mesmos de quando ela tocou.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { escolherOpcao, recusarTodas } from "@/app/(portal)/portal/[eventoId]/escolhas/actions";
import { aprovarGuia, pedirAjusteNoGuia } from "@/app/(portal)/portal/[eventoId]/guia-estilo/actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import { dataHoraBR, type AprovacaoDaTela, type DocumentoDaTela, type PendenteDaTela } from "./montar";
import "./documentos.css";

const CHIP: Record<DocumentoDaTela["status"], string> = { assinado: "Assinado", arquivo: "arquivo" };

/** As ações do portal devolvem {error} de dois jeitos; aqui vira texto ou null. */
function erroDe(r: { error?: string } | { success: true } | { ok?: true; error?: string }): string | null {
  return "error" in r && r.error ? r.error : null;
}

export function TelaDocumentos({
  documentos,
  pendentes,
  historico,
  eu,
}: {
  documentos: DocumentoDaTela[];
  pendentes: PendenteDaTela[];
  historico: AprovacaoDaTela[];
  /** primeiro nome de quem está no portal (o guia grava o nome do acesso) */
  eu: string | null;
}) {
  const { eventoId, base, cerimonialista, avisar } = usePortalNoivos();
  const router = useRouter();

  // o que ela acabou de fazer, preso aos dados de quando tocou
  const [saidos, setSaidos] = useState<{ chave: string; de: PendenteDaTela[] }[]>([]);
  const [notas, setNotas] = useState<{ chave: string; nota: string; de: PendenteDaTela[] }[]>([]);
  const [novas, setNovas] = useState<{ item: AprovacaoDaTela; de: AprovacaoDaTela[] }[]>([]);
  const [pedindo, setPedindo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);

  const tirados = new Set(saidos.filter((s) => s.de === pendentes).map((s) => s.chave));
  const notaNova = new Map(notas.filter((n) => n.de === pendentes).map((n) => [n.chave, n.nota]));
  const lista = pendentes
    .filter((p) => !tirados.has(p.chave))
    .map((p) => (notaNova.has(p.chave) ? { ...p, nota: notaNova.get(p.chave) ?? p.nota } : p));
  const log = [...novas.filter((n) => n.de === historico).map((n) => n.item), ...historico];

  async function aprovar(p: PendenteDaTela) {
    if (enviando) return;
    setEnviando(p.chave);
    const r =
      p.tipo === "guia"
        ? await aprovarGuia(eventoId, p.alvoId)
        : await escolherOpcao(eventoId, p.alvoId, p.opcaoId ?? "");
    setEnviando(null);
    const erro = erroDe(r);
    if (erro) {
      avisar(erro, true);
      return;
    }
    setSaidos((s) => [...s, { chave: p.chave, de: pendentes }]);
    setNovas((n) => [
      {
        item: {
          chave: p.chave,
          titulo: p.rotuloAprovado,
          por: p.tipo === "guia" ? eu : null,
          quando: dataHoraBR(new Date()),
        },
        de: historico,
      },
      ...n,
    ]);
    avisar("Aprovado e registrado");
    router.refresh();
  }

  async function pedirMudanca(p: PendenteDaTela) {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setEnviando(p.chave);
    const r =
      p.tipo === "guia"
        ? await pedirAjusteNoGuia(eventoId, p.alvoId, msg)
        : await recusarTodas(eventoId, p.alvoId, msg);
    setEnviando(null);
    const erro = erroDe(r);
    if (erro) {
      avisar(erro, true);
      return;
    }
    setPedindo(null);
    setTexto("");
    // o guia continua esperando (a cerimonialista ajusta e ele volta a
    // ser aprovável); a curadoria recusada sai da lista
    if (p.tipo === "guia") setNotas((n) => [...n, { chave: p.chave, nota: "mudança pedida hoje", de: pendentes }]);
    else setSaidos((s) => [...s, { chave: p.chave, de: pendentes }]);
    avisar(cerimonialista ? `${cerimonialista} recebeu o pedido de mudança` : "Pedido de mudança enviado");
    router.refresh();
  }

  function abrirPedido(chave: string) {
    setPedindo(chave);
    setTexto("");
  }

  return (
    <div className="pn-documentos">
      {/* ---------- contratos e comprovantes ---------- */}
      <section className="pn-documentos-card" aria-labelledby="pn-documentos-t1">
        <Eyebrow>Documentos</Eyebrow>
        <h2 id="pn-documentos-t1" className="pn-t pn-documentos-titulo">
          Contratos e comprovantes
        </h2>
        <div className="pn-documentos-lista">
          {documentos.map((d) => (
            <div key={d.chave} className="pn-documentos-doc">
              <div className="pn-documentos-doc-icone">
                <Icone nome={d.icone} tamanho={22} />
              </div>
              <div className="pn-documentos-doc-texto">
                <div className="pn-documentos-doc-nome">{d.nome}</div>
                {d.info && <div className="pn-documentos-doc-info">{d.info}</div>}
              </div>
              <span className={`pn-documentos-chip ${d.status}`}>{CHIP[d.status]}</span>
              <a className="pn-documentos-ver" href={d.href} target="_blank" rel="noopener noreferrer">
                Ver
              </a>
            </div>
          ))}
          {documentos.length === 0 && <div className="pn-documentos-nada">Nenhum contrato ou comprovante ainda.</div>}
        </div>
      </section>

      <div className="pn-documentos-direita">
        {/* ---------- para aprovar ---------- */}
        <section className="pn-documentos-card" aria-labelledby="pn-documentos-t2">
          <Eyebrow>Para aprovar</Eyebrow>
          <h2 id="pn-documentos-t2" className="pn-t pn-documentos-titulo">
            Decisões esperando vocês
          </h2>
          <div className="pn-documentos-pendentes">
            {lista.map((p) => {
              const ocupado = enviando === p.chave;
              const aberto = pedindo === p.chave;
              return (
                <div key={p.chave} className="pn-documentos-pendente">
                  <Link href={`${base}/${p.seg}`} className="pn-t pn-documentos-pendente-titulo">
                    {p.titulo}
                  </Link>
                  {p.texto && <div className="pn-documentos-pendente-texto">{p.texto}</div>}
                  {(p.prazo || p.nota) && (
                    <div className="pn-documentos-pendente-nota">{[p.prazo, p.nota].filter(Boolean).join(" · ")}</div>
                  )}

                  {aberto ? (
                    <div>
                      <textarea
                        className="pn-documentos-campo"
                        aria-label="O que vocês querem mudar"
                        placeholder="O que vocês querem mudar?"
                        value={texto}
                        maxLength={600}
                        rows={3}
                        autoFocus
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setPedindo(null);
                        }}
                      />
                      <div className="pn-documentos-botoes">
                        <button
                          type="button"
                          className="pn-documentos-aprovar"
                          disabled={ocupado || !texto.trim()}
                          onClick={() => pedirMudanca(p)}
                        >
                          Enviar pedido
                        </button>
                        <button
                          type="button"
                          className="pn-documentos-mudar"
                          disabled={ocupado}
                          onClick={() => setPedindo(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pn-documentos-botoes">
                      {p.tipo === "curadoria" && !p.opcaoId ? (
                        <Link href={`${base}/escolhas`} className="pn-documentos-aprovar">
                          Escolher
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="pn-documentos-aprovar"
                          disabled={!!enviando}
                          onClick={() => aprovar(p)}
                        >
                          Aprovar
                        </button>
                      )}
                      <button
                        type="button"
                        className="pn-documentos-mudar"
                        disabled={!!enviando}
                        onClick={() => abrirPedido(p.chave)}
                      >
                        Pedir mudança
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {lista.length === 0 && <div className="pn-documentos-nada">Nada esperando por vocês agora.</div>}
          </div>
        </section>

        {/* ---------- histórico ---------- */}
        {log.length > 0 && (
          <section className="pn-documentos-historico" aria-labelledby="pn-documentos-t3">
            <h2 id="pn-documentos-t3" className="pn-t pn-documentos-historico-titulo">
              Histórico de aprovações
            </h2>
            <div className="pn-documentos-log">
              {log.map((l) => (
                <div key={l.chave} className="pn-documentos-log-item">
                  <Icone nome="verified" tamanho={20} cheio cor="#e9ae88" style={{ flex: "none" }} />
                  <div>
                    <div className="pn-documentos-log-t">{l.titulo}</div>
                    <div className="pn-documentos-log-quem">
                      {l.por ? `Aprovado por ${l.por}` : "Aprovado"} · {l.quando}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
