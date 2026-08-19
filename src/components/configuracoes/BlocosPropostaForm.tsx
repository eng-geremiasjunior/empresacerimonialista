"use client";

// Catálogo > Conteúdo da Proposta > blocos editáveis (101).
//
// Três seções da proposta pública — "o que está incluso", "no dia" e
// "próximos passos" — que antes eram copy fixa em código. Abre
// pré-preenchido: com o que a empresa já salvou, ou com a copy-padrão
// do template (a mesma que o casal vê enquanto nada foi salvo). O
// primeiro salvar grava no banco; dali em diante vale o que está aqui.
//
// Cada seção salva SOZINHA (substituição por seção) — salvar uma não
// mexe nas outras.

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { salvarBlocosProposta, salvarCitacaoHero } from "@/lib/proposta-config";
import type { EventType } from "@/lib/types";
import type { BlocoProposta } from "@/lib/proposta-classico-conteudo";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

const ICONES: { valor: string; rotulo: string }[] = [
  { valor: "relogio", rotulo: "Relógio" },
  { valor: "trofeu", rotulo: "Troféu" },
  { valor: "brilho", rotulo: "Brilho" },
  { valor: "coracao", rotulo: "Coração" },
  { valor: "presente", rotulo: "Presente" },
  { valor: "camera", rotulo: "Câmera" },
  { valor: "flor", rotulo: "Flor" },
  { valor: "talheres", rotulo: "Talheres" },
  { valor: "musica", rotulo: "Música" },
  { valor: "pessoas", rotulo: "Pessoas" },
];

type Linha = {
  key: string;
  icone: string | null;
  titulo: string;
  texto_curto: string;
  texto_longo: string;
};

let seq = 0;
const novaKey = () => `bloco-${++seq}-${Date.now()}`;

export function BlocosPropostaForm({
  tipoEvento,
  secao,
  inicial,
  padrao,
}: {
  tipoEvento: EventType;
  secao: "incluso" | "no_dia" | "proximos_passos";
  /** o que a empresa já salvou (vazio = nada salvo ainda) */
  inicial: {
    icone: string | null;
    titulo: string;
    texto_curto: string | null;
    texto_longo: string | null;
  }[];
  /** a copy-padrão do template — é o que o casal vê enquanto nada foi salvo */
  padrao: BlocoProposta[];
}) {
  const base = inicial.length > 0 ? inicial : padrao;
  const [linhas, setLinhas] = useState<Linha[]>(
    base.map((b) => ({
      key: novaKey(),
      icone: b.icone,
      titulo: b.titulo,
      texto_curto: b.texto_curto ?? "",
      texto_longo: b.texto_longo ?? "",
    }))
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  const usaTextos = secao !== "proximos_passos";
  const usaLongo = secao === "incluso";
  const usaIcone = secao !== "proximos_passos";

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= linhas.length) return;
    const copia = [...linhas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setLinhas(copia);
  }

  function atualizar(i: number, patch: Partial<Linha>) {
    setLinhas((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarBlocosProposta(
        tipoEvento,
        secao,
        linhas.map((l) => ({
          icone: l.icone,
          titulo: l.titulo,
          texto_curto: l.texto_curto || null,
          texto_longo: l.texto_longo || null,
        }))
      );
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    });
  }

  return (
    <div className="space-y-3">
      {inicial.length === 0 && (
        <p className="text-xs text-gray-400">
          Estes são os textos-padrão que o cliente vê hoje. Edite e salve para
          usar os seus.
        </p>
      )}

      {linhas.map((l, i) => (
        <div
          key={l.key}
          className="space-y-2 rounded-lg border border-gray-200 p-3"
        >
          <div className="flex items-center gap-2">
            {usaIcone && (
              <select
                value={l.icone ?? ""}
                onChange={(e) => atualizar(i, { icone: e.target.value || null })}
                className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                aria-label="Ícone"
              >
                <option value="">Sem ícone</option>
                {ICONES.map((ic) => (
                  <option key={ic.valor} value={ic.valor}>
                    {ic.rotulo}
                  </option>
                ))}
              </select>
            )}
            <input
              value={l.titulo}
              onChange={(e) => atualizar(i, { titulo: e.target.value })}
              placeholder="Título"
              className={inputClass}
            />
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                className="rounded p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                aria-label="Subir"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === linhas.length - 1}
                className="rounded p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                aria-label="Descer"
              >
                <ChevronDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => setLinhas((ls) => ls.filter((_, k) => k !== i))}
                className="rounded p-1.5 text-gray-400 hover:text-red-600"
                aria-label="Remover"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          {usaTextos && (
            <input
              value={l.texto_curto}
              onChange={(e) => atualizar(i, { texto_curto: e.target.value })}
              placeholder="Texto curto (aparece no cartão)"
              className={inputClass}
            />
          )}
          {usaLongo && (
            <textarea
              value={l.texto_longo}
              onChange={(e) => atualizar(i, { texto_longo: e.target.value })}
              placeholder='Texto longo (abre no "ver detalhes")'
              rows={2}
              className={inputClass}
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setLinhas((ls) => [
              ...ls,
              {
                key: novaKey(),
                icone: null,
                titulo: "",
                texto_curto: "",
                texto_longo: "",
              },
            ])
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={15} />
          Adicionar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Salvar
        </button>
        {salvo && <span className="text-sm text-emerald-600">Salvo</span>}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </div>
  );
}

/* ---------------- citação do hero ---------------- */

export function CitacaoHeroForm({
  tipoEvento,
  inicial,
  padrao,
}: {
  tipoEvento: EventType;
  inicial: string | null;
  padrao: string;
}) {
  const [texto, setTexto] = useState(inicial ?? padrao);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarCitacaoHero(tipoEvento, texto);
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        maxLength={300}
        className={inputClass}
        placeholder="A frase em itálico no topo da proposta"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Salvar
        </button>
        {salvo && <span className="text-sm text-emerald-600">Salvo</span>}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    </div>
  );
}
