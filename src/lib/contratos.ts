// Onde os contratos ficam guardados — a única parte do sistema que sabe
// disso.
//
// Hoje é Supabase Storage. A intenção declarada é migrar para um provedor
// dedicado (S3) quando o custo justificar, e por isso nada além deste
// arquivo chama `storage.from(...)`: o resto do sistema pede um caminho,
// uma permissão de envio ou uma URL de leitura, e não sabe de quem vem.
//
// Para trocar de provedor, as funções que tocam o balde mudam aqui e
// mais nada:
//   - permitirEnvioEm    → devolve uma URL pré-assinada em vez do token
//   - urlParaLerDe       → devolve a URL assinada do S3
//   - gravarArquivo      → PUT no bucket novo
//   - baixarArquivo      → GET no bucket novo
//   - apagarContrato     → deleta no bucket novo
//
// O formato `PermissaoDeEnvio` já prevê os dois mundos, e o cliente
// (contratos-cliente.ts) já sabe executar os dois. A migração de
// provedor não deve tocar em componente nenhum.
//
// O balde `contratos` guarda duas famílias de arquivo, com caminhos que
// as políticas da 119 leem do mesmo jeito (empresa no 1º segmento,
// evento no 2º):
//   - o contrato do FORNECEDOR: empresa/evento/solicitacao/arquivo
//   - os documentos da CLIENTE (termo de aceite em PDF, contrato de
//     prestação): empresa/{evento ou orçamento}/documentos/{documento}/arquivo
// O termo nasce no servidor, antes de o evento existir quando a proposta
// não tem data — por isso o 2º segmento pode ser o orçamento. A sessão
// dela não lê esse caminho (a 119 exige evento); quem assina a leitura é
// a rota /api/documento, com a chave de serviço, depois que a RLS de
// `evento_documento` decidiu.

import type { SupabaseClient } from "@supabase/supabase-js";

export const BALDE_CONTRATOS = "contratos";
export const LIMITE_BYTES = 10 * 1024 * 1024;

export const MIMES_ACEITOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/**
 * O que o cliente precisa para mandar o arquivo, em um formato que não
 * depende do provedor.
 *
 * - `token`: Supabase Storage (upload assinado por token)
 * - `url`:   S3 e afins (PUT direto numa URL pré-assinada)
 */
export type PermissaoDeEnvio =
  | { modo: "token"; caminho: string; token: string }
  | {
      modo: "url";
      caminho: string;
      url: string;
      metodo: "PUT" | "POST";
      campos?: Record<string, string>;
    };

/**
 * Nome de arquivo previsível para o caminho: só ASCII simples. O nome
 * bonito que ela vê fica guardado na resposta da solicitação, então aqui
 * pode ser agressivo — o que importa é nunca virar caminho.
 */
export function nomeSeguro(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? "contrato";
  const limpo = base
    .normalize("NFD")
    .split("")
    .filter((c) => /[A-Za-z0-9._-]/.test(c))
    .join("")
    .replace(/-{2,}/g, "-")
    .slice(-80);
  return limpo.replace(/^[.-]+/, "") || "contrato";
}

/**
 * A empresa é o PRIMEIRO segmento porque é ela que as políticas conferem.
 * Se o provedor mudar, esta convenção continua servindo: no S3 vira o
 * prefixo da chave, e a separação por empresa permanece explícita.
 */
export function caminhoDoContrato(
  empresaId: string,
  eventId: string,
  solicitacaoId: string,
  nomeOriginal: string
): string {
  return `${empresaId}/${eventId}/${solicitacaoId}/${nomeSeguro(nomeOriginal)}`;
}

/**
 * Caminho de um documento da cliente. O 2º segmento é o evento quando ele
 * já existe e o orçamento quando ainda não — o id do documento no 4º
 * garante que dois arquivos com o mesmo nome não se sobrescrevem.
 */
export function caminhoDoDocumento(
  empresaId: string,
  eventoOuOrcamentoId: string,
  documentoId: string,
  nome: string
): string {
  return `${empresaId}/${eventoOuOrcamentoId}/documentos/${documentoId}/${nomeSeguro(nome)}`;
}

/** Permissão de envio para UM caminho só, com validade curta. */
export async function permitirEnvio(
  admin: SupabaseClient,
  caminho: string
): Promise<PermissaoDeEnvio | null> {
  return permitirEnvioEm(admin, BALDE_CONTRATOS, caminho);
}

/** O mesmo, em qualquer balde — o modelo de contrato dela mora em outro. */
export async function permitirEnvioEm(
  admin: SupabaseClient,
  balde: string,
  caminho: string
): Promise<PermissaoDeEnvio | null> {
  const { data, error } = await admin.storage
    .from(balde)
    .createSignedUploadUrl(caminho, { upsert: true });
  if (error || !data?.token) return null;
  return { modo: "token", caminho, token: data.token };
}

/** URL de leitura temporária. O balde é privado: não existe URL fixa. */
export async function urlParaLer(
  supabase: SupabaseClient,
  caminho: string,
  segundos = 300
): Promise<string | null> {
  return urlParaLerDe(supabase, BALDE_CONTRATOS, caminho, segundos);
}

/**
 * O mesmo, em qualquer balde. Quem assina decide o que abre: a sessão
 * dela só assina o que a política do balde deixa ler; a chave de serviço
 * assina qualquer caminho — e por isso só entra aqui depois que uma RLS
 * de tabela já disse que ela pode ver o documento.
 */
export async function urlParaLerDe(
  client: SupabaseClient,
  balde: string,
  caminho: string,
  segundos = 300
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(balde)
    .createSignedUrl(caminho, segundos);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Grava um arquivo que NASCEU no servidor (o termo de aceite em PDF).
 * Todos os outros envios do sistema saem do navegador; este é o único
 * caminho servidor → balde, e precisa da chave de serviço porque a
 * política do balde não conhece "o sistema" como autor. `upsert` porque a
 * rotina de reenvio pode regerar o mesmo documento no mesmo caminho.
 */
export async function gravarArquivo(
  admin: SupabaseClient,
  balde: string,
  caminho: string,
  conteudo: Buffer,
  contentType: string
): Promise<boolean> {
  const { error } = await admin.storage
    .from(balde)
    .upload(caminho, conteudo, { contentType, upsert: true });
  if (error) {
    console.error(`[eorg:storage] gravar ${balde}/${caminho}: ${error.message}`);
    return false;
  }
  return true;
}

/** Lê o arquivo inteiro para a memória — para anexar num e-mail. */
export async function baixarArquivo(
  admin: SupabaseClient,
  balde: string,
  caminho: string
): Promise<Buffer | null> {
  const { data, error } = await admin.storage.from(balde).download(caminho);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.length > 0 ? buf : null;
}

export async function apagarContrato(
  supabase: SupabaseClient,
  caminho: string
): Promise<void> {
  await supabase.storage.from(BALDE_CONTRATOS).remove([caminho]);
}
