import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateCoverFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Escolha um arquivo de imagem.";
  if (file.size > MAX_SIZE_BYTES) return "A imagem deve ter no máximo 5 MB.";
  return null;
}

// URL pública da capa de um evento (bucket público, path fixo). Usada como
// fallback quando não há cover_image_url gravado. Retorna null sem base.
export function coverPublicUrl(eventId: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!eventId || !base) return null;
  return `${base}/storage/v1/object/public/event-covers/${eventId}/cover`;
}

// Sobe a capa para event-covers/{event_id}/cover (nome fixo -> sobrescreve)
// e grava a URL pública (com ?v=) em events.cover_image_url.
export async function uploadEventCover(
  eventId: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  const invalid = validateCoverFile(file);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const path = `${eventId}/cover`;
  const { error: uploadError } = await supabase.storage
    .from("event-covers")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return {
      error:
        "Não foi possível enviar a capa. Se o bucket ainda não existe, execute a migração 029_event_cover_image.sql.",
    };
  }

  const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: metaError } = await supabase
    .from("events")
    .update({ cover_image_url: url })
    .eq("id", eventId);
  if (metaError) {
    return { error: "Capa enviada, mas não foi possível salvar no evento." };
  }
  return { url };
}

export async function removeEventCover(
  eventId: string
): Promise<{ error?: string }> {
  const supabase = createClient();
  await supabase.storage.from("event-covers").remove([`${eventId}/cover`]);
  const { error } = await supabase
    .from("events")
    .update({ cover_image_url: null })
    .eq("id", eventId);
  return error ? { error: "Não foi possível remover a capa." } : {};
}
