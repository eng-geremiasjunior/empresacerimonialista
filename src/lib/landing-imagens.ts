// Imagens de fundo da landing da proposta (hero e "No dia do evento").
// Mesmo padrão de lib/empresa-logo.ts: bucket público, path por empresa,
// URL com ?v= gravada em `empresas`.
//
// NULL na coluna = usar o asset padrão do sistema. É por isso que
// "Restaurar padrão" grava null em vez de apagar a coluna.

import { createClient } from "@/lib/supabase/client";

export type SlotImagem = "hero" | "no_dia_evento";

// Assets de fábrica servidos de /public.
export const IMAGEM_PADRAO: Record<SlotImagem, string> = {
  hero: "/images/hero-padrao.jpg",
  no_dia_evento: "/images/no-dia-evento-padrao.jpg",
};

const COLUNA: Record<SlotImagem, string> = {
  hero: "hero_imagem_url",
  no_dia_evento: "no_dia_evento_imagem_url",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_LADO = 2000; // px — é imagem de fundo full-width
const QUALIDADE = 0.85;

export function validarImagem(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Escolha um arquivo de imagem.";
  if (file.size > 20 * 1024 * 1024) return "A imagem deve ter no máximo 20 MB.";
  return null;
}

// Mesma compressão do portfólio: foto de celular de 8 MB como fundo de
// landing deixa a proposta lenta no 4G.
async function comprimir(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", QUALIDADE)
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadImagemLanding(
  empresaId: string,
  slot: SlotImagem,
  file: File
): Promise<{ url?: string; error?: string }> {
  const invalido = validarImagem(file);
  if (invalido) return { error: invalido };

  const supabase = createClient();
  const blob = await comprimir(file);
  if (blob.size > MAX_BYTES) {
    return { error: "A imagem continua acima de 5 MB depois de comprimida." };
  }

  // Path fixo por slot: upsert sobrescreve, sem acumular arquivo antigo.
  const path = `${empresaId}/${slot}.jpg`;
  const { error: upErro } = await supabase.storage
    .from("landing-imagens")
    .upload(path, blob, { upsert: true, contentType: blob.type });

  if (upErro) {
    return {
      error:
        "Não foi possível enviar a imagem. Se o bucket ainda não existe, execute a migração 048_landing_imagens_padrao.sql.",
    };
  }

  const { data } = supabase.storage.from("landing-imagens").getPublicUrl(path);
  // ?v= força o cache a soltar a versão antiga (o path é sempre o mesmo).
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: metaErro } = await supabase
    .from("empresas")
    .update({ [COLUNA[slot]]: url })
    .eq("id", empresaId);

  if (metaErro) {
    return { error: "Imagem enviada, mas não foi possível salvar na empresa." };
  }
  return { url };
}

// Volta ao asset de fábrica: coluna = null e arquivo removido do bucket.
export async function restaurarImagemPadrao(
  empresaId: string,
  slot: SlotImagem
): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("empresas")
    .update({ [COLUNA[slot]]: null })
    .eq("id", empresaId);
  if (error) return { error: "Não foi possível restaurar a imagem padrão." };

  await supabase.storage
    .from("landing-imagens")
    .remove([`${empresaId}/${slot}.jpg`]);
  return {};
}
