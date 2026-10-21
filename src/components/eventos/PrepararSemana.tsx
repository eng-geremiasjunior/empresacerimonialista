"use client";

// Preparar a semana do evento (21/10/2026, T2 do plano "IA que trabalha").
// O pacote: a mensagem de cada fornecedor e a da família (ela edita, abre
// no WhatsApp e manda — nada sai sozinho), as tarefas que faltam (entram
// com um clique e se desfazem por 24 h), as parcelas e as folhas.

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { linkCompartilharWhatsapp, linkWhatsapp } from "@/lib/whatsapp-link";
import { dataBR, type PacoteDaSemana } from "@/lib/ia-semana";
import { marcarRoteiroEnviado } from "@/app/(app)/eventos/[id]/roteiro/envio-actions";
import { criarTarefasDaSemana, desfazerTarefasDaSemana } from "@/app/(app)/eventos/[id]/semana/ia-actions";

const primario =
  "rounded-[9px] bg-[var(--mo-destaque,#244C50)] px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const secundario =
  "rounded-[9px] border border-stone-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";
const discreto = "rounded-[9px] px-3 py-2 text-[13px] font-semibold text-stone-500 hover:bg-stone-100";

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Inicial = { trabalhoId: string; pacote: PacoteDaSemana; criadas: number | null; desfazivel: boolean } | null;

export function PrepararSemana({ eventId, dias, aviso, inicial }: { eventId: string; dias: number; aviso: string | null; inicial: Inicial }) {
  const router = useRouter();
  const [trabalhoId, setTrabalhoId] = useState(inicial?.trabalhoId ?? null);
  const [pacote, setPacote] = useState<PacoteDaSemana | null>(inicial?.pacote ?? null);
  const [textos, setTextos] = useState<Record<string, string>>(() =>
    Object.fromEntries((inicial?.pacote.mensagens ?? []).map((m) => [m.chave, m.texto]))
  );
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [vendo, setVendo] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(
    () => new Set((inicial?.pacote.tarefas ?? []).filter((t) => t.marcada).map((t) => t.chave))
  );
  const [criadas, setCriadas] = useState<number | null>(inicial?.criadas ?? null);
  const [desfazivel, setDesfazivel] = useState(inicial?.desfazivel ?? false);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function preparar() {
    setErro(null);
    setLendo(true);
    try {
      const r = await fetch("/api/ai/semana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const j = (await r.json().catch(() => ({}))) as { trabalhoId?: string; pacote?: PacoteDaSemana; error?: string };
      if (!r.ok || !j.pacote || !j.trabalhoId) throw new Error(j.error ?? "Não foi possível preparar agora. Tente de novo.");
      setTrabalhoId(j.trabalhoId);
      setPacote(j.pacote);
      setTextos(Object.fromEntries(j.pacote.mensagens.map((m) => [m.chave, m.texto])));
      setMarcadas(new Set(j.pacote.tarefas.filter((t) => t.marcada).map((t) => t.chave)));
      setAbertas(new Set());
      setCriadas(null);
      setDesfazivel(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível preparar agora.");
    } finally {
      setLendo(false);
    }
  }

  function abrir(chave: string, telefone: string | null, supplierId: string | null) {
    const texto = textos[chave] ?? "";
    const url = linkWhatsapp(telefone, texto) ?? linkCompartilharWhatsapp(texto);
    window.open(url, "_blank", "noopener");
    setAbertas(new Set(abertas).add(chave));
    if (supplierId) void marcarRoteiroEnviado(eventId, supplierId);
  }

  async function copiar(chave: string) {
    await navigator.clipboard.writeText(textos[chave] ?? "");
    setAbertas(new Set(abertas).add(chave));
  }

  function alternar(chave: string) {
    const s = new Set(marcadas);
    if (s.has(chave)) s.delete(chave);
    else s.add(chave);
    setMarcadas(s);
  }

  function criar() {
    if (!trabalhoId) return;
    setErro(null);
    iniciar(async () => {
      const r = await criarTarefasDaSemana(eventId, trabalhoId, Array.from(marcadas));
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setCriadas(r.criadas);
      setDesfazivel(true);
      router.refresh();
    });
  }

  function desfazer() {
    if (!trabalhoId) return;
    setErro(null);
    iniciar(async () => {
      const r = await desfazerTarefasDaSemana(eventId, trabalhoId);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setCriadas(null);
      setDesfazivel(false);
      setPacote(null);
      setTrabalhoId(null);
      router.refresh();
    });
  }

  const quando = dias > 1 ? `faltam ${dias} dias` : dias === 1 ? "é amanhã" : dias === 0 ? "é hoje" : "já passou";

  return (
    <div className="mx-auto max-w-[880px] pb-12">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-gray-900">Preparar a semana</h1>
          <p className="text-[13px] text-stone-500">{quando}</p>
        </div>
        <div className="flex items-center gap-2">
          {aviso && <span className="text-[12px] text-stone-500">{aviso}</span>}
          {pacote ? (
            <button onClick={() => void preparar()} disabled={lendo || pendente} className={discreto}>
              {lendo ? "Preparando…" : "Preparar de novo"}
            </button>
          ) : null}
        </div>
      </header>

      {!pacote && (
        <button onClick={() => void preparar()} disabled={lendo} className={primario}>
          {lendo ? "Preparando…" : "Preparar agora"}
        </button>
      )}

      {pacote && (
        <div className="space-y-8">
          {pacote.mensagens.length > 0 && (
            <Secao titulo="Mensagens">
              <ul className="divide-y divide-stone-100">
                {pacote.mensagens.map((m) => (
                  <li key={m.chave} className="py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setVendo(vendo === m.chave ? null : m.chave)}
                        aria-expanded={vendo === m.chave}
                        className="text-left text-sm font-semibold text-gray-900 hover:underline"
                      >
                        {m.para}
                        {m.supplierId && (
                          <span className={`ml-2 text-[12px] font-normal ${m.confirmado ? "text-stone-500" : "text-[#9a3412]"}`}>
                            {m.confirmado ? "confirmou" : "ainda não confirmou"}
                          </span>
                        )}
                        {!m.supplierId && <span className="ml-2 text-[12px] font-normal text-stone-500">família</span>}
                        <span className="ml-2 text-[12px] font-normal text-stone-400">{vendo === m.chave ? "fechar" : "ver a mensagem"}</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        {abertas.has(m.chave) && <span className="text-[12px] text-stone-500">aberta</span>}
                        <button onClick={() => void copiar(m.chave)} className={secundario}>
                          Copiar
                        </button>
                        <button onClick={() => abrir(m.chave, m.telefone, m.supplierId)} className={secundario}>
                          {m.telefone ? "Abrir no WhatsApp" : "Escolher no WhatsApp"}
                        </button>
                      </div>
                    </div>
                    {vendo === m.chave && (
                    <textarea
                      value={textos[m.chave] ?? ""}
                      onChange={(e) => setTextos({ ...textos, [m.chave]: e.target.value })}
                      rows={Math.min(12, Math.max(4, (textos[m.chave] ?? "").split("\n").length + 1))}
                      className="mt-2 w-full rounded-lg border border-stone-200 bg-[#FAF8F5] px-3 py-2 text-[13px] leading-relaxed text-gray-800 focus:border-stone-400 focus:outline-none"
                    />
                    )}
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {(pacote.tarefas.length > 0 || criadas !== null) && (
            <Secao titulo="Tarefas até a festa">
              {criadas !== null ? (
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-stone-700">
                  {criadas === 1 ? "1 tarefa criada." : `${criadas} tarefas criadas.`}
                  <Link href={`/eventos/${eventId}/organizacao`} className="font-semibold text-[var(--mo-destaque,#244C50)] hover:underline">
                    Ver na Organização
                  </Link>
                  {desfazivel && (
                    <button onClick={desfazer} disabled={pendente} className={discreto}>
                      Desfazer
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-stone-100">
                    {pacote.tarefas.map((t) => (
                      <li key={t.chave}>
                        <label className="flex cursor-pointer items-center gap-3 py-2">
                          <input
                            type="checkbox"
                            checked={marcadas.has(t.chave)}
                            onChange={() => alternar(t.chave)}
                            className="h-4 w-4 shrink-0 accent-[var(--mo-destaque,#244C50)]"
                          />
                          <span className="min-w-0 flex-1 text-sm text-gray-900">{t.titulo}</span>
                          <span className="font-mono text-[12.5px] tabular-nums text-stone-500">até {dataBR(t.prazo)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button onClick={criar} disabled={pendente || marcadas.size === 0} className={`${primario} mt-3`}>
                    {pendente ? "Criando…" : `Criar ${marcadas.size} ${marcadas.size === 1 ? "tarefa" : "tarefas"}`}
                  </button>
                </>
              )}
            </Secao>
          )}

          {pacote.parcelas.length > 0 && (
            <Secao titulo="Parcelas até a festa">
              <ul className="divide-y divide-stone-100">
                {pacote.parcelas.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-[12px] text-stone-500">{p.tipo === "receber" ? "receber" : "pagar"}</span>
                    <span className="min-w-0 flex-1 truncate text-gray-900">{p.descricao}</span>
                    <span className="font-mono text-[12.5px] tabular-nums text-gray-800">{reais(p.valor)}</span>
                    <span className={`w-24 text-right text-[12px] ${p.vencida ? "text-[#9a3412]" : "text-stone-500"}`}>
                      {p.vencimento ? `${p.vencida ? "venceu" : "vence"} ${dataBR(p.vencimento)}` : "sem data"}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={`/eventos/${eventId}/financeiro`} className="mt-2 inline-block text-[13px] font-semibold text-[var(--mo-destaque,#244C50)] hover:underline">
                Abrir o Financeiro
              </Link>
            </Secao>
          )}

          {pacote.rsvp.aguardando > 0 && (
            <p className="text-[13px] text-stone-600">
              {pacote.rsvp.aguardando === 1 ? "1 convidado ainda não respondeu" : `${pacote.rsvp.aguardando} convidados ainda não responderam`}
              {" · "}
              {pacote.rsvp.confirmados} confirmados.{" "}
              <Link href={`/eventos/${eventId}/rsvp`} className="font-semibold text-[var(--mo-destaque,#244C50)] hover:underline">
                Ver a lista
              </Link>
            </p>
          )}

          <Secao titulo="Folhas para imprimir">
            <div className="flex flex-wrap gap-2">
              <a href={`/imprimir/roteiro/${eventId}`} target="_blank" rel="noopener" className={secundario}>
                Roteiro do dia
              </a>
              <a href={`/imprimir/evento/${eventId}`} target="_blank" rel="noopener" className={secundario}>
                Panorama do evento
              </a>
              <a href={`/imprimir/mesas/${eventId}`} target="_blank" rel="noopener" className={secundario}>
                Mesas
              </a>
            </div>
          </Secao>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-stone-500">{titulo}</h2>
      {children}
    </section>
  );
}
