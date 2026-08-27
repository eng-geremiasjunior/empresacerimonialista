"use client";

// As listas do evento, pelo lado da equipe. A comissão manda a lista
// pronta por WhatsApp — por isso a entrada em lote (colar, um nome por
// linha) é gesto de primeira classe, não recurso escondido. A ordem é
// dado de trabalho: é a ordem de entrada e da chamada nominal.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ClipboardList, Pencil, Printer, Trash2, X } from "lucide-react";
import {
  agruparCortejo,
  papeisDoTipo,
  rotuloDoPapel,
  type PessoaCortejo,
} from "@/lib/portal-pessoas-shared";
import {
  adicionarPessoasEquipe,
  atualizarPessoaEquipe,
  removerPessoaEquipe,
  reordenarPapelEquipe,
} from "@/app/(app)/eventos/[id]/cortejo/actions";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

export function CortejoEquipe({
  eventId,
  printEventId,
  tipo,
  pessoas,
}: {
  eventId: string;
  /** evento cuja data/local saem no cabeçalho da folha (o da rota atual) */
  printEventId?: string;
  tipo: string;
  pessoas: PessoaCortejo[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const papeis = papeisDoTipo(tipo);
  const ehFormatura = tipo === "formatura";

  const [papel, setPapel] = useState(papeis[0]);
  const [nome, setNome] = useState("");
  const [pronuncia, setPronuncia] = useState("");
  const [lote, setLote] = useState(false);
  const [loteTexto, setLoteTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  const grupos = useMemo(() => agruparCortejo(pessoas, tipo), [pessoas, tipo]);
  const nomesDoLote = loteTexto
    .split(/\r?\n/)
    .map((n) => n.trim())
    .filter(Boolean);

  function rodar(fn: () => Promise<{ error?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) setErro(r.error);
      else router.refresh();
    });
  }

  function adicionar() {
    if (!nome.trim()) return;
    rodar(async () => {
      const r = await adicionarPessoasEquipe(eventId, papel, [nome], pronuncia);
      if (!r.error) {
        setNome("");
        setPronuncia("");
      }
      return r;
    });
  }

  function adicionarLote() {
    if (nomesDoLote.length === 0) return;
    rodar(async () => {
      const r = await adicionarPessoasEquipe(eventId, papel, nomesDoLote);
      if (!r.error) {
        setLoteTexto("");
        setLote(false);
      }
      return r;
    });
  }

  function mover(g: { papel: string; pessoas: PessoaCortejo[] }, idx: number, delta: -1 | 1) {
    const alvo = idx + delta;
    if (alvo < 0 || alvo >= g.pessoas.length) return;
    const ids = g.pessoas.map((p) => p.id);
    [ids[idx], ids[alvo]] = [ids[alvo], ids[idx]];
    rodar(() => reordenarPapelEquipe(eventId, g.papel, ids));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {ehFormatura ? "Papéis e chamada" : "Cortejo"}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {ehFormatura
              ? "Formandos na ordem de entrada, mesa de honra e quem discursa."
              : "Quem entra, na ordem de entrada."}
          </p>
        </div>
        <a
          href={`/imprimir/chamada/${printEventId ?? eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-700 transition-colors hover:bg-stone-50"
        >
          <Printer size={15} />
          {ehFormatura ? "Imprimir a chamada" : "Imprimir a ordem de entrada"}
        </a>
      </div>

      {/* adicionar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[170px_1fr_auto]">
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className={inputCls}
          >
            {papeis.map((p) => (
              <option key={p} value={p}>
                {rotuloDoPapel(p)}
              </option>
            ))}
          </select>
          {lote ? (
            <div className="sm:col-span-2">
              <textarea
                value={loteTexto}
                onChange={(e) => setLoteTexto(e.target.value)}
                rows={6}
                autoFocus
                placeholder={"Cole a lista — um nome por linha.\nMaria Souza\nJoão Pereira"}
                className={inputCls}
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={adicionarLote}
                  disabled={pendente || nomesDoLote.length === 0}
                  className="rounded-[9px] bg-[#17162A] px-3.5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {nomesDoLote.length > 1
                    ? `Adicionar ${nomesDoLote.length} nomes`
                    : "Adicionar"}
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
            <>
              <div className="flex gap-3">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionar()}
                  placeholder="Nome"
                  className={inputCls}
                />
                {ehFormatura && (
                  <input
                    value={pronuncia}
                    onChange={(e) => setPronuncia(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && adicionar()}
                    placeholder="Pronúncia (opcional)"
                    className={inputCls}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={adicionar}
                  disabled={pendente || !nome.trim()}
                  className="rounded-[9px] bg-[#17162A] px-3.5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setLote(true)}
                  className="flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <ClipboardList size={15} /> Colar lista
                </button>
              </div>
            </>
          )}
        </div>
        {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-gray-500">
          Ainda não há ninguém aqui. Adicione pelo campo acima — ou cole a
          lista inteira de uma vez.
        </p>
      ) : (
        grupos.map((g) => (
          <section key={g.papel}>
            <h3 className="text-sm font-semibold text-gray-900">
              {g.rotulo}
              <span className="ml-2 font-normal text-gray-400">
                {g.pessoas.length}
              </span>
            </h3>
            <div className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white shadow-sm">
              {g.pessoas.map((p, i) =>
                editando === p.id ? (
                  <LinhaEdicao
                    key={p.id}
                    eventId={eventId}
                    pessoa={p}
                    papeis={papeis}
                    ehFormatura={ehFormatura}
                    fechar={() => setEditando(null)}
                  />
                ) : (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-gray-400">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {p.nome}
                      </p>
                      {(p.pronuncia || p.oQueLeva || p.contato) && (
                        <p className="truncate text-xs text-gray-500">
                          {[
                            p.pronuncia && `pronúncia: ${p.pronuncia}`,
                            p.oQueLeva && `leva: ${p.oQueLeva}`,
                            p.contato,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => mover(g, i, -1)}
                        disabled={pendente || i === 0}
                        aria-label="Subir"
                        className="rounded p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        onClick={() => mover(g, i, 1)}
                        disabled={pendente || i === g.pessoas.length - 1}
                        aria-label="Descer"
                        className="rounded p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700 disabled:opacity-30"
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        onClick={() => setEditando(p.id)}
                        aria-label="Editar"
                        className="rounded p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() =>
                          rodar(() => removerPessoaEquipe(eventId, p.id))
                        }
                        disabled={pendente}
                        aria-label="Remover"
                        className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function LinhaEdicao({
  eventId,
  pessoa,
  papeis,
  ehFormatura,
  fechar,
}: {
  eventId: string;
  pessoa: PessoaCortejo;
  papeis: string[];
  ehFormatura: boolean;
  fechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({
    papel: pessoa.papel,
    nome: pessoa.nome,
    pronuncia: pessoa.pronuncia ?? "",
  });
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarPessoaEquipe(eventId, pessoa.id, form);
      if (r.error) {
        setErro(r.error);
        return;
      }
      fechar();
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 bg-stone-50 px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_1fr]">
        <select
          value={form.papel}
          onChange={(e) => setForm({ ...form, papel: e.target.value })}
          className={inputCls}
        >
          {/* papel legado fora da lista do tipo continua selecionável */}
          {(papeis.includes(form.papel) ? papeis : [form.papel, ...papeis]).map(
            (p) => (
              <option key={p} value={p}>
                {rotuloDoPapel(p)}
              </option>
            )
          )}
        </select>
        <input
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
          placeholder="Nome"
          autoFocus
          className={inputCls}
        />
        {ehFormatura && (
          <input
            value={form.pronuncia}
            onChange={(e) => setForm({ ...form, pronuncia: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder="Pronúncia"
            className={inputCls}
          />
        )}
      </div>
      {erro && <p className="text-sm text-rose-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          onClick={salvar}
          disabled={pendente || !form.nome.trim()}
          className="rounded-[9px] bg-[#17162A] px-3.5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={fechar}
          className="flex items-center gap-1 rounded-[9px] px-3 py-2 text-[13px] font-semibold text-stone-500 hover:bg-stone-100"
        >
          <X size={14} /> Cancelar
        </button>
      </div>
    </div>
  );
}
