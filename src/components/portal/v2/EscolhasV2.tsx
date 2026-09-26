"use client";

// Escolhas do portal v2 (desenho "Portal da Família v2", 25/09/2026).
// Mão dupla: a cerimonialista manda opções, a família escolhe OU propõe
// a dela, e responde ali mesmo o que só ela sabe. Os assuntos filtram;
// os blocos dizem de quem é a vez; as decididas ficam recolhidas.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Escolha, EstadoDaEscolha, QuemDecide } from "@/lib/supabase/portal-escolhas";
import type { PerguntaDoPortal } from "@/lib/supabase/portal";
import { RespostaV2 } from "./RespostaV2";

const ES = "cubic-bezier(.2,.8,.2,1)";

export function rotuloQuem(q: QuemDecide, cerimonialista: string): string {
  return q === "familia" ? "vocês decidem" : q === "juntas" ? "decidem juntas" : `${cerimonialista} decide`;
}

export function prazoEmTempo(iso: string | null, hoje: string): { texto: string; urgente: boolean } {
  if (!iso) return { texto: "sem prazo", urgente: false };
  const a = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const d = Math.round((b - a) / 86_400_000);
  if (d < 0) return { texto: "passou do prazo", urgente: true };
  if (d === 0) return { texto: "hoje", urgente: true };
  if (d === 1) return { texto: "até amanhã", urgente: true };
  if (d <= 7) return { texto: `faltam ${d} dias`, urgente: true };
  return { texto: `até ${iso.slice(8, 10)}/${iso.slice(5, 7)}`, urgente: false };
}

function detalhe(e: Escolha, cerimonialista: string): string {
  const c = e.curadoria;
  if (e.estado === "decidido") {
    const esc = c?.opcoes.find((o) => o.id === c.escolhidaOpcaoId);
    return esc ? esc.nome : "decidido";
  }
  if (c?.estado === "publicada") {
    const n = c.opcoes.length;
    return `${n} ${n === 1 ? "opção" : "opções"} de ${cerimonialista}`;
  }
  if (c?.estado === "escolhida") {
    const esc = c.opcoes.find((o) => o.id === c.escolhidaOpcaoId);
    return `${esc?.nome ?? "Escolhida"}${e.quem === "familia" ? "" : ` · aguardando o de acordo de ${cerimonialista}`}`;
  }
  const aguardando = e.propostas.filter((p) => p.estado === "aguardando").length;
  if (aguardando) return `Proposta de vocês · aguardando ${cerimonialista}`;
  const resp = e.propostas.find((p) => p.resposta);
  if (resp) return `${cerimonialista} respondeu a proposta de vocês`;
  return "";
}

export function EscolhasV2({
  eventoId,
  escolhas,
  outras,
  cerimonialista,
  hoje,
}: {
  eventoId: string;
  escolhas: Escolha[];
  outras: { decisaoId: string; titulo: string; topico: string }[];
  cerimonialista: string;
  hoje: string;
}) {
  const [filtro, setFiltro] = useState("todas");
  const [verDecididas, setVerDecididas] = useState(false);
  const [escolhendoOutra, setEscolhendoOutra] = useState(false);
  const base = `/portal/${eventoId}`;

  const topicos = useMemo(() => Array.from(new Set(escolhas.map((e) => e.topico))), [escolhas]);
  const itens = escolhas.filter((e) => filtro === "todas" || e.topico === filtro);
  const nV = escolhas.filter((e) => e.estado === "voces").length;
  const nC = escolhas.filter((e) => e.estado === "carol").length;
  const resumo =
    [nV ? `${nV} aguardando vocês` : "", nC ? `${nC} aguardando ${cerimonialista}` : ""].filter(Boolean).join(" · ") ||
    (escolhas.length ? "tudo decidido" : "nada para escolher agora");

  const BLOCOS: [EstadoDaEscolha, string, string, string][] = [
    ["voces", "Aguardando vocês", "var(--destaque)", "var(--destaque)"],
    ["carol", `Aguardando ${cerimonialista}`, "transparent", "#928a81"],
    ["escolheram", "Vocês escolheram", "#6b6259", "#6b6259"],
    ["decidido", "Decididas", "#d8cfc2", "#d8cfc2"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8 }}>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>
          Escolhas
        </h1>
        <div style={{ fontSize: 14, color: "#4c443c" }}>{resumo}</div>
      </div>

      {topicos.length > 1 && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", margin: "0 -20px", padding: "4px 20px 12px" }}>
          {["todas", ...topicos].map((t, i) => {
            const nv = escolhas.filter((e) => (t === "todas" || e.topico === t) && e.estado === "voces").length;
            const on = filtro === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltro(t)}
                style={{
                  flex: "none", width: 148, scrollSnapAlign: "start", padding: 0, border: 0, borderRadius: 20, overflow: "hidden",
                  background: "rgba(255,255,255,.8)", textAlign: "left", cursor: "pointer",
                  boxShadow: on ? "0 0 0 2px var(--destaque-texto),0 18px 30px -18px var(--destaque-texto)" : "0 14px 30px -24px rgba(50,35,45,.5)",
                  transform: on ? "translateY(-3px)" : "none", transition: `transform .35s ${ES},box-shadow .35s`,
                  animation: `pv2-entrar .6s ${ES} ${(i + 1) * 60}ms backwards`,
                }}
              >
                <div style={{ height: 8, background: nv ? "var(--destaque)" : "var(--destaque-linha)" }} />
                <div style={{ padding: "12px 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 18, color: "#2b241f", lineHeight: 1.15 }}>
                    {t === "todas" ? "Todas" : t}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: nv ? 600 : 400, color: nv ? "var(--destaque-texto)" : "#776d60" }}>
                    {nv ? `${nv} aguardando vocês` : "nada pendente"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {escolhas.length === 0 && (
        <p className="pv2-vidro" style={{ margin: 0, padding: "18px 20px", borderRadius: 22, fontSize: 15, color: "#4c443c" }}>
          Nada para escolher agora.
        </p>
      )}

      {BLOCOS.map(([estado, nome, ponto, anel]) => {
        const lista = itens.filter((e) => e.estado === estado);
        if (!lista.length) return null;
        const fechado = estado === "decidido" && !verDecididas;
        return (
          <div key={estado} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: ponto, boxShadow: `inset 0 0 0 1.5px ${anel}` }} />
              <h2 style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, fontSize: 22, color: "#332b24" }}>{nome}</h2>
              <span style={{ fontSize: 13, color: "#776d60" }}>{lista.length}</span>
            </div>
            {!fechado && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
                {lista.map((e, i) => (
                  <CartaoEscolha key={e.decisaoId} e={e} i={i} base={base} cerimonialista={cerimonialista} hoje={hoje} />
                ))}
              </div>
            )}
            {estado === "decidido" && (
              <button
                type="button"
                onClick={() => setVerDecididas((v) => !v)}
                style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 16px", border: "1px solid rgba(0,0,0,.08)", borderRadius: 22, background: "rgba(255,255,255,.7)", fontSize: 14, color: "#3a312a", cursor: "pointer" }}
              >
                {verDecididas ? "Esconder decididas" : `Ver ${lista.length} ${lista.length === 1 ? "decidida" : "decididas"}`}
              </button>
            )}
          </div>
        );
      })}

      {outras.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!escolhendoOutra ? (
            <button
              type="button"
              onClick={() => setEscolhendoOutra(true)}
              style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 18px", border: "1.5px dashed #d8cfc2", borderRadius: 24, background: "rgba(255,255,255,.5)", fontSize: 15, color: "#3a312a", cursor: "pointer" }}
            >
              + Propor uma opção em outra decisão
            </button>
          ) : (
            <div className="pv2-vidro" style={{ borderRadius: 22, padding: "8px 20px 12px" }}>
              {Array.from(new Set(outras.map((o) => o.topico))).map((t) => (
                <div key={t} style={{ padding: "10px 0" }}>
                  <div style={{ fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase", color: "#776d60", marginBottom: 4 }}>{t}</div>
                  {outras.filter((o) => o.topico === t).map((o) => (
                    <Link
                      key={o.decisaoId}
                      href={`${base}/escolhas/${o.decisaoId}`}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 44, fontSize: 15, color: "#332b24", textDecoration: "none", borderBottom: "1px solid #f2ece3" }}
                    >
                      {o.titulo}
                      <span style={{ color: "#b4ada4", fontSize: 20 }}>›</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CartaoEscolha({
  e,
  i,
  base,
  cerimonialista,
  hoje,
}: {
  e: Escolha;
  i: number;
  base: string;
  cerimonialista: string;
  hoje: string;
}) {
  const router = useRouter();
  const aguardaVoces = e.estado === "voces";
  const prazo = prazoEmTempo(e.prazo, hoje);
  const temPainel = !!e.curadoria || e.propostas.length > 0;
  const rotuloEstado: Record<EstadoDaEscolha, string> = {
    voces: prazo.texto,
    escolheram: e.curadoria ? "vocês escolheram" : "respondido",
    carol: `aguardando ${cerimonialista}`,
    decidido: "decidido",
  };
  const det = detalhe(e, cerimonialista);

  return (
    <div
      onClick={temPainel ? () => router.push(`${base}/escolhas/${e.decisaoId}`) : undefined}
      className={temPainel ? "pv2-cartao-escolha pv2-clicavel" : "pv2-cartao-escolha"}
      style={{
        animation: `pv2-entrar .6s ${ES} ${120 + i * 70}ms backwards`, padding: 18, borderRadius: 22,
        background: aguardaVoces ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.62)",
        WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,.9)",
        boxShadow: "0 20px 40px -32px rgba(50,35,45,.5)", display: "flex", flexDirection: "column", gap: 10,
        cursor: temPainel ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 12, color: "#776d60" }}>
            {e.topico} · {rotuloQuem(e.quem, cerimonialista)}
          </div>
          <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 21, lineHeight: 1.2, color: "#2b241f" }}>{e.titulo}</div>
        </div>
        <span
          style={{
            flex: "none", height: 26, padding: "0 10px", display: "flex", alignItems: "center", borderRadius: 13,
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            background: aguardaVoces ? (prazo.urgente ? "var(--destaque-texto)" : "var(--destaque-fundo)") : "#f2eee9",
            color: aguardaVoces ? (prazo.urgente ? "#fff" : "var(--destaque-texto)") : "#6b6259",
          }}
        >
          {rotuloEstado[e.estado]}
        </span>
      </div>

      {temPainel && det && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, color: "#4c443c" }}>{det}</div>
          <span style={{ fontSize: 22, color: "#b4ada4" }}>›</span>
        </div>
      )}

      {!temPainel &&
        e.perguntas.map((p: PerguntaDoPortal) => (
          <div key={p.campoId} onClick={(ev) => ev.stopPropagation()}>
            {e.perguntas.length > 1 && <div style={{ fontSize: 13.5, color: "#3a312a", marginBottom: 6 }}>{p.label}</div>}
            <RespostaV2 pergunta={p} />
          </div>
        ))}
    </div>
  );
}
