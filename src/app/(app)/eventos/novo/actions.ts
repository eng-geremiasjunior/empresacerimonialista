"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { montarTimelineDoPlaybook } from "@/lib/supabase/roteiro-template";
import {
  gerarFasesPorTipo,
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
  responsavelId: string | null; // membro_equipe responsável
  respostas: WizardRespostas;

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

  // Fases: sempre do template do tipo. Timeline: só no fluxo completo —
  // e do Playbook da empresa (deslocamentos vs. hora da cerimônia), com
  // fallback na constante TS enquanto a 112 não existe.
  const phases = gerarFasesPorTipo(arquetipo);
  const timeline = payload.incluirTimeline
    ? await montarTimelineDoPlaybook(payload.type, payload.respostas)
    : [];

  // Checklist plano APOSENTADO (076): tarefa nasce da decisão do método
  // (trigger na criação do evento), não de lista de títulos sem prazo nem
  // responsável. p_tasks vai vazio — mesmo padrão de orcamento-para-evento.
  //
  // O wizard tinha um passo "Revisar checklist" que deixava ela marcar,
  // desmarcar e acrescentar item — e tudo caía aqui, neste array vazio. O
  // passo foi removido: a tela não pode pedir uma decisão que o servidor
  // descarta.
  const tasks: { title: string; category: string; priority: string }[] = [];

  const supabase = createClient();
  const args = {
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
  };

  let { data, error } = await supabase.rpc("criar_evento_completo", {
    ...args,
    p_responsavel_id: payload.responsavelId,
  });

  // Migração 022 pendente: a assinatura com p_responsavel_id não existe
  // ainda (PGRST202) — cria sem o responsável em vez de bloquear.
  if (error?.code === "PGRST202") {
    ({ data, error } = await supabase.rpc("criar_evento_completo", args));
  }

  if (error || !data) {
    console.error("[vela:novo-evento]", error);
    return {
      // O texto do Postgres não diz nada a ela e assusta — vai para o log,
      // que é onde alguém consegue usar.
      error:
        "Não foi possível criar o evento (nada foi salvo). Tente novamente.",
    };
  }

  // Formatura: a resposta "juntos ou separados" vira o campo
  // celebracao_formato do método (125) — é dele que o hub decide se
  // oferece a colação em evento próprio, e o checklist do dia decide
  // quais blocos semear. O instanciar (trigger da criação) já criou a
  // linha do campo com valor vazio; aqui só se preenche. Se a 125 ainda
  // não rodou, zero linhas casam e nada quebra.
  //
  // undefined = ela NÃO respondeu (o toggle é Sim/Não sem estado
  // inicial, e "Pular esta etapa" chega aqui sem tocar nele) — o campo
  // fica em branco para ela decidir no Planejamento. Gravar "Separados"
  // por omissão registraria uma decisão que ninguém tomou.
  if (
    payload.type === "formatura" &&
    payload.incluirTimeline &&
    payload.respostas.colacaoJunto !== undefined
  ) {
    const formato = payload.respostas.colacaoJunto
      ? "Juntos (mesmo dia e local)"
      : "Separados (a colação em outra data)";
    const { error: erroCampo } = await supabase
      .from("evento_campo_valor")
      .update({ valor_opcao: formato })
      .eq("event_id", data as string)
      .eq("codigo", "celebracao_formato");
    if (erroCampo) {
      console.error("[vela:novo-evento] celebracao_formato:", erroCampo.message);
    }
  }

  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  redirect(`/eventos/${data as string}`);
}
