"use client";

// Importar a lista de convidados (13/10/2026): a noiva manda a lista num
// Excel, num Word ou colada no WhatsApp. O arquivo é lido aqui no
// navegador; a cerimonialista confere as linhas e só então salva.
//
// A lista bagunçada (22/10/2026, C1 do RSVP): com a IA liberada, a lista
// colada também pode ser organizada pela IA ("Tia Maria + marido + 2
// filhos", "Família Souza (5)", títulos de grupo). A conferência é a mesma.

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linhasDoTexto, separarRepetidos, type LinhaImportada } from "@/lib/importar-convidados";
import { ACEITOS_NA_LISTA, lerListaDoArquivo } from "@/lib/importar-convidados-arquivo";
import { importarConvidados } from "@/app/(app)/eventos/[id]/rsvp/actions";
import { MarcaDaIa } from "@/components/MarcaDaIa";
import { totalDaLista } from "@/lib/ia-lista-convidados";

export function ImportarLista({
  eventId,
  nomesAtuais,
  aoFechar,
  aoTerminar,
  ia = false,
}: {
  eventId: string;
  nomesAtuais: string[];
  aoFechar: () => void;
  aoTerminar: (frase: string) => void;
  /** a IA liberada para a conta: "Organizar com IA" */
  ia?: boolean;
}) {
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [lidas, setLidas] = useState<LinhaImportada[] | null>(null);
  const [origem, setOrigem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, comecar] = useTransition();

  const separadas = useMemo(() => (lidas ? separarRepetidos(lidas, nomesAtuais) : null), [lidas, nomesAtuais]);

  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setLendo(true);
    try {
      const l = await lerListaDoArquivo(f);
      if (!l.length) setErro("Não achei nomes nesse arquivo. Confira se a lista está na primeira aba, ou copie e cole.");
      else {
        setLidas(l);
        setOrigem(f.name);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setLendo(false);
      if (arquivo.current) arquivo.current.value = "";
    }
  }

  function lerColado() {
    const l = linhasDoTexto(texto);
    if (!l.length) {
      setErro("Cole um nome por linha.");
      return;
    }
    setErro(null);
    setLidas(l);
    setOrigem("lista colada");
  }

  async function organizarComIa() {
    setErro(null);
    setLendo(true);
    try {
      const r = await fetch("/api/ai/rsvp-lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, texto }),
      });
      const j = (await r.json().catch(() => ({}))) as { linhas?: LinhaImportada[]; error?: string };
      if (!r.ok || !j.linhas) throw new Error(j.error ?? "A leitura não respondeu agora.");
      setLidas(j.linhas);
      setOrigem("organizada com IA");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler.");
    } finally {
      setLendo(false);
    }
  }

  function salvar() {
    if (!separadas || separadas.novas.length === 0) return;
    comecar(async () => {
      const r = await importarConvidados(eventId, separadas.novas);
      if (r.error && r.adicionados === 0) {
        setErro(r.error);
        return;
      }
      router.refresh();
      aoTerminar(
        `${r.adicionados} ${r.adicionados === 1 ? "convidado adicionado" : "convidados adicionados"}` +
          (r.repetidos ? ` · ${r.repetidos} já estavam na lista` : "") +
          (r.error ? ` · ${r.error}` : "")
      );
    });
  }

  return (
    <>
      <div className="rp-veu" onClick={aoFechar} aria-hidden />
      <div className="rp-modal" role="dialog" aria-modal="true" aria-label="Importar lista de convidados">
        <header>
          <h3>Importar lista</h3>
          {origem && <span className="rp-mono" style={{ fontSize: 12, color: "var(--cinza)" }}>{origem}</span>}
          <button type="button" className="rp-btn" style={{ marginLeft: "auto" }} onClick={aoFechar}>
            Fechar
          </button>
        </header>

        <div className="rp-corpo">
          {!lidas ? (
            <>
              <div className="rp-par" style={{ alignItems: "center" }}>
                <button type="button" className="rp-btn p g" disabled={lendo} onClick={() => arquivo.current?.click()}>
                  {lendo ? "Lendo…" : "Escolher arquivo"}
                </button>
                <span className="rp-nota">Excel, CSV, Word ou PDF</span>
                <input
                  ref={arquivo}
                  type="file"
                  accept={ACEITOS_NA_LISTA}
                  hidden
                  onChange={(e) => escolher(e.target.files?.[0])}
                />
              </div>
              <span className="rp-rot" style={{ padding: "6px 0 0" }}>ou cole a lista</span>
              <textarea
                className="rp-in"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={"Ana Souza (11) 98765-4321\nBruno e Carla Lima +1\nTia Lúcia"}
                aria-label="Lista colada, um convidado por linha"
              />
              <div className="rp-par" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="rp-btn" disabled={!texto.trim() || lendo} onClick={lerColado}>
                  Ler a lista
                </button>
                {ia && (
                  <button
                    type="button"
                    className="rp-btn"
                    disabled={!texto.trim() || lendo}
                    onClick={() => void organizarComIa()}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <MarcaDaIa tamanho={12} />
                    {lendo ? "Organizando…" : "Organizar com IA"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="rp-nota" style={{ fontSize: 13, color: "var(--tinta)" }}>
                <b>{separadas!.novas.length}</b> {separadas!.novas.length === 1 ? "convite novo" : "convites novos"}
                {" · "}
                {(() => {
                  const p = separadas!.novas.reduce((s, l) => s + 1 + l.acompanhantes + (l.criancas ?? 0), 0);
                  const diz = origem === "organizada com IA" && !separadas!.repetidas.length ? totalDaLista(texto) : null;
                  return (
                    <>
                      {p} {p === 1 ? "pessoa" : "pessoas"}
                      {diz !== null && diz !== p && <span style={{ color: "var(--esp)" }}> · a lista diz {diz}: confira</span>}
                    </>
                  );
                })()}
                {separadas!.repetidas.length > 0 && <span style={{ color: "var(--cinza)" }}> · {separadas!.repetidas.length} já estão na lista e ficam de fora</span>}
              </p>
              <div style={{ maxHeight: "48dvh", overflow: "auto", border: "1px solid var(--linha)", borderRadius: 6 }}>
                <table className="rp-tab">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>WhatsApp</th>
                      <th>E-mail</th>
                      <th>Grupo</th>
                      <th>Acomp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...separadas!.novas.map((l) => ({ l, rep: false })), ...separadas!.repetidas.map((l) => ({ l, rep: true }))].map(({ l, rep }, i) => (
                      <tr key={i} className={rep ? "rep" : undefined}>
                        <td>{l.nome}{rep ? " · já na lista" : ""}</td>
                        <td className="rp-mono">{l.telefone ?? "—"}</td>
                        <td>{l.email ?? "—"}</td>
                        <td>{[l.grupo, l.lado ? `lado ${l.lado === "noiva" ? "da noiva" : "do noivo"}` : null].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="rp-mono">
                          {[l.acompanhantes ? `+${l.acompanhantes}` : null, l.criancas ? `${l.criancas} ${l.criancas === 1 ? "criança" : "crianças"}` : null]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {erro && <p className="rp-nota esp">{erro}</p>}
        </div>

        {lidas && (
          <footer>
            <button type="button" className="rp-btn" onClick={() => { setLidas(null); setOrigem(null); }}>
              Outra lista
            </button>
            <button
              type="button"
              className="rp-btn p g"
              style={{ marginLeft: "auto" }}
              disabled={salvando || !separadas || separadas.novas.length === 0}
              onClick={salvar}
            >
              {salvando ? "Adicionando…" : `Adicionar ${separadas?.novas.length ?? 0} à lista`}
            </button>
          </footer>
        )}
      </div>
    </>
  );
}
