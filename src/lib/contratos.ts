// Onde os contratos ficam guardados — a única parte do sistema que sabe
// disso.
//
// Hoje é Supabase Storage. A intenção declarada é migrar para um provedor
// dedicado (S3) quando o custo justificar, e por isso nada além deste
// arquivo chama `storage.from(...)`: o resto do sistema pede um caminho,
// uma permissão de envio ou uma URL de leitura, e não sabe de quem vem.
//
// Para trocar de provedor, três funções mudam aqui e mais nada:
//   - permitirEnvio      → devolve uma URL pré-assinada em vez do token
//   - urlParaLer         → devolve a URL assinada do S3
//   - apagarContrato     → deleta no bucket novo
//
// O formato `PermissaoDeEnvio` já prevê os dois mundos, e o cliente
// (contratos-cliente.ts) já sabe executar os dois. A migração de
// provedor não deve tocar em componente nenhum.

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

/** Permissão de envio para UM caminho só, com validade curta. */
export async function permitirEnvio(
  admin: SupabaseClient,
  caminho: string
): Promise<PermissaoDeEnvio | null> {
  const { data, error } = await admin.storage
    .from(BALDE_CONTRATOS)
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
  const { data, error } = await supabase.storage
    .from(BALDE_CONTRATOS)
    .createSignedUrl(caminho, segundos);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function apagarContrato(
  supabase: SupabaseClient,
  caminho: string
): Promise<void> {
  await supabase.storage.from(BALDE_CONTRATOS).remove([caminho]);
}
