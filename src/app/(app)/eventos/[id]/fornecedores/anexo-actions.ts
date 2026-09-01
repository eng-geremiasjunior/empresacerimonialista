"use server";

// A cerimonialista anexa o contrato ELA MESMA (o fornecedor mandou por
// WhatsApp, ou o papel já estava na mão dela). O arquivo entra pela
// MESMA porta do fornecedor: mesmo balde privado, mesmo caminho
// canônico, mesma solicitação de contrato — só que respondida por ela
// (resposta.origem = 'cerimonialista'). Tudo que vem depois (a caixa
// "contrato recebido espera conferência", a leitura no navegador, a
// extração, a conferência) funciona sem mudar uma linha.
//
// Duas etapas, porque o arquivo sobe do navegador direto para o
// armazenamento (contrato passa fácil do corpo de uma função):
//   1. prepararAnexoContrato  → acha/cria a solicitação e devolve a
//      permissão de envio
//   2. confirmarAnexoContrato → grava a resposta apontando o arquivo

import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  apagarContrato,
  caminhoDoContrato,
  MIMES_ACEITOS,
  permitirEnvio,
  type PermissaoDeEnvio,
} from "@/lib/contratos";

export type PreparoAnexo =
  | { error: string }
  | { permissao: PermissaoDeEnvio; solicitacaoId: string };

export type ResultadoAnexo = { error: string } | { success: true };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
}

export async function prepararAnexoContrato(
  eventId: string,
  supplierId: string,
  nome: string,
  tipo: string
): Promise<PreparoAnexo> {
  if (!nome.trim()) return { error: "Arquivo sem nome." };
  if (!(MIMES_ACEITOS as readonly string[]).includes(tipo)) {
    return { error: "Formato não aceito. Envie PDF, foto ou documento do Word." };
  }

  const supabase = createClient();

  // A RLS decide: se ela não pode editar este evento, a leitura volta
  // vazia e nada acontece. empresa_id vem daqui — é o primeiro segmento
  // do caminho, o que as políticas do balde conferem.
  const { data: ev } = await supabase
    .from("events")
    .select("id, empresa_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev?.empresa_id) {
    return { error: "Evento não encontrado ou sem acesso." };
  }

  // A solicitação de contrato deste fornecedor: se existe (viva — ela
  // pediu e ele não respondeu — ou já respondida), reusa; senão cria já
  // respondida (o contrato chegou por outro caminho, não há o que
  // cobrar). O índice de solicitação viva não é tocado.
  const { data: existentes } = await supabase
    .from("solicitacao_fornecedor")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("supplier_id", supplierId)
    .eq("tipo", "contrato")
    .in("status", ["pendente", "enviada", "reenviada", "respondida"])
    .order("created_at", { ascending: false })
    .limit(1);

  let solicitacaoId: string | undefined = existentes?.[0]?.id;
  if (!solicitacaoId) {
    const { data: nova, error } = await supabase
      .from("solicitacao_fornecedor")
      .insert({
        event_id: eventId,
        // a policy de insert confere a empresa explicitamente (115) —
        // mesmo molde do pedirAoFornecedor
        empresa_id: ev.empresa_id,
        supplier_id: supplierId,
        tipo: "contrato",
        titulo: "Enviar contrato assinado",
        status: "respondida",
        respondida_em: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !nova) {
      console.error("[vela:anexo] criar solicitacao:", error?.message);
      return { error: "Não foi possível preparar o envio." };
    }
    solicitacaoId = nova.id as string;
  }
  if (!solicitacaoId) return { error: "Não foi possível preparar o envio." };

  const adm = admin();
  if (!adm) return { error: "Ambiente incompleto no servidor." };

  const caminho = caminhoDoContrato(ev.empresa_id, eventId, solicitacaoId, nome);
  const permissao = await permitirEnvio(adm, caminho);
  if (!permissao) return { error: "Não foi possível preparar o envio." };

  return { permissao, solicitacaoId };
}

export async function confirmarAnexoContrato(
  eventId: string,
  solicitacaoId: string,
  caminho: string,
  nomeOriginal: string
): Promise<ResultadoAnexo> {
  const supabase = createClient();

  // o caminho tem que ser da pasta desta solicitação — nada de gravar
  // ponteiro para arquivo alheio
  const { data: ev } = await supabase
    .from("events")
    .select("id, empresa_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev?.empresa_id) return { error: "Evento não encontrado ou sem acesso." };
  const prefixo = `${ev.empresa_id}/${eventId}/${solicitacaoId}/`;
  if (!caminho.startsWith(prefixo)) {
    return { error: "Arquivo fora da pasta deste pedido." };
  }

  // arquivo antigo (recontratou, mandou versão nova): sai do balde
  const { data: antiga } = await supabase
    .from("solicitacao_fornecedor")
    .select("id, resposta")
    .eq("id", solicitacaoId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!antiga) return { error: "Pedido não encontrado." };
  const pathAntigo = (antiga.resposta as { arquivo_path?: string } | null)
    ?.arquivo_path;

  const { data: upd, error } = await supabase
    .from("solicitacao_fornecedor")
    .update({
      status: "respondida",
      respondida_em: new Date().toISOString(),
      resposta: {
        feito: true,
        arquivo_path: caminho,
        arquivo_nome: nomeOriginal,
        origem: "cerimonialista",
      },
    })
    .eq("id", solicitacaoId)
    .eq("event_id", eventId)
    .select("id");
  if (error || !upd?.length) {
    console.error("[vela:anexo] confirmar:", error?.message);
    return { error: "Não foi possível registrar o contrato." };
  }

  const adm = admin();
  if (adm && pathAntigo && pathAntigo !== caminho) {
    await apagarContrato(adm, pathAntigo);
  }

  // proposta de extração do arquivo ANTIGO não vale mais — a leitura
  // recomeça do zero com o arquivo novo (conferida fica, é registro)
  await supabase
    .from("contrato_extracao")
    .delete()
    .eq("solicitacao_id", solicitacaoId)
    .eq("status", "proposta");

  revalidatePath(`/eventos/${eventId}/fornecedores`);
  return { success: true };
}
