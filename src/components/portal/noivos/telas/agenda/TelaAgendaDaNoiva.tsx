"use client";

// A Agenda da noiva que abriu a conta sozinha (04/10/2026). De cima para
// baixo:
//   1. o mês — cada dia com um ponto para o que tem (compromisso, parcela)
//      e o dia do casamento marcado; tocar num dia mostra o que tem nele;
//   2. "Próximos" — o que vem pela frente, com "Marcar compromisso" e o
//      lápis para mudar ou tirar;
//   3. a Agenda do Google — a mesma ligação da cerimonialista: os
//      compromissos vão para a agenda "eOrganizei" do Google dela.

import { Fragment, useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AgendaDaNoiva, ItemDaAgenda } from "@/lib/supabase/portal-agenda";
import { AVISOS_GOOGLE, diaMes, urlDeConectar } from "@/lib/google/na-tela";
import {
  desligarGoogleDaNoiva,
  salvarCompromissoDaNoiva,
  tirarCompromissoDaNoiva,
} from "@/app/(portal)/portal/[eventoId]/agenda/actions";
import { Eyebrow, Icone } from "../../primitivas";
import { usePortalNoivos } from "../../contexto";
import "./agenda.css";

type Retorno = { ok: true } | { error: string };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// o que a volta do Google disse, na voz do portal (o "sem ocupado" da
// cerimonialista fala de oferta a fornecedores: aqui é o mesmo "ligada")
const AVISO_DA_VOLTA: Record<string, string> = {
  ok: "Ligada. Os compromissos vão para a agenda eOrganizei do seu Google.",
  ok_sem_ocupado: "Ligada. Os compromissos vão para a agenda eOrganizei do seu Google.",
  recusado: AVISOS_GOOGLE.recusado,
  erro: AVISOS_GOOGLE.erro,
};

const doisDigitos = (n: number) => String(n).padStart(2, "0");

function partes(iso: string): { a: number; m: number; d: number } {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { a, m, d };
}

/** "sábado, 12 de outubro" (a data da festa e da agenda, sem fuso) */
function diaPorExtenso(iso: string): string {
  const { a, m, d } = partes(iso);
  const semana = DIAS_DA_SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${semana}, ${d} de ${MESES[m - 1]}`;
}

/** As casas do mês, começando no domingo (null = casa vazia antes do dia 1). */
function casasDoMes(ano: number, mes: number): (string | null)[] {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const casas: (string | null)[] = Array.from({ length: primeiro }, () => null);
  for (let d = 1; d <= dias; d++) casas.push(`${ano}-${doisDigitos(mes)}-${doisDigitos(d)}`);
  return casas;
}

type Formulario = { id: string | null; titulo: string; data: string; hora: string; local: string };

function Linha({
  i,
  editando,
  mudar,
  financeiro,
}: {
  i: ItemDaAgenda;
  editando: boolean;
  mudar: (i: ItemDaAgenda) => void;
  /** o endereço do Financeiro (a parcela leva até lá) */
  financeiro: string;
}) {
  const { m, d } = partes(i.data);
  return (
    <li className={`pn-agn-item ${i.tipo}`}>
      <div className="pn-agn-quando">
        <span className="pn-t dia">{d}</span>
        <span className="mes">{MESES[m - 1].slice(0, 3)}</span>
      </div>
      <div className="pn-agn-texto">
        <div className="tit">
          {i.hora && <span className="hora">{i.hora}</span>}
          {i.titulo}
        </div>
        {i.sub && <div className="sub">{i.sub}</div>}
      </div>
      {i.tipo === "compromisso" && !editando && (
        <button type="button" className="pn-agn-lapis" onClick={() => mudar(i)} aria-label={`Mudar: ${i.titulo}`} title="Mudar">
          <Icone nome="edit" tamanho={18} />
        </button>
      )}
      {i.tipo === "parcela" && (
        <Link href={financeiro} className="pn-agn-ir">
          Financeiro
        </Link>
      )}
      {i.tipo === "casamento" && (
        <span className="pn-agn-coracao" aria-hidden="true">
          <Icone nome="favorite" tamanho={20} cheio />
        </span>
      )}
    </li>
  );
}

export function TelaAgendaDaNoiva({ agenda }: { agenda: AgendaDaNoiva }) {
  const { eventoId, base, avisar } = usePortalNoivos();
  const router = useRouter();
  const caminho = usePathname();
  const busca = useSearchParams();
  const [enviando, iniciar] = useTransition();

  const hoje = partes(agenda.hoje);
  const [mes, setMes] = useState({ a: hoje.a, m: hoje.m });
  const [dia, setDia] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [tirando, setTirando] = useState(false);
  const [desligando, setDesligando] = useState(false);

  // a volta do Google (?google=ok|recusado|erro): o aviso uma vez, e o endereço limpo
  useEffect(() => {
    const g = busca.get("google");
    if (!g) return;
    const msg = AVISO_DA_VOLTA[g];
    if (msg) avisar(msg, g === "erro" || g === "recusado");
    router.replace(caminho, { scroll: false });
  }, [busca, avisar, router, caminho]);

  const porDia = useMemo(() => {
    const m = new Map<string, ItemDaAgenda[]>();
    for (const i of agenda.itens) m.set(i.data, [...(m.get(i.data) ?? []), i]);
    return m;
  }, [agenda.itens]);

  const proximos = agenda.itens.filter((i) => i.data >= agenda.hoje);
  const doDia = dia ? (porDia.get(dia) ?? []) : [];

  function andar(delta: number) {
    setMes(({ a, m }) => {
      const t = a * 12 + (m - 1) + delta;
      return { a: Math.floor(t / 12), m: (t % 12) + 1 };
    });
    setDia(null);
  }

  function rodar(acao: () => Promise<Retorno>, aviso: string, depois?: () => void) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r) {
        avisar(r.error, true);
        return;
      }
      avisar(aviso);
      depois?.();
      router.refresh();
    });
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const f = form;
    rodar(() => salvarCompromissoDaNoiva(eventoId, f), f.id ? "Compromisso salvo" : "Compromisso marcado", () => setForm(null));
  }

  function abrirNovo() {
    setTirando(false);
    setForm({ id: null, titulo: "", data: dia && dia >= agenda.hoje ? dia : agenda.hoje, hora: "", local: "" });
  }

  function abrirEdicao(i: ItemDaAgenda) {
    setTirando(false);
    setForm({ id: i.id, titulo: i.titulo, data: i.data, hora: i.hora ?? "", local: i.local ?? "" });
  }

  const formulario = form && (
    <form className="pn-agn-form" onSubmit={salvar} aria-label={form.id ? "Mudar o compromisso" : "Marcar compromisso"}>
      <div className="pn-agn-campo">
        <label htmlFor="pn-agn-oque">O que é</label>
        <input
          id="pn-agn-oque"
          value={form.titulo}
          maxLength={120}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          placeholder="Prova do vestido, degustação…"
          required
        />
      </div>
      <div className="pn-agn-dupla">
        <div className="pn-agn-campo">
          <label htmlFor="pn-agn-data">Dia</label>
          <input id="pn-agn-data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
        </div>
        <div className="pn-agn-campo">
          <label htmlFor="pn-agn-hora">
            Hora <span className="opcional">(se tiver)</span>
          </label>
          <input id="pn-agn-hora" type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
        </div>
      </div>
      <div className="pn-agn-campo">
        <label htmlFor="pn-agn-local">
          Onde <span className="opcional">(se quiser)</span>
        </label>
        <input id="pn-agn-local" value={form.local} maxLength={200} onChange={(e) => setForm({ ...form, local: e.target.value })} />
      </div>
      <div className="pn-agn-acoes">
        <button type="submit" className="pn-btn" disabled={enviando || !form.titulo.trim() || !form.data}>
          {form.id ? "Salvar" : "Marcar"}
        </button>
        <button type="button" className="pn-agn-link" onClick={() => setForm(null)}>
          Cancelar
        </button>
        {form.id &&
          (tirando ? (
            <span className="pn-agn-tirar">
              Tirar da agenda?
              <button
                type="button"
                className="pn-agn-link perigo"
                disabled={enviando}
                onClick={() => rodar(() => tirarCompromissoDaNoiva(eventoId, form.id!), "Compromisso tirado", () => setForm(null))}
              >
                Tirar
              </button>
              <button type="button" className="pn-agn-link" onClick={() => setTirando(false)}>
                Não
              </button>
            </span>
          ) : (
            <button type="button" className="pn-agn-link" onClick={() => setTirando(true)}>
              Tirar da agenda
            </button>
          ))}
      </div>
    </form>
  );

  const g = agenda.google;
  return (
    <section className="pn-agn" aria-labelledby="pn-agn-titulo">
      {/* ---------- o mês ---------- */}
      <div className="pn-agn-card">
        <Eyebrow>Agenda</Eyebrow>
        <div className="pn-agn-cab">
          <h1 id="pn-agn-titulo" className="pn-t pn-agn-mes">
            {MESES[mes.m - 1]} de {mes.a}
          </h1>
          <div className="pn-agn-nav">
            <button type="button" onClick={() => andar(-1)} aria-label="Mês anterior">
              ‹
            </button>
            <button
              type="button"
              className="hoje"
              onClick={() => {
                setMes({ a: hoje.a, m: hoje.m });
                setDia(null);
              }}
            >
              Hoje
            </button>
            <button type="button" onClick={() => andar(1)} aria-label="Próximo mês">
              ›
            </button>
          </div>
        </div>
        <div className="pn-agn-semana" aria-hidden="true">
          {SEMANA.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="pn-agn-grade">
          {casasDoMes(mes.a, mes.m).map((iso, k) => {
            if (!iso) return <span key={`v${k}`} className="pn-agn-vazia" aria-hidden="true" />;
            const itens = porDia.get(iso) ?? [];
            const casamento = itens.some((i) => i.tipo === "casamento");
            const classes = [
              "pn-agn-dia",
              iso === agenda.hoje ? "hoje" : "",
              iso === dia ? "sel" : "",
              casamento ? "casamento" : "",
              iso < agenda.hoje ? "passou" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const rotulo = `${diaPorExtenso(iso)}${itens.length ? `: ${itens.map((i) => i.titulo).join(", ")}` : ""}`;
            return (
              <button
                key={iso}
                type="button"
                className={classes}
                aria-label={rotulo}
                aria-pressed={iso === dia}
                onClick={() => setDia(iso === dia ? null : iso)}
              >
                <span className="num">{partes(iso).d}</span>
                {itens.length > 0 && (
                  <span className="pontos" aria-hidden="true">
                    {itens.some((i) => i.tipo === "compromisso") && <span className="ponto compromisso" />}
                    {itens.some((i) => i.tipo === "parcela") && <span className="ponto parcela" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {dia && (
          <div className="pn-agn-diasel">
            <div className="pn-agn-diasel-tit">{diaPorExtenso(dia)}</div>
            {doDia.length === 0 ? (
              <p className="pn-agn-nada">Nada neste dia.</p>
            ) : (
              <ul className="pn-agn-lista">
                {doDia.map((i) => (
                  <Linha key={`${i.tipo}-${i.id}`} i={i} editando={form?.id === i.id} mudar={abrirEdicao} financeiro={`${base}/investimento`} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ---------- o que vem pela frente ---------- */}
      <div className="pn-agn-card">
        <div className="pn-agn-cab">
          <h2 className="pn-t pn-agn-h2">Próximos</h2>
          {!form && (
            <button type="button" className="pn-btn pn-agn-marcar" onClick={abrirNovo}>
              <Icone nome="add" tamanho={18} />
              Marcar compromisso
            </button>
          )}
        </div>
        {form && !form.id && formulario}
        {proximos.length === 0 ? (
          <p className="pn-agn-nada">Nada marcado ainda.</p>
        ) : (
          <ul className="pn-agn-lista">
            {proximos.map((i) => (
              <Fragment key={`${i.tipo}-${i.id}`}>
                <Linha i={i} editando={form?.id === i.id} mudar={abrirEdicao} financeiro={`${base}/investimento`} />
                {form?.id === i.id && <li className="pn-agn-form-li">{formulario}</li>}
              </Fragment>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- a Agenda do Google ---------- */}
      {agenda.googleDisponivel && (
        <div className="pn-agn-card pn-agn-google">
          <div className="pn-agn-google-ic" aria-hidden="true">
            <Icone nome="calendar_month" tamanho={24} />
          </div>
          <div className="pn-agn-google-texto">
            {!g ? (
              <>
                <div className="tit">Na sua Agenda do Google</div>
              </>
            ) : g.falha ? (
              <>
                <div className="tit">O Google parou de aceitar{g.falha_em ? ` em ${diaMes(g.falha_em)}` : ""}</div>
              </>
            ) : (
              <>
                <div className="tit">Ligada à Agenda do Google</div>
                <div className="sub">{g.google_email ?? "sua conta Google"}</div>
              </>
            )}
          </div>
          <div className="pn-agn-google-acao">
            {!g || g.falha ? (
              <a className="pn-btn pn-agn-ligar" href={urlDeConectar(`${base}/agenda`)}>
                {g ? "Ligar de novo" : "Ligar à Agenda do Google"}
              </a>
            ) : desligando ? (
              <span className="pn-agn-tirar">
                Desligar?
                <button
                  type="button"
                  className="pn-agn-link perigo"
                  disabled={enviando}
                  onClick={() => rodar(() => desligarGoogleDaNoiva(eventoId), "Agenda do Google desligada", () => setDesligando(false))}
                >
                  Desligar
                </button>
                <button type="button" className="pn-agn-link" onClick={() => setDesligando(false)}>
                  Não
                </button>
              </span>
            ) : (
              <button type="button" className="pn-agn-link" onClick={() => setDesligando(true)}>
                Desligar
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
