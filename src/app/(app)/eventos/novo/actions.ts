"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  gerarFasesPorTipo,
  gerarTimelineSugerida,
  resolverTemplate,
  type WizardRespostas,
} from "@/lib/event-templates";

export type WizardTaskInput = { title: string; group: string };

export type WizardPayload = {
  clientId: string | null;
  newClientName: string;
  newClientPhone: string;
  type: string;
  name: string;
  date: string;
  time: string; // "" ou HH:MM
  city: string;
  location: string;
  guests: string;
  contractValue: string;
  entrada: string;
  status: string; // orcamento | confirmado
  respostas: WizardRespostas;
  tasks: WizardTaskInput[]; // checklist final (já editado na revisão)
  incluirTimeline: boolean; // true no fluxo completo, false no rápido
};

function toNumber(v: string): number | null {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type CriarEventoState = { error: string } | null;

export async function criarEventoCompleto(
  payload: WizardPayload
): Promise<CriarEventoState> {
  if (!payload.type) return { error: "Escolha o tipo do evento." };
  if (!payload.date) return { error: "Informe a data do evento." };
  if (!payload.clientId && !payload.newClientName.trim()) {
    return { error: "Selecione um cliente ou informe um novo." };
  }

  const arquetipo = resolverTemplate(payload.type);

  // Fases: sempre do template do tipo. Timeline: só no fluxo completo.
  const phases = gerarFasesPorTipo(arquetipo);
  const timeline = payload.incluirTimeline
    ? gerarTimelineSugerida(arquetipo, payload.respostas)
    : [];

  // Tasks vindas da revisão (já filtradas pelo usuário).
  const tasks = payload.tasks.map((t) => ({
    title: t.title,
    category: "geral",
    priority: t.group === "evento" ? "media" : "alta",
  }));

  const supabase = createClient();
  const { data, error } = await supabase.rpc("criar_evento_completo", {
    p_client_id: payload.clientId,
    p_new_client_name: payload.newClientName || null,
    p_new_client_phone: payload.newClientPhone || null,
    p_type: payload.type,
    p_name: payload.name || null,
    p_date: payload.date,
    p_time: payload.time || null,
    p_location: payload.location || null,
    p_city: payload.city || null,
    p_guests: toNumber(payload.guests) ? Math.round(toNumber(payload.guests)!) : null,
    p_contract_value: toNumber(payload.contractValue),
    p_status: payload.status === "confirmado" ? "confirmado" : "orcamento",
    p_entrada: toNumber(payload.entrada),
    p_tasks: tasks,
    p_phases: phases,
    p_timeline: timeline,
  });

  if (error || !data) {
    return {
      error:
        "Não foi possível criar o evento (nada foi salvo). Tente novamente." +
        (error ? ` [${error.message}]` : ""),
    };
  }

  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  redirect(`/eventos/${data as string}`);
}
