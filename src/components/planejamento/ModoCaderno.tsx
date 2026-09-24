"use client";

// Caderno do evento (172), no desenho do dono no Claude Design
// (design_handoff_planejamento, 23/09/2026). Dois jeitos de ver:
//   * Panorama  — os meses numa página só, como agenda anual (páginas de 6);
//   * Mês a mês — o índice à esquerda e o mês aberto à direita, pautado.
// O que está no mês são as decisões do método (a decidida riscada, a
// vencida em vermelho), as reuniões e as anotações DELA, que não viram
// tarefa. Os meses vêm de montarMeses (meses.ts): o Caderno não inventa
// um segundo cálculo de prazo.
//
// 24/09/2026: o Modo Amplo entrou aqui. Eram cinco jeitos de ver as
// mesmas decisões (Foco, Amplo, Panorama, Mês a mês, Mapa mental), três
// deles por mês. O que só o Amplo mostrava — o valor a fechar no mês —
// passou para o cabeçalho do mês, e o Mapa mental abre daqui.
//
// Tudo o que está no Caderno é DECISÃO: tarefa é o que nasce de uma
// decisão, na Organização. Chamar as duas coisas pelo mesmo nome era a
// contradição que a tela tinha com o "Requer atenção" do evento.

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import {
  anotarNoCaderno,
  apagarNotaDoCaderno,
  editarNotaDoCaderno,
  marcarReuniao,
  type NotaDoCaderno,
  type ReuniaoDoCaderno,
} from "@/app/(app)/eventos/[id]/planejamento/caderno-actions";
import { montarMeses } from "./meses";
import { brl, C, F_MONO, F_UI, estadoVisual, prazoRelativo } from "./celebra";
import { inicioDoDiaBR } from "@/lib/tempo";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const VISTA = "caderno-vista";

const CSS = `
.cd{display:flex;flex-direction:column;gap:16px;color:#221E1B;font-family:var(--font-ui),system-ui,sans-serif}
.cd button{font:inherit}
.cd-cab{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cd-meta{font:400 12px/16px var(--font-mono),ui-monospace,monospace;color:#928A81}
.cd-ferr{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.cd-leg{display:flex;gap:14px;font:400 12px/16px var(--font-mono),ui-monospace,monospace;color:#928A81;white-space:nowrap}
.cd-leg span{display:flex;align-items:center;gap:6px}
.cd-ponto{flex:none;width:6px;height:6px;border-radius:50%;border:1px solid #B4ADA4;background:transparent}
.cd-ponto.venc{background:#A5544B;border-color:#A5544B}
.cd-ponto.ok{background:#5E7355;border-color:#5E7355}
.cd-seg{display:flex;padding:3px;background:#F2EEE9;border-radius:10px;gap:2px}
.cd-seg button{border:0;cursor:pointer;height:32px;padding:0 16px;border-radius:8px;font:600 13px/16px var(--font-ui),system-ui,sans-serif;background:transparent;color:#928A81;white-space:nowrap;transition:background 150ms ease,color 150ms ease}
.cd-seg button[aria-pressed="true"]{background:#FFFFFF;color:#221E1B;box-shadow:0 1px 2px rgba(34,30,27,0.08)}
.cd-folha{background:#FFFFFF;border:1px solid #E6E0D8;border-radius:14px;box-shadow:0 1px 2px rgba(34,30,27,0.04);overflow:hidden}
.cd-pano{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr))}
.cd-pag{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(200px,auto);border-right:1px solid #E6E0D8}
@media (max-width:520px){.cd-pag{grid-template-columns:1fr;grid-auto-rows:auto}}
.cd-cel{cursor:pointer;text-align:left;border:0;padding:16px 20px;border-bottom:1px solid #E6E0D8;border-right:1px solid #F2EEE9;display:flex;flex-direction:column;gap:8px;background:transparent;color:inherit;transition:background 150ms ease;min-width:0}
.cd-cel:hover{background:#F2EEE9}
.cd-cel.atual{background:#F3EBF0}
.cd-mcab{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.cd-mnome{font:600 15px/20px var(--font-title),system-ui,sans-serif;letter-spacing:-0.01em}
.cd-cel.atual .cd-mnome{color:#6E3F5F}
.cd-aa{font-weight:500;color:#928A81}
.cd-peq{font:400 11px/16px var(--font-mono),ui-monospace,monospace;color:#928A81;white-space:nowrap}
.cd-prev{display:flex;flex-direction:column}
.cd-prev>div{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px dashed #E6E0D8}
.cd-prev .t{flex:1;min-width:0;font:400 13px/18px var(--font-ui),system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-mpe{display:flex;justify-content:space-between;gap:8px;font:400 12px/16px var(--font-ui),system-ui,sans-serif;margin-top:auto}
.cd-mais{color:#6E3F5F}.cd-feitas{color:#5E7355}
.venc .t,.venc .d{color:#A5544B}
.ok .t,.ok .d{color:#5E7355}
.ok .t{text-decoration:line-through}
.cd-mes{display:grid;grid-template-columns:minmax(260px,380px) minmax(0,1fr);min-height:640px}
@media (max-width:760px){.cd-mes{grid-template-columns:1fr;min-height:0}.cd-ind{border-right:0!important;border-bottom:1px solid #E6E0D8}.cd-det{padding:24px 20px!important}.cd-det h2{font-size:32px!important;line-height:38px!important}}
.cd-ind{border-right:1px solid #E6E0D8;padding:24px 0;display:flex;flex-direction:column;gap:4px;background:#FAF8F5}
.cd-rot{padding:0 24px 12px;font:600 13px/16px var(--font-ui),system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#928A81}
.cd-lin{cursor:pointer;border:0;border-left:3px solid transparent;text-align:left;display:grid;grid-template-columns:110px 1fr 48px;align-items:center;gap:12px;padding:10px 24px;background:transparent;color:inherit}
.cd-lin:hover{background:#F2EEE9}
.cd-lin[aria-current="true"]{background:#FFFFFF;border-left-color:#6E3F5F}
.cd-lin .n{font:600 14px/20px var(--font-title),system-ui,sans-serif;letter-spacing:-0.01em;white-space:nowrap}
.cd-lin[aria-current="true"] .n{color:#6E3F5F}
.cd-barra{height:4px;border-radius:999px;background:#E6E0D8;overflow:hidden;display:block}
.cd-barra i{display:block;height:100%;background:#6E7F63}
.cd-barra.venc i{background:#A5544B}
.cd-razao{font:400 11px/16px var(--font-mono),ui-monospace,monospace;color:#928A81;text-align:right}
.cd-razao.venc{color:#A5544B}
.cd-det{padding:28px 40px;display:flex;flex-direction:column;gap:18px;min-width:0}
.cd-dcab{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid #221E1B}
.cd-det h2{margin:4px 0 0;font:500 40px/46px var(--font-title),system-ui,sans-serif;letter-spacing:-0.02em;white-space:nowrap}
.cd-tar{border-bottom:1px solid #E6E0D8}
.cd-tar>button{width:100%;display:flex;align-items:center;gap:12px;min-height:40px;border:0;background:transparent;padding:0;cursor:pointer;text-align:left;color:inherit}
.cd-tar>button:hover .t{text-decoration:underline;text-underline-offset:3px}
.cd-anel{flex:none;width:14px;height:14px;border-radius:50%;border:1.5px solid #B4ADA4}
.venc .cd-anel{border-color:#A5544B;background:#A5544B}
.ok .cd-anel{border-color:#5E7355;background:#5E7355}
.cd-tar .t{flex:1;min-width:0;font:400 15px/20px var(--font-ui),system-ui,sans-serif}
.cd-tar .d{font:400 12px/16px var(--font-mono),ui-monospace,monospace;color:#928A81;white-space:nowrap}
.cd-notas{display:flex;flex-direction:column;gap:3px;padding:0 0 10px 26px}
.cd-nota{display:flex;gap:8px;align-items:baseline;font:italic 400 13.5px/19px var(--font-ui),system-ui,sans-serif;color:#6B6259}
.cd-nota span{flex:1;cursor:text}
.cd-x{border:0;background:none;color:#B4ADA4;cursor:pointer;font-size:13px;padding:0 2px}
.cd-x:hover{color:#A5544B}
.cd-pauta{min-height:40px;border-bottom:1px solid #E6E0D8;display:flex;align-items:center}
.cd-pauta input{width:100%;border:0;background:transparent;outline:none;padding:0;font:400 14px/20px var(--font-ui),system-ui,sans-serif;color:#221E1B}
.cd-pauta input::placeholder{color:#B4ADA4}
.cd-reu{padding:10px 0;border-bottom:1px solid #E6E0D8}
.cd-reu b{font:600 14px/20px var(--font-ui),system-ui,sans-serif}
.cd-reu input{width:100%;border:0;border-bottom:1px dashed #E6E0D8;background:transparent;outline:none;padding:6px 0;font:400 13.5px/19px var(--font-ui),system-ui,sans-serif;color:#221E1B}
.cd-acoes{display:flex;gap:8px;margin-top:auto;flex-wrap:wrap;align-items:center}
.cd-btn{display:inline-flex;align-items:center;height:32px;padding:0 12px;border-radius:10px;font:600 13px/16px var(--font-ui),system-ui,sans-serif;cursor:pointer;transition:background 150ms ease;text-decoration:none}
.cd-btn.sec{border:1px solid #E6E0D8;background:#FFFFFF;color:#221E1B}
.cd-btn.fant{border:1px solid transparent;background:transparent;color:#6B6259}
.cd-btn:hover{background:#F2EEE9}
.cd-btn:disabled{opacity:.4;cursor:default}
.cd-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cd-form input{height:32px;border:1px solid #E6E0D8;border-radius:8px;padding:0 10px;font:400 13px/16px var(--font-ui),system-ui,sans-serif;color:#221E1B;background:#fff}
.cd button:focus-visible,.cd a:focus-visible{outline:none;box-shadow:0 0 0 3px #F3EBF0,0 0 0 1px #6E3F5F}
.cd-erro{margin:0;font:400 13px/18px var(--font-ui),system-ui,sans-serif;color:#A5544B}
`;

type Mes = {
  chave: string;
  nome: string;
  ano: string;
  mesesAteEvento: number | null;
  passado: boolean;
  atual: boolean;
  diaD: boolean;
  decisoes: Decisao[];
  /** o que ainda falta contratar com prazo neste mês (era do Amplo) */
  previsto: number;
};
type Estado = "venc" | "ok" | "";

function estado(d: Decisao): Estado {
  const e = estadoVisual(d);
  return e === "atrasada" ? "venc" : e === "decidida" ? "ok" : "";
}
const ORDEM: Record<Estado, number> = { venc: 0, "": 1, ok: 2 };
function ordenar(ds: Decisao[]) {
  return [...ds].sort(
    (a, b) => ORDEM[estado(a)] - ORDEM[estado(b)] || (a.prazoPrevisto ?? "").localeCompare(b.prazoPrevisto ?? "")
  );
}
function dataCurta(iso: string | null) {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}
function dataLonga(iso: string | null) {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
function diaMes(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1].toLowerCase()}`;
}
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
function quando(m: Mes) {
  if (m.diaD) return "mês do evento";
  if (m.atual) return "este mês";
  if (m.mesesAteEvento === null) return "";
  if (m.mesesAteEvento <= 0) return "mês do evento";
  return m.mesesAteEvento === 1 ? "falta 1 mês" : `faltam ${m.mesesAteEvento} meses`;
}
function chaveDaNota(n: NotaDoCaderno) {
  return (n.mes ?? n.criadaEm).slice(0, 7);
}

export function ModoCaderno({
  eventId,
  objetivos,
  dataEvento,
  meta,
  notas,
  reunioes,
  onAbrirDecisao,
  onAbrirMapa,
}: {
  eventId: string;
  objetivos: Objetivo[];
  dataEvento: string | null;
  /** "Ana & Pedro · casamento 08/08/2027 · faltam 319 dias" — o "x de y decididas" vem daqui */
  meta: string;
  notas: NotaDoCaderno[];
  reunioes: ReuniaoDoCaderno[];
  onAbrirDecisao: (d: Decisao) => void;
  /** o Mapa mental abre daqui, do Panorama (saiu da barra principal) */
  onAbrirMapa?: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [vista, setVista] = useState<"pano" | "mes">("pano");
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [reuniaoAberta, setReuniaoAberta] = useState(false);
  const [novaReuniao, setNovaReuniao] = useState({ titulo: "", data: "", hora: "" });
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);

  // a vista é dela, não do evento: lembra entre eventos
  useEffect(() => {
    try {
      if (window.localStorage.getItem(VISTA) === "mes") setVista("mes");
    } catch {
      /* sem armazenamento: começa no Panorama */
    }
  }, []);
  const trocarVista = (v: "pano" | "mes") => {
    setVista(v);
    try {
      window.localStorage.setItem(VISTA, v);
    } catch {
      /* nada */
    }
  };

  function rodar(f: () => Promise<{ error: string } | { success: true }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      depois?.();
      router.refresh();
    });
  }

  const { meses: base, diaD } = montarMeses(objetivos, dataEvento);
  const todos: Mes[] = [...base.map((m) => ({ ...m, diaD: false })), ...(diaD ? [{ ...diaD, diaD: true }] : [])].map(
    (m) => {
      const [a, n] = m.chave.split("-").map(Number);
      return {
        chave: m.chave,
        nome: MESES[n - 1],
        ano: String(a),
        mesesAteEvento: m.mesesAteEvento,
        passado: m.passado,
        atual: m.atual,
        diaD: m.diaD,
        decisoes: ordenar(m.decisoes),
        previsto: m.previsto,
      };
    }
  );
  // o que já passou só fica se ainda tem o que fazer (a vencida); com o
  // evento já realizado, o caderno inteiro vira memória e fica todo
  const aindaVem = todos.some((m) => !m.passado);
  const meses = aindaVem
    ? todos.filter((m) => !m.passado || m.decisoes.some((d) => estado(d) === "venc"))
    : [...todos];
  // sem data do evento, o caderno ainda existe: o mês de hoje
  if (meses.length === 0) {
    const d = inicioDoDiaBR();
    meses.push({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      nome: MESES[d.getMonth()],
      ano: String(d.getFullYear()),
      mesesAteEvento: null,
      passado: false,
      atual: true,
      diaD: false,
      decisoes: [],
      previsto: 0,
    });
  }
  const primeira = meses[0].chave;
  const ultima = meses[meses.length - 1].chave;
  // o que cai fora do intervalo vai para a ponta mais próxima
  const naPagina = (chave: string) => (chave < primeira ? primeira : chave > ultima ? ultima : chave);

  const [sel, setSel] = useState<string | null>(null);
  const aberto = meses.find((m) => m.chave === sel) ?? meses.find((m) => m.atual) ?? meses[0];

  const todasDecisoes = todos.flatMap((m) => m.decisoes);
  const feitas = todasDecisoes.filter((d) => estado(d) === "ok").length;

  const soltas = notas.filter((n) => !n.decisaoId && !n.reuniaoId);
  const daDecisao = (id: string) => notas.filter((n) => n.decisaoId === id);
  const daReuniao = (id: string) => notas.filter((n) => n.reuniaoId === id);

  const nota_ = (n: NotaDoCaderno) =>
    editando?.id === n.id ? (
      <div key={n.id} className="cd-pauta">
        <input
          autoFocus
          value={editando.texto}
          onChange={(e) => setEditando({ id: n.id, texto: e.target.value })}
          onBlur={() => setEditando(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") rodar(() => editarNotaDoCaderno(eventId, n.id, editando.texto), () => setEditando(null));
            if (e.key === "Escape") setEditando(null);
          }}
        />
      </div>
    ) : (
      <div key={n.id} className="cd-nota">
        <span onClick={() => setEditando({ id: n.id, texto: n.texto })}>{n.texto}</span>
        <button
          type="button"
          className="cd-x"
          aria-label="Apagar anotação"
          onClick={() => {
            if (window.confirm("Apagar esta anotação?")) rodar(() => apagarNotaDoCaderno(eventId, n.id));
          }}
        >
          ×
        </button>
      </div>
    );

  const cabecalho = (
    <div className="cd-cab">
      <span className="cd-meta">
        {meta}
        {todasDecisoes.length > 0 ? ` · ${feitas} de ${todasDecisoes.length} decididas` : ""}
      </span>
      <div className="cd-ferr">
        {vista === "pano" && onAbrirMapa && (
          <button type="button" className="cd-btn sec" onClick={onAbrirMapa}>
            Mapa mental
          </button>
        )}
        <div className="cd-leg" aria-hidden>
          <span style={{ color: "#A5544B" }}>
            <i className="cd-ponto venc" />
            vencida
          </span>
          <span>
            <i className="cd-ponto" />
            aberta
          </span>
          <span style={{ color: "#5E7355", textDecoration: "line-through" }}>decidida</span>
        </div>
        <div className="cd-seg" role="group" aria-label="Como ver o caderno">
          <button type="button" aria-pressed={vista === "pano"} onClick={() => trocarVista("pano")}>
            Panorama
          </button>
          <button type="button" aria-pressed={vista === "mes"} onClick={() => trocarVista("mes")}>
            Mês a mês
          </button>
        </div>
      </div>
    </div>
  );

  const pontoDe = (e: Estado) => <i className={`cd-ponto ${e}`} />;
  const curta = (d: Decisao, e: Estado) => (e === "venc" ? "vencida" : e === "ok" ? "decidida" : dataCurta(d.prazoPrevisto));
  const longa = (d: Decisao, e: Estado) =>
    e === "venc" ? prazoRelativo(d.prazoPrevisto) ?? "vencida" : e === "ok" ? "decidida" : dataLonga(d.prazoPrevisto);

  // ── Panorama: páginas de 6 meses ──
  const paginas: Mes[][] = [];
  for (let i = 0; i < meses.length; i += 6) paginas.push(meses.slice(i, i + 6));

  const panorama = (
    <div className="cd-folha cd-pano">
      {paginas.map((pg, k) => (
        <div key={k} className="cd-pag">
          {pg.map((m) => {
            const abertas = m.decisoes.filter((d) => estado(d) !== "ok").length;
            const decididas = m.decisoes.length - abertas;
            return (
              <button
                key={m.chave}
                type="button"
                className={`cd-cel${m.atual ? " atual" : ""}`}
                onClick={() => {
                  setSel(m.chave);
                  trocarVista("mes");
                }}
              >
                <div className="cd-mcab">
                  <span className="cd-mnome">
                    {m.nome} <span className="cd-aa">&apos;{m.ano.slice(2)}</span>
                  </span>
                  <span className="cd-peq">
                    {m.diaD ? "o evento" : m.decisoes.length ? plural(abertas, "aberta", "abertas") : ""}
                  </span>
                </div>
                <div className="cd-prev">
                  {m.decisoes.slice(0, 4).map((d) => {
                    const e = estado(d);
                    return (
                      <div key={d.id} className={e}>
                        {pontoDe(e)}
                        <span className="t">{d.titulo}</span>
                        <span className="cd-peq d">{curta(d, e)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="cd-mpe">
                  <span className="cd-mais">{m.decisoes.length > 4 ? `+ ${m.decisoes.length - 4} decisões` : ""}</span>
                  <span className="cd-feitas">{decididas ? `✓ ${plural(decididas, "decidida", "decididas")}` : ""}</span>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  // ── Mês a mês ──
  const m = aberto;
  const abertasDoMes = m.decisoes.filter((d) => estado(d) !== "ok").length;
  const reunioesDoMes = reunioes.filter((r) => naPagina(r.data.slice(0, 7)) === m.chave);
  const soltasDoMes = soltas.filter((n) => naPagina(chaveDaNota(n)) === m.chave);

  const mesAMes = (
    <div className="cd-folha cd-mes">
      <nav className="cd-ind" aria-label="Meses">
        <div className="cd-rot">Índice · {plural(meses.length, "mês", "meses")}</div>
        {meses.map((x) => {
          const total = x.decisoes.length;
          const ok = x.decisoes.filter((d) => estado(d) === "ok").length;
          const venc = x.decisoes.some((d) => estado(d) === "venc");
          return (
            <button
              key={x.chave}
              type="button"
              className="cd-lin"
              aria-current={x.chave === m.chave}
              onClick={() => {
                setSel(x.chave);
                setReuniaoAberta(false);
              }}
            >
              <span className="n">
                {x.nome} <span className="cd-aa">&apos;{x.ano.slice(2)}</span>
              </span>
              <span className={`cd-barra${venc ? " venc" : ""}`}>
                <i style={{ width: `${total ? Math.round((ok / total) * 100) : 0}%` }} />
              </span>
              <span className={`cd-razao${venc ? " venc" : ""}`}>{total ? `${ok}/${total}` : "—"}</span>
            </button>
          );
        })}
      </nav>

      <div className="cd-det">
        <div className="cd-dcab">
          <div>
            <span className="cd-meta">{quando(m)}</span>
            <h2>
              {m.nome} {m.ano}
            </h2>
          </div>
          <span className="cd-meta">
            {plural(abertasDoMes, "aberta", "abertas")} · {plural(m.decisoes.length - abertasDoMes, "decidida", "decididas")}
            {m.previsto > 0 ? ` · ${brl(m.previsto)} a fechar` : ""}
          </span>
        </div>

        <div>
          {m.decisoes.map((d) => {
            const e = estado(d);
            const suas = daDecisao(d.id);
            return (
              <div key={d.id} className={`cd-tar ${e}`}>
                <button type="button" onClick={() => onAbrirDecisao(d)}>
                  <span className="cd-anel" aria-hidden />
                  <span className="t">{d.titulo}</span>
                  <span className="d">{longa(d, e)}</span>
                </button>
                {suas.length > 0 && <div className="cd-notas">{suas.map((n) => nota_(n))}</div>}
              </div>
            );
          })}

          {reunioesDoMes.map((r) => {
            const chave = `r:${r.id}`;
            return (
              <div key={r.id} className="cd-reu">
                <b>
                  Reunião · {diaMes(r.data)}
                  {r.hora ? ` · ${r.hora.slice(0, 5)}` : ""} · {r.titulo}
                </b>
                <div className="cd-notas" style={{ padding: "4px 0 0 12px" }}>
                  {daReuniao(r.id).map((n) => nota_(n))}
                  <input
                    placeholder="o que ficou combinado…"
                    value={rascunho[chave] ?? ""}
                    disabled={pendente}
                    onChange={(e) => setRascunho({ ...rascunho, [chave]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (rascunho[chave] ?? "").trim())
                        rodar(() => anotarNoCaderno(eventId, { texto: rascunho[chave], reuniaoId: r.id }), () =>
                          setRascunho({ ...rascunho, [chave]: "" })
                        );
                    }}
                  />
                </div>
              </div>
            );
          })}

          {soltasDoMes.map((n) => (
            <div key={n.id} className="cd-pauta">
              {nota_(n)}
            </div>
          ))}

          {/* anotar no mês: Enter salva, não vira tarefa */}
          <div className="cd-pauta">
            <input
              placeholder="+ anotar"
              aria-label="Anotar neste mês"
              value={rascunho[m.chave] ?? ""}
              disabled={pendente}
              onChange={(e) => setRascunho({ ...rascunho, [m.chave]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (rascunho[m.chave] ?? "").trim())
                  rodar(() => anotarNoCaderno(eventId, { texto: rascunho[m.chave], mes: m.chave }), () =>
                    setRascunho({ ...rascunho, [m.chave]: "" })
                  );
              }}
            />
          </div>
          <div className="cd-pauta" aria-hidden />
          <div className="cd-pauta" aria-hidden />
        </div>

        {erro && <p className="cd-erro">{erro}</p>}

        {reuniaoAberta ? (
          <form
            className="cd-form"
            onSubmit={(e) => {
              e.preventDefault();
              rodar(() => marcarReuniao(eventId, novaReuniao), () => {
                setReuniaoAberta(false);
                setNovaReuniao({ titulo: "", data: "", hora: "" });
              });
            }}
          >
            <input
              autoFocus
              placeholder="Reunião (ex.: Degustação)"
              value={novaReuniao.titulo}
              onChange={(e) => setNovaReuniao({ ...novaReuniao, titulo: e.target.value })}
              style={{ width: 220 }}
            />
            <input
              type="date"
              aria-label="Data"
              value={novaReuniao.data}
              onChange={(e) => setNovaReuniao({ ...novaReuniao, data: e.target.value })}
            />
            <input
              type="time"
              aria-label="Hora"
              value={novaReuniao.hora}
              onChange={(e) => setNovaReuniao({ ...novaReuniao, hora: e.target.value })}
            />
            <button
              type="submit"
              className="cd-btn sec"
              disabled={pendente || !novaReuniao.titulo.trim() || !novaReuniao.data}
            >
              Marcar
            </button>
            <button type="button" className="cd-btn fant" onClick={() => setReuniaoAberta(false)}>
              Cancelar
            </button>
          </form>
        ) : (
          <div className="cd-acoes">
            <Link className="cd-btn sec" href={`/eventos/${eventId}/organizacao?tarefa=nova`}>
              + Tarefa
            </Link>
            <button
              type="button"
              className="cd-btn fant"
              onClick={() => {
                setReuniaoAberta(true);
                const hoje = inicioDoDiaBR();
                const chaveHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
                setNovaReuniao({ titulo: "", data: m.chave > chaveHoje ? `${m.chave}-01` : "", hora: "" });
              }}
            >
              + Reunião
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="cd">
      <style>{CSS}</style>
      {cabecalho}
      {vista === "pano" ? panorama : mesAMes}
      {vista === "pano" && erro && <p className="cd-erro">{erro}</p>}
    </div>
  );
}

// estilos das anotações dentro do drawer da decisão (AnotacoesDaDecisao)
const nota: React.CSSProperties = {
  fontFamily: F_UI,
  fontStyle: "italic",
  fontSize: 13.5,
  lineHeight: "19px",
  color: C.corpo,
};
const entrada: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderBottom: `1px solid ${C.bordaMedia}`,
  background: "transparent",
  padding: "6px 2px",
  fontFamily: F_UI,
  fontSize: 13.5,
  color: C.tinta,
  outline: "none",
};

/** As anotações presas a uma decisão, dentro do drawer dela. */
export function AnotacoesDaDecisao({
  eventId,
  decisaoId,
  notas,
}: {
  eventId: string;
  decisaoId: string;
  notas: NotaDoCaderno[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const minhas = notas.filter((n) => n.decisaoId === decisaoId);

  return (
    <div style={{ borderTop: `1px solid ${C.bordaSutil}`, paddingTop: 12 }}>
      <p style={{ fontFamily: F_MONO, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.secundario, margin: 0 }}>
        anotações
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
        {minhas.map((n) => (
          <div key={n.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <span style={{ ...nota, flex: 1 }}>{n.texto}</span>
            <button
              type="button"
              aria-label="Apagar anotação"
              onClick={() =>
                iniciar(async () => {
                  const r = await apagarNotaDoCaderno(eventId, n.id);
                  if ("error" in r) setErro(r.error);
                  else router.refresh();
                })
              }
              style={{ border: "none", background: "none", color: C.fantasma, cursor: "pointer", fontSize: 13 }}
            >
              ×
            </button>
          </div>
        ))}
        <input
          style={entrada}
          placeholder="+ anotar"
          value={texto}
          disabled={pendente}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && texto.trim()) {
              setErro(null);
              iniciar(async () => {
                const r = await anotarNoCaderno(eventId, { texto, decisaoId });
                if ("error" in r) setErro(r.error);
                else {
                  setTexto("");
                  router.refresh();
                }
              });
            }
          }}
        />
        {erro && <span style={{ fontFamily: F_UI, fontSize: 12, color: C.atrasadaFg }}>{erro}</span>}
      </div>
    </div>
  );
}
