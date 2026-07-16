"use server";

// CRUD de fornecedores. empresa_id nunca vem do client: é preenchido
// pelo trigger fill_empresa_from_cerimonialista (migração 021). O RLS por
// cargo (024) garante que só quem pode gerenciar escreve.

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
}

export async function setStatusFornecedor(
  id: string,
  status: string
): Promise<Resultado> {
  if (!STATUSES.includes(status as StatusFornecedor)) {
    return { error: "Status inválido" };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({ status })
    .eq("id", id);
  if (error) return { error: "Não foi possível alterar o status" };
  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
  return { id };
}
