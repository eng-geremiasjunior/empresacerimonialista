"use client";

// Fornecedores (portal v2, 181). Os da cerimonialista, com o que cada um
// faz na noite (pelo roteiro), e os da família, que ela mesma chamou.

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { FornecedorDaFamilia, FornecedorDaFesta } from "@/lib/supabase/portal-fornecedores";
import { adicionarFornecedorDaFamilia, marcarContratado, tirarFornecedorDaFamilia } from "@/app/(portal)/portal/[eventoId]/fornecedores/actions";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";

export function FornecedoresV2({
  eventoId,
  daCerimonialista,
  daFamilia,
  cerimonialista,
}: {
  eventoId: string;
  daCerimonialista: FornecedorDaFesta[];
  daFamilia: FornecedorDaFamilia[];
  cerimonialista: string;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [nome, setNome] = useState("");
  const [oQueFaz, setOQueFaz] = useState("");
  const [contato, setContato] = useState("");
  const [contratado, setContratado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function gravar(acao: () => Promise<{ ok: true } | { error: string }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) setErro(r.error);
      else depois?.();
      router.refresh();
    });
  }

  const contratados = daCerimonialista.filter((f) => f.contratado).length + daFamilia.filter((f) => f.contratado).length;

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>Fornecedores</h1>
        <div style={{ fontSize: 14, color: "#4c443c" }}>
          {daCerimonialista.length + daFamilia.length ? `${contratados} ${contratados === 1 ? "contratado" : "contratados"} · ${daCerimonialista.length + daFamilia.length} no total` : "nenhum ainda"}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={h2}>De {cerimonialista}</h2>
        {daCerimonialista.length === 0 && <div style={{ padding: "16px 18px", borderRadius: 22, background: "rgba(255,255,255,.6)", fontSize: 15, color: "#4c443c" }}>{cerimonialista} ainda não fechou fornecedores.</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 12 }}>
          {daCerimonialista.map((f, i) => (
            <div key={f.id} style={{ padding: "16px 18px", borderRadius: 22, background: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.9)", boxShadow: "0 18px 36px -30px rgba(50,35,45,.5)", display: "flex", flexDirection: "column", gap: 6, animation: `pv2-entrar .6s ${ES} ${i * 60}ms backwards` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: TITULO, fontSize: 21, color: "#2b241f" }}>{f.nome}</div>
                  {f.categoria && <div style={{ fontSize: 12.5, color: "#776d60" }}>{f.categoria}</div>}
                </div>
                <span style={{ flex: "none", height: 28, padding: "0 10px", display: "inline-flex", alignItems: "center", borderRadius: 14, fontSize: 12, fontWeight: 600, background: f.contratado ? "var(--destaque-fundo)" : "#f2eee9", color: f.contratado ? "var(--destaque-texto)" : "#6b6259" }}>
                  {f.contratado ? "contratado" : "em conversa"}
                </span>
              </div>
              {f.naNoite.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 6, borderTop: "1px solid rgba(0,0,0,.05)" }}>
                  <div style={rotulo}>Na noite</div>
                  {f.naNoite.map((m, j) => (
                    <div key={j} style={{ fontSize: 14, color: "#3a312a" }}>
                      {m.hora && <span style={{ fontWeight: 500, color: "var(--destaque-texto)", marginRight: 8 }}>{m.hora}</span>}
                      {m.titulo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: 26, background: "color-mix(in oklch, var(--destaque-fundo) 75%, #fff)", border: "1.5px dashed var(--destaque-linha)" }}>
        <h2 style={h2}>Da família</h2>
        {daFamilia.map((f) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,.85)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#2b241f" }}>{f.nome}</div>
              <div style={{ fontSize: 12.5, color: "#776d60" }}>{[f.oQueFaz, f.contato, f.autor ? `${f.autor.split(" ")[0]} incluiu` : null].filter(Boolean).join(" · ")}</div>
            </div>
            <button type="button" aria-pressed={f.contratado} onClick={() => gravar(() => marcarContratado(eventoId, f.id, !f.contratado))} style={{ flex: "none", height: 34, padding: "0 12px", border: `1px solid ${f.contratado ? "var(--destaque-texto)" : "#e7dfd2"}`, borderRadius: 17, background: f.contratado ? "var(--destaque-texto)" : "#fff", color: f.contratado ? "#fff" : "#3a312a", fontSize: 12.5, cursor: "pointer" }}>
              {f.contratado ? "contratado" : "em conversa"}
            </button>
            <button type="button" aria-label={`Tirar ${f.nome}`} onClick={() => gravar(() => tirarFornecedorDaFamilia(eventoId, f.id))} style={{ flex: "none", width: 34, height: 40, border: 0, background: "none", fontSize: 18, color: "#928a81", cursor: "pointer" }}>
              ×
            </button>
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Nome" aria-label="Nome do fornecedor" style={{ ...campo, flex: "1 1 160px" }} />
          <input value={oQueFaz} onChange={(e) => setOQueFaz(e.target.value)} maxLength={120} placeholder="O que faz (ex.: maquiagem)" aria-label="O que o fornecedor faz" style={{ ...campo, flex: "1 1 160px" }} />
          <input value={contato} onChange={(e) => setContato(e.target.value)} maxLength={80} placeholder="Contato (opcional)" aria-label="Contato do fornecedor" style={{ ...campo, flex: "1 1 160px" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#332b24", minHeight: 44 }}>
            <input type="checkbox" checked={contratado} onChange={(e) => setContratado(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--destaque-texto)" }} />
            já contratado
          </label>
          <button
            type="button"
            onClick={() =>
              nome.trim() &&
              gravar(() => adicionarFornecedorDaFamilia(eventoId, { nome, oQueFaz, contato, contratado }), () => {
                setNome("");
                setOQueFaz("");
                setContato("");
                setContratado(false);
              })
            }
            style={{ height: 46, padding: "0 16px", border: 0, borderRadius: 14, background: nome.trim() ? "var(--destaque-texto)" : "#ede8e2", color: nome.trim() ? "#fff" : "#928a81", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Adicionar
          </button>
        </div>
        {erro && <div role="alert" style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
      </div>
    </div>
  );
}

const h2: CSSProperties = { margin: 0, fontFamily: TITULO, fontWeight: 400, fontSize: 23, color: "#332b24" };
const rotulo: CSSProperties = { fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase", color: "#776d60" };
const campo: CSSProperties = { minWidth: 0, height: 46, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
