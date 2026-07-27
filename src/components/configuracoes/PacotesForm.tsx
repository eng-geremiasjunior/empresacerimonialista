"use client";

// Configurações > Proposta > Pacotes.
// Cada pacote tem nome, preço, o que inclui e o que NÃO inclui — a
// proposta mostra os dois lados, porque é a ausência que faz o casal
// subir de pacote.

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Star, Trash2 } from "lucide-react";
import { salvarPacotes, type PacoteEntrada } from "@/lib/proposta-config";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none";

type Linha = PacoteEntrada & { key: string };

let seq = 0;
const novaKey = () => `pac-${++seq}-${Date.now()}`;

export function PacotesForm({
  inicial,
}: {
  inicial: {
    nome: string;
    subtitulo: string | null;
    preco: number;
    inclui: string[];
    nao_inclui: string[];
    recomendado: boolean;
    ativo: boolean;
  }[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(
    inicial.map((p) => ({
      key: novaKey(),
      nome: p.nome,
      subtitulo: p.subtitulo ?? "",
      preco: String(p.preco ?? ""),
      inclui: (p.inclui ?? []).join("\n"),
      naoInclui: (p.nao_inclui ?? []).join("\n"),
      recomendado: p.recomendado,
      ativo: p.ativo,
    }))
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  function alterar(key: string, campo: keyof Linha, valor: string | boolean) {
    setLinhas((prev) =>
      prev.map((x) => {
        if (x.key !== key) {
          // só um recomendado por vez
          return campo === "recomendado" && valor === true
            ? { ...x, recomendado: false }
            : x;
        }
        return { ...x, [campo]: valor };
      })
    );
  }

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= linhas.length) return;
    const copia = [...linhas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setLinhas(copia);
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const res = await salvarPacotes(
        linhas.map(({ key, ...resto }) => resto)
      );
      if ("error" in res) return setErro(res.error);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    });
  }

  return (
    <div className="space-y-3">
      {linhas.length === 0 && (
        <p className="text-sm text-gray-400">
          Nenhum pacote cadastrado. A proposta só mostra a calculadora
          quando houver ao menos um.
        </p>
      )}

      {linhas.map((l, i) => (
        <div
          key={l.key}
          className={`rounded-lg border p-3 ${
            l.ativo ? "border-gray-200 bg-gray-50/60" : "border-gray-200 bg-gray-100/60 opacity-70"
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
                <input
                  value={l.nome}
                  onChange={(e) => alterar(l.key, "nome", e.target.value)}
                  placeholder="Nome (ex.: Completa)"
                  className={inputClass}
                />
                <input
                  value={l.subtitulo}
                  onChange={(e) => alterar(l.key, "subtitulo", e.target.value)}
                  placeholder="Subtítulo (ex.: Mais escolhido)"
                  className={inputClass}
                />
                <input
                  value={l.preco}
                  onChange={(e) => alterar(l.key, "preco", e.target.value)}
                  inputMode="decimal"
                  placeholder="2500"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    O que inclui — um por linha
                  </label>
                  <textarea
                    value={l.inclui}
                    onChange={(e) => alterar(l.key, "inclui", e.target.value)}
                    rows={4}
                    placeholder={"Assessoria completa 6 meses\nVisitas técnicas ilimitadas"}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    O que NÃO inclui — um por linha
                  </label>
                  <textarea
                    value={l.naoInclui}
                    onChange={(e) => alterar(l.key, "naoInclui", e.target.value)}
                    rows={4}
                    placeholder={"Ensaio pré-wedding\nAssessoria lua de mel"}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={l.recomendado}
                    onChange={(e) => alterar(l.key, "recomendado", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                  />
                  <Star size={13} /> Destacar como mais escolhido
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={l.ativo}
                    onChange={(e) => alterar(l.key, "ativo", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                  />
                  Exibir na proposta
                </label>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-1">
              <button
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label="Mover para cima"
                className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => mover(i, 1)}
                disabled={i === linhas.length - 1}
                aria-label="Mover para baixo"
                className="rounded p-1 text-gray-400 hover:bg-white hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => setLinhas((p) => p.filter((x) => x.key !== l.key))}
                aria-label="Remover pacote"
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            setLinhas((p) => [
              ...p,
              {
                key: novaKey(),
                nome: "",
                subtitulo: "",
                preco: "",
                inclui: "",
                naoInclui: "",
                recomendado: false,
                ativo: true,
              },
            ])
          }
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          <Plus size={15} /> Adicionar pacote
        </button>
        <button
          onClick={salvar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar pacotes"}
        </button>
        {salvo && <span className="text-sm font-medium text-emerald-600">Salvo!</span>}
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>

      <p className="text-xs text-gray-400">
        Alterar preço aqui não muda propostas já aceitas — o aceite guarda o
        valor assinado.
      </p>
    </div>
  );
}
