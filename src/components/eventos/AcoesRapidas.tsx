"use client";

// Ações rápidas (Modelo A): grade de seis quadrinhos, ícone e rótulo.
// Nova tarefa, Adicionar fornecedor e Adicionar observação abrem no
// lugar; os outros levam à tela.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ListPlus,
  MessageSquare,
  ScrollText,
  Truck,
  Wallet,
  StickyNote,
  X,
} from "lucide-react";
import { tem } from "@/lib/capacidades";
import { rotuloCortejo } from "@/lib/papel";
import { TaskForm } from "@/components/tasks/TaskForm";
import { BuscarVincularFornecedorModal } from "@/components/fornecedores/BuscarVincularFornecedorModal";
import { createTask } from "@/app/(app)/tarefas/actions";
import { criarNota } from "@/app/(app)/eventos/[id]/notas-actions";

const quadrinho: React.CSSProperties = {
  border: "1px solid var(--ev-card-border)",
  borderRadius: 10,
  padding: "12px 6px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  textAlign: "center",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  lineHeight: 1.25,
  color: "var(--ev-text-body)",
  cursor: "pointer",
  background: "#fff",
  transition: "background 140ms ease, border-color 140ms ease",
};

function Quadrinho({
  icon: Icon,
  titulo,
  onClick,
  href,
}: {
  icon: typeof ListPlus;
  titulo: string;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <Icon size={18} strokeWidth={1.6} />
      {titulo}
    </>
  );
  return href ? (
    <Link href={href} className="ev-cartao-link" style={quadrinho}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="ev-cartao-link" style={quadrinho}>
      {inner}
    </button>
  );
}

export function AcoesRapidas({
  eventId,
  eventLabel,
  tipo,
}: {
  eventId: string;
  eventLabel: string;
  tipo?: string;
}) {
  const router = useRouter();
  const [tarefa, setTarefa] = useState(false);
  const [fornecedor, setFornecedor] = useState(false);
  const [nota, setNota] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [notaErro, setNotaErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvarNota() {
    setNotaErro(null);
    startTransition(async () => {
      const r = await criarNota(eventId, notaTexto);
      if (r.error) {
        setNotaErro(r.error);
        return;
      }
      setNotaTexto("");
      setNota(false);
      router.refresh();
    });
  }

  return (
    <section
      aria-label="Ações rápidas"
      style={{
        background: "var(--ev-card-bg)",
        border: "1px solid var(--ev-card-border)",
        borderRadius: 14,
        padding: "14px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, paddingLeft: 4, color: "var(--ev-text-strong)" }}>
        Ações rápidas
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 8 }}>
        <Quadrinho icon={ListPlus} titulo="Nova tarefa" onClick={() => setTarefa(true)} />
        <Quadrinho icon={Truck} titulo="Adicionar fornecedor" onClick={() => setFornecedor(true)} />
        <Quadrinho icon={MessageSquare} titulo="Abrir comunicação" href={`/eventos/${eventId}/comunicacao`} />
        <Quadrinho icon={Wallet} titulo="Abrir financeiro" href={`/eventos/${eventId}/financeiro`} />
        {tem(tipo, "cortejo") && (
          <Quadrinho icon={ScrollText} titulo={rotuloCortejo(tipo)} href={`/eventos/${eventId}/cortejo`} />
        )}
        <Quadrinho icon={StickyNote} titulo="Adicionar observação" onClick={() => setNota(true)} />
      </div>

      {tarefa && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4">
          <div className="mt-10 w-full max-w-lg">
            <TaskForm
              action={createTask}
              events={[{ id: eventId, label: eventLabel }]}
              onClose={() => {
                setTarefa(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}

      {fornecedor && (
        <BuscarVincularFornecedorModal
          eventId={eventId}
          onClose={() => setFornecedor(false)}
        />
      )}

      {nota && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Nova observação</h4>
              <button
                onClick={() => setNota(false)}
                aria-label="Fechar"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              value={notaTexto}
              onChange={(e) => setNotaTexto(e.target.value)}
              autoFocus
              rows={3}
              placeholder="Anote algo sobre este evento…"
              className="ev-foco mt-3 w-full rounded-lg border border-[color:var(--ev-card-border)] px-3 py-2 text-sm"
            />
            {notaErro && <p className="mt-1 text-sm text-rose-600">{notaErro}</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setNota(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNota}
                disabled={pending}
                className="ev-btn-primario rounded-lg bg-[color:var(--ev-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
