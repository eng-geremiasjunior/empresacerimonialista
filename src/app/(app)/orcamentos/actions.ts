"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enviarEmailOrcamento } from "@/lib/email";
import { TEMPLATES_POR_TIPO } from "@/lib/proposta-templates";
import type { EventType } from "@/lib/types";

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
  template_proposta: string | null;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  numero_convidados: number | null;
  validade_dias: number;
  itens: ItemPayload[];
  /**
   * O pedido da página pública que esta proposta responde (165). Só vale
   * na criação: a proposta herda o canal do pedido, e o pedido sai da fila.
   */
  pedido_id?: string | null;
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
  const linha = (data as
    | { empresa_id: string; membro_equipe_id?: string }[]
    | null)?.[0];
  return {
    supabase,
    empresaId: linha?.empresa_id,
    membroId: linha?.membro_equipe_id ?? null,
  };
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

  const { supabase, empresaId, membroId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const campos = {
    contato_nome: payload.contato_nome.trim(),
    contato_telefone: payload.contato_telefone?.trim() || null,
    contato_email: payload.contato_email?.trim() || null,
    tipo_evento: payload.tipo_evento,
    // Só grava o template para os tipos que têm opção (hoje debutante):
    // para os outros fica null e a página usa o template único do tipo.
    template_proposta:
      TEMPLATES_POR_TIPO[payload.tipo_evento as EventType]?.some(
        (t) => t.valor === payload.template_proposta
      )
        ? payload.template_proposta
        : null,
    data_evento: payload.data_evento || null,
    local_evento: payload.local_evento?.trim() || null,
    cidade_evento: payload.cidade_evento?.trim() || null,
    numero_convidados: payload.numero_convidados,
    validade_dias: payload.validade_dias,
  };

  let id = orcamentoId;
  let pedido: { id: string; canal: string } | null = null;

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
    // O pedido é lido pela sessão: a RLS só devolve pedido da empresa e de
    // quem pode respondê-lo. Id de fora (ou de outra empresa) não liga nada
    // e não impede a proposta de nascer.
    if (payload.pedido_id) {
      const { data: p } = await supabase
        .from("pedido_orcamento")
        .select("id, canal")
        .eq("id", payload.pedido_id)
        .maybeSingle();
      pedido = (p as { id: string; canal: string } | null) ?? null;
    }

    const { data: criado, error } = await supabase
      .from("orcamentos")
      .insert({
        ...campos,
        ...(pedido ? { pedido_id: pedido.id, canal: pedido.canal } : {}),
        empresa_id: empresaId,
        // quem cria a proposta conduz o evento que nascer dela — sem isso
        // o evento gerado fica sem responsável e só a dona o enxerga
        cerimonialista_responsavel_id: membroId,
      })
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

  // O pedido sai da fila: virou proposta. Melhor esforço — a proposta já
  // existe e aponta para ele; se esta escrita falhar, o pedido só continua
  // aparecendo como aberto até ela encerrar.
  if (pedido) {
    const { error: pedErr } = await supabase
      .from("pedido_orcamento")
      .update({ status: "em_proposta", orcamento_id: id })
      .eq("id", pedido.id);
    if (pedErr) console.error("[eorg:pedido] ligar a proposta:", pedErr.code, pedErr.message);
    revalidatePath("/orcamentos/pedidos");
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
      template_proposta: orc.template_proposta,
      data_evento: orc.data_evento,
      local_evento: orc.local_evento,
      cidade_evento: orc.cidade_evento,
      numero_convidados: orc.numero_convidados,
      validade_dias: orc.validade_dias,
      // a cópia continua sabendo de onde a negociação veio (165)
      canal: orc.canal ?? "manual",
      pedido_id: orc.pedido_id ?? null,
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

// Para onde vai a resposta da cliente quando ela responde o e-mail do
// orçamento. O nosso domínio envia e não recebe, então a resposta precisa
// cair na caixa dela: primeiro o e-mail de contato do Catálogo para este
// tipo de evento; sem ele, o de qualquer tipo (o mais recente); sem
// Catálogo, o de quem conduz a proposta; por último o da proprietária.
//
// O Catálogo só é legível pela proprietária (policy da 045). Quando outra
// pessoa da equipe envia, a consulta volta vazia — sem erro — e a cadeia
// segue para a equipe, que toda a empresa enxerga.
async function emailParaResposta(
  supabase: Awaited<ReturnType<typeof contexto>>["supabase"],
  empresaId: string,
  tipoEvento: string | null,
  responsavelId: string | null
): Promise<string | null> {
  const { data: catalogo } = await supabase
    .from("empresa_conteudo_institucional")
    .select("tipo_evento, email_contato")
    .eq("empresa_id", empresaId)
    .not("email_contato", "is", null)
    .order("updated_at", { ascending: false });
  const doCatalogo = (catalogo ?? [])
    .map((l) => ({ tipo: l.tipo_evento as string | null, email: (l.email_contato as string | null)?.trim() ?? "" }))
    .filter((l) => l.email);
  const doTipo = doCatalogo.find((l) => l.tipo === tipoEvento);
  if (doTipo) return doTipo.email;
  if (doCatalogo[0]) return doCatalogo[0].email;

  const { data: equipe } = await supabase
    .from("membros_equipe")
    .select("id, email, is_owner, cargo")
    .eq("empresa_id", empresaId)
    .eq("status", "ativo");
  const membros = (equipe ?? []).map((m) => ({
    id: m.id as string,
    email: (m.email as string | null)?.trim() ?? "",
    dona: Boolean(m.is_owner) || m.cargo === "proprietaria",
  }));
  const responsavel = membros.find((m) => m.id === responsavelId && m.email);
  if (responsavel) return responsavel.email;
  const dona = membros.find((m) => m.dona && m.email);
  return dona?.email || null;
}

// Envia o orçamento ao cliente: muda status para 'enviado' e, se houver
// e-mail no contato, dispara o aviso com o link público. O link em si é
// sempre exibido na tela para copiar (o e-mail é um extra).
//
// Devolve também o telefone e o nome do contato (nomes das colunas) para
// a tela montar o botão de WhatsApp com o link já no texto.
export async function enviarOrcamento(
  orcamentoId: string
): Promise<
  | { error: string }
  | {
      success: true;
      hash: string;
      emailEnviado: boolean;
      emailErro?: string;
      contato_telefone?: string | null;
      contato_nome?: string;
    }
> {
  const { supabase } = await contexto();

  const { data: orc } = await supabase
    .from("orcamentos")
    .select(
      "id, status, hash_publico, contato_nome, contato_email, contato_telefone, empresa_id, tipo_evento, cerimonialista_responsavel_id"
    )
    .eq("id", orcamentoId)
    .single();

  if (!orc) return { error: "Orçamento não encontrado." };
  if (orc.status !== "rascunho") {
    return { error: "Este orçamento já foi enviado." };
  }

  const { error } = await supabase
    .from("orcamentos")
    .update({ status: "enviado" })
    .eq("id", orcamentoId);
  if (error) return { error: "Não foi possível enviar o orçamento." };

  let emailEnviado = false;
  let emailErro: string | undefined;

  if (orc.contato_email) {
    const [{ data: empresa }, replyTo] = await Promise.all([
      supabase
        .from("empresas")
        .select("nome")
        .eq("id", orc.empresa_id)
        .maybeSingle(),
      emailParaResposta(
        supabase,
        orc.empresa_id,
        orc.tipo_evento ?? null,
        orc.cerimonialista_responsavel_id ?? null
      ),
    ]);

    const envio = await enviarEmailOrcamento({
      to: orc.contato_email,
      contatoNome: orc.contato_nome,
      nomeEmpresa: empresa?.nome ?? "eorganizei",
      hash: orc.hash_publico,
      replyTo,
    });
    emailEnviado = envio.ok;
    if (!envio.ok) emailErro = envio.error;
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
  return {
    success: true,
    hash: orc.hash_publico,
    emailEnviado,
    emailErro,
    contato_telefone: orc.contato_telefone ?? null,
    contato_nome: orc.contato_nome,
  };
}
