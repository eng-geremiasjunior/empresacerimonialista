"use client";

// Container do Painel de Equipe (Etapa 5): busca + filtros (cargo/status),
// grid de cards, modais de cadastro/edição e painel de detalhe.

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { CerimonialistaCard } from "@/components/cerimonialistas/CerimonialistaCard";
import { PainelCerimonialista } from "@/components/cerimonialistas/PainelCerimonialista";
import { CadastrarCerimonialistaModal } from "@/components/cerimonialistas/CadastrarCerimonialistaModal";
import {
  CARGO_LABELS,
  type Cargo,
  type MembroEquipe,
} from "@/lib/equipe-shared";
import type { MembroComStatus } from "@/lib/supabase/cerimonialistas";

const CARGO_CHIPS: (Cargo | "todos")[] = [
  "todos",
  "proprietaria",
  "coordenadora",
  "cerimonialista",
  "assistente",
];

export function EquipePainel({
  equipe,
  currentUserId,
  readOnly,
}: {
  equipe: MembroComStatus[];
  currentUserId: string | null;
  readOnly: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [cargoFiltro, setCargoFiltro] = useState<Cargo | "todos">("todos");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ativo" | "inativo">(
    "todos"
  );
  const [cadastrando, setCadastrando] = useState(false);
  const [editando, setEditando] = useState<MembroEquipe | null>(null);
  const [painel, setPainel] = useState<MembroComStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return equipe.filter((m) => {
      if (q && !m.nome.toLowerCase().includes(q)) return false;
      if (cargoFiltro !== "todos" && m.cargo !== cargoFiltro) return false;
      if (statusFiltro !== "todos" && m.status !== statusFiltro) return false;
      return true;
    });
  }, [equipe, busca, cargoFiltro, statusFiltro]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        {!readOnly && (
          <button
            onClick={() => setCadastrando(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Plus size={15} />
            Cadastrar cerimonialista
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CARGO_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => setCargoFiltro(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              cargoFiltro === c
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {c === "todos" ? "Todos" : CARGO_LABELS[c]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        {(["todos", "ativo", "inativo"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFiltro(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFiltro === s
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {s === "todos" ? "Todos os status" : s === "ativo" ? "Ativo" : "Inativo"}
          </button>
        ))}
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Nenhuma cerimonialista encontrada com estes filtros.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((m) => (
            <CerimonialistaCard
              key={m.id}
              membro={m}
              souEu={m.user_id === currentUserId}
              readOnly={readOnly}
              onEditar={() => setEditando(m)}
              onAbrirPainel={() => setPainel(m)}
            />
          ))}
        </div>
      )}

      {cadastrando && (
        <CadastrarCerimonialistaModal
          onClose={() => setCadastrando(false)}
          onSuccess={setMsg}
        />
      )}
      {editando && (
        <CadastrarCerimonialistaModal
          editar={editando}
          onClose={() => setEditando(null)}
          onSuccess={setMsg}
        />
      )}
      {painel && (
        <PainelCerimonialista
          membro={painel}
          souEu={painel.user_id === currentUserId}
          onClose={() => setPainel(null)}
        />
      )}
    </div>
  );
}
