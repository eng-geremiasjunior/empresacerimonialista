"use client";

// Ajuste do checklist do dia — a operação interna dela, ao lado do
// documento público. Aqui ela prepara; no Modo Evento ela risca.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus } from "lucide-react";
import {
  criarItemChecklist,
  editarItemChecklist,
  esconderItemChecklist,
} from "@/app/(app)/eventos/[id]/roteiro/checklist-actions";

export type ItemChecklistAjuste = {
  id: string;
  bloco: "montagem" | "colacao" | "cerimonia" | "recepcao" | "desmontagem";
  titulo: string;
  ordem: number;
  horario: string | null;
  ativo: boolean;
  templateId: string | null;
  responsavelMembroId: string | null;
};

export type MembroDaEquipe = { id: string; nome: string };

const BLOCOS: { key: ItemChecklistAjuste["bloco"]; label: string }[] = [
  { key: "montagem", label: "Montagem" },
  { key: "colacao", label: "Colação" },
  { key: "cerimonia", label: "Cerimônia" },
  { key: "recepcao", label: "Recepção" },
  { key: "desmontagem", label: "Desmontagem" },
];

export function ChecklistDoDiaAjuste({
  eventId,
  itens,
  membros,
}: {
  eventId: string;
  itens: ItemChecklistAjuste[];
  membros: MembroDaEquipe[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarEscondidos, setMostrarEscondidos] = useState(false);

  const porBloco = useMemo(() => {
    const m = new Map<string, ItemChecklistAjuste[]>();
    for (const b of BLOCOS) m.set(b.key, []);
    for (const i of itens) m.get(i.bloco)?.push(i);
    for (const lista of m.values()) lista.sort((a, b) => a.ordem - b.ordem);
    return m;
  }, [itens]);

  const escondidos = itens.filter((i) => !i.ativo).length;

  function rodar(fn: () => Promise<{ error: string } | { success: true }>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if ("error" in r) setErro(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="mt-10 print:hidden">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-stone-900">
          Checklist do dia
        </h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
          interno
        </span>
        {escondidos > 0 && (
          <button
            onClick={() => setMostrarEscondidos((v) => !v)}
            className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600"
          >
            {mostrarEscondidos
              ? "ocultar os que não se aplicam"
              : `${escondidos} não se ${escondidos === 1 ? "aplica" : "aplicam"}`}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Só a sua equipe vê. No dia, cada bloco aparece no Modo Evento para
        riscar item por item.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {/* colacao só aparece onde foi semeado (formatura) — nos outros
            tipos seria uma seção vazia oferecendo itens de outro rito */}
        {BLOCOS.filter(
          (b) => b.key !== "colacao" || (porBloco.get("colacao")?.length ?? 0) > 0
        ).map((b) => {
          const lista = (porBloco.get(b.key) ?? []).filter(
            (i) => i.ativo || mostrarEscondidos
          );
          return (
            <BlocoAjuste
              key={b.key}
              eventId={eventId}
              bloco={b.key}
              label={b.label}
              itens={lista}
              membros={membros}
              pendente={pendente}
              rodar={rodar}
            />
          );
        })}
      </div>

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
    </section>
  );
}

function BlocoAjuste({
  eventId,
  bloco,
  label,
  itens,
  membros,
  pendente,
  rodar,
}: {
  eventId: string;
  bloco: ItemChecklistAjuste["bloco"];
  label: string;
  itens: ItemChecklistAjuste[];
  membros: MembroDaEquipe[];
  pendente: boolean;
  rodar: (fn: () => Promise<{ error: string } | { success: true }>) => void;
}) {
  const [novo, setNovo] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  function adicionar() {
    const titulo = novo.trim();
    if (!titulo) return;
    setNovo("");
    setAdicionando(false);
    rodar(() => criarItemChecklist(eventId, bloco, titulo));
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-stone-700">{label}</h3>

      <ul className="mt-3 space-y-1.5">
        {itens.length === 0 && (
          <li className="text-sm text-stone-400">Nada neste bloco.</li>
        )}
        {itens.map((i) => (
          <LinhaAjuste
            key={i.id}
            eventId={eventId}
            item={i}
            membros={membros}
            pendente={pendente}
            rodar={rodar}
          />
        ))}
      </ul>

      {adicionando ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            autoFocus
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionar();
              if (e.key === "Escape") setAdicionando(false);
            }}
            placeholder="O que conferir?"
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-stone-400 focus:outline-none"
          />
          <button
            onClick={adicionar}
            disabled={pendente}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="mt-3 flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          <Plus size={14} />
          Adicionar item
        </button>
      )}
    </div>
  );
}

function LinhaAjuste({
  eventId,
  item,
  membros,
  pendente,
  rodar,
}: {
  eventId: string;
  item: ItemChecklistAjuste;
  membros: MembroDaEquipe[];
  pendente: boolean;
  rodar: (fn: () => Promise<{ error: string } | { success: true }>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);

  function salvarTitulo() {
    setEditando(false);
    if (titulo.trim() && titulo.trim() !== item.titulo) {
      rodar(() => editarItemChecklist(eventId, item.id, { titulo }));
    } else {
      setTitulo(item.titulo);
    }
  }

  return (
    <li
      className={`group flex items-center gap-2 rounded-lg px-1 py-0.5 ${
        item.ativo ? "" : "opacity-45"
      }`}
    >
      {editando ? (
        <input
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={salvarTitulo}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvarTitulo();
            if (e.key === "Escape") {
              setTitulo(item.titulo);
              setEditando(false);
            }
          }}
          className="w-full rounded border border-stone-300 px-2 py-0.5 text-sm focus:outline-none"
        />
      ) : (
        <button
          onClick={() => item.ativo && setEditando(true)}
          className="min-w-0 flex-1 truncate text-left text-sm text-stone-700"
          title={item.titulo}
        >
          {item.titulo}
        </button>
      )}

      {item.ativo && membros.length > 0 && (
        <select
          value={item.responsavelMembroId ?? ""}
          disabled={pendente}
          onChange={(e) =>
            rodar(() =>
              editarItemChecklist(eventId, item.id, {
                responsavelMembroId: e.target.value || null,
              })
            )
          }
          aria-label="Responsável"
          className={`max-w-[110px] shrink-0 truncate rounded border-0 bg-transparent py-0.5 pr-1 text-xs focus:outline-none ${
            item.responsavelMembroId ? "text-stone-600" : "text-stone-300"
          }`}
        >
          <option value="">— quem?</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome.split(" ")[0]}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={() =>
          rodar(() => esconderItemChecklist(eventId, item.id, item.ativo))
        }
        disabled={pendente}
        title={item.ativo ? "Não se aplica neste evento" : "Voltar para a lista"}
        className="shrink-0 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:text-stone-500 disabled:opacity-30"
      >
        {item.ativo ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </li>
  );
}
