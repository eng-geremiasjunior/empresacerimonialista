"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ListPlus,
  MessageSquare,
  Users,
  Wallet,
  StickyNote,
  X,
  Zap,
} from "lucide-react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { BuscarVincularFornecedorModal } from "@/components/fornecedores/BuscarVincularFornecedorModal";
import { createTask } from "@/app/(app)/tarefas/actions";
import { criarNota } from "@/app/(app)/eventos/[id]/notas-actions";

function ItemBotao({
  icon: Icon,
  titulo,
  descricao,
  onClick,
  href,
}: {
  icon: typeof ListPlus;
  titulo: string;
  descricao: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gray-50";
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-gray-800">{titulo}</span>
        <span className="block truncate text-xs text-gray-500">{descricao}</span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function AcoesRapidas({
  eventId,
  eventLabel,
}: {
  eventId: string;
  eventLabel: string;
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
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <Zap size={15} className="text-indigo-500" />
        Ações rápidas
      </h3>
      <div className="mt-2 space-y-0.5">
        <ItemBotao
          icon={ListPlus}
          titulo="Nova tarefa"
          descricao="Crie uma tarefa para este evento"
          onClick={() => setTarefa(true)}
        />
        <ItemBotao
          icon={Users}
          titulo="Adicionar fornecedor"
          descricao="Busque e vincule do seu cadastro"
          onClick={() => setFornecedor(true)}
        />
        <ItemBotao
          icon={MessageSquare}
          titulo="Abrir comunicação"
          descricao="Converse com equipe e fornecedores"
          href={`/eventos/${eventId}/comunicacao`}
        />
        <ItemBotao
          icon={Wallet}
          titulo="Abrir financeiro"
          descricao="Contratos, parcelas e despesas"
          href={`/eventos/${eventId}/financeiro`}
        />
        <ItemBotao
          icon={StickyNote}
          titulo="Adicionar observação"
          descricao="Anote algo sobre o evento"
          onClick={() => setNota(true)}
        />
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
              <h4 className="text-sm font-semibold text-gray-900">
                Nova observação
              </h4>
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
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
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
