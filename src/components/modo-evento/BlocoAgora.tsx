"use client";

// Bloco "AGORA" do Modo Evento (centro de comando): relógio ao vivo, as
// atividades mais recentes do log dos fornecedores (tempo relativo),
// próxima etapa e a frase de status geral. Presentational — os dados e o
// realtime vêm do ModoEvento (pai).

import { Check, Clock, Eye, MessageSquareText, Play, TriangleAlert } from "lucide-react";
import { formatTime } from "@/lib/format";
import { itemDateTime, pad2, type ModoItem, type ModoTheme } from "@/lib/modo-tema";
import { tempoRelativo, type AtividadeRecente } from "@/lib/modo-evento";

const ICONE: Record<
  string,
  { icon: typeof Play; cor: string }
> = {
  iniciado: { icon: Play, cor: "text-sky-500" },
  concluido: { icon: Check, cor: "text-emerald-500" },
  problema_reportado: { icon: TriangleAlert, cor: "text-red-500" },
  observacao_adicionada: { icon: MessageSquareText, cor: "text-stone-400" },
  visualizado: { icon: Eye, cor: "text-stone-400" },
  status_atualizado: { icon: Play, cor: "text-sky-500" },
};

function relogio(now: number) {
  const d = new Date(now);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function BlocoAgora({
  now,
  activities,
  proximo,
  eventDate,
  status,
  t,
}: {
  now: number;
  activities: AtividadeRecente[];
  proximo: ModoItem | null;
  eventDate: string;
  status: { ok: boolean; texto: string };
  t: ModoTheme;
}) {
  const feed = activities.filter((a) => a.tipo_evento !== "visualizado").slice(0, 3);

  let proximoLabel: string | null = null;
  if (proximo) {
    const dt = itemDateTime(eventDate, proximo.time);
    const diffMin = Math.round((dt - now) / 60000);
    if (!isNaN(dt)) {
      proximoLabel =
        diffMin <= 0 ? "começa agora" : `começa em ${diffMin} min`;
    } else {
      proximoLabel = "horário a definir";
    }
  }

  return (
    <div className={`rounded-2xl border p-5 ${t.panel}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-500">
          Agora
        </p>
        <p className="font-mono text-lg font-bold tabular-nums">{relogio(now)}</p>
      </div>

      {/* Feed de atividade */}
      <div className={`mt-3 divide-y ${t.divide}`}>
        {feed.length === 0 ? (
          <p className={`py-2 text-sm ${t.sub}`}>
            Sem atividade dos fornecedores ainda.
          </p>
        ) : (
          feed.map((a) => {
            const conf = ICONE[a.tipo_evento] ?? ICONE.status_atualizado;
            const Icone = conf.icon;
            return (
              <div key={a.id} className="flex items-start gap-3 py-2.5">
                <Icone size={17} className={`mt-0.5 shrink-0 ${conf.cor}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {a.descricao ?? a.tipo_evento}
                    {a.itemTitle ? (
                      <span className={t.sub}> · {a.itemTitle}</span>
                    ) : null}
                  </p>
                  <p className={`text-xs ${t.sub}`}>
                    {tempoRelativo(a.created_at, now)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Próxima etapa */}
      {proximo && (
        <div className={`mt-1 flex items-start gap-3 border-t pt-3 ${t.border}`}>
          <Clock size={17} className={`mt-0.5 shrink-0 ${t.sub}`} />
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${t.sub}`}>
              Próxima etapa
            </p>
            <p className="text-sm font-medium leading-snug">
              {proximo.title}
              {proximo.time ? (
                <span className={t.sub}> · {formatTime(proximo.time)}</span>
              ) : null}
            </p>
            {proximoLabel && (
              <p className={`text-xs ${t.sub}`}>{proximoLabel}</p>
            )}
          </div>
        </div>
      )}

      {/* Status geral */}
      <div
        className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
          status.ok
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-red-500/10 text-red-600"
        }`}
      >
        {status.ok ? (
          <Check size={15} className="shrink-0" />
        ) : (
          <TriangleAlert size={15} className="shrink-0" />
        )}
        <span className="font-medium leading-snug">{status.texto}</span>
      </div>
    </div>
  );
}
