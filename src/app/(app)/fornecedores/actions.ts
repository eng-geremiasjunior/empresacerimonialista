"use server";

// CRUD de fornecedores. empresa_id nunca vem do client: é preenchido
// pelo trigger fill_empresa_from_cerimonialista (migração 021). O RLS por
// cargo (024) garante que só quem pode gerenciar escreve.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  slugCategoria,
  type FaixaPreco,
  type StatusFornecedor,
  type TipoOperacional,
} from "@/lib/fornecedores-shared";

type Resultado = { error?: string; id?: string };

const TIPOS: TipoOperacional[] = ["operacional", "apoio", "parceiro"];
const STATUSES: StatusFornecedor[] = [
  "ativo",
  "inativo",
  "bloqueado",
  "favorito",
  "parceiro_premium",
];
const FAIXAS: FaixaPreco[] = ["economico", "intermediario", "premium"];

export type FornecedorInput = {
  name: string;
  descricao: string;
  tipo_operacional: string;
  status: string;
  faixa_preco: string; // "" = não informado
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  endereco: string;
  cidade: string;
  categorias: string[];
};

function validar(input: FornecedorInput): string | null {
  if (!input.name.trim()) return "Informe o nome do fornecedor";
  if (!TIPOS.includes(input.tipo_operacional as TipoOperacional)) {
    return "Tipo operacional inválido";
  }
  if (!STATUSES.includes(input.status as StatusFornecedor)) {
    return "Status inválido";
  }
  if (input.faixa_preco && !FAIXAS.includes(input.faixa_preco as FaixaPreco)) {
    return "Faixa de preço inválida";
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "E-mail inválido";
  }
  if (input.categorias.length === 0) {
    return "Selecione ao menos uma categoria de serviço";
  }
  return null;
}

function dbFields(input: FornecedorInput) {
  return {
    name: input.name.trim(),
    descricao: input.descricao.trim() || null,
    tipo_operacional: input.tipo_operacional,
    status: input.status,
    faixa_preco: input.faixa_preco || null,
    phone: input.phone.trim() || null,
    whatsapp: input.whatsapp.trim() || null,
    email: input.email.trim() || null,
    cpf: input.cpf.trim() || null,
    endereco: input.endereco.trim() || null,
    cidade: input.cidade.trim() || null,
  };
}

// Normaliza e deduplica os slugs de categoria.
function slugsUnicos(categorias: string[]): string[] {
  return [...new Set(categorias.map(slugCategoria).filter(Boolean))];
}

async function sincronizarCategorias(
  supabase: ReturnType<typeof createClient>,
  supplierId: string,
  categorias: string[]
) {
  const slugs = slugsUnicos(categorias);
  if (slugs.length === 0) {
    await supabase
      .from("supplier_categorias")
      .delete()
      .eq("supplier_id", supplierId);
    return;
  }
  // Remove as que não estão mais e insere as novas (idempotente).
  await supabase
    .from("supplier_categorias")
    .delete()
    .eq("supplier_id", supplierId)
    .not("categoria", "in", `(${slugs.map((s) => `"${s}"`).join(",")})`);
  await supabase
    .from("supplier_categorias")
    .upsert(
      slugs.map((categoria) => ({ supplier_id: supplierId, categoria })),
      { onConflict: "supplier_id,categoria", ignoreDuplicates: true }
    );
}

export async function criarFornecedor(
  input: FornecedorInput
): Promise<Resultado> {
  const erro = validar(input);
  if (erro) return { error: erro };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data, error } = await supabase
    .from("suppliers")
    .insert({ cerimonialista_id: user.id, ...dbFields(input) })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Não foi possível cadastrar o fornecedor" };
  }

  await sincronizarCategorias(supabase, data.id, input.categorias);
  revalidatePath("/fornecedores");
  return { id: data.id };
}

export async function editarFornecedor(
  id: string,
  input: FornecedorInput
): Promise<Resultado> {
  const erro = validar(input);
  if (erro) return { error: erro };

  const supabase = createClient();
  const { error } = await supabase
    .from("suppliers")
    .update(dbFields(input))
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações" };

  await sincronizarCategorias(supabase, id, input.categorias);
  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
  return { id };
}// setStatusFornecedor era um atalho sem chamador: o modal do fornecedor
// já troca o status pelo select alimentado por STATUS_LABELS.
// ------------------------------------------------------------------
// Ações da tela nova: favoritar em lote e vincular a evento
// ------------------------------------------------------------------

// Teto de lote: protege a query string do PostgREST e o tempo de resposta.
// NÃO exportado — arquivo "use server" só pode exportar função async.
const MAX_LOTE = 200;

/**
 * Favoritar em lote, a partir da barra de seleção.
 *
 * "Favorito" não é uma coluna própria: é um VALOR de status (026), então
 * marcar sobrescreve o status atual. Por isso só alcança quem está
 * 'ativo' — favoritar em lote não pode ressuscitar um inativo nem apagar
 * um "não contratar" que ela marcou de propósito.
 */
export async function marcarComoFavorito(
  ids: string[]
): Promise<{ error?: string; alterados?: number; pedidos?: number }> {
  const limpos = [...new Set(ids.filter(Boolean))].slice(0, MAX_LOTE);
  if (limpos.length === 0) return { alterados: 0, pedidos: 0 };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update({ status: "favorito" })
    .in("id", limpos)
    .eq("status", "ativo")
    .select("id");

  if (error) return { error: "Não foi possível marcar como favorito" };
  revalidatePath("/fornecedores");
  for (const id of limpos) revalidatePath(`/fornecedores/${id}`);
  // "alterados" pode ser MENOR que o pedido: quem não estava 'ativo' fica
  // de fora de propósito. Quem chama precisa contar isso, senão a seleção
  // some como se tudo tivesse funcionado.
  return { alterados: data?.length ?? 0, pedidos: limpos.length };
}

/** Desfaz o favorito: volta para 'ativo', que é de onde ele saiu. */
export async function desmarcarFavorito(
  id: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ status: "ativo" })
    .eq("id", id)
    .eq("status", "favorito");
  if (error) return { error: "Não foi possível desmarcar" };
  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
  return {};
}

export type EventoParaVincular = {
  id: string;
  label: string;
  date: string;
};

/**
 * Os eventos que ainda podem receber fornecedor.
 *
 * Só o que ainda vai acontecer. Sem o corte por data, o menu abria com
 * orçamentos de meses atrás no topo (a ordem é por data crescente) — os
 * menos prováveis primeiro, e o casamento da semana que vem enterrado
 * lá embaixo.
 *
 * Erro NÃO vira lista vazia: "Nenhum evento em aberto" é uma afirmação, e
 * afirmá-la porque a consulta falhou faria ela cadastrar um evento que já
 * existe.
 */
export async function eventosParaVincular(): Promise<{
  eventos: EventoParaVincular[];
  error?: string;
}> {
  const supabase = createClient();
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const { data, error } = await supabase
    .from("events")
    .select("id, name, date, status, archived, clients(name)")
    .not("status", "in", "(concluido,cancelado)")
    .gte("date", hoje)
    .order("date", { ascending: true })
    .limit(200);

  if (error) return { eventos: [], error: "Não foi possível carregar os eventos." };

  const eventos = ((data ?? []) as unknown as {
    id: string;
    name: string | null;
    date: string;
    archived: boolean | null;
    clients: { name: string } | null;
  }[])
    .filter((e) => e.archived !== true)
    .map((e) => ({
      id: e.id,
      label: e.name || e.clients?.name || "Evento sem nome",
      date: e.date,
    }));

  return { eventos };
}

/**
 * Vincula um ou vários fornecedores a um evento — o mesmo upsert em
 * roteiro_links que a tela do evento já faz, com o mesmo fallback para a
 * coluna `role` ausente (027 pendente). Idempotente.
 */
export async function vincularAoEvento(
  eventId: string,
  supplierIds: string[]
): Promise<{ error?: string; vinculados?: number }> {
  const limpos = [...new Set(supplierIds.filter(Boolean))].slice(0, MAX_LOTE);
  if (!eventId || limpos.length === 0) return { vinculados: 0 };

  const supabase = createClient();
  const linhas = limpos.map((supplier_id) => ({
    event_id: eventId,
    supplier_id,
    hash: randomBytes(16).toString("hex"),
  }));

  let { error } = await supabase
    .from("roteiro_links")
    .upsert(
      linhas.map((l) => ({ ...l, role: null })),
      { onConflict: "event_id,supplier_id", ignoreDuplicates: true }
    );

  if (error?.code === "42703") {
    ({ error } = await supabase
      .from("roteiro_links")
      .upsert(linhas, { onConflict: "event_id,supplier_id", ignoreDuplicates: true }));
  }

  if (error) return { error: "Não foi possível vincular ao evento" };

  revalidatePath("/fornecedores");
  revalidatePath(`/eventos/${eventId}/fornecedores`);
  revalidatePath(`/eventos/${eventId}/roteiro`);
  revalidatePath("/eventos/[id]", "layout");
  return { vinculados: limpos.length };
}
