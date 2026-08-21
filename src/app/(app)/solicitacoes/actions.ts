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
    .select("id, date, empresa_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!evento?.empresa_id) return { error: "Evento não encontrado." };

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
  const agora = new Date().toISOString();

  const { data: batida, error: erroBatida } = await supabase
    .from("batida")
    .update({ status: "enviada", enviada_em: agora })
    .eq("id", batidaId)
    .in("status", ["na_fila", "segurada"])
    .select("id")
    .maybeSingle();

  if (erroBatida || !batida) return { error: "Esta mensagem já tinha saído." };

  const { data: itens } = await supabase
    .from("solicitacao_fornecedor")
    .select("id, status, tentativas")
    .eq("batida_id", batidaId)
    .in("status", ["pendente", "enviada"]);

  for (const i of itens ?? []) {
    await supabase
      .from("solicitacao_fornecedor")
      .update({
        // primeira saída é envio; a segunda é cobrança da mesma coisa
        status: i.status === "pendente" ? "enviada" : "reenviada",
        enviada_em: i.status === "pendente" ? agora : undefined,
        reenviada_em: i.status === "pendente" ? undefined : agora,
        tentativas: (i.tentativas ?? 0) + 1,
        updated_at: agora,
      })
      .eq("id", i.id);
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
  await supabase
    .from("solicitacao_fornecedor")
    .update({ batida_id: null })
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
