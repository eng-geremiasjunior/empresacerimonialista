"use client";

// Convidados (portal v2, 180). O número que vai para o buffet sobe na
// tela; o salão mostra cada lugar (confirmado cheio, sem resposta
// contorno, não vai cinza) nas mesas que a cerimonialista montou — ou,
// sem mesas ainda, os lugares da festa. Embaixo: buffet por idade,
// mulheres e homens, restrições (sem nomes) e as listas por resposta.

import { useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { ConvidadoV2, ElementoDoSalao, MesaDoSalao } from "@/lib/supabase/portal-salao";
import { adicionarConvidado, adicionarVarios, removerConvidado } from "@/app/(portal)/portal/[eventoId]/convidados/actions";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";
const RESTRICAO: Record<string, string> = {
  vegano: "vegano",
  vegetariano: "vegetariano",
  sem_gluten: "sem glúten",
  sem_lactose: "sem lactose",
  alergia: "alergia",
  outro: "outra restrição",
};

type Lugar = "c" | "p" | "n";

function haQuanto(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return min <= 1 ? "agora" : `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function ConvidadosV2({
  eventoId,
  convidados,
  mesas,
  elementos,
  base,
  debutante,
}: {
  eventoId: string;
  convidados: ConvidadoV2[];
  mesas: MesaDoSalao[];
  elementos: ElementoDoSalao[];
  base: string;
  debutante: string | null;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [aba, setAba] = useState<"c" | "p" | "n">("c");
  const [deCima, setDeCima] = useState(false);
  const [mesaAberta, setMesaAberta] = useState<string | null>(null);
  const [cola, setCola] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  // as confirmações chegam pelo link: a tela se atualiza sozinha
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [router]);

  const conf = convidados.filter((c) => c.confirmacao === "confirmado");
  const pend = convidados.filter((c) => c.confirmacao === "aguardando");
  const nao = convidados.filter((c) => c.confirmacao === "nao_vai");
  const acomp = conf.reduce((s, c) => s + c.acompanhantes, 0);
  const criancas = conf.reduce((s, c) => s + c.criancas, 0);
  const buffet = conf.length + acomp + criancas;

  // o buffet por idade, e mulheres e homens, de quem confirmou
  const idade = useMemo(() => {
    let adultos = 0, meia = 0, bebe = 0, semIdade = 0;
    let f = 0, m = 0, nd = 0;
    for (const c of conf) {
      if (c.faixa === "6-12") meia++;
      else if (c.faixa === "0-5") bebe++;
      else adultos++;
      if (c.sexo === "feminino") f++;
      else if (c.sexo === "masculino") m++;
      else nd++;
      let criancasDetalhadas = 0;
      for (const p of c.pessoas) {
        if (p.faixa === "6-12") (meia++, criancasDetalhadas++);
        else if (p.faixa === "0-5") (bebe++, criancasDetalhadas++);
        if (p.sexo === "feminino") f++;
        else if (p.sexo === "masculino") m++;
        else nd++;
      }
      // acompanhantes já é a soma dos adultos que vêm junto
      adultos += c.acompanhantes;
      semIdade += Math.max(0, c.criancas - criancasDetalhadas);
      nd += Math.max(0, c.acompanhantes + c.criancas - c.pessoas.length);
    }
    return { adultos, meia, bebe, semIdade, f, m, nd };
  }, [conf]);

  const restricoes = useMemo(() => {
    const cont = new Map<string, number>();
    for (const c of conf) for (const r of c.restricoes) cont.set(r, (cont.get(r) ?? 0) + 1);
    return [...cont.entries()].sort((a, b) => b[1] - a[1]);
  }, [conf]);

  const chegando = convidados
    .filter((c) => c.confirmadoVia === "link" && c.confirmadoEm && Date.now() - new Date(c.confirmadoEm).getTime() < 7 * 86_400_000)
    .sort((a, b) => (b.confirmadoEm ?? "").localeCompare(a.confirmadoEm ?? ""))
    .slice(0, 4);

  function gravar(acao: () => Promise<{ ok?: true; error?: string }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (r.error) setErro(r.error);
      else depois?.();
      router.refresh();
    });
  }

  const linkDe = (c: ConvidadoV2) => `${base}/confirmar/${c.hash}`;
  function reenviar(c: ConvidadoV2) {
    const texto = `Oi, ${c.nome.split(" ")[0]}! ${debutante ? `Confirme sua presença nos 15 anos da ${debutante}` : "Confirme sua presença"}: ${linkDe(c)}`;
    const digitos = (c.telefone ?? "").replace(/\D/g, "");
    if (digitos.length >= 10) {
      window.open(`https://wa.me/${digitos.length <= 11 ? "55" + digitos : digitos}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    } else {
      navigator.clipboard?.writeText(linkDe(c)).then(() => setErro(null)).catch(() => undefined);
      setErro(`Link de ${c.nome.split(" ")[0]} copiado.`);
    }
  }

  const listas = { c: conf, p: pend, n: nao };
  const mesa = mesas.find((m) => m.id === mesaAberta) ?? null;
  const naMesa = mesa ? convidados.filter((c) => c.mesaId === mesa.id) : [];

  return (
    <div className="pv2-largura" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", paddingTop: 8 }}>
        <div>
          <h1 className="pv2-h1" style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, lineHeight: 1.05, color: "#2b241f" }}>Convidados</h1>
          <div style={{ fontSize: 14, color: "#4c443c" }}>
            {convidados.length ? `${convidados.length} ${convidados.length > 1 ? "convites" : "convite"}` : "a lista começa aqui"}
            {mesas.length ? ` · ${mesas.reduce((s, m) => s + m.lugares, 0)} lugares no salão` : ""}
          </div>
        </div>
      </div>

      {convidados.length > 0 && (
        <div className="pv2-vidro" style={{ display: "flex", flexWrap: "wrap", gap: "14px 28px", alignItems: "flex-end", padding: "20px 22px", borderRadius: 26 }}>
          <div>
            <div style={rotulo}>Vai para o buffet</div>
            <div style={{ fontFamily: TITULO, fontSize: 58, lineHeight: 1, color: "var(--destaque-texto)" }}>
              <Conta valor={buffet} />
            </div>
          </div>
          <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 3, fontSize: 14, color: "#3a312a", paddingBottom: 4 }}>
            <span>{conf.length} {conf.length === 1 ? "confirmado" : "confirmados"}</span>
            {acomp > 0 && <span>{acomp} {acomp === 1 ? "acompanhante" : "acompanhantes"}</span>}
            {criancas > 0 && <span>{criancas} {criancas === 1 ? "criança" : "crianças"}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pend.length > 0 && <span style={{ ...pilula, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontWeight: 600 }}>{pend.length} sem resposta</span>}
            {nao.length > 0 && <span style={{ ...pilula, background: "#f2eee9", color: "#6b6259" }}>{nao.length} não {nao.length === 1 ? "vai" : "vão"}</span>}
          </div>
        </div>
      )}

      {convidados.length > 0 && (
        <Salao
          convidados={convidados}
          mesas={mesas}
          elementos={elementos}
          debutante={debutante}
          deCima={deCima}
          girar={() => setDeCima(!deCima)}
          abrirMesa={(id) => setMesaAberta(mesaAberta === id ? null : id)}
          chegando={chegando}
        />
      )}
      {convidados.length > 0 && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#4c443c" }}>
          <Legenda cor="var(--destaque-texto)">confirmado</Legenda>
          <Legenda cor="#fff" contorno>sem resposta</Legenda>
          <Legenda cor="#cfc6ba">não vai</Legenda>
        </div>
      )}

      {mesa && (
        <div style={{ padding: 18, borderRadius: 24, background: "#fff", boxShadow: "0 24px 44px -30px rgba(50,35,45,.55)", display: "flex", flexDirection: "column", gap: 10, animation: `pv2-entrar .45s ${ES} both` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontFamily: TITULO, fontSize: 24, color: "#2b241f" }}>{mesa.rotulo}</div>
            <button type="button" onClick={() => setMesaAberta(null)} style={{ height: 40, padding: "0 12px", border: 0, background: "none", fontSize: 13, color: "#6b6259", cursor: "pointer" }}>Fechar</button>
          </div>
          <div style={{ fontSize: 13, color: "#4c443c" }}>
            {naMesa.length ? `${naMesa.reduce((s, c) => s + 1 + c.acompanhantes + c.criancas, 0)} de ${mesa.lugares} lugares` : "ninguém nesta mesa ainda"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {naMesa.map((c) => (
              <span key={c.id} style={{ ...pilula, height: 32, background: c.confirmacao === "confirmado" ? "var(--destaque-fundo)" : "#f2eee9", color: c.confirmacao === "confirmado" ? "var(--destaque-texto)" : "#6b6259" }}>
                {c.nome}
                {c.acompanhantes + c.criancas > 0 ? ` +${c.acompanhantes + c.criancas}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {conf.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
          <div style={cartaoPequeno}>
            <div style={rotulo}>Para o buffet</div>
            <Linha t="Adultos" v={idade.adultos} />
            {idade.meia > 0 && <Linha t="Crianças de 6 a 12" v={idade.meia} />}
            {idade.bebe > 0 && <Linha t="Crianças de 0 a 5" v={idade.bebe} />}
            {idade.semIdade > 0 && <Linha t="Crianças sem idade" v={idade.semIdade} />}
            <div style={{ borderTop: "1px solid rgba(0,0,0,.06)", paddingTop: 6 }}>
              <Linha t="Total" v={buffet} />
            </div>
          </div>
          <div style={cartaoPequeno}>
            <div style={rotulo}>Mulheres e homens</div>
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: "#f2eee9" }}>
              <span style={{ width: `${(idade.f / Math.max(1, buffet)) * 100}%`, background: "var(--destaque-texto)", transition: "width .8s" }} />
              <span style={{ width: `${(idade.m / Math.max(1, buffet)) * 100}%`, background: "var(--destaque)", transition: "width .8s" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 13, color: "#3a312a" }}>
              <span>{idade.f} {idade.f === 1 ? "mulher" : "mulheres"}</span>
              <span>{idade.m} {idade.m === 1 ? "homem" : "homens"}</span>
              {idade.nd > 0 && <span style={{ color: "#776d60" }}>{idade.nd} não {idade.nd === 1 ? "informou" : "informaram"}</span>}
            </div>
          </div>
          <div style={cartaoPequeno}>
            <div style={rotulo}>Restrições alimentares</div>
            {restricoes.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {restricoes.map(([r, n]) => (
                  <span key={r} style={{ ...pilula, height: 32, background: "var(--destaque-fundo)", color: "var(--destaque-texto)" }}>
                    {n} {RESTRICAO[r] ?? r}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#776d60" }}>nenhuma até agora</div>
            )}
          </div>
        </div>
      )}

      {convidados.length === 0 && (
        <div style={{ padding: 18, borderRadius: 24, background: "rgba(255,255,255,.85)", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: TITULO, fontSize: 21, color: "#2b241f" }}>Começar a lista</div>
          <textarea
            value={cola}
            onChange={(e) => setCola(e.target.value)}
            rows={5}
            placeholder="Cole os nomes do WhatsApp, um por linha"
            aria-label="Nomes dos convidados, um por linha"
            style={{ padding: "12px 14px", border: "1px solid #e7dfd2", borderRadius: 16, background: "#fff", fontSize: 15, color: "#332b24", resize: "vertical" }}
          />
          <button
            type="button"
            onClick={() => gravar(() => adicionarVarios(eventoId, cola.split("\n")), () => setCola(""))}
            style={{ minHeight: 50, border: 0, borderRadius: 16, background: "var(--destaque-texto)", color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer" }}
          >
            {(() => {
              const n = cola.split("\n").filter((l) => l.trim()).length;
              return n ? `Organizar ${n} ${n === 1 ? "nome" : "nomes"}` : "Organizar os nomes";
            })()}
          </button>
        </div>
      )}

      {/* incluir alguém */}
      {convidados.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} placeholder="Nome de mais um convidado" aria-label="Nome de mais um convidado" style={{ ...campo, flex: "2 1 180px" }} />
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" maxLength={30} placeholder="WhatsApp (opcional)" aria-label="WhatsApp do convidado" style={{ ...campo, flex: "1 1 140px" }} />
          <button
            type="button"
            onClick={() =>
              nome.trim() &&
              gravar(() => adicionarConvidado(eventoId, { nome, telefone }), () => {
                setNome("");
                setTelefone("");
                setAba("p");
              })
            }
            style={{ height: 46, padding: "0 16px", border: 0, borderRadius: 14, background: nome.trim() ? "var(--destaque-texto)" : "#ede8e2", color: nome.trim() ? "#fff" : "#928a81", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            Incluir
          </button>
        </div>
      )}
      {erro && <div role="status" style={{ fontSize: 13, color: erro.includes("copiado") ? "#4c443c" : "#8a2f2f" }}>{erro}</div>}

      {convidados.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", height: 48, padding: 4, borderRadius: 24, background: "rgba(255,255,255,.7)" }}>
            <span aria-hidden style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: "calc((100% - 8px) / 3)", borderRadius: 20, background: "var(--destaque-texto)", transform: `translateX(${aba === "c" ? "0%" : aba === "p" ? "100%" : "200%"})`, transition: `transform .45s ${ES}` }} />
            {([["c", "Confirmados"], ["p", "Sem resposta"], ["n", "Não vão"]] as const).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={aba === k} onClick={() => setAba(k)} style={{ position: "relative", border: 0, background: "none", fontSize: 13.5, fontWeight: 600, color: aba === k ? "#fff" : "#3a312a", cursor: "pointer", transition: "color .3s" }}>
                {t} {listas[k].length ? `· ${listas[k].length}` : ""}
              </button>
            ))}
          </div>
          {listas[aba].length === 0 && <div style={{ padding: "14px 4px", fontSize: 14, color: "#776d60" }}>Ninguém aqui.</div>}
          {listas[aba].map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "6px 14px", borderRadius: 16, background: "rgba(255,255,255,.75)", animation: `pv2-entrar .4s ease ${Math.min(i, 12) * 30}ms backwards` }}>
              <span aria-hidden style={{ width: 36, height: 36, flex: "none", borderRadius: "50%", background: "var(--destaque-fundo)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TITULO, fontSize: 15, color: "var(--destaque-texto)" }}>{iniciais(c.nome)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, color: "#2b241f" }}>{c.nome}</div>
                <div style={{ fontSize: 12.5, color: "#776d60" }}>{subtitulo(c, mesas)}</div>
              </div>
              {c.confirmacao === "aguardando" && (
                <>
                  <button type="button" onClick={() => reenviar(c)} style={{ flex: "none", height: 40, padding: "0 12px", border: 0, borderRadius: 14, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Reenviar link
                  </button>
                  <button type="button" aria-label={`Tirar ${c.nome}`} onClick={() => gravar(() => removerConvidado(eventoId, c.id))} style={{ flex: "none", width: 36, height: 40, border: 0, background: "none", fontSize: 18, color: "#928a81", cursor: "pointer" }}>
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function subtitulo(c: ConvidadoV2, mesas: MesaDoSalao[]): string {
  if (c.confirmacao === "nao_vai") return c.recado ? `não vai · "${c.recado}"` : "não vai";
  if (c.confirmacao === "aguardando") return "sem resposta";
  const partes: string[] = [];
  const extra = c.acompanhantes + c.criancas;
  if (extra) partes.push(`+${extra}${c.criancas ? ` · ${c.criancas} ${c.criancas === 1 ? "criança" : "crianças"}` : ""}`);
  const m = mesas.find((x) => x.id === c.mesaId);
  if (m) partes.push(m.rotulo);
  if (c.confirmadoVia === "link") partes.push("pelo link");
  return partes.length ? partes.join(" · ") : "confirmado";
}

/* ---------------- o salão ---------------- */

function lugaresDe(c: ConvidadoV2): Lugar[] {
  const s: Lugar = c.confirmacao === "confirmado" ? "c" : c.confirmacao === "nao_vai" ? "n" : "p";
  return Array.from({ length: s === "c" ? 1 + c.acompanhantes + c.criancas : 1 }, () => s);
}

function corDoLugar(l: Lugar | null): { bg: string; sh: string } {
  if (l === "c") return { bg: "var(--destaque-texto)", sh: "none" };
  if (l === "p") return { bg: "#fff", sh: "inset 0 0 0 1.5px var(--destaque-linha)" };
  if (l === "n") return { bg: "#cfc6ba", sh: "none" };
  return { bg: "rgba(0,0,0,.06)", sh: "none" };
}

function Salao({
  convidados,
  mesas,
  elementos,
  debutante,
  deCima,
  girar,
  abrirMesa,
  chegando,
}: {
  convidados: ConvidadoV2[];
  mesas: MesaDoSalao[];
  elementos: ElementoDoSalao[];
  debutante: string | null;
  deCima: boolean;
  girar: () => void;
  abrirMesa: (id: string) => void;
  chegando: ConvidadoV2[];
}) {
  const plano = mesas.length > 0;
  // a caixa do salão, a partir das coordenadas que a equipe desenhou
  const caixa = useMemo(() => {
    const xs = [...mesas.map((m) => m.x), ...elementos.map((e) => e.x), ...elementos.map((e) => e.x + e.largura)];
    const ys = [...mesas.map((m) => m.y), ...elementos.map((e) => e.y), ...elementos.map((e) => e.y + e.altura)];
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    return { minX, minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
  }, [mesas, elementos]);
  const px = (x: number) => 10 + ((x - caixa.minX) / caixa.w) * 80;
  const py = (y: number) => 10 + ((y - caixa.minY) / caixa.h) * 80;

  // todos os lugares, na ordem: confirmados, sem resposta, não vão
  const todos = convidados.flatMap(lugaresDe).sort((a, b) => "cpn".indexOf(a) - "cpn".indexOf(b)).slice(0, 400);

  return (
    <div style={{ position: "relative", borderRadius: 30, overflow: "hidden", background: "radial-gradient(70% 60% at 50% 40%, color-mix(in oklch, var(--destaque-fundo) 90%, #fff), #efe8dd)", padding: "16px 16px 26px", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.8)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, position: "relative", zIndex: 2 }}>
        <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#6b6259" }}>{plano ? "O salão" : "Os lugares da festa"}</span>
        {plano && (
          <button type="button" onClick={girar} style={{ height: 40, padding: "0 14px", border: "1px solid rgba(0,0,0,.08)", borderRadius: 20, background: "rgba(255,255,255,.85)", fontSize: 13, color: "#3a312a", cursor: "pointer" }}>
            {deCima ? "Ver em perspectiva" : "Ver de cima"}
          </button>
        )}
      </div>

      {plano ? (
        <div style={{ perspective: 1100, perspectiveOrigin: "50% 0%", marginTop: deCima ? 14 : -10 }}>
          <div
            style={{
              position: "relative", width: "100%", maxWidth: 540, margin: "0 auto", aspectRatio: "1",
              transform: deCima ? "none" : "rotateX(50deg) rotateZ(-10deg) scale(.92)", transformOrigin: "50% 50%",
              transition: `transform 1.4s ${ES}`, borderRadius: 26,
              background: "repeating-linear-gradient(0deg,rgba(0,0,0,.025) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(0,0,0,.025) 0 1px,transparent 1px 28px),#faf6ef",
              boxShadow: "0 60px 80px -50px rgba(50,35,45,.6), inset 0 0 0 1px #ebe3d8",
            }}
          >
            {elementos.map((e, i) => (
              <div key={i} style={{ position: "absolute", left: `${px(e.x)}%`, top: `${py(e.y)}%`, width: `${(e.largura / caixa.w) * 80}%`, height: `${(e.altura / caixa.h) * 80}%`, borderRadius: 12, background: e.tipo === "pista" ? "radial-gradient(closest-side, color-mix(in oklch, var(--destaque) 45%, transparent), transparent), color-mix(in oklch, var(--destaque-linha) 55%, #fff)" : "#2b241f", color: e.tipo === "pista" ? "var(--destaque-texto)" : "#fdfbf7", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TITULO, fontStyle: "italic", fontSize: 14 }}>
                {e.rotulo || e.tipo}
              </div>
            ))}
            {mesas.map((m) => {
              const gente = convidados.filter((c) => c.mesaId === m.id).flatMap(lugaresDe);
              const n = Math.max(m.lugares, gente.length);
              const honra = m.tipo === "noivos";
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => abrirMesa(m.id)}
                  aria-label={`${m.rotulo}: ${gente.length} de ${m.lugares} lugares`}
                  style={{ position: "absolute", left: `${px(m.x)}%`, top: `${py(m.y)}%`, width: "14%", height: "14%", margin: "-7% 0 0 -7%", padding: 0, border: 0, background: "none", cursor: "pointer" }}
                >
                  {Array.from({ length: n }, (_, k) => {
                    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
                    const cor = corDoLugar(gente[k] ?? null);
                    return <span key={k} style={{ position: "absolute", left: `${50 + Math.cos(a) * 42}%`, top: `${50 + Math.sin(a) * 42}%`, width: "13%", height: "13%", margin: "-6.5% 0 0 -6.5%", borderRadius: "50%", background: cor.bg, boxShadow: cor.sh, transition: "background .5s" }} />;
                  })}
                  <span style={{ position: "absolute", left: "26%", top: "26%", width: "48%", height: "48%", borderRadius: "50%", background: honra ? "var(--destaque-texto)" : "#fff", boxShadow: honra ? "none" : "0 4px 10px -6px rgba(50,35,45,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 500, fontSize: 10, color: honra ? "#fff" : "#4c443c", overflow: "hidden" }}>
                    {honra ? debutante ?? "" : m.rotulo.replace(/^mesa\s*/i, "")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div aria-label={`${todos.length} lugares`} style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "22px 6px 8px", maxWidth: 560, margin: "0 auto" }}>
          {todos.map((l, i) => {
            const cor = corDoLugar(l);
            return <span key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: cor.bg, boxShadow: cor.sh, animation: `pv2-entrar .5s ${ES} ${Math.min(i, 60) * 12}ms backwards` }} />;
          })}
        </div>
      )}

      {chegando.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginTop: 12 }}>
          {chegando.map((c) => (
            <span key={c.id} style={{ maxWidth: "100%", height: 34, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: 17, background: "rgba(255,255,255,.92)", boxShadow: "0 12px 24px -14px rgba(50,35,45,.5)", fontSize: 12.5, color: "#2b241f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", animation: `pv2-entrar .5s ${ES} both` }}>
              <span aria-hidden style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: c.confirmacao === "confirmado" ? "var(--destaque-texto)" : "#cfc6ba" }} />
              {c.nome.split(" ")[0]} {c.confirmacao === "confirmado" ? "confirmou" : "não vai"} pelo link · {haQuanto(c.confirmadoEm!)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- peças ---------------- */

function Conta({ valor }: { valor: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const ini = v;
    const t0 = performance.now();
    let id = 0;
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / 1400);
      setV(Math.round(ini + (valor - ini) * (1 - Math.pow(1 - k, 4))));
      if (k < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>;
}

function Linha({ t, v }: { t: string; v: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, color: "#2b241f" }}>
      <span>{t}</span>
      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
}

function Legenda({ cor, contorno, children }: { cor: string; contorno?: boolean; children: React.ReactNode }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: cor, boxShadow: contorno ? "inset 0 0 0 1.5px var(--destaque-linha)" : "none" }} />
      {children}
    </span>
  );
}

const rotulo: CSSProperties = { fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase", color: "#776d60" };
const pilula: CSSProperties = { height: 34, padding: "0 12px", display: "inline-flex", alignItems: "center", borderRadius: 17, fontSize: 13 };
const cartaoPequeno: CSSProperties = { padding: "16px 18px", borderRadius: 22, background: "rgba(255,255,255,.85)", display: "flex", flexDirection: "column", gap: 8 };
const campo: CSSProperties = { minWidth: 0, height: 46, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
