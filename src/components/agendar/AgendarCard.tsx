"use client";

// Cartão público de escolha de horário (mobile-first: o fornecedor abre no
// celular). Escolha estruturada — um toque num slot — nunca texto livre.

import { useState } from "react";
import { Calendar, Check, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ConviteData } from "@/app/agendar/[hash]/page";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dataLonga(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const [a, m, dia] = iso.split("-");
  void a;
  return `${DIAS[d.getDay()]}, ${dia}/${m}`;
}

export function AgendarCard({
  hash,
  initial,
}: {
  hash: string;
  initial: ConviteData;
}) {
  const [dados, setDados] = useState(initial);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // "nenhum horário serve": sugestão estruturada (dia + hora)
  const [sugerindo, setSugerindo] = useState(false);
  const [sugData, setSugData] = useState("");
  const [sugHora, setSugHora] = useState("");
  const [enviandoSug, setEnviandoSug] = useState(false);

  const expirado =
    dados.status === "expirado" ||
    dados.status === "cancelado" ||
    (dados.status !== "respondido" &&
      dados.status !== "sugerido" &&
      new Date(dados.prazo_ate).getTime() < Date.now());
  const respondido = dados.status === "respondido";
  const sugerido = dados.status === "sugerido";

  async function sugerir() {
    if (!sugData || !sugHora) return;
    setEnviandoSug(true);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("sugerir_horario_convite", {
      p_hash: hash,
      p_data: sugData,
      p_hora: sugHora,
    });
    setEnviandoSug(false);
    const resp = data as { success?: boolean; error?: string } | null;
    if (error || resp?.error) {
      setErro(resp?.error ?? "não foi possível enviar a sugestão.");
      return;
    }
    setDados({ ...dados, status: "sugerido", sugestao: { data: sugData, hora: sugHora } });
  }

  async function escolher(slotId: string) {
    setEscolhendo(slotId);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("escolher_horario_convite", {
      p_hash: hash,
      p_slot_id: slotId,
    });
    setEscolhendo(null);

    const resp = data as {
      success?: boolean;
      error?: string;
      data?: string;
      hora?: string;
    } | null;

    if (error || resp?.error) {
      setErro(resp?.error ?? "não foi possível agendar. Tente de novo.");
      // horário pode ter sido tomado: refaz a leitura para atualizar a lista
      const { data: fresco } = await supabase.rpc("consultar_convite", {
        p_hash: hash,
      });
      if (fresco) setDados(fresco as ConviteData);
      return;
    }

    setDados({
      ...dados,
      status: "respondido",
      compromisso: {
        data: resp!.data!,
        hora: resp!.hora!,
        local: null,
      },
    });
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-stone-100 p-4 pt-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Agendamento
        </p>
        <h1 className="mt-1 text-lg font-semibold leading-snug text-stone-900">
          {dados.tarefa}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {dados.event_label} · com a cerimonialista ·{" "}
          <span className="inline-flex items-center gap-1">
            <Clock size={13} />
            {dados.duracao_min} min
          </span>
        </p>

        {respondido && dados.compromisso ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <Check className="mx-auto text-emerald-600" size={22} />
            <p className="mt-2 font-semibold text-emerald-800">
              Agendado!
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              {dataLonga(dados.compromisso.data)} às{" "}
              {String(dados.compromisso.hora).slice(0, 5)}
              {dados.compromisso.local ? ` · ${dados.compromisso.local}` : ""}
            </p>
            <p className="mt-2 text-xs text-emerald-600">
              A cerimonialista já foi avisada. Até lá!
            </p>
          </div>
        ) : sugerido && dados.sugestao ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="font-semibold text-amber-800">Sugestão enviada</p>
            <p className="mt-1 text-sm text-amber-700">
              {dataLonga(dados.sugestao.data)} às{" "}
              {String(dados.sugestao.hora).slice(0, 5)} — aguardando a
              cerimonialista aprovar. Ela entra em contato para confirmar.
            </p>
          </div>
        ) : expirado ? (
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-center">
            <p className="font-medium text-stone-700">Este convite expirou</p>
            <p className="mt-1 text-sm text-stone-500">
              A cerimonialista vai combinar o horário direto com você.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
              <Calendar size={13} />
              Escolha um horário
            </p>

            {dados.slots.length === 0 ? (
              <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">
                Os horários oferecidos já foram ocupados. A cerimonialista vai
                combinar direto com você.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {dados.slots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => escolher(s.id)}
                    disabled={escolhendo !== null}
                    className="flex w-full items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left transition-colors hover:border-stone-400 hover:bg-stone-50 disabled:opacity-60"
                  >
                    <span className="text-sm font-medium capitalize text-stone-800">
                      {dataLonga(s.data)}
                    </span>
                    <span className="rounded-lg bg-stone-900 px-3 py-1 text-sm font-semibold text-white">
                      {escolhendo === s.id ? "…" : String(s.hora).slice(0, 5)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* nenhum horário serve → sugestão estruturada (dia + hora) */}
            {sugerindo ? (
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Sugerir outro horário
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="date"
                    value={sugData}
                    onChange={(e) => setSugData(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-2 font-mono text-sm"
                  />
                  <input
                    type="time"
                    value={sugHora}
                    onChange={(e) => setSugHora(e.target.value)}
                    className="rounded-lg border border-stone-300 px-2 py-2 font-mono text-sm"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={sugerir}
                    disabled={enviandoSug || !sugData || !sugHora}
                    className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {enviandoSug ? "Enviando…" : "Enviar sugestão"}
                  </button>
                  <button
                    onClick={() => setSugerindo(false)}
                    className="rounded-lg px-3 py-2 text-sm text-stone-500"
                  >
                    Voltar
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-stone-400">
                  A cerimonialista aprova ou combina outro com você.
                </p>
              </div>
            ) : (
              <button
                onClick={() => setSugerindo(true)}
                className="mt-4 w-full rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-500 hover:bg-stone-50"
              >
                Nenhum horário serve? Sugerir outro
              </button>
            )}

            {erro && (
              <p className="mt-3 text-center text-sm text-rose-600">{erro}</p>
            )}

            <p className="mt-4 text-center text-xs text-stone-400">
              Válido até{" "}
              {new Date(dados.prazo_ate).toLocaleDateString("pt-BR")}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
