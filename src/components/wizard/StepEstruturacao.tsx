"use client";

import { resolverTemplate, type WizardRespostas } from "@/lib/event-templates";

type BoolKey = Exclude<
  keyof WizardRespostas,
  "fornecedoresContratados" | "cenario"
>;

const PERGUNTAS: Record<string, { key: BoolKey; label: string }[]> = {
  casamento: [
    { key: "religiousCeremony", label: "Cerimônia religiosa?" },
    { key: "hasDanceFloor", label: "Terá pista de dança?" },
    { key: "luaDeMel", label: "Vai planejar a lua de mel? (opcional)" },
  ],
  debutante: [{ key: "cabineFotos", label: "Terá cabine de fotos?" }],
  formatura: [
    { key: "colacaoJunto", label: "Colação e baile juntos (mesmo dia e local)?" },
  ],
  corporativo: [],
  maternidade: [
    { key: "chaRevelacao", label: "É chá revelação (revelação do sexo)?" },
  ],
  religioso: [],
  outro: [],
};

// O subtipo é o arquétipo do eixo cenario: as opções vêm do método do
// tipo (metodo_arquetipo), pela página. Só quem tem pergunta aparece aqui.
const PERGUNTA_CENARIO: Partial<Record<string, string>> = {
  corporativo: "Que tipo de evento é?",
};

const opcaoClass = (ativa: boolean) =>
  `rounded-lg border px-3 py-1 text-sm font-medium ${
    ativa
      ? "border-stone-900 bg-stone-900 text-white"
      : "border-stone-300 bg-white text-stone-600 hover:border-stone-500"
  }`;

type Props = {
  type: string;
  respostas: WizardRespostas;
  fornecedores: string[];
  /** opções do eixo cenario do tipo; vazio = sem a pergunta */
  cenarios: { valor: string; rotulo: string }[];
  onChange: (patch: Partial<WizardRespostas>) => void;
  onNext: () => void;
  onSkip: () => void;
  creating: boolean;
  error: string | null;
};

export function StepEstruturacao({
  type,
  respostas,
  fornecedores,
  cenarios,
  onChange,
  onNext,
  onSkip,
  creating,
  error,
}: Props) {
  const perguntas = PERGUNTAS[resolverTemplate(type)] ?? [];
  const perguntaCenario =
    cenarios.length > 0 ? PERGUNTA_CENARIO[type] : undefined;
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
          disabled={creating}
          onClick={onSkip}
          className="shrink-0 text-sm text-stone-500 underline underline-offset-2 hover:text-stone-900"
        >
          Pular esta etapa
        </button>
      </div>

      {(perguntas.length > 0 || perguntaCenario) && (
        <div className="mt-4 space-y-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          {perguntaCenario && (
            <div className="py-1">
              <span className="text-sm">{perguntaCenario}</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {cenarios.map((c) => {
                  const ativa = respostas.cenario === c.valor;
                  return (
                    <button
                      key={c.valor}
                      onClick={() =>
                        onChange({ cenario: ativa ? undefined : c.valor })
                      }
                      className={opcaoClass(ativa)}
                    >
                      {c.rotulo}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
                      className={opcaoClass(
                        (opt.v && val) || (!opt.v && respostas[p.key] === false)
                      )}
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

      <div className="mt-5 flex flex-col gap-2">
        <button
          disabled={creating}
          onClick={onNext}
          className="self-start rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {creating ? "Criando…" : "Criar evento"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
