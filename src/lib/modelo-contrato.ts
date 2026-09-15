"use server";

// O modelo de contrato de prestação que a cerimonialista sobe (163).
//
// Um padrão da empresa (Configurações) e, quando ela quiser, um diferente
// por tipo de evento (Catálogo). No aceite, a rota copia o modelo vigente
// para os documentos da cliente — trocar o modelo depois não mexe no que
// uma cliente já aceitou.
//
// Duas etapas, como o anexo de contrato do fornecedor (anexo-actions.ts):
// o PDF sobe do navegador direto para o armazenamento (passa fácil do
// corpo de uma função), e só então a confirmação lê o arquivo no servidor,
// confere que é PDF, calcula o SHA-256 e grava as colunas.
//
// Só a proprietária: é quem vê Configurações › Minha Empresa e o
// Catálogo, e é o que as policies das duas tabelas deixam gravar.

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  BALDE_CONTRATOS,
  LIMITE_BYTES,
  apagarArquivo,
  baixarArquivo,
  caminhoDoModelo,
  permitirEnvioEm,
  prefixoDoModelo,
  urlParaLerDe,
  type PermissaoDeEnvio,
} from "@/lib/contratos";
import { tipoValido } from "@/lib/catalogo";

export type ModeloContratoSalvo = { nome: string; em: string };

type Resultado<T> = { error: string } | ({ success: true } & T);

const SEM_MIGRACAO = "Esta parte ainda não está disponível neste banco. Avise a gente.";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
}

/** null = o padrão da empresa; um tipo válido = a exceção dele. */
function tipoOuPadrao(tipo: string | null): { ok: true; tipo: string | null } | { ok: false } {
  if (tipo === null) return { ok: true, tipo: null };
  const t = tipoValido(tipo);
  return t ? { ok: true, tipo: t } : { ok: false };
}

async function daProprietaria() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc("meu_cargo");
  const cargo = (data as { empresa_id: string; cargo: string }[] | null)?.[0];
  if (!cargo?.empresa_id || cargo.cargo !== "proprietaria") return null;
  return { supabase, empresaId: cargo.empresa_id };
}

function nomeLimpo(nome: string): string {
  const base = (nome.split(/[\\/]/).pop() ?? "").replace(/[\r\n\t]/g, " ").trim();
  return (base || "contrato.pdf").slice(0, 120);
}

function onde(tipo: string | null): string {
  return tipo ? `/catalogo/${tipo}` : "/configuracoes";
}

/** O caminho gravado hoje (padrão ou exceção), lido pela sessão dela. */
async function caminhoAtual(
  supabase: ReturnType<typeof createClient>,
  empresaId: string,
  tipo: string | null
): Promise<{ caminho: string | null; erro: boolean }> {
  const consulta = tipo
    ? supabase
        .from("empresa_conteudo_institucional")
        .select("contrato_modelo_path")
        .eq("empresa_id", empresaId)
        .eq("tipo_evento", tipo)
        .maybeSingle()
    : supabase.from("empresas").select("contrato_modelo_path").eq("id", empresaId).maybeSingle();
  const { data, error } = await consulta;
  if (error) return { caminho: null, erro: true };
  return {
    caminho: (data as { contrato_modelo_path?: string | null } | null)?.contrato_modelo_path ?? null,
    erro: false,
  };
}

async function gravarColunas(
  supabase: ReturnType<typeof createClient>,
  empresaId: string,
  tipo: string | null,
  colunas: {
    contrato_modelo_path: string | null;
    contrato_modelo_nome: string | null;
    contrato_modelo_sha256: string | null;
    contrato_modelo_bytes: number | null;
    contrato_modelo_em: string | null;
  }
): Promise<string | null> {
  // .select(): a RLS não dá erro quando filtra — um update que não alcança
  // a linha volta "sucesso" com zero linhas. Sem conferir, a confirmação
  // apagaria o modelo anterior com as colunas ainda apontando para ele.
  const { data, error } = tipo
    ? await supabase
        .from("empresa_conteudo_institucional")
        .upsert(
          { empresa_id: empresaId, tipo_evento: tipo, ...colunas, updated_at: new Date().toISOString() },
          { onConflict: "empresa_id,tipo_evento" }
        )
        .select("empresa_id")
    : await supabase.from("empresas").update(colunas).eq("id", empresaId).select("id");
  if (error) return error.message;
  return (data ?? []).length === 1 ? null : "nenhuma linha gravada (sem permissão)";
}

/** 1ª etapa: a permissão para o navegador subir UM PDF num caminho novo. */
export async function pedirEnvioModeloContrato(
  tipo: string | null,
  nome: string,
  mime: string,
  bytes: number
): Promise<{ error: string } | { permissao: PermissaoDeEnvio }> {
  const t = tipoOuPadrao(tipo);
  if (!t.ok) return { error: "Tipo de evento inválido." };
  if (mime !== "application/pdf" && !/\.pdf$/i.test(nome)) {
    return { error: "Envie o contrato em PDF." };
  }
  if (bytes > LIMITE_BYTES) return { error: "O arquivo passa de 10 MB." };

  const ctx = await daProprietaria();
  if (!ctx) return { error: "Só a proprietária troca o contrato da empresa." };
  const servico = admin();
  if (!servico) return { error: "Envio indisponível agora. Tente de novo em instantes." };

  const caminho = caminhoDoModelo(ctx.empresaId, t.tipo, randomUUID(), nomeLimpo(nome));
  const permissao = await permitirEnvioEm(servico, BALDE_CONTRATOS, caminho);
  if (!permissao) return { error: "Não deu para preparar o envio. Tente de novo." };
  return { permissao };
}

/**
 * 2ª etapa: o arquivo já está no balde. Confere que é PDF de verdade (os
 * primeiros bytes, não a extensão), calcula o SHA-256, grava as colunas e
 * só então apaga o modelo anterior — os aceites que já copiaram o antigo
 * guardam a própria cópia.
 */
export async function confirmarModeloContrato(
  tipo: string | null,
  caminho: string,
  nome: string
): Promise<Resultado<ModeloContratoSalvo>> {
  const t = tipoOuPadrao(tipo);
  if (!t.ok) return { error: "Tipo de evento inválido." };
  const ctx = await daProprietaria();
  if (!ctx) return { error: "Só a proprietária troca o contrato da empresa." };
  const servico = admin();
  if (!servico) return { error: "Envio indisponível agora. Tente de novo em instantes." };

  // o caminho vem do navegador: só vale o que a 1ª etapa poderia ter dado
  if (!caminho.startsWith(prefixoDoModelo(ctx.empresaId, t.tipo)) || caminho.includes("..")) {
    return { error: "Envio inválido. Escolha o arquivo de novo." };
  }

  const arquivo = await baixarArquivo(servico, BALDE_CONTRATOS, caminho);
  if (!arquivo) return { error: "O arquivo não chegou. Envie de novo." };
  if (arquivo.subarray(0, 5).toString("latin1") !== "%PDF-" || arquivo.length > LIMITE_BYTES) {
    await apagarArquivo(servico, BALDE_CONTRATOS, caminho);
    return {
      error:
        arquivo.length > LIMITE_BYTES
          ? "O arquivo passa de 10 MB."
          : "Este arquivo não é um PDF. Salve o contrato como PDF e envie de novo.",
    };
  }

  const anterior = await caminhoAtual(ctx.supabase, ctx.empresaId, t.tipo);
  if (anterior.erro) {
    await apagarArquivo(servico, BALDE_CONTRATOS, caminho);
    return { error: SEM_MIGRACAO };
  }

  const em = new Date().toISOString();
  const salvo = { nome: nomeLimpo(nome), em };
  const falha = await gravarColunas(ctx.supabase, ctx.empresaId, t.tipo, {
    contrato_modelo_path: caminho,
    contrato_modelo_nome: salvo.nome,
    contrato_modelo_sha256: createHash("sha256").update(arquivo).digest("hex"),
    contrato_modelo_bytes: arquivo.length,
    contrato_modelo_em: em,
  });
  if (falha) {
    console.error(`[eorg:modelo-contrato] gravar: ${falha}`);
    await apagarArquivo(servico, BALDE_CONTRATOS, caminho);
    return { error: /column|coluna/i.test(falha) ? SEM_MIGRACAO : "Não foi possível salvar o contrato." };
  }

  if (anterior.caminho && anterior.caminho !== caminho) {
    await apagarArquivo(servico, BALDE_CONTRATOS, anterior.caminho);
  }

  revalidatePath(onde(t.tipo));
  return { success: true, ...salvo };
}

/** Tira o modelo. Propostas abertas deixam de citar contrato; aceites antigos ficam intactos. */
export async function removerModeloContrato(tipo: string | null): Promise<Resultado<object>> {
  const t = tipoOuPadrao(tipo);
  if (!t.ok) return { error: "Tipo de evento inválido." };
  const ctx = await daProprietaria();
  if (!ctx) return { error: "Só a proprietária troca o contrato da empresa." };
  const servico = admin();
  if (!servico) return { error: "Indisponível agora. Tente de novo em instantes." };

  const anterior = await caminhoAtual(ctx.supabase, ctx.empresaId, t.tipo);
  if (anterior.erro) return { error: SEM_MIGRACAO };

  const falha = await gravarColunas(ctx.supabase, ctx.empresaId, t.tipo, {
    contrato_modelo_path: null,
    contrato_modelo_nome: null,
    contrato_modelo_sha256: null,
    contrato_modelo_bytes: null,
    contrato_modelo_em: null,
  });
  if (falha) {
    console.error(`[eorg:modelo-contrato] remover: ${falha}`);
    return { error: "Não foi possível remover o contrato." };
  }
  if (anterior.caminho) await apagarArquivo(servico, BALDE_CONTRATOS, anterior.caminho);

  revalidatePath(onde(t.tipo));
  return { success: true };
}

/** URL de leitura de poucos minutos, para ela conferir o arquivo que subiu. */
export async function abrirModeloContrato(tipo: string | null): Promise<{ error: string } | { url: string }> {
  const t = tipoOuPadrao(tipo);
  if (!t.ok) return { error: "Tipo de evento inválido." };
  const ctx = await daProprietaria();
  if (!ctx) return { error: "Só a proprietária abre o contrato da empresa." };
  const servico = admin();
  if (!servico) return { error: "Indisponível agora. Tente de novo em instantes." };

  const atual = await caminhoAtual(ctx.supabase, ctx.empresaId, t.tipo);
  if (!atual.caminho || !atual.caminho.startsWith(`${ctx.empresaId}/modelos/`)) {
    return { error: "Nenhum contrato enviado." };
  }
  const url = await urlParaLerDe(servico, BALDE_CONTRATOS, atual.caminho, 300);
  return url ? { url } : { error: "O arquivo não foi encontrado." };
}
