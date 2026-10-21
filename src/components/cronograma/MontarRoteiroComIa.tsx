"use client";

// Montar o roteiro com IA (21/10/2026, T1 do plano "IA que trabalha").
// Ela traz o cronograma que já tem (Word, PDF ou texto) — ou monta pelo
// padrão dos eventos anteriores dela — e confere o PACOTE: o que entra,
// o que muda, o que pode sair. Nada entra sem o "Confirmar"; depois, dá
// para desfazer por 24 h. O arquivo é lido NO NAVEGADOR: só o texto vai.

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarcaDaIa } from "@/components/MarcaDaIa";
import { FileUp, X } from "lucide-react";
import { ACEITOS, textoDoArquivo } from "@/lib/ler-checklist";
import type { OperacaoDoRoteiro } from "@/lib/ia-roteiro";
import {
  confirmarRoteiroDaIa,
  descartarRoteiroDaIa,
  desfazerRoteiroDaIa,
} from "@/app/(app)/eventos/[id]/roteiro/ia-actions";

const primario =
  "rounded-[9px] bg-[var(--mo-destaque,#244C50)] px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const secundario =
  "flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";
const discreto = "rounded-[9px] px-3 py-2 text-[13px] font-semibold text-stone-500 hover:bg-stone-100";

type Pacote = { trabalhoId: string; operacoes: OperacaoDoRoteiro[]; conflitos: string[] };

export function MontarRoteiroComIa({
  eventId,
  semana,
  temPadrao,
  aviso,
  ultimo,
}: {
  eventId: string;
  /** o evento está perto: atalho para "Preparar a semana" */
  semana: boolean;
  /** há eventos anteriores dela, do mesmo tipo, com roteiro */
  temPadrao: boolean;
  /** "restam 30 ações…" a partir de 80% da cota */
  aviso: string | null;
  /** o último roteiro trazido, enquanto ainda dá para desfazer */
  ultimo: { trabalhoId: string; quando: string } | null;
}) {
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pacote, setPacote] = useState<Pacote | null>(null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [feito, setFeito] = useState<{ trabalhoId: string; aplicadas: number; recusadas: string[] } | null>(null);
  const [aviso2, setAviso2] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function ler(conteudo: string, rotulo: string) {
    setErro(null);
    setAviso2(null);
    setLendo(rotulo);
    try {
      const r = await fetch("/api/ai/roteiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, texto: conteudo }),
      });
      const j = (await r.json().catch(() => ({}))) as Partial<Pacote> & { error?: string; igual?: boolean };
      if (!r.ok) throw new Error(j.error ?? "A leitura não respondeu agora. Tente de novo.");
      if (j.igual || !j.trabalhoId || !j.operacoes?.length) {
        setAviso2("O roteiro já está igual a esse cronograma.");
        return;
      }
      setPacote({ trabalhoId: j.trabalhoId, operacoes: j.operacoes, conflitos: j.conflitos ?? [] });
      setMarcadas(new Set(j.operacoes.filter((o) => o.marcada).map((o) => o.chave)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler.");
    } finally {
      setLendo(null);
    }
  }

  async function escolherArquivo(f: File | undefined) {
    if (!f) return;
    setErro(null);
    try {
      setLendo(`Lendo ${f.name}…`);
      const t = await textoDoArquivo(f);
      if (t.trim().length < 10) {
        setLendo(null);
        setErro("Não achei texto nesse arquivo. Se for foto ou PDF escaneado, copie e cole os horários no campo abaixo.");
        return;
      }
      await ler(t, `Lendo ${f.name}…`);
    } catch (e) {
      setLendo(null);
      setErro(e instanceof Error ? e.message : "Não consegui abrir esse arquivo.");
    }
  }

  function alternar(chave: string) {
    const s = new Set(marcadas);
    if (s.has(chave)) s.delete(chave);
    else s.add(chave);
    setMarcadas(s);
  }

  function confirmar() {
    if (!pacote) return;
    setErro(null);
    iniciar(async () => {
      const r = await confirmarRoteiroDaIa(eventId, pacote.trabalhoId, Array.from(marcadas));
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setFeito({ trabalhoId: pacote.trabalhoId, aplicadas: r.aplicadas, recusadas: r.recusadas });
      setPacote(null);
      setAberto(false);
      setTexto("");
      router.refresh();
    });
  }

  function descartar() {
    if (pacote) void descartarRoteiroDaIa(eventId, pacote.trabalhoId);
    setPacote(null);
  }

  function desfazer(trabalhoId: string) {
    if (!window.confirm("Desfazer o que entrou do cronograma? O roteiro volta a ser o de antes.")) return;
    setErro(null);
    iniciar(async () => {
      const r = await desfazerRoteiroDaIa(eventId, trabalhoId);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setFeito(null);
      setAviso2("O roteiro voltou a ser o de antes.");
      router.refresh();
    });
  }

  const ops = pacote?.operacoes ?? [];
  // na ordem do dia, não na ordem do texto
  const entram = (ops.filter((o) => o.op === "criar") as Extract<OperacaoDoRoteiro, { op: "criar" }>[]).sort((a, b) =>
    a.horario.localeCompare(b.horario)
  );
  const mudam = (ops.filter((o) => o.op === "mudar") as Extract<OperacaoDoRoteiro, { op: "mudar" }>[]).sort((a, b) =>
    (a.depois.horario ?? "").localeCompare(b.depois.horario ?? "")
  );
  const saem = ops.filter((o) => o.op === "remover") as Extract<OperacaoDoRoteiro, { op: "remover" }>[];
  const desfazivel = feito ? { trabalhoId: feito.trabalhoId } : ultimo;

  return (
    <section className="mb-5" aria-label="Trazer o cronograma">
      {!aberto && !pacote && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAberto(true)} className={primario}>
            <span className="inline-flex items-center gap-1.5"><MarcaDaIa naCorDoTexto />Trazer o seu cronograma</span>
          </button>
          {temPadrao && (
            <button onClick={() => void ler("", "Montando pelo seu padrão…")} disabled={!!lendo} className={secundario}>
              <MarcaDaIa />
              {lendo ?? "Montar pelo seu padrão"}
            </button>
          )}
          {semana && (
            <Link href={`/eventos/${eventId}/semana`} className={secundario}>
              <MarcaDaIa />
              Preparar a semana
            </Link>
          )}
          {desfazivel && (
            <button onClick={() => desfazer(desfazivel.trabalhoId)} disabled={pendente} className={discreto}>
              Desfazer o cronograma trazido{ultimo && !feito ? ` ${ultimo.quando}` : ""}
            </button>
          )}
          {aviso && <span className="text-[12px] text-stone-500">{aviso}</span>}
        </div>
      )}

      {feito && !pacote && (
        <p className="mt-2 text-[13px] text-stone-700">
          {feito.aplicadas === 1 ? "1 horário atualizado." : `${feito.aplicadas} horários atualizados.`}
          {feito.recusadas.length > 0 && (
            <span className="mt-1 block text-[12.5px] text-[#9a3412]">
              Ficaram de fora: {feito.recusadas.join("; ")}.
            </span>
          )}
        </p>
      )}
      {aviso2 && !pacote && <p className="mt-2 text-[13px] text-stone-600">{aviso2}</p>}

      {aberto && !pacote && (
        <div className="rounded-xl border border-stone-200 bg-[#FAF8F5] p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">O cronograma que você já tem</p>
            <button onClick={() => setAberto(false)} aria-label="Fechar" className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700">
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <input
              ref={arquivo}
              type="file"
              accept={ACEITOS}
              className="hidden"
              onChange={(e) => void escolherArquivo(e.target.files?.[0])}
            />
            <button onClick={() => arquivo.current?.click()} disabled={!!lendo} className={secundario}>
              <FileUp size={15} />
              Word ou PDF
            </button>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={6}
              placeholder={"ou cole o texto aqui\n\n08:00 Montagem da decoração\n15:30 Chegada da noiva\n16:00 Cerimônia…"}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
            />
            <button onClick={() => void ler(texto, "Lendo…")} disabled={!!lendo || texto.trim().length < 10} className={primario}>
              {lendo ?? "Ler o cronograma"}
            </button>
          </div>
        </div>
      )}

      {pacote && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          {pacote.conflitos.length > 0 && (
            <ul className="mb-3 space-y-0.5 text-[13px] text-[#9a3412]">
              {pacote.conflitos.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          {entram.length > 0 && (
            <Grupo titulo={`Entram (${entram.length})`}>
              {entram.map((o) => (
                <Linha key={o.chave} marcada={marcadas.has(o.chave)} alternar={() => alternar(o.chave)}>
                  <span className="w-12 shrink-0 font-mono text-[13px] tabular-nums text-stone-700">{o.horario}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-900">
                      {o.titulo}
                      {o.fornecedorNome && <span className="text-stone-500"> · {o.fornecedorNome}</span>}
                      {o.responsavel && <span className="text-stone-500"> · {o.responsavel}</span>}
                    </span>
                    {o.origem === "padrao" ? (
                      <span className="block text-[12px] text-stone-500">do seu padrão · confirmar com a família</span>
                    ) : (
                      trechoQueAcrescenta(o.trecho, o.titulo) && <span className="block truncate text-[12px] text-stone-400">“{o.trecho}”</span>
                    )}
                  </span>
                </Linha>
              ))}
            </Grupo>
          )}

          {mudam.length > 0 && (
            <Grupo titulo={`Mudam (${mudam.length})`}>
              {mudam.map((o) => (
                <Linha key={o.chave} marcada={marcadas.has(o.chave)} alternar={() => alternar(o.chave)}>
                  <span className="w-12 shrink-0 font-mono text-[13px] tabular-nums text-stone-700">{o.depois.horario}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-900">{o.depois.titulo}</span>
                    <span className="block text-[12px] text-stone-500">
                      {[
                        o.mudou.includes("horario") && `era ${o.antes.horario ?? "sem horário"}`,
                        o.mudou.includes("titulo") && `era “${o.antes.titulo}”`,
                        o.mudou.includes("fornecedor") && o.fornecedorNome && `agora com ${o.fornecedorNome}`,
                        o.mudou.includes("descricao") && "descrição nova",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Linha>
              ))}
            </Grupo>
          )}

          {saem.length > 0 && (
            <Grupo titulo={`Estimados que não estão no cronograma (${saem.length})`}>
              {saem.map((o) => (
                <Linha key={o.chave} marcada={marcadas.has(o.chave)} alternar={() => alternar(o.chave)}>
                  <span className="w-12 shrink-0 font-mono text-[13px] tabular-nums text-stone-400">{o.antes.horario ?? "—"}</span>
                  <span className="min-w-0 flex-1 text-sm text-stone-600">
                    {o.antes.titulo}
                    <span className="block text-[12px] text-stone-400">{marcadas.has(o.chave) ? "sai do roteiro" : "fica no roteiro"}</span>
                  </span>
                </Linha>
              ))}
            </Grupo>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={confirmar} disabled={pendente || marcadas.size === 0} className={primario}>
              {pendente ? "Atualizando…" : `Confirmar ${marcadas.size} ${marcadas.size === 1 ? "item" : "itens"}`}
            </button>
            <button onClick={descartar} disabled={pendente} className={discreto}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
    </section>
  );
}

/** o trecho só aparece quando diz mais que o horário e o título já mostram */
function trechoQueAcrescenta(trecho: string | null, titulo: string): boolean {
  if (!trecho) return false;
  const limpo = (t: string) => t.toLowerCase().replace(/[^a-zà-ú0-9]+/g, " ").trim();
  const resto = limpo(trecho).replace(limpo(titulo), "").replace(/\b\d{1,2}( ?h ?| )?\d{0,2}\b/g, "").trim();
  return resto.length > 3;
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-stone-500">{titulo}</p>
      <ul className="divide-y divide-stone-100">{children}</ul>
    </div>
  );
}

function Linha({ marcada, alternar, children }: { marcada: boolean; alternar: () => void; children: ReactNode }) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 py-2">
        <input type="checkbox" checked={marcada} onChange={alternar} className="mt-1 h-4 w-4 shrink-0 accent-[var(--mo-destaque,#244C50)]" />
        {children}
      </label>
    </li>
  );
}
