"use client";

import { useMemo, useState } from "react";
import {
  CHECKLIST_GROUP_LABELS,
  type ChecklistGroup,
  type TaskDraft,
} from "@/lib/event-templates";

type FinalTask = { title: string; group: string };

type Props = {
  checklist: TaskDraft[];
  onCreate: (tasks: FinalTask[]) => void;
  creating: boolean;
  error: string | null;
};

const GROUP_ORDER: ChecklistGroup[] = [
  "documentacao",
  "fornecedores",
  "evento",
];

export function StepRevisao({ checklist, onCreate, creating, error }: Props) {
  // Todos marcados por padrão, exceto os opcionais.
  const [checked, setChecked] = useState<boolean[]>(() =>
    checklist.map((t) => !t.optional)
  );
  const [customTitle, setCustomTitle] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([]);

  const porGrupo = useMemo(() => {
    const map: Record<ChecklistGroup, { draft: TaskDraft; index: number }[]> = {
      documentacao: [],
      fornecedores: [],
      evento: [],
    };
    checklist.forEach((draft, index) => map[draft.group].push({ draft, index }));
    return map;
  }, [checklist]);

  function toggle(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  function addCustom() {
    const t = customTitle.trim();
    if (!t) return;
    setCustomItems((prev) => [...prev, t]);
    setCustomTitle("");
  }

  function criar() {
    const tasks: FinalTask[] = [];
    checklist.forEach((draft, i) => {
      if (checked[i]) tasks.push({ title: draft.title, group: draft.group });
    });
    for (const title of customItems) {
      tasks.push({ title, group: "evento" });
    }
    onCreate(tasks);
  }

  const totalSelecionado =
    checked.filter(Boolean).length + customItems.length;

  return (
    <div>
      <h2 className="text-lg font-semibold">Revisar checklist</h2>
      <p className="mt-1 text-sm text-stone-500">
        Desmarque o que não quiser criar. Você pode adicionar itens próprios.
      </p>

      <div className="mt-4 space-y-4">
        {GROUP_ORDER.map((group) => {
          const itens = porGrupo[group];
          if (itens.length === 0) return null;
          return (
            <div
              key={group}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {CHECKLIST_GROUP_LABELS[group]}
              </p>
              <ul className="space-y-1">
                {itens.map(({ draft, index }) => (
                  <li key={index}>
                    <label className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                      <input
                        type="checkbox"
                        checked={checked[index]}
                        onChange={() => toggle(index)}
                        className="h-4 w-4"
                      />
                      <span
                        className={
                          checked[index] ? "" : "text-stone-400 line-through"
                        }
                      >
                        {draft.title}
                      </span>
                      {draft.optional && (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                          opcional
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Adicionar item
          </p>
          {customItems.length > 0 && (
            <ul className="mb-2 space-y-1">
              {customItems.map((title, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
                >
                  <span>{title}</span>
                  <button
                    onClick={() =>
                      setCustomItems((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="text-stone-400 hover:text-red-600"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Item personalizado..."
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
            />
            <button
              onClick={addCustom}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:border-stone-400"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-5">
        <button
          onClick={criar}
          disabled={creating}
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {creating
            ? "Criando..."
            : `Criar evento (${totalSelecionado} tarefas)`}
        </button>
      </div>
    </div>
  );
}
