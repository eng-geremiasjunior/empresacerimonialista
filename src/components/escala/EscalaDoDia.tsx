"use client";

// A escala do dia no celular de quem trabalha no evento (171).
//
// No dia, ninguém lê tela: a pessoa olha uma vez, de relance, entre uma
// coisa e outra. Por isso a PRÓXIMA DEIXA dela vem em cima, grande, com o
// tempo que falta — e o resto (as outras deixas, o dia inteiro, a equipe
// com telefone) fica embaixo.
//
// Três cuidados de campo:
//   * sinal ruim em sítio e salão: o último dado fica guardado no
//     aparelho, e a página abre com ele se a rede cair;
//   * o relógio só entra depois de montar (o "agora" no primeiro render
//     quebra a hidratação — ver lib/tempo);
//   * vibra 5 min antes de cada deixa dela, se o aparelho deixar e a
//     página estiver aberta. Não é notificação: é o celular no bolso.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hojeBR, minutosDoDiaBR } from "@/lib/tempo";
import { formatDate } from "@/lib/format";

type Item = {
  id: string;
  time: string | null;
  title: string;
  description: string | null;
  status_novo: "planejado" | "em_andamento" | "concluido" | "problema";
  horario_real_inicio: string | null;
  horario_real_fim: string | null;
  duracao_minutos: number | null;
  origem_horario: string | null;
  fornecedor: string | null;
  responsavel: string | null;
  deixa: string | null;
  meu: boolean;
};

type ItemDoChecklist = {
  id: string;
  bloco: string;
  titulo: string;
  horario: string | null;
  feito: boolean;
  meu: boolean;
};

const BLOCO: Record<string, string> = {
  montagem: "Montagem",
  colacao: "Colação",
  cerimonia: "Cerimônia",
  recepcao: "Recepção",
  desmontagem: "Desmontagem",
};

export type DadosDaEscala = {
  evento: {
    nome: string | null;
    tipo: string;
    data: string;
    hora: string | null;
    local: string | null;
    empresa: string | null;
  };
  pessoa: { id: string; nome: string; posto: string | null };
  itens: Item[];
  /** o checklist do dia (172); ausente antes da 172 */
  checklist?: ItemDoChecklist[];
  equipe: { nome: string; posto: string | null; telefone: string | null; eu: boolean }[];
};

const ATUALIZA_MS = 30_000;
const AVISO_MIN = 5;

function hhmm(t: string | null) {
  return t ? t.slice(0, 5) : "—";
}
function minutosDe(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function quantoFalta(min: number): string {
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `em ${h}h${String(m).padStart(2, "0")}` : `em ${h}h`;
}
function telefoneLink(t: string | null) {
  const d = (t ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `tel:+${d.length <= 11 ? `55${d}` : d}` : null;
}

export function EscalaDoDia({ hash, inicial }: { hash: string; inicial: DadosDaEscala }) {
  const [dados, setDados] = useState<DadosDaEscala>(inicial);
  const [semSinal, setSemSinal] = useState<string | null>(null);
  const [agora, setAgora] = useState<{ dia: string; min: number } | null>(null);
  const [aba, setAba] = useState<"minhas" | "dia">("minhas");
  const [problemaDe, setProblemaDe] = useState<string | null>(null);
  const [textoProblema, setTextoProblema] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const avisados = useRef<Set<string>>(new Set());
  const chave = `escala-${hash}`;

  // guarda o que chegou do servidor (abre sem sinal da próxima vez)
  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify({ em: Date.now(), dados: inicial }));
    } catch {
      /* sem armazenamento: segue sem cópia */
    }
  }, [chave, inicial]);

  const atualizar = useCallback(async () => {
    try {
      const { data, error } = await createClient().rpc("roteiro_da_equipe", { p_hash: hash });
      if (error || !data) throw new Error("sem dados");
      setDados(data as DadosDaEscala);
      setSemSinal(null);
      try {
        localStorage.setItem(chave, JSON.stringify({ em: Date.now(), dados: data }));
      } catch {
        /* idem */
      }
    } catch {
      // sem rede: fica com o que tem, e diz de quando é
      try {
        const salvo = JSON.parse(localStorage.getItem(chave) ?? "null") as { em: number } | null;
        const quando = salvo
          ? new Date(salvo.em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : null;
        setSemSinal(quando ? `Sem sinal — mostrando o roteiro de ${quando}` : "Sem sinal");
      } catch {
        setSemSinal("Sem sinal");
      }
    }
  }, [chave, hash]);

  // relógio (só depois de montar) + atualização periódica
  useEffect(() => {
    const tick = () => setAgora({ dia: hojeBR(), min: minutosDoDiaBR() });
    tick();
    const relogio = setInterval(tick, 20_000);
    const busca = setInterval(atualizar, ATUALIZA_MS);
    const volta = () => document.visibilityState === "visible" && atualizar();
    document.addEventListener("visibilitychange", volta);
    return () => {
      clearInterval(relogio);
      clearInterval(busca);
      document.removeEventListener("visibilitychange", volta);
    };
  }, [atualizar]);

  const eHoje = agora !== null && agora.dia === dados.evento.data;
  const minhas = useMemo(() => dados.itens.filter((i) => i.meu), [dados]);
  const abertas = useMemo(() => minhas.filter((i) => i.status_novo !== "concluido"), [minhas]);
  // a próxima: a que está em andamento, senão a primeira aberta
  const proxima =
    abertas.find((i) => i.status_novo === "em_andamento") ?? abertas[0] ?? null;
  const faltaMin =
    eHoje && proxima && proxima.status_novo !== "em_andamento" && minutosDe(proxima.time) !== null
      ? minutosDe(proxima.time)! - agora!.min
      : null;

  // vibra 5 min antes de cada deixa dela (uma vez por item)
  useEffect(() => {
    if (!eHoje || !agora) return;
    for (const i of abertas) {
      const m = minutosDe(i.time);
      if (m === null || avisados.current.has(i.id)) continue;
      const falta = m - agora.min;
      if (falta <= AVISO_MIN && falta >= 0) {
        avisados.current.add(i.id);
        try {
          navigator.vibrate?.([300, 150, 300]);
        } catch {
          /* aparelho sem vibração */
        }
      }
    }
  }, [eHoje, agora, abertas]);

  async function marcar(item: Item, status: "em_andamento" | "concluido" | "problema", obs?: string) {
    setErro(null);
    setEnviando(item.id);
    try {
      const { data, error } = await createClient().rpc("equipe_marcar_item", {
        p_hash: hash,
        p_item_id: item.id,
        p_status: status,
        p_observacao: obs ?? null,
      });
      const r = data as { error?: string } | null;
      if (error || r?.error) {
        setErro(r?.error ?? "Não foi possível marcar agora.");
      } else {
        setProblemaDe(null);
        setTextoProblema("");
        await atualizar();
      }
    } catch {
      setErro("Sem sinal. Tente de novo em instantes.");
    } finally {
      setEnviando(null);
    }
  }

  const lista = aba === "minhas" ? minhas : dados.itens;
  const conferir = (dados.checklist ?? []).filter((c) => c.meu);

  async function conferirItem(c: ItemDoChecklist) {
    setErro(null);
    setEnviando(c.id);
    try {
      const { data, error } = await createClient().rpc("equipe_conferir_item", {
        p_hash: hash,
        p_item_id: c.id,
        p_feito: !c.feito,
      });
      const r = data as { error?: string } | null;
      if (error || r?.error) setErro(r?.error ?? "Não foi possível marcar agora.");
      else await atualizar();
    } catch {
      setErro("Sem sinal. Tente de novo em instantes.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 pb-16">
      <div className="mx-auto max-w-md px-4 pt-5">
        {/* quem e onde */}
        <p className="text-xs uppercase tracking-wide text-stone-500">
          {dados.evento.empresa ?? "Roteiro do dia"}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-stone-900">
          {dados.evento.nome ?? "Evento"}
        </h1>
        <p className="mt-0.5 text-sm text-stone-600">
          {formatDate(dados.evento.data)}
          {dados.evento.hora ? ` · ${hhmm(dados.evento.hora)}` : ""}
          {dados.evento.local ? ` · ${dados.evento.local}` : ""}
        </p>
        <p className="mt-3 text-sm text-stone-700">
          <span className="font-semibold">{dados.pessoa.nome}</span>
          {dados.pessoa.posto ? ` · ${dados.pessoa.posto}` : ""}
        </p>

        {semSinal && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{semSinal}</p>
        )}

        {/* a próxima deixa */}
        {proxima ? (
          <section className="mt-4 rounded-2xl bg-stone-900 p-5 text-white">
            <p className="text-xs uppercase tracking-wide text-stone-300">
              {proxima.status_novo === "em_andamento" ? "Agora" : "Sua próxima deixa"}
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl font-bold tabular-nums">{hhmm(proxima.time)}</span>
              {faltaMin !== null && (
                <span className="text-lg font-semibold text-[#E7C6DC]">{quantoFalta(faltaMin)}</span>
              )}
            </div>
            <p className="mt-2 text-lg font-semibold leading-snug">{proxima.title}</p>
            {proxima.deixa && <p className="mt-1 text-base text-stone-200">{proxima.deixa}</p>}
            {proxima.fornecedor && (
              <p className="mt-1 text-sm text-stone-400">com {proxima.fornecedor}</p>
            )}
            <div className="mt-4 flex gap-2">
              {proxima.status_novo === "em_andamento" ? (
                <button
                  type="button"
                  disabled={enviando === proxima.id}
                  onClick={() => marcar(proxima, "concluido")}
                  className="flex-1 rounded-xl bg-white py-3 text-base font-semibold text-stone-900 disabled:opacity-60"
                >
                  Concluí
                </button>
              ) : (
                <button
                  type="button"
                  disabled={enviando === proxima.id}
                  onClick={() => marcar(proxima, "em_andamento")}
                  className="flex-1 rounded-xl bg-white py-3 text-base font-semibold text-stone-900 disabled:opacity-60"
                >
                  Comecei
                </button>
              )}
              <button
                type="button"
                onClick={() => setProblemaDe(proxima.id)}
                className="rounded-xl border border-stone-600 px-4 py-3 text-sm font-medium text-stone-200"
              >
                Problema
              </button>
            </div>
          </section>
        ) : minhas.length > 0 ? (
          <p className="mt-4 rounded-2xl bg-white p-5 text-base text-stone-700">
            Suas deixas estão todas concluídas.
          </p>
        ) : null}

        {problemaDe && (
          <div className="mt-3 rounded-xl border border-stone-300 bg-white p-3">
            <textarea
              value={textoProblema}
              onChange={(e) => setTextoProblema(e.target.value)}
              rows={2}
              placeholder="O que aconteceu?"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={!textoProblema.trim() || enviando !== null}
                onClick={() => {
                  const item = dados.itens.find((i) => i.id === problemaDe);
                  if (item) marcar(item, "problema", textoProblema);
                }}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Avisar a cerimonialista
              </button>
              <button type="button" onClick={() => setProblemaDe(null)} className="px-3 text-sm text-stone-500">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}

        {/* as deixas / o dia inteiro */}
        <div className="mt-6 flex gap-1 rounded-xl bg-stone-200 p-1">
          {(
            [
              ["minhas", `Suas deixas (${minhas.length + conferir.length})`],
              ["dia", "Dia inteiro"],
            ] as const
          ).map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                aba === k ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {aba === "minhas" && conferir.length > 0 && (
          <>
            <h2 className="mt-4 text-sm font-semibold text-stone-900">Para conferir</h2>
            <ul className="mt-2 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
              {conferir.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    disabled={enviando === c.id}
                    onClick={() => conferirItem(c)}
                    aria-label={c.feito ? "Desmarcar" : "Marcar como feito"}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-base font-bold disabled:opacity-50 ${
                      c.feito ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                  <span className={`min-w-0 flex-1 text-[15px] ${c.feito ? "text-stone-400 line-through" : "text-stone-900"}`}>
                    {c.titulo}
                  </span>
                  <span className="shrink-0 text-xs text-stone-500">
                    {c.horario ? hhmm(c.horario) : BLOCO[c.bloco] ?? ""}
                  </span>
                </li>
              ))}
            </ul>
            {minhas.length > 0 && <h2 className="mt-4 text-sm font-semibold text-stone-900">No roteiro</h2>}
          </>
        )}

        {(aba === "dia" || minhas.length > 0 || conferir.length === 0) && (
        <ul className="mt-3 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {lista.length === 0 ? (
            <li className="p-4 text-sm text-stone-500">
              {aba === "minhas" ? "Nenhum item com o seu nome ainda." : "O roteiro ainda está vazio."}
            </li>
          ) : (
            lista.map((i) => {
              const feito = i.status_novo === "concluido";
              return (
                <li key={i.id} className={`flex gap-3 p-3 ${feito ? "opacity-50" : ""}`}>
                  <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-stone-900">
                    {hhmm(i.time)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[15px] font-medium text-stone-900 ${feito ? "line-through" : ""}`}>
                      {i.title}
                    </span>
                    {i.deixa && <span className="block text-sm text-stone-600">{i.deixa}</span>}
                    <span className="block text-xs text-stone-500">
                      {[
                        aba === "dia" && i.responsavel ? (i.meu ? "você" : i.responsavel) : null,
                        i.fornecedor,
                        i.status_novo === "em_andamento" ? "em andamento" : null,
                        i.status_novo === "problema" ? "com problema" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {i.meu && !feito && i.id !== proxima?.id && (
                    <button
                      type="button"
                      disabled={enviando === i.id}
                      onClick={() => marcar(i, i.status_novo === "em_andamento" ? "concluido" : "em_andamento")}
                      className="shrink-0 self-center rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                    >
                      {i.status_novo === "em_andamento" ? "Concluí" : "Comecei"}
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>
        )}

        {/* a equipe, para ligar */}
        {dados.equipe.length > 1 && (
          <>
            <h2 className="mt-8 text-sm font-semibold text-stone-900">Equipe</h2>
            <ul className="mt-2 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
              {dados.equipe.map((p, k) => {
                const tel = telefoneLink(p.telefone);
                return (
                  <li key={k} className="flex items-center justify-between gap-3 p-3">
                    <span className="min-w-0 text-[15px] text-stone-900">
                      {p.eu ? "Você" : p.nome}
                      {p.posto && <span className="text-sm text-stone-500"> · {p.posto}</span>}
                    </span>
                    {tel && !p.eu && (
                      <a href={tel} className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium">
                        Ligar
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
