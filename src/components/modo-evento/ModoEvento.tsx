"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MODO_DARK,
  MODO_LIGHT,
  type ModoItem,
  type ModoSupplier,
  type ModoTask,
} from "@/lib/modo-tema";
import type { CronogramaItem } from "@/lib/cronograma";
import {
  buscarAtividadesRecentes,
  proximoPlanejado,
  statusGeral,
  type AtividadeRecente,
} from "@/lib/modo-evento";
import { ModoEventoHeader } from "./ModoEventoHeader";
import { BlocoAgora } from "./BlocoAgora";
import { ProximaAtividade } from "./ProximaAtividade";
import { TimelineModoEvento } from "./TimelineModoEvento";
import { AcaoItemSheet } from "./AcaoItemSheet";
import { ResumoFinal } from "./ResumoFinal";
import { FornecedoresStatus } from "./FornecedoresStatus";
import { ChecklistRapido } from "./ChecklistRapido";

const POLL_MS = 15_000;

type Props = {
  eventId: string;
  eventLabel: string;
  eventDate: string;
  items: ModoItem[];
  suppliers: ModoSupplier[];
  tasks: ModoTask[];
};

function mapItem(i: CronogramaItem): ModoItem {
  return {
    id: i.id,
    time: i.time,
    title: i.title,
    description: i.description,
    statusNovo: i.status_novo,
    supplierName: i.supplier_name,
    responsavelNome: i.responsavel_nome,
    horarioRealInicio: i.horario_real_inicio,
    horarioRealFim: i.horario_real_fim,
    observacao: i.observacao,
  };
}

function Section({
  title,
  children,
  sub,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${sub}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ModoEvento({
  eventId,
  eventLabel,
  eventDate,
  items: initialItems,
  suppliers,
  tasks,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [isDark, setIsDark] = useState(true);
  const [items, setItems] = useState<ModoItem[]>(initialItems);
  const [activities, setActivities] = useState<AtividadeRecente[]>([]);
  const [selecionado, setSelecionado] = useState<ModoItem | null>(null);
  const [resumoAberto, setResumoAberto] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const semeado = useRef(false);

  const t = isDark ? MODO_DARK : MODO_LIGHT;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Tela cheia: trava o scroll do body.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Refetch de itens + atividades. Toca toast em novo problema reportado.
  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [{ data: itemsData }, ativ] = await Promise.all([
      supabase.rpc("cronograma_evento", { p_event_id: eventId }),
      buscarAtividadesRecentes(eventId, 6),
    ]);
    if (itemsData) setItems((itemsData as CronogramaItem[]).map(mapItem));

    if (!semeado.current) {
      // 1ª carga: registra o que já existe sem alertar.
      ativ.forEach((a) => seenIds.current.add(a.id));
      semeado.current = true;
    } else {
      for (const a of ativ) {
        if (!seenIds.current.has(a.id)) {
          seenIds.current.add(a.id);
          if (a.tipo_evento === "problema_reportado") {
            toast.custom(
              (tt) => (
                <div
                  className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-900 shadow-lg ${
                    tt.visible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <TriangleAlert size={18} className="mt-0.5 shrink-0 text-red-500" />
                  <span className="font-medium leading-snug">
                    {a.descricao ?? "Problema reportado"}
                    {a.itemTitle ? ` · ${a.itemTitle}` : ""}
                  </span>
                </div>
              ),
              { id: `prob-${a.id}`, duration: 8000 }
            );
          }
        }
      }
    }
    setActivities(ativ);
  }, [eventId]);

  // Realtime no log + polling de fallback (15s).
  useEffect(() => {
    refetch();
    const supabase = createClient();
    const channel = supabase
      .channel(`modo-evento-log-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "roteiro_item_log" },
        () => refetch()
      )
      .subscribe();
    const poll = setInterval(refetch, POLL_MS);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [refetch]);

  const nextItem = useMemo(
    () => items.find((i) => i.statusNovo !== "concluido") ?? null,
    [items]
  );
  const proximo = useMemo(() => proximoPlanejado(items), [items]);
  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const hoje = new Date().toISOString().slice(0, 10);
  const status = useMemo(
    () => statusGeral(items, eventDate === hoje ? nowMinutes : -1),
    [items, eventDate, hoje, nowMinutes]
  );

  const tudoConcluido =
    items.length > 0 && items.every((i) => i.statusNovo === "concluido");

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${t.bg}`}>
      <Toaster position="top-center" containerClassName="!z-[70]" />

      <ModoEventoHeader
        eventLabel={eventLabel}
        eventDate={eventDate}
        now={now}
        isDark={isDark}
        onToggleTheme={() => setIsDark((v) => !v)}
        eventId={eventId}
        t={t}
      />

      <main className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-lg">
          <BlocoAgora
            now={now}
            activities={activities}
            proximo={proximo}
            eventDate={eventDate}
            status={status}
            t={t}
          />

          {tudoConcluido && !resumoAberto && (
            <button
              onClick={() => setResumoAberto(true)}
              className="mt-4 w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              🎉 Ver resumo do evento
            </button>
          )}

          <div className="mt-4">
            <ProximaAtividade
              item={nextItem}
              eventDate={eventDate}
              now={now}
              t={t}
            />
          </div>

          <Section title="Cronograma do dia" sub={t.sub}>
            <TimelineModoEvento
              items={items}
              currentId={nextItem?.id ?? null}
              onSelect={(item) => setSelecionado(item)}
              t={t}
            />
          </Section>

          <Section title="Fornecedores" sub={t.sub}>
            <FornecedoresStatus suppliers={suppliers} t={t} />
          </Section>

          <Section title="Checklist — alta prioridade" sub={t.sub}>
            <ChecklistRapido tasks={tasks} t={t} />
          </Section>
        </div>
      </main>

      {selecionado && (
        <AcaoItemSheet
          eventId={eventId}
          item={selecionado}
          onFechar={() => setSelecionado(null)}
          onDone={refetch}
          t={t}
        />
      )}

      {resumoAberto && (
        <ResumoFinal
          eventId={eventId}
          items={items}
          activities={activities}
          onFechar={() => setResumoAberto(false)}
          t={t}
        />
      )}
    </div>
  );
}
