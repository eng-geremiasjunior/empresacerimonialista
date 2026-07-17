"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Circle, MoreVertical } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { avatarPublicUrl } from "@/lib/avatar";
import { setStatusMembro } from "@/app/(app)/cerimonialistas/actions";
import {
  CARGO_BADGE,
  CARGO_LABELS,
  STATUS_MEMBRO_UI,
} from "@/lib/equipe-shared";
import type { MembroComStatus } from "@/lib/supabase/cerimonialistas";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function CerimonialistaCard({
  membro,
  souEu,
  readOnly,
  onEditar,
  onAbrirPainel,
}: {
  membro: MembroComStatus;
  souEu: boolean;
  readOnly: boolean;
  onEditar: () => void;
  onAbrirPainel: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const ui = STATUS_MEMBRO_UI[membro.statusHoje];

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  return (
    <div
      className={`flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
        membro.status === "inativo" ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={avatarPublicUrl(membro.user_id)}
          fallback={iniciais(membro.nome)}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold text-gray-900">{membro.nome}</p>
            {souEu && (
              <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Você
              </span>
            )}
          </div>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CARGO_BADGE[membro.cargo]}`}
          >
            {CARGO_LABELS[membro.cargo]}
          </span>
        </div>

        {!membro.is_owner && !readOnly && (
          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenu((v) => !v)}
              disabled={pending}
              aria-label="Ações"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60"
            >
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setMenu(false);
                    onEditar();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    startTransition(async () => {
                      await setStatusMembro(
                        membro.id,
                        membro.status === "ativo" ? "inativo" : "ativo"
                      );
                    });
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {membro.status === "ativo" ? "Desativar" : "Reativar"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status do dia */}
      <div className="mt-3 flex items-center gap-1.5">
        <Circle size={9} className={`${ui.dot} fill-current`} />
        <span className="text-sm font-medium text-gray-700">{ui.label}</span>
      </div>

      {/* Especialidades */}
      {membro.especialidades && membro.especialidades.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {membro.especialidades.map((tag) => (
            <span
              key={tag}
              className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Hoje / Próximo */}
      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
        <div>
          <span className="text-xs text-gray-400">Hoje</span>
          {membro.eventoHoje ? (
            <p className="truncate font-medium text-gray-800">
              {membro.eventoHoje.label}
            </p>
          ) : (
            <p className="text-gray-500">Sem eventos hoje</p>
          )}
        </div>
        <div>
          <span className="text-xs text-gray-400">Próximo evento</span>
          {membro.proximoEvento ? (
            <p className="truncate font-medium text-gray-800">
              {membro.proximoEvento.label}
            </p>
          ) : (
            <p className="text-gray-500">Nenhum evento agendado</p>
          )}
        </div>
      </div>

      <button
        onClick={onAbrirPainel}
        className="mt-4 w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
      >
        Ver painel completo
      </button>
    </div>
  );
}
