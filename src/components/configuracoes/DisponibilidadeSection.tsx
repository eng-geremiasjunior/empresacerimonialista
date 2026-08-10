"use client";

// Grade de disponibilidade da cerimonialista — configurada uma vez, usada
// pelo Secretário Executivo para oferecer horários ao fornecedor. Os
// horários oferecidos são esta grade MENOS os compromissos da Agenda; a
// grade não é um calendário paralelo.

import { useState, useTransition } from "react";
import { CalendarClock, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type JanelaDisponibilidade = {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function DisponibilidadeSection({
  userId,
  inicial,
}: {
  userId: string;
  inicial: JanelaDisponibilidade[];
}) {
  const [janelas, setJanelas] = useState(inicial);
  const [dia, setDia] = useState(1);
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("18:00");
  const [erro, setErro] = useState<string | null>(null);
  const [pend, start] = useTransition();

  function adicionar() {
    setErro(null);
    if (fim <= inicio) {
      setErro("O fim precisa ser depois do início.");
      return;
    }
    start(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("disponibilidade")
        .insert({ user_id: userId, dia_semana: dia, hora_inicio: inicio, hora_fim: fim })
        .select("id, dia_semana, hora_inicio, hora_fim")
        .single();
      if (error || !data) {
        setErro("Não foi possível salvar. A migração 077 já rodou?");
        return;
      }
      setJanelas((j) =>
        [...j, data as JanelaDisponibilidade].sort(
          (a, b) =>
            a.dia_semana - b.dia_semana ||
            a.hora_inicio.localeCompare(b.hora_inicio)
        )
      );
    });
  }

  function remover(id: string) {
    setJanelas((j) => j.filter((x) => x.id !== id));
    void createClient().from("disponibilidade").delete().eq("id", id);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <CalendarClock size={15} className="text-gray-500" />
        Minha disponibilidade
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Os horários que você atende fornecedores e clientes. O agendamento
        automático oferece estes horários, descontando o que já está na sua
        Agenda.
      </p>

      {janelas.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {janelas.map((j) => (
            <li
              key={j.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="w-20 font-medium text-gray-800">
                {DIAS[j.dia_semana]}
              </span>
              <span className="font-mono text-[13px] text-gray-600">
                {String(j.hora_inicio).slice(0, 5)} – {String(j.hora_fim).slice(0, 5)}
              </span>
              <button
                onClick={() => remover(j.id)}
                aria-label="Remover janela"
                className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={dia}
          onChange={(e) => setDia(Number(e.target.value))}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800"
        >
          {DIAS.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <input
          type="time"
          value={inicio}
          onChange={(e) => setInicio(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-sm text-gray-800"
        />
        <span className="text-sm text-gray-400">até</span>
        <input
          type="time"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-sm text-gray-800"
        />
        <button
          onClick={adicionar}
          disabled={pend}
          className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {erro && <p className="mt-2 text-xs text-rose-600">{erro}</p>}
      {janelas.length === 0 && (
        <p className="mt-2 text-xs text-amber-700">
          Sem grade, o agendamento automático não tem o que oferecer.
        </p>
      )}
    </section>
  );
}
