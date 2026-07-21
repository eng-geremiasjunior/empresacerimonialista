// Upload da logo da empresa — mesmo padrão de lib/event-cover.ts:
// bucket público, path fixo empresa-logos/{empresa_id}/logo (upsert
// sobrescreve), URL com ?v= gravada em empresas.logo_url. A logo vale
// para TODOS os orçamentos: o PDF sempre busca a logo atual da empresa
// no momento da geração.

import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function validateLogoFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Escolha um arquivo de imagem.";
  if (file.size > MAX_SIZE_BYTES) return "A logo deve ter no máximo 2 MB.";
  return null;
}

// Sobe a logo e grava a URL pública na empresa.
export async function uploadEmpresaLogo(
  empresaId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const invalid = validateLogoFile(file);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const path = `${empresaId}/logo`;
  const { error: uploadError } = await supabase.storage
    .from("empresa-logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return {
      error:
        "Não foi possível enviar a logo. Se o bucket ainda não existe, execute a migração 042_empresa_logo_bucket.sql.",
    };
  }

  const { data } = supabase.storage.from("empresa-logos").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: metaError } = await supabase
    .from("empresas")
    .update({ logo_url: url })
    .eq("id", empresaId);
  if (metaError) {
    return { error: "Logo enviada, mas não foi possível salvar na empresa." };
  }
  return { url };
}

export async function removeEmpresaLogo(
  empresaId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  await supabase.storage.from("empresa-logos").remove([`${empresaId}/logo`]);
  const { error } = await supabase
    .from("empresas")
    .update({ logo_url: null })
    .eq("id", empresaId);
  return error ? { error: "Não foi possível remover a logo." } : {};
}
