"use client";

// Tabela da equipe: proprietária sempre no topo (badge "Você"), menu de
// ações com Editar e Desativar/Reativar (sem exclusão permanente, para
// preservar o histórico de eventos vinculados).

import { useEffect, useRef, useState, useTransition } from "react";
import { MoreVertical, Plus, UserRound } from "lucide-react";
import { CadastrarCerimonialistaModal } from "@/components/cerimonialistas/CadastrarCerimonialistaModal";
import { setStatusMembro } from "@/app/(app)/cerimonialistas/actions";
import {
  CARGO_BADGE,
  CARGO_LABELS,
  type MembroEquipe,
} from "@/lib/equipe-shared";

function MenuAcoes({
  membro,
  onEditar,
}: {
  membro: MembroEquipe;
  onEditar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  function toggleStatus() {
    setAberto(false);
    startTransition(async () => {
      await setStatusMembro(
        membro.id,
        membro.status === "ativo" ? "inativo" : "ativo"
      );
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={pending}
        aria-label="Ações"
        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
      >
        <MoreVertical size={16} />
      </button>
      {aberto && (
        <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              setAberto(false);
              onEditar();
            }}
            className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Editar
          </button>
          <button
            onClick={toggleStatus}
            className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {membro.status === "ativo" ? "Desativar" : "Reativar"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CerimonialistasTable({
  membros,
  currentUserId,
}: {
  membros: MembroEquipe[];
  currentUserId: string | null;
}) {
  const [cadastrando, setCadastrando] = useState(false);
  const [editando, setEditando] = useState<MembroEquipe | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setCadastrando(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <Plus size={15} />
          Cadastrar cerimonialista
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Especialidades</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {membros.map((m) => {
              const souEu = m.user_id === currentUserId;
              return (
                <tr key={m.id} className={m.status === "inativo" ? "opacity-60" : ""}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        <UserRound size={15} strokeWidth={1.75} />
                      </span>
                      <span className="font-medium text-gray-900">{m.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{m.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CARGO_BADGE[m.cargo]}`}
                      >
                        {CARGO_LABELS[m.cargo]}
                      </span>
                      {souEu && (
                        <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Você
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.especialidades?.length ? (
                      <span className="flex flex-wrap gap-1">
                        {m.especialidades.map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.status === "ativo"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {m.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {m.is_owner ? (
                        <span className="pr-1.5 text-xs text-gray-400">—</span>
                      ) : (
                        <MenuAcoes
                          membro={m}
                          onEditar={() => setEditando(m)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
