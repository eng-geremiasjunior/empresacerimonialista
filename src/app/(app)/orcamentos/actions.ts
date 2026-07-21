"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SalvarOrcamentoState =
  | { error: string }
  | { success: true; id: string }
  | null;

type ItemPayload = {
  modelo_precificacao_id: string | null;
  nome: string;
  descricao: string | null;
  tipo_calculo: "fixo" | "por_convidado" | "manual";
  valor_unitario: number | null;
  quantidade_convidados_aplicada: number | null;
  taxa_fixa: number;
  valor_calculado: number;
  ordem: number;
};

export type OrcamentoPayload = {
  contato_nome: string;
  contato_telefone: string | null;
  contato_email: string | null;
  tipo_evento: string;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  numero_convidados: number | null;
  validade_dias: number;
  itens: ItemPayload[];
};

function validar(p: OrcamentoPayload): string | null {
  if (!p.contato_nome.trim()) return "Informe o nome do contato.";
  if (!p.tipo_evento) return "Escolha o tipo de evento.";
  if (![7, 14, 30, 60, 90].includes(p.validade_dias)) {
    return "Validade inválida.";
  }
  for (const item of p.itens) {
    if (!item.nome.trim()) return "Todo item precisa de um nome.";
    if (!Number.isFinite(item.valor_calculado) || item.valor_calculado < 0) {
      return `Valor inválido no item "${item.nome}".`;
    }
  }
  return null;
}

async function contexto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("meu_cargo");
  const empresaId = (data as { empresa_id: string }[] | null)?.[0]?.empresa_id;
  return { supabase, empresaId };
}

// Cria ou atualiza o orçamento. Itens: substituição completa (o snapshot
// é sempre o estado atual do formulário); o trigger da Etapa 1 recalcula
// valor_total sozinho.
export async function salvarOrcamento(
  orcamentoId: string | null,
  payload: OrcamentoPayload
): Promise<SalvarOrcamentoState> {
  const invalido = validar(payload);
  if (invalido) return { error: invalido };

  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const campos = {
    contato_nome: payload.contato_nome.trim(),
    contato_telefone: payload.contato_telefone?.trim() || null,
    contato_email: payload.contato_email?.trim() || null,
    tipo_evento: payload.tipo_evento,
    data_evento: payload.data_evento || null,
    local_evento: payload.local_evento?.trim() || null,
    cidade_evento: payload.cidade_evento?.trim() || null,
    numero_convidados: payload.numero_convidados,
    validade_dias: payload.validade_dias,
  };

  let id = orcamentoId;

  if (id) {
    // Edição só de rascunho (enviado/aprovado é histórico do cliente).
    const { data: atual } = await supabase
      .from("orcamentos")
      .select("status")
      .eq("id", id)
      .single();
    if (!atual) return { error: "Orçamento não encontrado." };
    if (atual.status !== "rascunho") {
      return { error: "Só rascunhos podem ser editados." };
    }

    const { error } = await supabase
      .from("orcamentos")
      .update(campos)
      .eq("id", id);
    if (error) return { error: "Não foi possível salvar o orçamento." };

    const { error: delErr } = await supabase
      .from("orcamento_itens")
      .delete()
      .eq("orcamento_id", id);
    if (delErr) return { error: "Não foi possível atualizar os itens." };
  } else {
    const { data: criado, error } = await supabase
      .from("orcamentos")
      .insert({ ...campos, empresa_id: empresaId })
      .select("id")
      .single();
    if (error || !criado) {
      return { error: "Não foi possível criar o orçamento." };
    }
    id = criado.id;
  }

  if (payload.itens.length > 0) {
    const { error: itensErr } = await supabase.from("orcamento_itens").insert(
      payload.itens.map((item, i) => ({
        orcamento_id: id,
        modelo_precificacao_id: item.modelo_precificacao_id,
        nome: item.nome.trim(),
        descricao: item.descricao?.trim() || null,
        tipo_calculo: item.tipo_calculo,
        valor_unitario: item.valor_unitario,
        quantidade_convidados_aplicada: item.quantidade_convidados_aplicada,
        taxa_fixa: item.taxa_fixa || 0,
        valor_calculado: item.valor_calculado,
        ordem: i,
      }))
    );
    if (itensErr) return { error: "Não foi possível salvar os itens." };
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  return { success: true, id: id! };
}

export async function excluirOrcamento(
  orcamentoId: string
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await contexto();

  const { data: orc } = await supabase
    .from("orcamentos")
    .select("status")
    .eq("id", orcamentoId)
    .single();
  if (!orc) return { error: "Orçamento não encontrado." };
  if (orc.status !== "rascunho") {
    return { error: "Só rascunhos podem ser excluídos." };
  }

  const { error } = await supabase
    .from("orcamentos")
    .delete()
    .eq("id", orcamentoId);
  if (error) return { error: "Não foi possível excluir." };

  revalidatePath("/orcamentos");
  return { success: true };
}

// Duplica orçamento + itens como novo rascunho (novo hash pelo default).
export async function duplicarOrcamento(
  orcamentoId: string
): Promise<{ error: string } | { success: true; id: string }> {
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const { data: orc } = await supabase
    .from("orcamentos")
    .select("*")
    .eq("id", orcamentoId)
    .single();
  if (!orc) return { error: "Orçamento não encontrado." };

  const { data: novo, error } = await supabase
    .from("orcamentos")
    .insert({
      empresa_id: empresaId,
      contato_nome: `${orc.contato_nome} (cópia)`,
      contato_telefone: orc.contato_telefone,
      contato_email: orc.contato_email,
      tipo_evento: orc.tipo_evento,
      data_evento: orc.data_evento,
      local_evento: orc.local_evento,
      cidade_evento: orc.cidade_evento,
      numero_convidados: orc.numero_convidados,
      validade_dias: orc.validade_dias,
    })
    .select("id")
    .single();
  if (error || !novo) return { error: "Não foi possível duplicar." };

  const { data: itens } = await supabase
    .from("orcamento_itens")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .order("ordem");

  if (itens && itens.length > 0) {
    await supabase.from("orcamento_itens").insert(
      itens.map((i) => ({
        orcamento_id: novo.id,
        modelo_precificacao_id: i.modelo_precificacao_id,
        nome: i.nome,
        descricao: i.descricao,
        tipo_calculo: i.tipo_calculo,
        valor_unitario: i.valor_unitario,
        quantidade_convidados_aplicada: i.quantidade_convidados_aplicada,
        taxa_fixa: i.taxa_fixa,
        valor_calculado: i.valor_calculado,
        ordem: i.ordem,
      }))
    );
  }

  revalidatePath("/orcamentos");
  return { success: true, id: novo.id };
}
