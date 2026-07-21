"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ModeloFormState = { error: string } | { success: true } | null;

function readForm(formData: FormData) {
  const num = (k: string): number | null => {
    const raw = String(formData.get(k) ?? "").trim().replace(",", ".");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    categoria: String(formData.get("categoria") ?? "").trim() || null,
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    tipoCalculo: String(formData.get("tipo_calculo") ?? "fixo"),
    valorFixo: num("valor_fixo"),
    valorPorConvidado: num("valor_por_convidado"),
    taxaFixaAdicional: num("taxa_fixa_adicional") ?? 0,
    ativo: String(formData.get("ativo") ?? "true") === "true",
  };
}

function validate(f: ReturnType<typeof readForm>): string | null {
  if (!f.nome) return "Informe o nome do modelo.";
  if (f.tipoCalculo !== "fixo" && f.tipoCalculo !== "por_convidado") {
    return "Escolha o tipo de cálculo.";
  }
  if (f.tipoCalculo === "fixo" && f.valorFixo == null) {
    return "Informe o valor fixo.";
  }
  if (f.tipoCalculo === "por_convidado" && f.valorPorConvidado == null) {
    return "Informe o valor por convidado.";
  }
  return null;
}

async function empresaDoUsuario() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("meu_cargo");
  const empresaId = (data as { empresa_id: string }[] | null)?.[0]?.empresa_id;
  return { supabase, empresaId };
}

export async function criarModelo(
  _prev: ModeloFormState,
  formData: FormData
): Promise<ModeloFormState> {
  const f = readForm(formData);
  const invalido = validate(f);
  if (invalido) return { error: invalido };

  const { supabase, empresaId } = await empresaDoUsuario();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const { error } = await supabase.from("modelos_precificacao").insert({
    empresa_id: empresaId,
    nome: f.nome,
    categoria: f.categoria,
    descricao: f.descricao,
    tipo_calculo: f.tipoCalculo,
    valor_fixo: f.tipoCalculo === "fixo" ? f.valorFixo : null,
    valor_por_convidado:
      f.tipoCalculo === "por_convidado" ? f.valorPorConvidado : null,
    taxa_fixa_adicional:
      f.tipoCalculo === "por_convidado" ? f.taxaFixaAdicional : 0,
    ativo: f.ativo,
  });

  if (error) return { error: "Não foi possível salvar o modelo." };
  revalidatePath("/orcamentos/modelos");
  return { success: true };
}

export async function editarModelo(
  modeloId: string,
  _prev: ModeloFormState,
  formData: FormData
): Promise<ModeloFormState> {
  const f = readForm(formData);
  const invalido = validate(f);
  if (invalido) return { error: invalido };

  const { supabase } = await empresaDoUsuario();

  const { error } = await supabase
    .from("modelos_precificacao")
    .update({
      nome: f.nome,
      categoria: f.categoria,
      descricao: f.descricao,
      tipo_calculo: f.tipoCalculo,
      valor_fixo: f.tipoCalculo === "fixo" ? f.valorFixo : null,
      valor_por_convidado:
        f.tipoCalculo === "por_convidado" ? f.valorPorConvidado : null,
      taxa_fixa_adicional:
        f.tipoCalculo === "por_convidado" ? f.taxaFixaAdicional : 0,
      ativo: f.ativo,
    })
    .eq("id", modeloId);

  if (error) return { error: "Não foi possível salvar o modelo." };
  revalidatePath("/orcamentos/modelos");
  return { success: true };
}

export async function setModeloAtivo(modeloId: string, ativo: boolean) {
  const { supabase } = await empresaDoUsuario();
  await supabase
    .from("modelos_precificacao")
    .update({ ativo })
    .eq("id", modeloId);
  revalidatePath("/orcamentos/modelos");
}

// Excluir SÓ quando o modelo nunca foi usado num orçamento (a UI já
// desabilita, mas a checagem de verdade é aqui).
export async function excluirModelo(
  modeloId: string
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await empresaDoUsuario();

  const { count } = await supabase
    .from("orcamento_itens")
    .select("id", { count: "exact", head: true })
    .eq("modelo_precificacao_id", modeloId);

  if ((count ?? 0) > 0) {
    return {
      error:
        "Este modelo já foi usado em orçamentos. Desative-o em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("modelos_precificacao")
    .delete()
    .eq("id", modeloId);

  if (error) return { error: "Não foi possível excluir o modelo." };
  revalidatePath("/orcamentos/modelos");
  return { success: true };
}
