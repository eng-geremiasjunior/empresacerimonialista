"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { desmascararDinheiro } from "@/lib/format";
import { escalaPorPublico } from "@/lib/capacidades";
import { montarTimelineDoPlaybook } from "@/lib/supabase/roteiro-template";
import {
  normalizarBriefingV2,
  propostaParaConferencia,
  type PropostaBriefingV2,
} from "@/lib/briefing-core";
import { itensDaProposta } from "@/lib/briefing-aplicacao";
import { salvarCampo } from "@/app/(app)/eventos/[id]/planejamento/actions";
import type { TipoCampo } from "@/lib/planejamento-shared";
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
  /** só do briefing: o passo Cliente não pede e-mail */
  newClientEmail: string;
  type: string;
  name: string;
  date: string;
  time: string; // "" ou HH:MM
  city: string;
  location: string;
  guests: string;
  /** teto mencionado pela cliente; não dimensiona nada (143) */
  guestsMax: string;
  contractValue: string;
  entrada: string;
  status: string; // orcamento | confirmado
  responsavelId: string | null; // membro_equipe responsável
  respostas: WizardRespostas;
  /** o resto da leitura do briefing — nasce proposta, nunca aplicado aqui */
  briefing: PropostaBriefingV2 | null;

  incluirTimeline: boolean; // true no fluxo completo, false no rápido
};

function toNumber(v: string): number | null {
  // O campo de dinheiro entrega mascarado ("350.000,00"); o de convidados
  // entrega dígito puro. desmascararDinheiro dá conta dos dois.
  const n = desmascararDinheiro(String(v));
  return n != null && n > 0 ? n : null;
}

// A porta única de escrita de campo tipado é portal_escrever_campo (091),
// e ela pede o id da LINHA — aqui só traduzimos código → linha do evento.
// UPDATE direto em evento_campo_valor gravava sem deixar rastro de quem
// escreveu, e era o buraco que sobrava na conferência.
async function campoPorCodigo(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  codigo: string
): Promise<{ id: string; tipo: TipoCampo } | null> {
  const { data } = await supabase
    .from("evento_campo_valor")
    .select("id, tipo")
    .eq("event_id", eventId)
    .eq("codigo", codigo)
    .maybeSingle();
  return data ? { id: data.id as string, tipo: data.tipo as TipoCampo } : null;
}

// Escrita de campo na criação do evento: erro aqui vira log, nunca desfaz
// o evento (ele já existe e é dela).
async function escreverCampo(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  codigo: string,
  valor: string
) {
  const campo = await campoPorCodigo(supabase, eventId, codigo);
  if (!campo) {
    console.error(`[vela:novo-evento] ${codigo}: campo não instanciado`);
    return;
  }
  const r = await salvarCampo(eventId, campo.id, campo.tipo, codigo, valor);
  if ("error" in r) console.error(`[vela:novo-evento] ${codigo}:`, r.error);
}

export type CriarEventoState = { error: string } | null;

// O teto do plano (147) só é lido quando a trava bate — uma consulta a
// mais no caminho da recusa, nenhuma no caminho feliz. minha_assinatura
// responde só para a proprietária; para os outros cargos vem vazio e a
// frase sai sem o número.
async function mensagemDoTetoDoPlano(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  let conta = "";
  try {
    const { data } = await supabase.rpc("minha_assinatura");
    const a = data as { eventos?: number; limite_eventos?: number | null } | null;
    if (a && typeof a.eventos === "number" && typeof a.limite_eventos === "number") {
      conta = ` (${a.eventos} de ${a.limite_eventos} eventos em andamento)`;
    }
  } catch {
    // sem número, a frase continua verdadeira
  }
  return `Sua agenda chegou ao teto do plano${conta}. Mude de plano em Assinatura, ou espere um evento concluir.`;
}

export async function criarEventoCompleto(
  payload: WizardPayload
): Promise<CriarEventoState> {
  if (!payload.type) return { error: "Escolha o tipo do evento." };
  if (!payload.date) return { error: "Informe a data do evento." };
  if (!payload.clientId && !payload.newClientName.trim()) {
    return { error: "Selecione um cliente ou informe um novo." };
  }

  const arquetipo = resolverTemplate(payload.type);

  // O subtipo escolhido (token do cenário) vira chave booleana: a condicao
  // dos extras do roteiro casa pelo próprio token, sem literal aqui.
  const cenario = payload.respostas.cenario || null;
  const respostas: WizardRespostas = cenario
    ? { ...payload.respostas, [cenario]: true }
    : payload.respostas;

  // Fases: sempre do template do tipo. Timeline: só no fluxo completo —
  // e do Playbook da empresa (deslocamentos vs. hora da cerimônia), com
  // fallback na constante TS enquanto a 112 não existe.
  const phases = gerarFasesPorTipo(arquetipo);
  const timeline = payload.incluirTimeline
    ? await montarTimelineDoPlaybook(payload.type, respostas)
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
    // O limite do plano gratuito (131) não é falha: é uma resposta, e
    // ela precisa saber o caminho de saída, não "tente novamente".
    if (error?.message?.includes("plano_gratuito_no_limite")) {
      return {
        error:
          "Seu primeiro evento é por nossa conta — e ele já está criado. Para começar o próximo, ative a assinatura em Assinatura, no menu.",
      };
    }
    // Assinante no teto (147): a agenda está cheia, não quebrada. Concluir
    // um evento libera a vaga sozinho — o cron muda o status.
    if (error?.message?.includes("plano_no_limite")) {
      return { error: await mensagemDoTetoDoPlano(supabase) };
    }
    return {
      // O texto do Postgres não diz nada a ela e assusta — vai para o log,
      // que é onde alguém consegue usar.
      error:
        "Não foi possível criar o evento (nada foi salvo). Tente novamente.",
    };
  }

  const eventId = data as string;

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
    await escreverCampo(supabase, eventId, "celebracao_formato", formato);
  }

  // Arquétipo do método: o porte deriva do público (o wizard não pergunta
  // a escala), o subtipo é o cenário escolhido. O reflexo em events — que
  // é o que dispara os deltas do arquétipo (083) — mora dentro de
  // salvarCampo, para escala/cenario; por isso não se grava events aqui.
  const escala = escalaPorPublico(payload.type, args.p_guests);
  const eixos: Record<string, string> = {};
  if (escala) eixos.escala = escala;
  if (cenario) eixos.cenario = cenario;
  for (const [codigo, token] of Object.entries(eixos)) {
    await escreverCampo(supabase, eventId, codigo, token);
  }

  // Daqui para baixo o evento já existe: nada pode desfazê-lo. Cada bloco
  // falha para o log e segue.
  //
  // (a) e-mail do cliente novo: criar_evento_completo não recebe e-mail, e
  // sem isto o contato que ela colou morria no wizard.
  const emailNovo = (payload.newClientEmail ?? "").trim();
  if (!payload.clientId && emailNovo) {
    try {
      const { data: ev } = await supabase
        .from("events")
        .select("client_id")
        .eq("id", eventId)
        .maybeSingle();
      if (ev?.client_id) {
        const { error: erroEmail } = await supabase
          .from("clients")
          .update({ email: emailNovo })
          .eq("id", ev.client_id)
          // nunca por cima de um contato que já existe
          .is("email", null);
        if (erroEmail) {
          console.error("[vela:novo-evento] e-mail do cliente:", erroEmail.message);
        }
      }
    } catch (e) {
      console.error("[vela:novo-evento] e-mail do cliente:", e);
    }
  }

  // (b) o teto do público ("220, talvez 240"): guests continua sendo o
  // número que dimensiona; guests_max só guarda a possibilidade — e só
  // existe se for maior que a estimativa.
  const teto = toNumber(payload.guestsMax);
  if (teto && (args.p_guests == null || teto > args.p_guests)) {
    try {
      const { error: erroTeto } = await supabase
        .from("events")
        .update({ guests_max: Math.round(teto) })
        .eq("id", eventId);
      if (erroTeto) {
        console.error("[vela:novo-evento] teto do público:", erroTeto.message);
      }
    } catch (e) {
      console.error("[vela:novo-evento] teto do público:", e);
    }
  }

  // (c) o resto da leitura vira PROPOSTA (143): dinheiro de fornecedor,
  // quantidade, verba e estilo esperam a conferência item a item. O
  // payload vem do navegador — reconstruído aqui pela allowlist, sem
  // identidade e com os trechos redigidos antes de virar linha no banco.
  if (payload.briefing) {
    try {
      const proposta = propostaParaConferencia(
        normalizarBriefingV2(payload.briefing)
      );
      // só nasce proposta se sobrou algo para conferir: o que o wizard já
      // gravou (identidade, convidados) não vira caixa na tela do evento
      if (itensDaProposta(proposta).length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error: erroProposta } = await supabase
          .from("briefing_extracao")
          .insert({
            event_id: eventId,
            payload: proposta,
            status: "proposta",
            criada_por: user?.id ?? null,
          });
        if (erroProposta) {
          console.error("[vela:novo-evento] proposta do briefing:", erroProposta.message);
        }
      }
    } catch (e) {
      console.error("[vela:novo-evento] proposta do briefing:", e);
    }
  }

  revalidatePath("/eventos");
  revalidatePath("/eventos/dashboard");
  redirect(`/eventos/${eventId}`);
}
