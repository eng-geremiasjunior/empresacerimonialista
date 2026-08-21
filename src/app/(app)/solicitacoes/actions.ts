"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FilaState = { error: string } | { success: true } | null;

const TITULOS: Record<"confirmacao" | "contrato", string> = {
  confirmacao: "Confirmar presença no evento",
  contrato: "Enviar contrato assinado",
};

/**
 * Ela pede algo a um fornecedor. A solicitação nasce e já entra na fila do
 * mesmo dia — esperar a rotina da madrugada faria o pedido sumir por horas,
 * e ela não teria como saber se registrou.
 *
 * Se já existe batida viva para esse fornecedor, o pedido entra NELA: é a
 * promessa da Central, uma mensagem por vez, mesmo quando ela pede duas
 * coisas seguidas.
 */
export async function pedirAoFornecedor(
  eventId: string,
  supplierId: string,
  tipo: "confirmacao" | "contrato"
): Promise<{ error: string } | { success: true }> {
  return criarPedido(eventId, supplierId, tipo, TITULOS[tipo], null);
}

/**
 * Confirmar horário: a solicitação que vira estado operacional. Carrega o
 * item do roteiro do fornecedor (snapshot na página dele); a resposta
 * confirma ou corrige o horário — e o cronograma muda sozinho (114).
 */
export async function pedirHorarioAoFornecedor(
  eventId: string,
  supplierId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  // o item dele no dia: o mais cedo com fornecedor vinculado
  const { data: item } = await supabase
    .from("roteiro_items")
    .select("id, title")
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .order("time", { ascending: true, nullsFirst: false })
    .order("order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!item) {
    return { error: "Este fornecedor não tem item no roteiro deste evento." };
  }
  return criarPedido(
    eventId,
    supplierId,
    "horario",
    `Confirmar horário: ${item.title}`,
    item.id
  );
}

async function criarPedido(
  eventId: string,
  supplierId: string,
  tipo: "confirmacao" | "contrato" | "horario",
  titulo: string,
  roteiroItemId: string | null
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { data: evento } = await supabase
    .from("events")
    .select("id, date, empresa_id, cerimonialista_responsavel_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!evento?.empresa_id) return { error: "Evento não encontrado." };

  // a batida pertence a quem conduz; sem responsável, à dona (022)
  let responsavelId = evento.cerimonialista_responsavel_id as string | null;
  if (!responsavelId) {
    const { data: dona } = await supabase
      .from("membros_equipe")
      .select("id")
      .eq("empresa_id", evento.empresa_id)
      .eq("is_owner", true)
      .maybeSingle();
    responsavelId = dona?.id ?? null;
  }

  const { data: sol, error: erroSol } = await supabase
    .from("solicitacao_fornecedor")
    .insert({
      empresa_id: evento.empresa_id,
      supplier_id: supplierId,
      event_id: eventId,
      tipo,
      titulo,
      roteiro_item_id: roteiroItemId,
      status: "pendente",
      prazo_ate: evento.date ? `${evento.date}T23:59:59` : null,
    })
    .select("id")
    .single();

  if (erroSol || !sol) {
    // O índice parcial impede dois pedidos vivos do mesmo tipo, e aí a
    // mensagem é informação, não erro. Qualquer outra falha precisa
    // aparecer como falha — dizer "já está pedido" quando o banco recusou
    // por outro motivo faz ela acreditar que pediu, e ninguém pede de novo.
    if (erroSol?.code === "23505") {
      return { error: "Este pedido já está em aberto com este fornecedor." };
    }
    return {
      error: `Não deu para registrar o pedido${erroSol?.message ? `: ${erroSol.message}` : "."}`,
    };
  }

  const { data: batidaViva } = await supabase
    .from("batida")
    .select("id")
    .eq("supplier_id", supplierId)
    .eq("responsavel_membro_id", responsavelId ?? "00000000-0000-0000-0000-000000000000")
    .in("status", ["na_fila", "segurada"])
    .maybeSingle();

  let batidaId = batidaViva?.id ?? null;
  if (!batidaId) {
    const { data: forn } = await supabase
      .from("suppliers")
      .select("whatsapp, phone, email")
      .eq("id", supplierId)
      .maybeSingle();

    const { data: nova } = await supabase
      .from("batida")
      .insert({
        empresa_id: evento.empresa_id,
        supplier_id: supplierId,
        responsavel_membro_id: responsavelId,
        canal: forn?.whatsapp || forn?.phone ? "whatsapp" : "email",
        status: "na_fila",
      })
      .select("id")
      .single();
    batidaId = nova?.id ?? null;
  }

  if (batidaId) {
    await supabase
      .from("solicitacao_fornecedor")
      .update({ batida_id: batidaId })
      .eq("id", sol.id);
  }

  // O link nasce junto: sem ele a mensagem não tem para onde apontar.
  await supabase.from("fornecedor_acesso").upsert(
    {
      empresa_id: evento.empresa_id,
      supplier_id: supplierId,
      expira_em: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      revogado_em: null,
    },
    { onConflict: "empresa_id,supplier_id", ignoreDuplicates: true }
  );

  revalidatePath("/solicitacoes");
  revalidatePath(`/eventos/${eventId}/fornecedores`);
  return { success: true };
}

/**
 * A única ação da caixa de espera. Não cria pedido, não responde por
 * ninguém: monta a batida de novo com as solicitações vivas do
 * fornecedor (menos as expiradas — a ação delas é a tarefa/ligar — e a
 * de horário órfã) e a põe na fila de hoje. Decisão humana explícita
 * passa por cima do silêncio mínimo do robô; o aviso "cobrada há N
 * dias" aparece ANTES do toque, na lista.
 *
 * Como a batida é por (fornecedor, responsável), um fornecedor com
 * eventos de duas condutoras gera uma batida para cada.
 */
export async function cobrarDeNovo(
  supplierId: string
): Promise<{ error: string } | { success: true; batidas: number }> {
  const supabase = createClient();

  const { data: vivas } = await supabase
    .from("solicitacao_fornecedor")
    .select(
      "id, empresa_id, tipo, roteiro_item_id, status, events!inner(id, status, cerimonialista_responsavel_id)"
    )
    .eq("supplier_id", supplierId)
    .in("status", ["pendente", "enviada", "reenviada"]);

  const um = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const anexaveis = (vivas ?? []).filter((v) => {
    const ev = um(v.events as never) as {
      status?: string;
      cerimonialista_responsavel_id?: string | null;
    } | null;
    if (!ev || ev.status === "concluido" || ev.status === "cancelado") return false;
    if (v.tipo === "horario" && v.roteiro_item_id === null) return false;
    return true;
  });

  if (anexaveis.length === 0) {
    return { error: "Nada vivo para cobrar deste fornecedor." };
  }

  const empresaId = anexaveis[0].empresa_id as string;
  const { data: dona } = await supabase
    .from("membros_equipe")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("is_owner", true)
    .maybeSingle();

  // uma batida por responsável (fallback: dona)
  const porResp = new Map<string, string[]>();
  for (const v of anexaveis) {
    const ev = um(v.events as never) as {
      cerimonialista_responsavel_id?: string | null;
    } | null;
    const resp = ev?.cerimonialista_responsavel_id ?? dona?.id ?? "";
    const lista = porResp.get(resp) ?? [];
    lista.push(v.id);
    porResp.set(resp, lista);
  }

  const { data: forn } = await supabase
    .from("suppliers")
    .select("whatsapp, phone, email")
    .eq("id", supplierId)
    .maybeSingle();
  const canal = forn?.whatsapp || forn?.phone ? "whatsapp" : "email";

  let criadas = 0;
  for (const [resp, ids] of porResp) {
    // batida viva dessa dupla? anexa nela — e se estiver segurada, solta:
    // "cobrar de novo" com nada saindo hoje seria sucesso de mentira
    const { data: viva } = await supabase
      .from("batida")
      .select("id, status")
      .eq("supplier_id", supplierId)
      .eq("responsavel_membro_id", resp || "00000000-0000-0000-0000-000000000000")
      .in("status", ["na_fila", "segurada"])
      .maybeSingle();

    let batidaId = viva?.id ?? null;
    if (batidaId && viva?.status === "segurada") {
      await supabase
        .from("batida")
        .update({ status: "na_fila", segurada_em: null, segurada_por: null })
        .eq("id", batidaId);
    }
    if (!batidaId) {
      const { data: nova } = await supabase
        .from("batida")
        .insert({
          empresa_id: empresaId,
          supplier_id: supplierId,
          responsavel_membro_id: resp || null,
          canal,
          status: "na_fila",
        })
        .select("id")
        .single();
      batidaId = nova?.id ?? null;
    }
    if (!batidaId) continue;

    await supabase
      .from("solicitacao_fornecedor")
      .update({ batida_id: batidaId })
      .in("id", ids);
    criadas++;
  }

  if (criadas === 0) return { error: "Não deu para montar a cobrança." };

  // o link se renova junto, como em toda batida
  await supabase.from("fornecedor_acesso").upsert(
    {
      empresa_id: empresaId,
      supplier_id: supplierId,
      expira_em: new Date(Date.now() + 90 * 86_400_000).toISOString(),
      revogado_em: null,
    },
    { onConflict: "empresa_id,supplier_id", ignoreDuplicates: true }
  );

  revalidatePath("/solicitacoes");
  return { success: true, batidas: criadas };
}

/** Segurar não cancela: tira do dia de hoje e devolve amanhã. */
export async function segurarBatida(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre de novo." };

  // segurada_por aponta para membros_equipe, não para o usuário do Auth:
  // quem segurou é uma pessoa da equipe dela, e é assim que a coluna lê.
  const { data: membro } = await supabase
    .from("membros_equipe")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("batida")
    .update({
      status: "segurada",
      segurada_em: new Date().toISOString(),
      segurada_por: membro?.id ?? null,
    })
    .eq("id", batidaId)
    .eq("status", "na_fila");

  if (error) return { error: "Não deu para segurar. Tente de novo." };
  revalidatePath("/solicitacoes");
  return { success: true };
}

export async function soltarBatida(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("batida")
    .update({ status: "na_fila", segurada_em: null, segurada_por: null })
    .eq("id", batidaId)
    .eq("status", "segurada");

  if (error) return { error: "Não deu para devolver à fila." };
  revalidatePath("/solicitacoes");
  return { success: true };
}

/**
 * Ela tocou em enviar. O WhatsApp abre com o texto pronto e a mensagem
 * sai do número dela — o que registramos aqui é que a batida saiu, para
 * o relógio de reenvio começar a contar e o fornecedor não ser cobrado
 * duas vezes pela mesma coisa.
 */
export async function marcarEnviada(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  // Operação íntegra no servidor (115): marca a batida e TODOS os itens
  // atomicamente, e recusa remetente que não enxergue algum evento da
  // batida — mensagem parcial não sai.
  const { data, error } = await supabase.rpc("marcar_batida_enviada", {
    p_batida_id: batidaId,
  });
  const r = data as { success?: boolean; error?: string } | null;
  if (error || !r?.success) {
    return { error: r?.error ?? "Esta mensagem já tinha saído." };
  }
  revalidatePath("/solicitacoes");
  return { success: true };
}

/** Cancelar é para o que ela resolveu por fora — não vira cobrança nenhuma. */
export async function cancelarBatida(batidaId: string): Promise<FilaState> {
  const supabase = createClient();
  const { error } = await supabase
    .from("batida")
    .update({ status: "cancelada" })
    .eq("id", batidaId)
    .in("status", ["na_fila", "segurada"]);

  if (error) return { error: "Não deu para cancelar." };
  // "Já resolvi por fora" tem que valer: pendente solta voltaria à fila
  // na manhã seguinte pelo cron, contra a promessa do botão.
  await supabase
    .from("solicitacao_fornecedor")
    .update({ status: "cancelada", batida_id: null, updated_at: new Date().toISOString() })
    .eq("batida_id", batidaId)
    .eq("status", "pendente");

  revalidatePath("/solicitacoes");
  return { success: true };
}

/**
 * Um link novo para o fornecedor. O anterior morre na hora — serve para
 * quando o contato dele mudou de mãos ou o link vazou para quem não devia.
 */
export async function gerarNovoLinkFornecedor(
  supplierId: string
): Promise<{ error: string } | { hash: string }> {
  const supabase = createClient();

  const { data: cargo } = await supabase.rpc("meu_cargo");
  const linha = Array.isArray(cargo) ? cargo[0] : cargo;
  const empresaId = (linha as { empresa_id?: string } | null)?.empresa_id;
  if (!empresaId) return { error: "Não foi possível identificar a empresa." };

  // Trocar o hash É a revogação: o endereço antigo deixa de existir e a
  // RPC pública devolve nulo para quem tentar. Mesmo formato do default
  // do banco — 64 hex, dois UUIDs sem os hífens.
  const novoHash = (randomUUID() + randomUUID()).replace(/-/g, "");

  const { data, error } = await supabase
    .from("fornecedor_acesso")
    .upsert(
      {
        empresa_id: empresaId,
        supplier_id: supplierId,
        hash: novoHash,
        expira_em: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        revogado_em: null,
        aberturas: 0,
        ultima_abertura: null,
      },
      { onConflict: "empresa_id,supplier_id" }
    )
    .select("hash")
    .single();

  if (error || !data) return { error: "Não deu para gerar o link." };
  revalidatePath(`/fornecedores/${supplierId}`);
  return { hash: data.hash };
}
