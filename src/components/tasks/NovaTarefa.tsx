"use client";

// "+ Tarefa" na tela de Tarefas (19/10/2026, pedido dele: "se o usuário
// quiser cadastrar uma tarefa sua deve ter essa possibilidade"). O que
// fazer, o prazo se tiver, e o evento só se for de um evento.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { novaTarefa } from "@/app/(app)/tarefas/actions";

const entrada =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none";

export function NovaTarefa({ eventos }: { eventos: { id: string; rotulo: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [eventId, setEventId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        + Tarefa
      </button>
    );
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await novaTarefa({ titulo, prazo: prazo || null, eventId: eventId || null });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setTitulo("");
      setPrazo("");
      setEventId("");
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="w-full space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <label className="block text-sm text-stone-700">
        O que fazer
        <input
          className={`${entrada} mt-1`}
          value={titulo}
          maxLength={200}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ligar para o buffet, renovar o contrato do espaço…"
          autoFocus
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-stone-700">
          Prazo (opcional)
          <input type="date" className={`${entrada} mt-1`} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </label>
        <label className="block text-sm text-stone-700">
          Evento (opcional)
          <select className={`${entrada} mt-1`} value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Sem evento</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pendente || !titulo.trim()}
          className="rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
        >
          {pendente ? "Salvando…" : "Salvar tarefa"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={pendente}
          className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-700 hover:bg-stone-50"
        >
          Cancelar
        </button>
        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>
    </form>
  );
}
