"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  Circle,
  Mail,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { avatarPublicUrl } from "@/lib/avatar";
import { carregarDetalhe } from "@/app/(app)/cerimonialistas/actions";
import {
  CARGO_BADGE,
  CARGO_LABELS,
  STATUS_MEMBRO_UI,
} from "@/lib/equipe-shared";
import type { MembroComStatus } from "@/lib/supabase/cerimonialistas";
import type { DetalheCerimonialista } from "@/lib/supabase/cerimonialistas";
import { formatDate } from "@/lib/format";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Metrica({
  icon: Icon,
  valor,
  label,
}: {
  icon: typeof CalendarCheck;
  valor: number;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 text-center">
      <Icon size={16} className="mx-auto text-gray-400" strokeWidth={1.75} />
      <p className="mt-1 text-lg font-semibold tabular-nums text-gray-900">
        {valor}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function PainelCerimonialista({
  membro,
  souEu,
  onClose,
}: {
  membro: MembroComStatus;
  souEu: boolean;
  onClose: () => void;
}) {
  const [detalhe, setDetalhe] = useState<DetalheCerimonialista | null>(null);
  const [carregando, setCarregando] = useState(true);
  const ui = STATUS_MEMBRO_UI[membro.statusHoje];

  useEffect(() => {
    let vivo = true;
    carregarDetalhe(membro.id).then((d) => {
      if (vivo) {
        setDetalhe(d);
        setCarregando(false);
      }
    });
    return () => {
      vivo = false;
    };
  }, [membro.id]);

  const desde = membro.created_at
    ? format(new Date(membro.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarPublicUrl(membro.user_id)}
              fallback={iniciais(membro.nome)}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {membro.nome}
                </h2>
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
              {membro.email && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={13} /> {membro.email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <Circle size={9} className={`${ui.dot} fill-current`} />
          <span className="text-sm font-medium text-gray-700">{ui.label}</span>
          {desde && (
            <span className="ml-auto text-xs text-gray-400">
              Na equipe desde {desde}
            </span>
          )}
        </div>

        {membro.especialidades && membro.especialidades.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
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

        {carregando ? (
          <p className="mt-6 text-sm text-gray-500">Carregando dados…</p>
        ) : detalhe ? (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Metrica
                icon={CalendarCheck}
                valor={detalhe.ativos}
                label="Eventos ativos"
              />
              <Metrica
                icon={CalendarCheck}
                valor={detalhe.concluidos}
                label="Concluídos"
              />
              <Metrica
                icon={CheckSquare}
                valor={detalhe.tarefasPendentes}
                label="Tarefas pendentes"
              />
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Hoje
              </h3>
              {detalhe.eventoHoje ? (
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {detalhe.eventoHoje.label}
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Sem eventos hoje</p>
              )}
            </div>

            <div className="mt-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <CalendarClock size={13} /> Próximos eventos
              </h3>
              {detalhe.proximosEventos.length === 0 ? (
                <p className="mt-1 text-sm text-gray-500">
                  Nenhum evento agendado
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {detalhe.proximosEventos.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium text-gray-800">
                        {ev.label}
                      </span>
                      <span className="shrink-0 text-gray-500">
                        {formatDate(ev.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-gray-500">
            Não foi possível carregar os dados.
          </p>
        )}
      </div>
    </div>
  );
}
