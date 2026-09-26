"use client";

// O convite do portal v2 (180), do lado do convidado: capa na cor da
// festa (com o retrato, quando o responsável liberou), a música da
// entrada, "Vou / Não vou"; quem vai diz quantas pessoas e, de cada uma,
// a faixa de idade e — se quiser — o sexo; as restrições; e no fim o
// resumo com agenda, como chegar e mudar a resposta.
//
// Grava pela RPC pública (o hash é a credencial), com a chave anônima.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { tokensDaCor, ESTILO_PADRAO } from "@/lib/cor-da-festa";
import type { ConviteDaFesta } from "@/lib/convite-da-festa";
import { CredencialEntrada, type Credencial } from "./ConfirmacaoConvidado";

const ES = "cubic-bezier(.2,.8,.2,1)";
const TITULO = "var(--pv2-titulo)";
const MAX = 10;

type Faixa = "adulto" | "6-12" | "0-5";
type Sexo = "feminino" | "masculino" | "nd";
type Pessoa = { nome: string; faixa: Faixa; sexo: Sexo | null };

const FAIXAS: [Faixa, string][] = [["adulto", "Adulto"], ["6-12", "Criança 6 a 12"], ["0-5", "Criança 0 a 5"]];
const SEXOS: [Sexo, string][] = [["feminino", "Feminino"], ["masculino", "Masculino"], ["nd", "Prefiro não dizer"]];
const RESTRICOES: [string, string][] = [["sem_gluten", "sem glúten"], ["sem_lactose", "sem lactose"], ["vegetariano", "vegetariano"], ["vegano", "vegano"], ["alergia", "alergia"]];
const ERROS: Record<string, string> = {
  encerrado: "As confirmações já foram encerradas. Fale direto com a família.",
  ja_na_festa: "Sua entrada já foi registrada na festa.",
  convite_invalido: "Este convite não está mais válido.",
};

export function ConviteV2({
  hash,
  nome,
  titulo,
  quando,
  onde,
  dataIso,
  horaIso,
  festa,
  confirmacaoInicial,
  credencial,
}: {
  hash: string;
  nome: string;
  titulo: string;
  quando: string;
  onde: string | null;
  dataIso: string;
  horaIso: string | null;
  festa: ConviteDaFesta;
  confirmacaoInicial: "aguardando" | "confirmado" | "nao_vai";
  credencial: Credencial | null;
}) {
  const router = useRouter();
  const primeiro = nome.split(" ")[0];
  const [fase, setFase] = useState<"capa" | "vou" | "nao" | "ok">(confirmacaoInicial === "aguardando" ? "capa" : "ok");
  const [resposta, setResposta] = useState(confirmacaoInicial);
  const [pessoas, setPessoas] = useState<Pessoa[]>(() => [
    { nome, faixa: festa.faixa ?? "adulto", sexo: festa.sexo },
    ...festa.pessoas.map((p) => ({ nome: p.nome, faixa: p.faixa, sexo: p.sexo })),
  ]);
  const [restricoes, setRestricoes] = useState<string[]>(festa.restricoes);
  const [recado, setRecado] = useState(festa.recado ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tocando, setTocando] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  function musica() {
    if (!festa.entrada?.preview) return;
    if (tocando) {
      audio.current?.pause();
      setTocando(false);
      return;
    }
    const a = audio.current ?? new Audio(festa.entrada.preview);
    audio.current = a;
    a.onended = () => setTocando(false);
    a.play().then(() => setTocando(true)).catch(() => setTocando(false));
  }

  function mudarQuantas(n: number) {
    const alvo = Math.max(1, Math.min(MAX, n));
    setPessoas((ps) => (alvo > ps.length ? [...ps, ...Array.from({ length: alvo - ps.length }, () => ({ nome: "", faixa: "adulto" as Faixa, sexo: null }))] : ps.slice(0, alvo)));
  }
  const mudar = (i: number, p: Partial<Pessoa>) => setPessoas((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function enviar(valor: "confirmado" | "nao_vai") {
    setEnviando(true);
    setErro(null);
    audio.current?.pause();
    setTocando(false);
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("responder_convite_por_pessoa", {
      p_hash: hash,
      p_confirmacao: valor,
      p_pessoas: valor === "confirmado" ? pessoas.map((p) => ({ nome: p.nome.trim(), faixa: p.faixa, sexo: p.sexo })) : [],
      p_restricoes: valor === "confirmado" ? restricoes : [],
      p_recado: recado.trim() || null,
    });
    setEnviando(false);
    const r = data as { ok?: boolean; erro?: string } | null;
    if (error || !r?.ok) {
      setErro(ERROS[r?.erro ?? ""] ?? "Não conseguimos registrar agora. Tente de novo em instantes.");
      return;
    }
    setResposta(valor);
    setFase("ok");
    // a credencial de entrada nasce no servidor, atrás da confirmação
    router.refresh();
  }

  function agenda() {
    const d = dataIso.replace(/-/g, "");
    const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//eorganizei//convite//PT", "BEGIN:VEVENT", `UID:${hash.slice(0, 16)}@eorganizei`];
    if (horaIso) {
      const [h, m] = horaIso.split(":").map(Number);
      linhas.push(`DTSTART;TZID=America/Sao_Paulo:${d}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`, `DTEND;TZID=America/Sao_Paulo:${d}T${String(Math.min(23, h + 5)).padStart(2, "0")}${String(m).padStart(2, "0")}00`);
    } else {
      linhas.push(`DTSTART;VALUE=DATE:${d}`);
    }
    linhas.push(`SUMMARY:${titulo.replace(/[,;\n]/g, " ")}`);
    if (onde) linhas.push(`LOCATION:${onde.replace(/[,;\n]/g, " ")}`);
    linhas.push("END:VEVENT", "END:VCALENDAR");
    const url = URL.createObjectURL(new Blob([linhas.join("\r\n")], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "convite.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const cor = tokensDaCor(festa.cor ?? ESTILO_PADRAO.cor);
  const adultos = pessoas.filter((p) => p.faixa === "adulto").length;
  const criancas = pessoas.length - adultos;
  const capaGrande = fase === "capa";

  return (
    <div className="pv2" style={{ ...(cor as CSSProperties), minHeight: "100vh", display: "flex", justifyContent: "center", padding: "12px 16px 30px" }}>
      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* a capa */}
        <div style={{ position: "relative", minHeight: capaGrande ? 520 : 240, borderRadius: 30, overflow: "hidden", background: "var(--destaque-profundo)", color: "#fdfbf7", boxShadow: "0 40px 70px -36px rgba(20,12,18,.7)", transition: `min-height .8s ${ES}`, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {festa.retratoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={festa.retratoUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span aria-hidden style={{ position: "absolute", right: -40, top: -60, fontFamily: TITULO, fontSize: 380, lineHeight: 1, color: "color-mix(in oklch, var(--destaque) 30%, transparent)" }}>
              {titulo.replace(/^Os 15 anos da /, "").charAt(0) || "15"}
            </span>
          )}
          <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 20%, color-mix(in oklch, var(--destaque-profundo) 85%, transparent) 70%, var(--destaque-profundo))" }} />
          <div style={{ position: "relative", padding: "24px 24px 26px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.8 }}>Olá, {primeiro}</div>
            <h1 style={{ margin: 0, fontFamily: TITULO, fontWeight: 400, fontStyle: "italic", fontSize: capaGrande ? 44 : 32, lineHeight: 1.05, transition: `font-size .6s ${ES}` }}>{titulo}</h1>
            <div style={{ fontSize: 15, opacity: 0.9 }}>{quando}</div>
            {onde && <div style={{ fontSize: 15, opacity: 0.9 }}>{onde}</div>}
            {festa.entrada?.preview && capaGrande && (
              <button type="button" onClick={musica} style={{ marginTop: 10, alignSelf: "flex-start", height: 40, padding: "0 14px", display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(255,255,255,.35)", borderRadius: 20, background: "rgba(255,255,255,.12)", color: "#fdfbf7", fontSize: 13.5, cursor: "pointer" }}>
                <span aria-hidden style={{ display: "flex", gap: 2, alignItems: "center", height: 14 }}>
                  {[0, 0.2, 0.4].map((d) => (
                    <span key={d} style={{ width: 2.5, height: 14, background: "var(--destaque)", borderRadius: 1, animation: `pv2-eq .8s ease-in-out ${d}s infinite`, animationPlayState: tocando ? "running" : "paused" }} />
                  ))}
                </span>
                {tocando ? `${festa.entrada.titulo} · tocando` : "Ouvir a música da entrada"}
              </button>
            )}
          </div>
        </div>

        {fase === "capa" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, animation: `pv2-entrar .6s ${ES} .2s backwards` }}>
            <button type="button" onClick={() => setFase("vou")} style={botaoForte}>Vou</button>
            <button type="button" onClick={() => setFase("nao")} style={botaoLeve}>Não vou</button>
          </div>
        )}

        {fase === "vou" && (
          <div className="pv2-vidro" style={{ padding: 18, borderRadius: 26, display: "flex", flexDirection: "column", gap: 16, animation: `pv2-entrar .5s ${ES} backwards` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 15, color: "#2b241f" }}>Quantas pessoas vêm?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button type="button" aria-label="Menos uma pessoa" onClick={() => mudarQuantas(pessoas.length - 1)} style={redondo(pessoas.length > 1)}>−</button>
                <span style={{ minWidth: 24, textAlign: "center", fontFamily: TITULO, fontSize: 28, color: "#2b241f" }}>{pessoas.length}</span>
                <button type="button" aria-label="Mais uma pessoa" onClick={() => mudarQuantas(pessoas.length + 1)} style={redondo(pessoas.length < MAX)}>+</button>
              </div>
            </div>
            {pessoas.map((p, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: i ? 12 : 0, borderTop: i ? "1px solid rgba(0,0,0,.06)" : "none" }}>
                {i === 0 ? (
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#2b241f" }}>{nome}</div>
                ) : (
                  <input value={p.nome} onChange={(e) => mudar(i, { nome: e.target.value })} maxLength={120} placeholder="Nome de quem vem com você" aria-label={`Nome da pessoa ${i + 1}`} style={campo} />
                )}
                <div role="group" aria-label="Idade" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {FAIXAS.map(([v, t]) => (
                    <button key={v} type="button" aria-pressed={p.faixa === v} onClick={() => mudar(i, { faixa: v })} style={chip(p.faixa === v)}>{t}</button>
                  ))}
                </div>
                <div role="group" aria-label="Sexo (opcional)" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SEXOS.map(([v, t]) => (
                    <button key={v} type="button" aria-pressed={p.sexo === v} onClick={() => mudar(i, { sexo: p.sexo === v ? null : v })} style={chip(p.sexo === v, true)}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,.06)" }}>
              <div style={{ fontSize: 14, color: "#4c443c" }}>Alguma restrição na comida?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {RESTRICOES.map(([v, t]) => {
                  const on = restricoes.includes(v);
                  return (
                    <button key={v} type="button" aria-pressed={on} onClick={() => setRestricoes(on ? restricoes.filter((x) => x !== v) : [...restricoes, v])} style={chip(on)}>{t}</button>
                  );
                })}
              </div>
            </div>
            {erro && <div role="alert" style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
            <button type="button" disabled={enviando} onClick={() => enviar("confirmado")} style={botaoForte}>
              {enviando ? "Enviando…" : `Confirmar ${pessoas.length} ${pessoas.length > 1 ? "pessoas" : "pessoa"}`}
            </button>
            <button type="button" onClick={() => setFase("capa")} style={{ ...botaoLeve, border: 0, background: "none" }}>Voltar</button>
          </div>
        )}

        {fase === "nao" && (
          <div className="pv2-vidro" style={{ padding: 18, borderRadius: 26, display: "flex", flexDirection: "column", gap: 12, animation: `pv2-entrar .5s ${ES} backwards` }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15, color: "#2b241f" }}>
              Quer deixar um recado?
              <textarea value={recado} onChange={(e) => setRecado(e.target.value)} rows={3} maxLength={500} placeholder="(opcional)" style={{ ...campo, height: "auto", padding: 12, resize: "vertical" }} />
            </label>
            {erro && <div role="alert" style={{ fontSize: 13, color: "#8a2f2f" }}>{erro}</div>}
            <button type="button" disabled={enviando} onClick={() => enviar("nao_vai")} style={botaoForte}>{enviando ? "Enviando…" : "Avisar que não vou"}</button>
            <button type="button" onClick={() => setFase("capa")} style={{ ...botaoLeve, border: 0, background: "none" }}>Voltar</button>
          </div>
        )}

        {fase === "ok" && (
          <div className="pv2-vidro" style={{ padding: 20, borderRadius: 26, display: "flex", flexDirection: "column", gap: 12, animation: `pv2-entrar .5s ${ES} backwards` }}>
            <div style={{ fontFamily: TITULO, fontSize: 30, lineHeight: 1.1, color: "#2b241f" }}>
              {resposta === "confirmado" ? `Até lá, ${primeiro}` : "Que bom que avisou"}
            </div>
            <div style={{ fontSize: 15, color: "#4c443c" }}>
              {resposta === "confirmado"
                ? `${adultos} ${adultos === 1 ? "adulto" : "adultos"}${criancas ? ` e ${criancas} ${criancas === 1 ? "criança" : "crianças"}` : ""}${restricoes.length ? ` · ${restricoes.map((r) => RESTRICOES.find(([v]) => v === r)?.[1] ?? r).join(", ")}` : ""}. A família já sabe.`
                : recado.trim()
                  ? "O seu recado chega junto."
                  : "A família já sabe."}
            </div>
            {resposta === "confirmado" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" onClick={agenda} style={botaoChip}>Pôr na agenda</button>
                {onde && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(onde)}`} target="_blank" rel="noopener noreferrer" style={{ ...botaoChip, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
                    Como chegar
                  </a>
                )}
              </div>
            )}
            <button type="button" onClick={() => setFase("capa")} style={{ ...botaoLeve, alignSelf: "flex-start" }}>Mudar a resposta</button>
          </div>
        )}

        {fase === "ok" && resposta === "confirmado" && credencial && <CredencialEntrada credencial={credencial} />}
      </div>
    </div>
  );
}

const campo: CSSProperties = { height: 48, padding: "0 14px", border: "1px solid #e7dfd2", borderRadius: 14, background: "#fff", fontSize: 15, color: "#332b24" };
const botaoForte: CSSProperties = { minHeight: 54, border: 0, borderRadius: 18, background: "var(--destaque-texto)", color: "#fff", fontSize: 16, fontWeight: 500, cursor: "pointer", boxShadow: "0 14px 28px -14px var(--destaque-texto)" };
const botaoLeve: CSSProperties = { minHeight: 54, padding: "0 18px", border: "1px solid rgba(0,0,0,.1)", borderRadius: 18, background: "rgba(255,255,255,.85)", color: "#3a312a", fontSize: 16, cursor: "pointer" };
const botaoChip: CSSProperties = { height: 42, padding: "0 14px", border: 0, borderRadius: 21, background: "var(--destaque-fundo)", color: "var(--destaque-texto)", fontSize: 14, fontWeight: 600, cursor: "pointer" };
function chip(on: boolean, leve = false): CSSProperties {
  return { height: leve ? 36 : 40, padding: "0 14px", border: `1px solid ${on ? "var(--destaque-texto)" : "#e7dfd2"}`, borderRadius: 20, background: on ? "var(--destaque-texto)" : "#fff", color: on ? "#fff" : "#3a312a", fontSize: leve ? 13 : 14, cursor: "pointer" };
}
function redondo(ativo: boolean): CSSProperties {
  return { width: 44, height: 44, border: 0, borderRadius: "50%", background: ativo ? "var(--destaque-texto)" : "#d8cfc2", color: "#fff", fontSize: 22, cursor: ativo ? "pointer" : "default" };
}
