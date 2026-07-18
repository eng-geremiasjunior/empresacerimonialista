"use client";

// Aba Cronograma (lado da cerimonialista) — timeline dinâmica com item
// atual em destaque, painel lateral (progresso, próximos, alertas, ações)
// e cálculo real de antecipação/atraso. Reflete o estado alimentado pelos
// fornecedores (Etapa 2) via polling leve.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import {
  createRoteiroItem,
  updateRoteiroItem,
  deleteRoteiroItem,
} from "@/app/(app)/eventos/[id]/roteiro/actions";
import { RoteiroForm } from "@/components/RoteiroForm";
import { ItemTimelineExpandido } from "@/components/cronograma/ItemTimelineExpandido";
import { ItemTimelineCompacto } from "@/components/cronograma/ItemTimelineCompacto";
import { HistoricoItemModal } from "@/components/cronograma/HistoricoItemModal";
import { AtualizarStatusModal } from "@/components/cronograma/AtualizarStatusModal";
import { PainelLateralCronograma } from "@/components/cronograma/PainelLateralCronograma";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/format";
import { proximosItens, timeToMinutes, type CronogramaItem } from "@/lib/cronograma";

const REFRESH_INTERVAL_MS = 20_000;

function agoraEmMinutos() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

type Props = {
  eventId: string;
  eventDate: string; // yyyy-MM-dd
  items: CronogramaItem[];
  suppliers: { id: string; name: string; category: string | null; phone: string | null }[];
};

export function RoteiroList({ eventId, eventDate, items: initialItems, suppliers }: Props) {
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<CronogramaItem | null>(null);
  const [statusModal, setStatusModal] = useState<{ open: boolean; itemId?: string }>({
    open: false,
  });
  const [focusId, setFocusId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Mantém a lista sincronizada com o que os fornecedores atualizam
  // (mesmo padrão de polling do link público).
  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("cronograma_evento", { p_event_id: eventId });
    if (data) setItems(data as CronogramaItem[]);
  }, [eventId]);

  useEffect(() => {
    const t = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => setItems(initialItems), [initialItems]);

  const hoje = new Date().toISOString().slice(0, 10);
  const eventoHoje = eventDate === hoje;

  // Item "atual": em andamento agora, senão problema aberto, senão o
  // próximo planejado mais próximo.
  const currentId = useMemo(() => {
    const emAndamento = items.find((i) => i.status_novo === "em_andamento");
    if (emAndamento) return emAndamento.id;
    const problema = items.find((i) => i.status_novo === "problema");
    if (problema) return problema.id;
    return proximosItens(items, 1)[0]?.id ?? null;
  }, [items]);

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) => (timeToMinutes(a.time) ?? 1e9) - (timeToMinutes(b.time) ?? 1e9)
      ),
    [items]
  );

  function focarItem(itemId: string) {
    setFocusId(itemId);
    const el = document.getElementById(`crono-item-${itemId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setFocusId((c) => (c === itemId ? null : c)), 2000);
  }

  const nowMinutes = agoraEmMinutos();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
      {/* Coluna principal: timeline */}
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="text-sm font-semibold text-stone-700">
            Cronograma do dia
          </h2>
          {!adding && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-700"
            >
              <Plus size={16} /> Adicionar item
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-4 print:hidden">
            <RoteiroForm
              action={createRoteiroItem.bind(null, eventId)}
              eventId={eventId}
              suppliers={suppliers}
              onClose={() => {
                setAdding(false);
                refresh();
              }}
            />
          </div>
        )}

        {ordered.length === 0 && !adding ? (
          <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-12 text-center">
            <p className="text-stone-600">O roteiro ainda está vazio.</p>
            <button
              onClick={() => setAdding(true)}
              className="mt-4 text-sm font-medium text-stone-900 underline underline-offset-4 hover:no-underline"
            >
              Adicionar o primeiro item
            </button>
          </div>
        ) : (
          <div ref={listRef} className="space-y-3">
            {ordered.map((item) => {
              if (editingId === item.id) {
                return (
                  <div key={item.id} className="print:hidden">
                    <RoteiroForm
                      action={updateRoteiroItem.bind(null, eventId, item.id)}
                      eventId={eventId}
                      suppliers={suppliers}
                      initial={{
                        time: formatTime(item.time),
                        title: item.title,
                        description: item.description ?? "",
                        supplierId: item.supplier_id ?? "",
                        responsavelNome: item.responsavel_nome ?? "",
                        responsavelTelefone: item.responsavel_telefone ?? "",
                        etapaObrigatoria: item.etapa_obrigatoria,
                        duracaoMinutos: item.duracao_minutos,
                      }}
                      onClose={() => {
                        setEditingId(null);
                        refresh();
                      }}
                    />
                  </div>
                );
              }

              const isCurrent = item.id === currentId;
              const usaExpandido =
                isCurrent || item.status_novo === "problema";
              const anel =
                focusId === item.id ? "ring-2 ring-sky-400 rounded-xl" : "";

              return (
                <div key={item.id} id={`crono-item-${item.id}`} className={anel}>
                  {usaExpandido ? (
                    <ItemTimelineExpandido
                      item={item}
                      destaque={isCurrent}
                      nowMinutes={eventoHoje ? nowMinutes : -1}
                      onEditar={() => {
                        setEditingId(item.id);
                        setAdding(false);
                      }}
                      onExcluir={() => {
                        if (confirm(`Excluir "${item.title}"?`)) {
                          deleteRoteiroItem(eventId, item.id).then(refresh);
                        }
                      }}
                      onVerHistorico={() => setHistorico(item)}
                    />
                  ) : (
                    <ItemTimelineCompacto item={item} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        {ordered.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-stone-100 pt-4 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Concluído
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Em andamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Próximo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" /> Pendente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Atrasado/Problema
            </span>
          </div>
        )}
      </div>

      {/* Painel lateral */}
      <aside className="lg:sticky lg:top-4 lg:self-start print:hidden">
        <PainelLateralCronograma
          items={items}
          eventId={eventId}
          eventoHoje={eventoHoje}
          onAtualizarStatus={() => setStatusModal({ open: true })}
          onFocarItem={focarItem}
        />
      </aside>

      {historico && (
        <HistoricoItemModal
          itemId={historico.id}
          titulo={historico.title}
          onFechar={() => setHistorico(null)}
        />
      )}
      {statusModal.open && (
        <AtualizarStatusModal
          eventId={eventId}
          items={ordered}
          itemInicial={statusModal.itemId}
          onFechar={() => {
            setStatusModal({ open: false });
            refresh();
          }}
        />
      )}
    </div>
  );
}
