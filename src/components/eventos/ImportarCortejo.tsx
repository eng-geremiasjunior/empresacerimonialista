"use client";

// Importar o cortejo de um arquivo (01/10/2026, pedido do dono): a lista
// que ela já tem em Word, PDF, planilha ou num texto do WhatsApp. O
// arquivo é lido NO NAVEGADOR (só o texto vai ao servidor), a IA monta a
// proposta de entradas e ela confere antes de lançar — nada entra sozinho.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, X } from "lucide-react";
import { ACEITOS, textoDoArquivo } from "@/lib/ler-checklist";
import { ROTULO_DO_LADO, papelDoCortejo, quemEntra, type EntradaLida } from "@/lib/cortejo-casamento";
import { lancarCortejoLido } from "@/app/(app)/eventos/[id]/cortejo/casamento-actions";

const botaoEscuro =
  "rounded-[9px] bg-[#17162A] px-3.5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const botaoClaro =
  "flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";

export function ImportarCortejo({
  eventId,
  temEntradas,
  fechar,
}: {
  eventId: string;
  /** o cortejo já tem entradas: pergunta se acrescenta ou substitui */
  temEntradas: boolean;
  fechar: () => void;
}) {
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [lancando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [lidas, setLidas] = useState<EntradaLida[] | null>(null);

  async function ler(conteudo: string) {
    setErro(null);
    setLendo(true);
    try {
      const r = await fetch("/api/ai/cortejo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, texto: conteudo }),
      });
      const j = (await r.json().catch(() => ({}))) as { entradas?: EntradaLida[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "A leitura não respondeu agora. Tente de novo.");
      if (!j.entradas?.length) throw new Error("Não encontrei nenhuma entrada de cortejo nesse texto.");
      setLidas(j.entradas);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler.");
    } finally {
      setLendo(false);
    }
  }

  async function escolherArquivo(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setNomeDoArquivo(f.name);
    try {
      const t = await textoDoArquivo(f);
      if (t.trim().length < 10) {
        setErro("Não achei texto nesse arquivo. Se for foto ou PDF escaneado, copie e cole os nomes no campo abaixo.");
        return;
      }
      await ler(t);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui abrir esse arquivo.");
    }
  }

  function lancar(modo: "acrescentar" | "substituir") {
    if (!lidas?.length) return;
    if (modo === "substituir" && !window.confirm("Trocar o cortejo inteiro pelo que foi lido? As entradas de agora saem.")) {
      return;
    }
    setErro(null);
    iniciar(async () => {
      const r = await lancarCortejoLido(eventId, lidas, modo);
      if (r.error) {
        setErro(r.error);
        return;
      }
      router.refresh();
      fechar();
    });
  }

  return (
    <div className="rounded-xl border border-stone-300 bg-[#FAF8F5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Importar o cortejo</p>
          <p className="mt-0.5 text-[13px] text-gray-600">
            Word, PDF, planilha ou o texto do WhatsApp. Você confere antes de lançar.
          </p>
        </div>
        <button onClick={fechar} aria-label="Fechar" className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700">
          <X size={16} />
        </button>
      </div>

      {!lidas && (
        <div className="mt-3 space-y-3">
          <input
            ref={arquivo}
            type="file"
            accept={ACEITOS}
            className="hidden"
            onChange={(e) => void escolherArquivo(e.target.files?.[0])}
          />
          <button onClick={() => arquivo.current?.click()} disabled={lendo} className={botaoClaro}>
            <FileUp size={15} />
            {nomeDoArquivo && lendo ? `Lendo ${nomeDoArquivo}…` : "Escolher o arquivo"}
          </button>
          <div>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={5}
              placeholder={"ou cole o texto aqui\n\n1. Celebrante — Padre Antônio\n2. Noivo com a mãe, Dona Rosa\n3. Padrinhos: Ana e Pedro, Carla e Rafael…"}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200"
            />
            <button onClick={() => void ler(texto)} disabled={lendo || texto.trim().length < 10} className={`${botaoEscuro} mt-2`}>
              {lendo && !nomeDoArquivo ? "Lendo…" : "Ler o texto"}
            </button>
          </div>
        </div>
      )}

      {lidas && (
        <div className="mt-3">
          <p className="text-[13px] text-gray-700">
            Encontrei <b>{lidas.length}</b> {lidas.length === 1 ? "entrada" : "entradas"}. Tire o que não for do cortejo:
          </p>
          <ol className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
            {lidas.map((e, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2">
                <span className="w-5 text-right text-xs tabular-nums text-stone-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    {papelDoCortejo(e.papel).rotulo}
                    {e.lado ? <span className="font-normal normal-case tracking-normal"> · {ROTULO_DO_LADO[e.lado]}</span> : null}
                  </p>
                  <p className="truncate text-sm font-medium text-gray-900">{quemEntra(e)}</p>
                  {(e.musica || e.observacao) && (
                    <p className="truncate text-xs text-gray-500">
                      {[e.musica && `♪ ${e.musica}`, e.observacao && `obs.: ${e.observacao}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setLidas(lidas.filter((_, j) => j !== i))}
                  aria-label="Tirar"
                  className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {temEntradas ? (
              <>
                <button onClick={() => lancar("acrescentar")} disabled={lancando || !lidas.length} className={botaoEscuro}>
                  {lancando ? "Lançando…" : "Acrescentar ao cortejo"}
                </button>
                <button onClick={() => lancar("substituir")} disabled={lancando || !lidas.length} className={botaoClaro}>
                  Substituir o cortejo inteiro
                </button>
              </>
            ) : (
              <button onClick={() => lancar("acrescentar")} disabled={lancando || !lidas.length} className={botaoEscuro}>
                {lancando ? "Lançando…" : `Lançar ${lidas.length} ${lidas.length === 1 ? "entrada" : "entradas"}`}
              </button>
            )}
            <button
              onClick={() => {
                setLidas(null);
                setNomeDoArquivo(null);
              }}
              className="rounded-[9px] px-3 py-2.5 text-[13px] font-semibold text-stone-500 hover:bg-stone-100"
            >
              Ler outro
            </button>
          </div>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
    </div>
  );
}
