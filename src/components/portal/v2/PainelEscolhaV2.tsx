"use client";

// O painel de uma decisão no portal v2 (desenho "Portal da Família v2"):
// as opções da cerimonialista em carrossel (ou lado a lado), a escolha
// que sobe e as outras que esmaecem, "De vocês" com as propostas da
// família e "Propor outra opção" (foto, link, fornecedor, texto).

import Link from "next/link";
import { useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { brl } from "@/components/planejamento/celebra";
import { escolherOpcao } from "@/app/(portal)/portal/[eventoId]/escolhas/actions";
import {
  desfazerEscolha,
  proporOpcao,
  tirarProposta,
} from "@/app/(portal)/portal/[eventoId]/escolhas/proposta-actions";
import type { Escolha } from "@/lib/supabase/portal-escolhas";
import { prazoEmTempo, rotuloQuem } from "./EscolhasV2";
import { RespostaV2 } from "./RespostaV2";

const ES = "cubic-bezier(.2,.8,.2,1)";
const campo: CSSProperties = {
  height: 48, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, fontSize: 15, color: "#332b24", background: "#fff",
};

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export function PainelEscolhaV2({
  eventoId,
  escolha: e,
  cerimonialista,
  hoje,
}: {
  eventoId: string;
  escolha: Escolha;
  cerimonialista: string;
  hoje: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [comparar, setComparar] = useState(false);
  const [propondo, setPropondo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const base = `/portal/${eventoId}`;
  const cur = e.curadoria;
  const decidido = e.estado === "decidido";
  const escolhida = cur?.escolhidaOpcaoId ?? null;
  const nomeEscolhida = cur?.opcoes.find((o) => o.id === escolhida)?.nome ?? null;
  const prazo = prazoEmTempo(e.prazo, hoje);

  function agir(f: () => Promise<{ ok?: true; error?: string } | { ok: true } | { error: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if ("error" in r && r.error) setErro(r.error);
      else router.refresh();
    });
  }

  function escolher(opcaoId: string) {
    if (!cur) return;
    agir(async () => {
      // trocar de opção: volta a rodada e escolhe a nova
      if (cur.estado === "escolhida") {
        const d = await desfazerEscolha(eventoId, cur.id);
        if ("error" in d) return d;
      }
      return escolherOpcao(eventoId, cur.id, opcaoId);
    });
  }

  // a faixa de estado
  const faixa = decidido
    ? { t: nomeEscolhida ? `Decidido: ${nomeEscolhida}` : "Decidido", q: e.decididaEm ? `${cerimonialista} fechou em ${dataCurta(e.decididaEm.slice(0, 10))}` : "", desfazer: false }
    : cur?.estado === "escolhida"
      ? {
          t: `Vocês escolheram: ${nomeEscolhida ?? "uma opção"}`,
          q: e.quem === "familia" ? `${cerimonialista} fecha com o fornecedor` : `aguardando o de acordo de ${cerimonialista}`,
          desfazer: true,
        }
      : cur?.estado === "publicada"
        ? { t: "Aguardando vocês", q: `${cur.opcoes.length} ${cur.opcoes.length === 1 ? "opção" : "opções"} de ${cerimonialista} · ${prazo.texto}`, desfazer: false }
        : e.propostas.some((p) => p.estado === "aguardando")
          ? { t: `Aguardando ${cerimonialista}`, q: "sobre a proposta de vocês", desfazer: false }
          : { t: rotuloQuem(e.quem, cerimonialista), q: prazo.texto, desfazer: false };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <Link
        href={`${base}/escolhas`}
        style={{
          alignSelf: "flex-start", height: 44, padding: "0 16px 0 12px", display: "flex", alignItems: "center",
          border: "1px solid rgba(255,255,255,.9)", borderRadius: 22, background: "rgba(255,255,255,.75)",
          WebkitBackdropFilter: "blur(12px)", backdropFilter: "blur(12px)", fontSize: 14, color: "#3a312a", textDecoration: "none",
        }}
      >
        ‹ Escolhas
      </Link>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 12.5, color: "#4c443c" }}>
          {e.topico} · {rotuloQuem(e.quem, cerimonialista)}
          {e.prazo && !decidido ? ` · ${prazo.texto}` : ""}
        </div>
        <h1 className="pv2-h1" style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>
          {e.titulo}
        </h1>
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 18,
          background: "var(--destaque-texto)", color: "#fff", boxShadow: "0 18px 36px -20px var(--destaque-texto)",
        }}
      >
        <span className="pv2-mov" style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: "#fff", animation: "pv2-pulsar 1.8s ease-out infinite" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{faixa.t}</div>
          {faixa.q && <div style={{ fontSize: 13, opacity: 0.88 }}>{faixa.q}</div>}
        </div>
        {faixa.desfazer && cur && (
          <button
            type="button"
            disabled={pendente}
            onClick={() => agir(() => desfazerEscolha(eventoId, cur.id))}
            style={{ flex: "none", minHeight: 44, border: 0, background: "none", fontSize: 14, color: "#fff", textDecoration: "underline", cursor: "pointer" }}
          >
            Desfazer
          </button>
        )}
      </div>

      {erro && <p role="alert" style={{ margin: 0, fontSize: 14, color: "#96605a" }}>{erro}</p>}

      {e.perguntas.length > 0 && (
        <div className="pv2-vidro" style={{ borderRadius: 22, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {e.perguntas.map((p) => (
            <div key={p.campoId} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 14, color: "#3a312a" }}>{p.label}</div>
              <RespostaV2 pergunta={p} />
            </div>
          ))}
        </div>
      )}

      {cur && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, fontSize: 23, color: "#332b24" }}>
              Opções de {cerimonialista}
            </h2>
            {cur.opcoes.length > 1 && (
              <button
                type="button"
                aria-pressed={comparar}
                onClick={() => setComparar((c) => !c)}
                style={{
                  height: 40, padding: "0 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${comparar ? "var(--destaque-texto)" : "rgba(0,0,0,.08)"}`,
                  background: comparar ? "var(--destaque-texto)" : "rgba(255,255,255,.75)", color: comparar ? "#fff" : "#3a312a",
                }}
              >
                Comparar lado a lado
              </button>
            )}
          </div>

          {!comparar ? (
            <div style={{ display: "flex", gap: 14, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", margin: "0 -20px", padding: "10px 20px 18px" }}>
              {cur.opcoes.map((o, i) => {
                const sel = escolhida === o.id;
                const outro = !!escolhida && !sel;
                return (
                  <div
                    key={o.id}
                    className="pv2-opcao"
                    style={{
                      flex: "none", scrollSnapAlign: "center", display: "flex", flexDirection: "column", borderRadius: 26,
                      overflow: "hidden", background: "#fff", animation: `pv2-entrar .7s ${ES} ${i * 110}ms backwards`,
                      boxShadow: sel ? "0 0 0 2px var(--destaque-texto),0 30px 50px -26px var(--destaque-texto)" : "0 24px 44px -30px rgba(50,35,45,.55)",
                      transform: sel ? "translateY(-8px)" : "none", opacity: outro ? 0.62 : 1,
                      transition: `transform .5s ${ES},box-shadow .5s,opacity .5s`,
                    }}
                  >
                    <div
                      style={{
                        position: "relative", height: 120,
                        background: "radial-gradient(90% 90% at 20% 0%,color-mix(in oklch,var(--destaque) 40%,transparent),transparent 70%),var(--destaque-fundo)",
                      }}
                    >
                      {o.recomendada && (
                        <span style={{ position: "absolute", top: 14, left: 14, height: 30, padding: "0 12px", display: "flex", alignItems: "center", borderRadius: 15, background: "var(--destaque-texto)", color: "#fff", fontSize: 11, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase" }}>
                          Recomendada por {cerimonialista}
                        </span>
                      )}
                      {o.valor !== null && (
                        <span style={{ position: "absolute", left: 14, bottom: 14, height: 34, padding: "0 14px", display: "flex", alignItems: "center", borderRadius: 17, background: "rgba(255,255,255,.85)", fontSize: 15, fontWeight: 600, color: "#2b241f" }}>
                          {brl(o.valor)}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 23, lineHeight: 1.15, color: "#2b241f" }}>{o.nome}</div>
                        {o.descricao && <div style={{ fontSize: 13, color: "#776d60" }}>{o.descricao}</div>}
                      </div>
                      {o.inclui.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: "#463e36" }}>
                          {o.inclui.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      )}
                      {o.nota && (
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 14, background: "var(--destaque-fundo)" }}>
                          <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--pv2-titulo)", fontSize: 13, color: "var(--destaque-texto)" }}>
                            {cerimonialista.charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "#3a312a" }}>{o.nota}</span>
                        </div>
                      )}
                      <div style={{ marginTop: "auto", paddingTop: 4 }}>
                        {sel ? (
                          <div style={{ minHeight: 50, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "var(--destaque-texto)", color: "#fff", fontSize: 15, fontWeight: 500 }}>
                            {decidido ? "Decidido" : "Escolhida por vocês"}
                          </div>
                        ) : (
                          !decidido && (
                            <button
                              type="button"
                              disabled={pendente}
                              onClick={() => escolher(o.id)}
                              style={{ width: "100%", minHeight: 50, border: "1.5px solid var(--destaque-texto)", borderRadius: 16, background: "#fff", fontSize: 15, fontWeight: 500, color: "var(--destaque-texto)", cursor: "pointer" }}
                            >
                              Escolher esta
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 22, background: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.9)" }}>
              <div style={{ display: "grid", gridTemplateColumns: `96px repeat(${cur.opcoes.length},minmax(150px,1fr))`, minWidth: 96 + 170 * cur.opcoes.length, fontSize: 13.5, color: "#3a312a" }}>
                <div />
                {cur.opcoes.map((o) => (
                  <div key={o.id} style={{ padding: "14px 12px", fontFamily: "var(--pv2-titulo)", fontSize: 18, lineHeight: 1.2, color: "#2b241f", background: escolhida === o.id ? "var(--destaque-fundo)" : "transparent" }}>
                    {o.nome}
                  </div>
                ))}
                {(
                  [
                    ["Valor", (o: (typeof cur.opcoes)[number]) => (o.valor !== null ? brl(o.valor) : "—")],
                    ["Inclui", (o: (typeof cur.opcoes)[number]) => o.inclui.join(" · ") || "—"],
                    ["Nota", (o: (typeof cur.opcoes)[number]) => o.nota ?? "—"],
                  ] as const
                ).map(([rot, val]) => (
                  <Linha key={rot} rotulo={rot} celulas={cur.opcoes.map((o) => ({ id: o.id, texto: val(o), sel: escolhida === o.id }))} />
                ))}
                <div style={{ padding: 12, borderTop: "1px solid #f2ece3" }} />
                {cur.opcoes.map((o) => (
                  <div key={o.id} style={{ padding: "10px 12px 14px", borderTop: "1px solid #f2ece3", background: escolhida === o.id ? "var(--destaque-fundo)" : "transparent" }}>
                    {escolhida === o.id ? (
                      <div style={{ minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "var(--destaque-texto)", color: "#fff", fontSize: 14 }}>
                        {decidido ? "Decidido" : "Escolhida"}
                      </div>
                    ) : (
                      !decidido && (
                        <button type="button" disabled={pendente} onClick={() => escolher(o.id)} style={{ width: "100%", minHeight: 44, border: "1.5px solid var(--destaque-texto)", borderRadius: 12, background: "#fff", fontSize: 14, color: "var(--destaque-texto)", cursor: "pointer" }}>
                          Escolher
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <h2 style={{ margin: 0, fontFamily: "var(--pv2-titulo)", fontWeight: 400, fontSize: 23, color: "#332b24" }}>De vocês</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {e.propostas.map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 14, padding: 14, borderRadius: 22, background: "rgba(255,255,255,.8)", border: "1.5px dashed var(--destaque-linha)" }}>
            <div
              style={{
                width: 96, flex: "none", borderRadius: 14, overflow: "hidden", minHeight: 96,
                background: p.fotoUrl ? "#221e1b" : "linear-gradient(160deg,var(--destaque-linha),var(--destaque-fundo))",
              }}
            >
              {p.fotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontFamily: "var(--pv2-titulo)", fontSize: 20, lineHeight: 1.2, color: "#2b241f" }}>{p.titulo}</div>
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--destaque-texto)", wordBreak: "break-all" }}>
                  {p.link.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
              {p.texto && !p.texto.startsWith(p.titulo) && <div style={{ fontSize: 13.5, lineHeight: 1.45, color: "#463e36" }}>{p.texto}</div>}
              <div style={{ fontSize: 12, color: "#776d60" }}>
                {p.autor ? `${p.autor.split(" ")[0]} propôs` : "Proposta de vocês"}
                {p.fornecedor ? ` · fornecedor: ${p.fornecedor}` : ""}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: p.estado === "aguardando" ? "var(--destaque-texto)" : "#4c443c" }}>
                {p.estado === "aguardando"
                  ? `aguardando ${cerimonialista}`
                  : p.estado === "aceita"
                    ? `${cerimonialista} aceitou${p.resposta ? `: ${p.resposta}` : ""}`
                    : `${cerimonialista} respondeu: ${p.resposta ?? "não vai dar desta vez"}`}
              </div>
              {p.minha && p.estado === "aguardando" && (
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => agir(() => tirarProposta(eventoId, p.id))}
                  style={{ alignSelf: "flex-start", minHeight: 36, border: 0, background: "none", padding: 0, fontSize: 13, color: "#6b6259", textDecoration: "underline", cursor: "pointer" }}
                >
                  Tirar
                </button>
              )}
            </div>
          </div>
        ))}
        {!decidido &&
          (propondo ? (
            <FormularioProposta
              eventoId={eventoId}
              cerimonialista={cerimonialista}
              aoEnviar={(f) => {
                setErro(null);
                iniciar(async () => {
                  const r = await proporOpcao(eventoId, e.decisaoId, f);
                  if ("error" in r) setErro(r.error);
                  else {
                    setPropondo(false);
                    router.refresh();
                  }
                });
              }}
              aoCancelar={() => setPropondo(false)}
              enviando={pendente}
            />
          ) : (
            <button
              type="button"
              onClick={() => setPropondo(true)}
              style={{ minHeight: 110, border: "1.5px dashed #d8cfc2", borderRadius: 22, background: "rgba(255,255,255,.5)", fontSize: 15, color: "#3a312a", cursor: "pointer" }}
            >
              + Propor outra opção
            </button>
          ))}
      </div>
    </div>
  );
}

function Linha({ rotulo, celulas }: { rotulo: string; celulas: { id: string; texto: string; sel: boolean }[] }) {
  return (
    <>
      <div style={{ padding: 12, color: "#776d60", borderTop: "1px solid #f2ece3" }}>{rotulo}</div>
      {celulas.map((c) => (
        <div key={c.id} style={{ padding: 12, borderTop: "1px solid #f2ece3", lineHeight: 1.5, background: c.sel ? "var(--destaque-fundo)" : "transparent" }}>
          {c.texto}
        </div>
      ))}
    </>
  );
}

function FormularioProposta({
  eventoId,
  cerimonialista,
  aoEnviar,
  aoCancelar,
  enviando,
}: {
  eventoId: string;
  cerimonialista: string;
  aoEnviar: (f: { titulo: string; texto: string; link: string; fornecedor: string; fotoPath: string | null }) => void;
  aoCancelar: () => void;
  enviando: boolean;
}) {
  const [link, setLink] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<{ path: string; url: string } | null>(null);
  const [subindo, setSubindo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function subir(file: File) {
    setAviso(null);
    setSubindo(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${eventoId}/proposta-${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("inspiracoes").upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setAviso("Não foi possível enviar a foto.");
        return;
      }
      setFoto({ path, url: URL.createObjectURL(file) });
    } finally {
      setSubindo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div style={{ padding: 16, borderRadius: 22, background: "#fff", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 20px 40px -30px rgba(50,35,45,.5)" }}>
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={subindo}
        style={{
          position: "relative", minHeight: 64, overflow: "hidden", borderRadius: 14, cursor: "pointer",
          border: "1.5px dashed var(--destaque-linha)", background: "var(--destaque-fundo)", fontSize: 14, color: "var(--destaque-texto)",
        }}
      >
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.url} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
        ) : subindo ? (
          "Enviando…"
        ) : (
          "Adicionar foto"
        )}
      </button>
      <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void subir(e.target.files[0])} />
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (Instagram, Pinterest, site)" style={campo} />
      <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Fornecedor, se tiver" style={campo} />
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="O que vocês imaginam"
        rows={3}
        style={{ ...campo, height: "auto", padding: "12px 14px", resize: "vertical" }}
      />
      {aviso && <div role="alert" style={{ fontSize: 13, color: "#96605a" }}>{aviso}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={enviando || subindo}
          onClick={() => aoEnviar({ titulo: "", texto, link, fornecedor, fotoPath: foto?.path ?? null })}
          style={{ flex: 1, minHeight: 48, border: 0, borderRadius: 14, background: "var(--destaque-texto)", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", opacity: enviando ? 0.6 : 1 }}
        >
          {enviando ? "Enviando…" : `Enviar para ${cerimonialista}`}
        </button>
        <button type="button" onClick={aoCancelar} style={{ minHeight: 48, padding: "0 14px", border: 0, background: "none", fontSize: 14, color: "#6b6259", cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
