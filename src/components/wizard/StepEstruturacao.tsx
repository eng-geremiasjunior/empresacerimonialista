"use client";

import { resolverTemplate, type WizardRespostas } from "@/lib/event-templates";

type BoolKey = Exclude<keyof WizardRespostas, "fornecedoresContratados">;

const PERGUNTAS: Record<string, { key: BoolKey; label: string }[]> = {
  casamento: [
    { key: "religiousCeremony", label: "Cerimônia religiosa?" },
    { key: "hasDanceFloor", label: "Terá pista de dança?" },
    { key: "luaDeMel", label: "Vai planejar a lua de mel? (opcional)" },
  ],
  debutante: [{ key: "cabineFotos", label: "Terá cabine de fotos?" }],
  formatura: [{ key: "colacaoNoLocal", label: "Colação de grau no local?" }],
  corporativo: [{ key: "palestrantes", label: "Terá palestrantes?" }],
  maternidade: [
    { key: "chaRevelacao", label: "É chá revelação (revelação do sexo)?" },
  ],
  religioso: [],
  outro: [],
};

type Props = {
  type: string;
  respostas: WizardRespostas;
  fornecedores: string[];
  onChange: (patch: Partial<WizardRespostas>) => void;
  onNext: () => void;
  onSkip: () => void;
};

export function StepEstruturacao({
  type,
  respostas,
  fornecedores,
  onChange,
  onNext,
  onSkip,
}: Props) {
  const perguntas = PERGUNTAS[resolverTemplate(type)] ?? [];
  const contratados = respostas.fornecedoresContratados ?? [];

  function toggleContratado(cat: string) {
    const next = contratados.includes(cat)
      ? contratados.filter((c) => c !== cat)
      : [...contratados, cat];
    onChange({ fornecedoresContratados: next });
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Configuração</h2>
          <p className="mt-1 text-sm text-stone-500">
            Perguntas que ajustam o checklist e a timeline.
          </p>
        </div>
        <button
          onClick={onSkip}
          className="shrink-0 text-sm text-stone-500 underline underline-offset-2 hover:text-stone-900"
        >
          Pular esta etapa
        </button>
      </div>

      {perguntas.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          {perguntas.map((p) => {
            const val = respostas[p.key] === true;
            return (
              <div
                key={p.key}
                className="flex items-center justify-between gap-3 py-1"
              >
                <span className="text-sm">{p.label}</span>
                <div className="flex gap-1">
                  {[
                    { v: true, t: "Sim" },
                    { v: false, t: "Não" },
                  ].map((opt) => (
                    <button
                      key={opt.t}
                      onClick={() => onChange({ [p.key]: opt.v } as Partial<WizardRespostas>)}
                      className={`rounded-lg border px-3 py-1 text-sm font-medium ${
                        (opt.v && val) || (!opt.v && respostas[p.key] === false)
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
                      }`}
                    >
                      {opt.t}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium">Fornecedores já contratados</p>
        <p className="mt-0.5 text-xs text-stone-400">
          Marque os que já estão fechados — o checklist não vai gerar
          &quot;Confirmar&quot; para eles.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {fornecedores.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={contratados.includes(cat)}
                onChange={() => toggleContratado(cat)}
                className="h-4 w-4"
              />
              {cat}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={onNext}
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          Revisar checklist →
        </button>
      </div>
    </div>
  );
}
