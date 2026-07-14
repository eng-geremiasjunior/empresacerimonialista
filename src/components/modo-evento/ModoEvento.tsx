"use client";

import { useEffect, useMemo, useState } from "react";
import { setRoteiroItemDone } from "@/app/(app)/eventos/[id]/roteiro/actions";
import {
  MODO_DARK,
  MODO_LIGHT,
  type ModoItem,
  type ModoSupplier,
  type ModoTask,
} from "@/lib/modo-tema";
import { ModoEventoHeader } from "./ModoEventoHeader";
import { ProximaAtividade } from "./ProximaAtividade";
import { TimelineModoEvento } from "./TimelineModoEvento";
import { FornecedoresStatus } from "./FornecedoresStatus";
import { ChecklistRapido } from "./ChecklistRapido";

type Props = {
  eventId: string;
  eventLabel: string;
  eventDate: string;
  items: ModoItem[];
  suppliers: ModoSupplier[];
  tasks: ModoTask[];
};

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

  const nextItem = useMemo(
    () => items.find((i) => i.status !== "concluido") ?? null,
    [items]
  );

  function handleToggle(item: ModoItem) {
    const done = item.status !== "concluido";
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: done ? "concluido" : "pendente" } : i
      )
    );
    // Persiste (fire-and-forget); RLS garante que é deste evento.
    setRoteiroItemDone(eventId, item.id, done);
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${t.bg}`}>
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
          <ProximaAtividade
            item={nextItem}
            eventDate={eventDate}
            now={now}
            t={t}
          />

          <Section title="Cronograma do dia" sub={t.sub}>
            <TimelineModoEvento
              items={items}
              currentId={nextItem?.id ?? null}
              onToggle={handleToggle}
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
    </div>
  );
}
