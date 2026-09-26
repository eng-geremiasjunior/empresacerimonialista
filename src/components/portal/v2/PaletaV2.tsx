"use client";

// Paleta e estilo (portal v2, 181). As 3 a 5 cores da festa, com nome —
// a primeira vira a cor do portal. A família monta do zero ou parte de
// uma paleta da cerimonialista; grava no guia de estilo dela. Embaixo, as
// referências por assunto (as imagens que explicam o que a palavra não
// dá conta) e, quando o guia chega para aprovar, Aprovar/Pedir ajuste.

import { useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirFoto } from "@/lib/portfolio";
import type { CorDaPaleta, PaletaDoPortal } from "@/lib/supabase/portal-paleta";
import { salvarPaleta } from "@/app/(portal)/portal/[eventoId]/guia-estilo/paleta-actions";
import { aprovarGuia, pedirAjusteNoGuia, registrarReferencia, removerReferencia } from "@/app/(portal)/portal/[eventoId]/guia-estilo/actions";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";
const ASSUNTOS: [string, string][] = [["decoracao", "Decoração"], ["flores", "Flores"], ["vestido", "Vestido"], ["bolo", "Bolo e doces"], ["convite", "Convite"], ["geral", "Outros"]];

export function PaletaV2({
  eventoId,
  dados,
  cerimonialista,
  eu,
}: {
  eventoId: string;
  dados: PaletaDoPortal;
  cerimonialista: string;
  eu: string | null;
}) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const [editando, setEditando] = useState(dados.cores.length === 0);
  const [cores, setCores] = useState<CorDaPaleta[]>(dados.cores.length ? dados.cores : [
    { nome: "Lilás", hex: "#b49ac9" },
    { nome: "Rosa antigo", hex: "#d9a7a0" },
    { nome: "Champanhe", hex: "#eadcc3" },
  ]);
  const [sensacao, setSensacao] = useState(dados.guia?.sensacao ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ajuste, setAjuste] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [assunto, setAssunto] = useState("decoracao");
  const [agradou, setAgradou] = useState("");
  const [subindo, setSubindo] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const mostradas = editando ? cores : dados.cores;
  const situacao = dados.guia?.situacao ?? null;
  const resumo =
    situacao === "aprovado"
      ? `aprovada${dados.guia?.aprovadoNome ? ` por ${dados.guia.aprovadoNome.split(" ")[0]}` : ""}`
      : situacao === "aguardando"
        ? `${cerimonialista} mandou para vocês aprovarem`
        : dados.cores.length
          ? `${dados.cores.length} ${dados.cores.length > 1 ? "cores" : "cor"}${dados.guia?.sensacao ? ` · ${dados.guia.sensacao}` : ""}`
          : "a paleta começa aqui";

  const refs = useMemo(() => dados.referencias.filter((r) => filtro === "todos" || r.assunto === filtro), [dados.referencias, filtro]);

  function mudar(i: number, c: Partial<CorDaPaleta>) {
    setCores((cs) => cs.map((x, j) => (j === i ? { ...x, ...c } : x)));
  }
  function mover(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= cores.length) return;
    const n = cores.slice();
    [n[i], n[j]] = [n[j], n[i]];
    setCores(n);
  }

  function salvar() {
    setAviso(null);
    iniciar(async () => {
      const r = await salvarPaleta(eventoId, cores, sensacao.trim() || null);
      if ("error" in r) setAviso(r.error);
      else {
        setEditando(false);
        setAviso("Paleta salva. A primeira cor já é a cor do portal.");
        router.refresh();
      }
    });
  }

  async function subir(file: File) {
    setAviso(null);
    setSubindo(true);
    try {
      const corpo = await comprimirFoto(file);
      const ext = corpo !== file ? "jpg" : (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${eventoId}/ref-${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("inspiracoes").upload(path, corpo, { contentType: corpo !== file ? "image/jpeg" : file.type, upsert: false });
      if (error) {
        setAviso("Não foi possível enviar a imagem.");
        return;
      }
      const r = await registrarReferencia(eventoId, path, assunto, agradou, eu ?? "");
      if ("error" in r) setAviso(r.error);
      else {
        setAgradou("");
        router.refresh();
      }
    } finally {
      setSubindo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>Paleta e estilo</h1>
        <div style={{ fontSize: 14, color: "#4c443c" }}>{resumo}</div>
      </div>

      {/* as cores */}
      {mostradas.length > 0 && (
        <div style={{ display: "flex", gap: 8, height: 190, animation: `pv2-entrar .7s ${ES} backwards` }}>
          {mostradas.map((c, i) => (
            <div key={`${c.hex}-${i}`} style={{ flex: i === 0 ? 1.6 : 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, transition: `flex .5s ${ES}` }}>
              <div style={{ flex: 1, borderRadius: 22, background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06), 0 18px 36px -26px rgba(50,35,45,.5)" }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: "#2b241f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</div>
              <div style={{ fontSize: 11, color: "#776d60" }}>{i === 0 ? "a cor da festa" : c.hex}</div>
            </div>
          ))}
        </div>
      )}

      {situacao === "aguardando" && !editando && dados.guia && (
        <div className="pv2-vidro" style={{ padding: 16, borderRadius: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 15, color: "#2b241f" }}>{cerimonialista} mandou o guia de estilo para vocês aprovarem.</div>
          {ajuste === null ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" onClick={() => iniciar(async () => { const r = await aprovarGuia(eventoId, dados.guia!.id); if ("error" in r) setAviso(r.error); router.refresh(); })} style={botaoForte}>Aprovar</button>
              <button type="button" onClick={() => setAjuste("")} style={botaoLeve}>Pedir ajuste</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea value={ajuste} onChange={(e) => setAjuste(e.target.value)} rows={2} maxLength={500} placeholder="O que vocês gostariam de mudar?" style={{ ...campo, height: "auto", padding: 12, resize: "vertical" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => iniciar(async () => { const r = await pedirAjusteNoGuia(eventoId, dados.guia!.id, ajuste); if ("error" in r) setAviso(r.error); else setAjuste(null); router.refresh(); })} style={botaoForte}>Enviar para {cerimonialista}</button>
                <button type="button" onClick={() => setAjuste(null)} style={botaoLeve}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {editando ? (
        <div className="pv2-vidro" style={{ padding: 16, borderRadius: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {cores.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ position: "relative", flex: "none", width: 44, height: 44, borderRadius: "50%", background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)", cursor: "pointer", overflow: "hidden" }}>
                <input type="color" value={c.hex} onChange={(e) => mudar(i, { hex: e.target.value })} aria-label={`Cor ${i + 1}`} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
              </label>
              <input value={c.nome} onChange={(e) => mudar(i, { nome: e.target.value })} maxLength={40} aria-label={`Nome da cor ${i + 1}`} style={{ ...campo, flex: 1, minWidth: 0 }} />
              <button type="button" aria-label={`Subir ${c.nome}`} onClick={() => mover(i, -1)} style={seta}>↑</button>
              <button type="button" aria-label={`Descer ${c.nome}`} onClick={() => mover(i, 1)} style={seta}>↓</button>
              <button type="button" aria-label={`Tirar ${c.nome}`} disabled={cores.length <= 1} onClick={() => setCores(cores.filter((_, j) => j !== i))} style={{ ...seta, fontSize: 18, color: "#928a81" }}>×</button>
            </div>
          ))}
          {cores.length < 5 && (
            <button type="button" onClick={() => setCores([...cores, { nome: "Nova cor", hex: "#c9b8a6" }])} style={{ ...botaoLeve, alignSelf: "flex-start", height: 40 }}>
              + cor
            </button>
          )}
          <input value={sensacao} onChange={(e) => setSensacao(e.target.value)} maxLength={200} placeholder="A sensação da festa (ex.: romântica e leve)" aria-label="A sensação da festa" style={campo} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={salvando} onClick={salvar} style={botaoForte}>{salvando ? "Salvando…" : "Salvar a paleta"}</button>
            {dados.cores.length > 0 && (
              <button type="button" onClick={() => { setCores(dados.cores); setEditando(false); }} style={botaoLeve}>Cancelar</button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setCores(dados.cores); setEditando(true); }} style={{ ...botaoLeve, alignSelf: "flex-start" }}>
          Mudar a paleta
        </button>
      )}
      {aviso && <div role="status" style={{ fontSize: 13, color: aviso.startsWith("Paleta salva") ? "#4c443c" : "#8a2f2f" }}>{aviso}</div>}

      {/* as paletas da cerimonialista */}
      {dados.paletas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={h2}>Paletas de {cerimonialista}</h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollbarWidth: "none", margin: "0 -20px", padding: "4px 20px 10px" }}>
            {dados.paletas.map((p) => (
              <div key={p.id} style={{ flex: "none", width: 220, padding: 12, borderRadius: 20, background: "rgba(255,255,255,.85)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", height: 56, borderRadius: 12, overflow: "hidden" }}>
                  {p.cores.slice(0, 5).map((c, i) => <span key={i} style={{ flex: 1, background: c.hex }} />)}
                </div>
                <div style={{ fontFamily: TITULO, fontSize: 18, color: "#2b241f" }}>{p.nome}</div>
                {p.sensacao && <div style={{ fontSize: 12.5, color: "#776d60" }}>{p.sensacao}</div>}
                <button type="button" onClick={() => { setCores(p.cores.slice(0, 5)); if (p.sensacao) setSensacao(p.sensacao); setEditando(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ ...botaoChip, alignSelf: "flex-start" }}>
                  Usar esta
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* as referências */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={h2}>Referências</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[["todos", "Todas"] as [string, string], ...ASSUNTOS].map(([v, t]) => (
            <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} style={chip(filtro === v)}>{t}</button>
          ))}
        </div>
        {refs.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {refs.map((r) => (
              <figure key={r.id} style={{ margin: 0, position: "relative", borderRadius: 16, overflow: "hidden", background: "#ede8e2", aspectRatio: "1" }}>
                {r.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.url} alt={r.legenda ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                {(r.legenda || r.autor) && (
                  <figcaption style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 10px 8px", background: "linear-gradient(transparent, rgba(20,14,18,.7))", color: "#fdfbf7", fontSize: 12 }}>
                    {r.legenda}
                    {r.autor ? <span style={{ opacity: 0.8 }}>{r.legenda ? " · " : ""}{r.autor.split(" ")[0]}</span> : null}
                  </figcaption>
                )}
                <button type="button" aria-label="Tirar esta referência" onClick={() => iniciar(async () => { await removerReferencia(eventoId, r.id, r.path); router.refresh(); })} style={{ position: "absolute", top: 6, right: 6, width: 30, height: 30, border: 0, borderRadius: "50%", background: "rgba(255,255,255,.85)", color: "#3a312a", cursor: "pointer" }}>
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}
        <div className="pv2-vidro" style={{ padding: 14, borderRadius: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ASSUNTOS.map(([v, t]) => (
              <button key={v} type="button" aria-pressed={assunto === v} onClick={() => setAssunto(v)} style={chip(assunto === v, true)}>{t}</button>
            ))}
          </div>
          <input value={agradou} onChange={(e) => setAgradou(e.target.value)} maxLength={300} placeholder="O que agradou nesta imagem? (opcional)" aria-label="O que agradou" style={campo} />
          <button type="button" disabled={subindo} onClick={() => entrada.current?.click()} style={{ ...botaoForte, alignSelf: "flex-start" }}>
            {subindo ? "Enviando…" : "Mandar uma imagem"}
          </button>
          <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
        </div>
      </div>
    </div>
  );
}

const h2: CSSProperties = { margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 23, color: "#332b24" };
const campo: CSSProperties = { height: 46, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
const botaoForte: CSSProperties = { height: 46, padding: "0 16px", border: 0, borderRadius: 14, background: "var(--destaque-texto)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" };
const botaoLeve: CSSProperties = { height: 46, padding: "0 14px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, background: "#fff", color: "#3a312a", fontSize: 14, cursor: "pointer" };
const botaoChip: CSSProperties = { height: 38, padding: "0 12px", border: 0, borderRadius: 14, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const seta: CSSProperties = { flex: "none", width: 36, height: 44, border: 0, borderRadius: 12, background: "none", fontSize: 16, color: "#6b6259", cursor: "pointer" };
function chip(on: boolean, leve = false): CSSProperties {
  return { height: leve ? 34 : 38, padding: "0 12px", border: `1px solid ${on ? "var(--destaque-texto)" : "#e7dfd2"}`, borderRadius: 19, background: on ? "var(--destaque-texto)" : "#fff", color: on ? "#fff" : "#3a312a", fontSize: 13, cursor: "pointer" };
}
