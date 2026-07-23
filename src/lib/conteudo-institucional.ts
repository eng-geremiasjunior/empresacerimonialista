"use server";

// Conteúdo institucional da empresa (Etapa 7) — textos fixos que a
// landing page da proposta (Etapa 9) vai consumir. Só a proprietária
// edita (RLS da migração 045 garante; aqui é a camada de escrita).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ConteudoInstitucional = {
  id: string;
  empresa_id: string;
  sobre_nos_texto: string | null;
  stat_anos_experiencia: number | null;
  stat_eventos_realizados: number | null;
  stat_dedicacao_percentual: number;
  stat_equipe_texto: string;
  condicao_entrada_percentual: number;
  condicao_parcelas_maximo: number;
  condicao_desconto_a_vista_percentual: number;
  condicao_prazo_parcelas_texto: string;
  whatsapp_contato: string | null;
  email_contato: string | null;
};

export type ProcessoEtapa = {
  id: string;
  empresa_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
};

export type FaqItem = {
  id: string;
  empresa_id: string;
  ordem: number;
  pergunta: string;
  resposta: string;
  ativo: boolean;
};

export type AcaoResult = { error: string } | { success: true };

async function contexto() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.rpc("meu_cargo");
  const cargo = (data as { empresa_id: string; cargo: string }[] | null)?.[0];
  return { supabase, empresaId: cargo?.empresa_id, cargo: cargo?.cargo };
}

function inteiro(v: FormDataEntryValue | null, padrao: number | null = null) {
  const s = String(v ?? "").trim();
  if (!s) return padrao;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : padrao;
}

// ---------- Sobre nós + estatísticas ----------
export async function salvarSobreNos(
  _prev: AcaoResult | null,
  formData: FormData
): Promise<AcaoResult> {
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const { error } = await supabase
    .from("empresa_conteudo_institucional")
    .update({
      sobre_nos_texto: String(formData.get("sobre_nos_texto") ?? "").trim() || null,
      stat_anos_experiencia: inteiro(formData.get("stat_anos_experiencia")),
      stat_eventos_realizados: inteiro(formData.get("stat_eventos_realizados")),
      stat_dedicacao_percentual: inteiro(formData.get("stat_dedicacao_percentual"), 100),
      stat_equipe_texto:
        String(formData.get("stat_equipe_texto") ?? "").trim() ||
        "Equipe Especializada",
      updated_at: new Date().toISOString(),
    })
    .eq("empresa_id", empresaId);

  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/configuracoes");
  return { success: true };
}

// ---------- Condições de pagamento + contato ----------
export async function salvarCondicoes(
  _prev: AcaoResult | null,
  formData: FormData
): Promise<AcaoResult> {
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const entrada = inteiro(formData.get("condicao_entrada_percentual"), 30) ?? 30;
  const desconto =
    inteiro(formData.get("condicao_desconto_a_vista_percentual"), 5) ?? 5;
  if (entrada > 100 || desconto > 100) {
    return { error: "Os percentuais devem ficar entre 0 e 100." };
  }

  const { error } = await supabase
    .from("empresa_conteudo_institucional")
    .update({
      condicao_entrada_percentual: entrada,
      condicao_parcelas_maximo:
        inteiro(formData.get("condicao_parcelas_maximo"), 7) ?? 7,
      condicao_desconto_a_vista_percentual: desconto,
      condicao_prazo_parcelas_texto:
        String(formData.get("condicao_prazo_parcelas_texto") ?? "").trim() ||
        "até 5 dias antes do evento",
      whatsapp_contato:
        String(formData.get("whatsapp_contato") ?? "").trim() || null,
      email_contato:
        String(formData.get("email_contato") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("empresa_id", empresaId);

  if (error) return { error: "Não foi possível salvar." };
  revalidatePath("/configuracoes");
  return { success: true };
}

// ---------- Depoimentos ----------
export async function salvarDepoimentos(
  itens: { texto: string; autor: string; contexto: string; ativo: boolean }[]
): Promise<AcaoResult> {
  const { supabase, empresaId, cargo } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };
  if (cargo !== "proprietaria") return { error: "Sem permissão." };

  // Autor e texto são o mínimo: depoimento sem um dos dois não diz nada.
  const validos = itens.filter((d) => d.texto.trim() && d.autor.trim());

  const { error: delErr } = await supabase
    .from("empresa_depoimentos")
    .delete()
    .eq("empresa_id", empresaId);
  if (delErr) return { error: "Não foi possível salvar os depoimentos." };

  if (validos.length > 0) {
    const { error } = await supabase.from("empresa_depoimentos").insert(
      validos.map((d, i) => ({
        empresa_id: empresaId,
        ordem: i + 1,
        texto: d.texto.trim(),
        autor: d.autor.trim(),
        contexto: d.contexto.trim() || null,
        ativo: d.ativo,
      }))
    );
    if (error) return { error: "Não foi possível salvar os depoimentos." };
  }

  revalidatePath("/configuracoes");
  return { success: true };
}

// ---------- Template visual da proposta ----------
export async function salvarTemplateOrcamento(
  template: string
): Promise<AcaoResult> {
  const { supabase, empresaId, cargo } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };
  if (cargo !== "proprietaria") return { error: "Sem permissão." };
  if (template !== "template_1" && template !== "template_2") {
    return { error: "Template inválido." };
  }

  const { error } = await supabase
    .from("empresas")
    .update({ template_orcamento: template })
    .eq("id", empresaId);

  if (error) return { error: "Não foi possível trocar o template." };
  revalidatePath("/configuracoes");
  return { success: true };
}

// ---------- Etapas do processo ----------
export async function salvarEtapas(
  etapas: { id?: string; titulo: string; descricao: string }[]
): Promise<AcaoResult> {
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const validas = etapas.filter((e) => e.titulo.trim());
  if (validas.length === 0) return { error: "Cadastre ao menos uma etapa." };

  // Substituição completa: a ordem é a da lista na tela.
  const { error: delErr } = await supabase
    .from("empresa_processo_etapas")
    .delete()
    .eq("empresa_id", empresaId);
  if (delErr) return { error: "Não foi possível salvar as etapas." };

  const { error } = await supabase.from("empresa_processo_etapas").insert(
    validas.map((e, i) => ({
      empresa_id: empresaId,
      ordem: i + 1,
      titulo: e.titulo.trim(),
      descricao: e.descricao.trim() || null,
    }))
  );

  if (error) return { error: "Não foi possível salvar as etapas." };
  revalidatePath("/configuracoes");
  return { success: true };
}

// ---------- FAQ ----------
export async function salvarFaq(
  itens: { id?: string; pergunta: string; resposta: string; ativo: boolean }[]
): Promise<AcaoResult> {
  const { supabase, empresaId } = await contexto();
  if (!empresaId) return { error: "Empresa não encontrada." };

  const validos = itens.filter((f) => f.pergunta.trim() && f.resposta.trim());

  const { error: delErr } = await supabase
    .from("empresa_faq")
    .delete()
    .eq("empresa_id", empresaId);
  if (delErr) return { error: "Não foi possível salvar as perguntas." };

  if (validos.length > 0) {
    const { error } = await supabase.from("empresa_faq").insert(
      validos.map((f, i) => ({
        empresa_id: empresaId,
        ordem: i + 1,
        pergunta: f.pergunta.trim(),
        resposta: f.resposta.trim(),
        ativo: f.ativo,
      }))
    );
    if (error) return { error: "Não foi possível salvar as perguntas." };
  }

  revalidatePath("/configuracoes");
  return { success: true };
}
