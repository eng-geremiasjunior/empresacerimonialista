"use client";

// O cortejo do casamento pelo lado da equipe (192, 01/10/2026): o corredor
// de entrada, uma entrada atrás da outra, na ordem em que entram. Cada
// entrada é uma pessoa ou um par, com o lado e a música. Quem monta é a
// cerimonialista — por isso começa pronto (o cortejo tradicional, com o
// nome do casal) e aceita a lista colada do WhatsApp ("Ana e Pedro").

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ClipboardList, Music, Pencil, Printer, Trash2, X } from "lucide-react";
import type { PessoaCortejo } from "@/lib/portal-pessoas-shared";
import {
  PAPEIS_DO_CORTEJO,
  ROTULO_DO_LADO,
  emSequencia,
  papelDoCortejo,
  quemEntra,
  separarPar,
  type LadoDoCortejo,
} from "@/lib/cortejo-casamento";
import {
  adicionarEntradas,
  atualizarEntrada,
  montarCortejoTradicional,
  reordenarCortejo,
} from "@/app/(app)/eventos/[id]/cortejo/casamento-actions";
import { removerPessoaEquipe } from "@/app/(app)/eventos/[id]/cortejo/actions";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";
const botaoEscuro =
  "rounded-[9px] bg-[#17162A] px-3.5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const botaoClaro =
  "flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";

type Retorno = { ok?: true; error?: string };

function EscolhaDoLado({ lado, onLado }: { lado: LadoDoCortejo | null; onLado: (l: LadoDoCortejo | null) => void }) {
  const opcoes: [LadoDoCortejo | null, string][] = [
    ["noivo", "Do noivo"],
    ["noiva", "Da noiva"],
    [null, "Sem lado"],
  ];
  return (
    <div className="flex rounded-lg border border-stone-300 bg-white p-0.5" role="group" aria-label="Lado">
      {opcoes.map(([v, r]) => (
        <button
          key={r}
          type="button"
          aria-pressed={lado === v}
          onClick={() => onLado(v)}
          className={
            lado === v
              ? "rounded-md bg-stone-900 px-2.5 py-1.5 text-xs font-semibold text-white"
              : "rounded-md px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
          }
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function CortejoCasamento({
  eventId,
  printEventId,
  pessoas,
}: {
  eventId: string;
  printEventId?: string;
  pessoas: PessoaCortejo[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  // o formulário de entrada nova
  const [papel, setPapel] = useState("padrinho");
  const [nome, setNome] = useState("");
  const [par, setPar] = useState("");
  const [lado, setLado] = useState<LadoDoCortejo | null>("noivo");
  const [musica, setMusica] = useState("");
  const [lote, setLote] = useState(false);
  const [loteTexto, setLoteTexto] = useState("");

  const sequencia = useMemo(() => emSequencia(pessoas), [pessoas]);
  const p = papelDoCortejo(papel);
  const linhasDoLote = loteTexto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(separarPar);

  const pessoasNoCortejo = sequencia.reduce((n, e) => n + (e.nome.trim() ? 1 : 0) + ((e.par ?? "").trim() ? 1 : 0), 0);
  const aDefinir = sequencia.filter((e) => !e.nome.trim()).length;

  function rodar(fn: () => Promise<Retorno>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) {
        setErro(r.error);
        return;
      }
      depois?.();
      router.refresh();
    });
  }

  function adicionar() {
    if (!nome.trim() && !par.trim()) return;
    rodar(
      () =>
        adicionarEntradas(eventId, {
          papel,
          lado: p.comLado ? lado : null,
          musica,
          entradas: [{ nome, par: p.comPar ? par : null }],
        }),
      () => {
        setNome("");
        setPar("");
        setMusica("");
      }
    );
  }

  function adicionarLote() {
    if (linhasDoLote.length === 0) return;
    rodar(
      () =>
        adicionarEntradas(eventId, {
          papel,
          lado: p.comLado ? lado : null,
          entradas: linhasDoLote.map((l) => (p.comPar ? l : { nome: quemEntra(l), par: null })),
        }),
      () => {
        setLoteTexto("");
        setLote(false);
      }
    );
  }

  function mover(i: number, delta: -1 | 1) {
    const alvo = i + delta;
    if (alvo < 0 || alvo >= sequencia.length) return;
    const ids = sequencia.map((e) => e.id);
    [ids[i], ids[alvo]] = [ids[alvo], ids[i]];
    rodar(() => reordenarCortejo(eventId, ids));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cortejo</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {sequencia.length === 0
              ? "A ordem de entrada da cerimônia."
              : `${sequencia.length} ${sequencia.length === 1 ? "entrada" : "entradas"} · ${pessoasNoCortejo} ${
                  pessoasNoCortejo === 1 ? "pessoa" : "pessoas"
                }${aDefinir ? ` · ${aDefinir} a definir` : ""}`}
          </p>
        </div>
        {sequencia.length > 0 && (
          <a href={`/imprimir/chamada/${printEventId ?? eventId}`} target="_blank" rel="noopener noreferrer" className={botaoClaro}>
            <Printer size={15} />
            Imprimir a ordem de entrada
          </a>
        )}
      </div>

      {sequencia.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-5">
          <p className="text-sm font-semibold text-gray-900">Comece pelo cortejo tradicional</p>
          <p className="mt-1 text-sm text-gray-600">
            Celebrante, noivo, pais, padrinhos, daminhas, alianças e a noiva, nessa ordem. Você preenche os nomes, tira o
            que não tiver e muda a ordem.
          </p>
          <button
            type="button"
            onClick={() => rodar(() => montarCortejoTradicional(eventId))}
            disabled={pendente}
            className={`${botaoEscuro} mt-3`}
          >
            {pendente ? "Montando…" : "Montar o cortejo tradicional"}
          </button>
        </div>
      )}

      {/* entrada nova */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Adicionar entrada</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className={`${inputCls} w-auto min-w-[150px]`}
            aria-label="Entrada"
          >
            {PAPEIS_DO_CORTEJO.map((x) => (
              <option key={x.papel} value={x.papel}>
                {x.rotulo}
              </option>
            ))}
          </select>
          {p.comLado && <EscolhaDoLado lado={lado} onLado={setLado} />}
        </div>
        {lote ? (
          <div className="mt-3">
            <textarea
              value={loteTexto}
              onChange={(e) => setLoteTexto(e.target.value)}
              rows={6}
              autoFocus
              placeholder={
                p.comPar
                  ? "Cole a lista — um par por linha.\nAna Souza e Pedro Lima\nCarla Dias e Rafael Mota"
                  : "Cole a lista — um nome por linha."
              }
              className={inputCls}
            />
            <div className="mt-2 flex items-center gap-2">
              <button onClick={adicionarLote} disabled={pendente || linhasDoLote.length === 0} className={botaoEscuro}>
                {linhasDoLote.length > 1 ? `Adicionar ${linhasDoLote.length} entradas` : "Adicionar"}
              </button>
              <button
                onClick={() => setLote(false)}
                className="rounded-[9px] px-3 py-2.5 text-[13px] font-semibold text-stone-500 hover:bg-stone-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
              placeholder="Nome"
              className={inputCls}
            />
            {p.comPar ? (
              <input
                value={par}
                onChange={(e) => setPar(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionar()}
                placeholder={p.parDica ?? "Entra com (opcional)"}
                className={inputCls}
              />
            ) : (
              <span className="hidden sm:block" />
            )}
            <input
              value={musica}
              onChange={(e) => setMusica(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
              placeholder="Música (opcional)"
              className={inputCls}
            />
            <div className="flex items-center gap-2">
              <button onClick={adicionar} disabled={pendente || (!nome.trim() && !par.trim())} className={botaoEscuro}>
                Adicionar
              </button>
              <button onClick={() => setLote(true)} className={botaoClaro}>
                <ClipboardList size={15} /> Colar lista
              </button>
            </div>
          </div>
        )}
        {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
      </div>

      {/* o corredor */}
      {sequencia.length > 0 && (
        <ol className="relative space-y-2 border-l-2 border-stone-200 pl-5">
          {sequencia.map((e, i) =>
            editando === e.id ? (
              <EdicaoDaEntrada
                key={e.id}
                eventId={eventId}
                entrada={e}
                numero={i + 1}
                fechar={() => setEditando(null)}
              />
            ) : (
              <li key={e.id} className="relative">
                <span className="absolute -left-[31px] top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-stone-300 bg-white text-[10px] font-bold tabular-nums text-stone-600">
                  {i + 1}
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      {papelDoCortejo(e.papel).rotulo}
                      {e.lado ? <span className="font-normal normal-case tracking-normal"> · {ROTULO_DO_LADO[e.lado]}</span> : null}
                    </p>
                    {quemEntra({ nome: e.nome, par: e.par ?? null }) ? (
                      <p className="mt-0.5 truncate text-[15px] font-medium text-gray-900">
                        {quemEntra({ nome: e.nome, par: e.par ?? null })}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditando(e.id)}
                        className="mt-0.5 text-[15px] italic text-stone-400 hover:text-stone-700"
                      >
                        a definir — toque para preencher
                      </button>
                    )}
                    {(e.musica || e.oQueLeva) && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                        {e.musica && (
                          <span className="inline-flex items-center gap-1">
                            <Music size={12} /> {e.musica}
                          </span>
                        )}
                        {e.oQueLeva && <span>leva: {e.oQueLeva}</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => mover(i, -1)}
                      disabled={pendente || i === 0}
                      aria-label="Subir"
                      className="rounded p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      onClick={() => mover(i, 1)}
                      disabled={pendente || i === sequencia.length - 1}
                      aria-label="Descer"
                      className="rounded p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      onClick={() => setEditando(e.id)}
                      aria-label="Editar"
                      className="rounded p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => rodar(() => removerPessoaEquipe(eventId, e.id))}
                      disabled={pendente}
                      aria-label="Remover"
                      className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </li>
            )
          )}
        </ol>
      )}
    </div>
  );
}

function EdicaoDaEntrada({
  eventId,
  entrada,
  numero,
  fechar,
}: {
  eventId: string;
  entrada: PessoaCortejo;
  numero: number;
  fechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({
    papel: entrada.papel,
    nome: entrada.nome,
    par: entrada.par ?? "",
    lado: (entrada.lado ?? null) as LadoDoCortejo | null,
    musica: entrada.musica ?? "",
    oQueLeva: entrada.oQueLeva ?? "",
  });
  const p = papelDoCortejo(form.papel);
  const papeis = PAPEIS_DO_CORTEJO.some((x) => x.papel === form.papel)
    ? PAPEIS_DO_CORTEJO
    : [papelDoCortejo(form.papel), ...PAPEIS_DO_CORTEJO];

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarEntrada(eventId, entrada.id, { ...form, lado: p.comLado ? form.lado : null });
      if (r.error) {
        setErro(r.error);
        return;
      }
      fechar();
      router.refresh();
    });
  }

  return (
    <li className="relative">
      <span className="absolute -left-[31px] top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-stone-900 bg-stone-900 text-[10px] font-bold tabular-nums text-white">
        {numero}
      </span>
      <div className="space-y-2 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={form.papel}
            onChange={(e) => setForm({ ...form, papel: e.target.value })}
            className={`${inputCls} w-auto min-w-[150px]`}
            aria-label="Entrada"
          >
            {papeis.map((x) => (
              <option key={x.papel} value={x.papel}>
                {x.rotulo}
              </option>
            ))}
          </select>
          {p.comLado && <EscolhaDoLado lado={form.lado} onLado={(l) => setForm({ ...form, lado: l })} />}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder="Nome"
            autoFocus
            className={inputCls}
          />
          {p.comPar && (
            <input
              value={form.par}
              onChange={(e) => setForm({ ...form, par: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder={p.parDica ?? "Entra com (opcional)"}
              className={inputCls}
            />
          )}
          <input
            value={form.musica}
            onChange={(e) => setForm({ ...form, musica: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder="Música (opcional)"
            className={inputCls}
          />
          <input
            value={form.oQueLeva}
            onChange={(e) => setForm({ ...form, oQueLeva: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder="Leva (alianças, buquê, plaquinha…)"
            className={inputCls}
          />
        </div>
        {erro && <p className="text-sm text-rose-600">{erro}</p>}
        <div className="flex gap-2">
          <button onClick={salvar} disabled={pendente} className={botaoEscuro}>
            {pendente ? "Salvando…" : "Salvar"}
          </button>
          <button
            onClick={fechar}
            className="flex items-center gap-1 rounded-[9px] px-3 py-2 text-[13px] font-semibold text-stone-500 hover:bg-stone-100"
          >
            <X size={14} /> Cancelar
          </button>
        </div>
      </div>
    </li>
  );
}
