import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function validateAvatarFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Escolha um arquivo de imagem.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "A imagem deve ter no máximo 2 MB.";
  }
  return null;
}

// Sobe a foto para avatars/{user_id}/avatar (nome fixo -> sobrescreve ao
// trocar) e grava a URL pública em user_metadata.avatar_url. O ?v= evita
// que o navegador continue mostrando a foto antiga em cache.
export async function uploadAvatar(
  file: File
): Promise<{ url?: string; error?: string }> {
  const invalid = validateAvatarFile(file);
  if (invalid) return { error: invalid };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const path = `${user.id}/avatar`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return {
      error:
        "Não foi possível enviar a foto. Se o bucket ainda não existe, execute a migração 016_avatars_storage.sql.",
    };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: metaError } = await supabase.auth.updateUser({
    data: { avatar_url: url },
  });
  if (metaError) {
    return { error: "Foto enviada, mas não foi possível salvar no perfil." };
  }

  return { url };
}

export async function removeAvatar(): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Entre novamente." };

  await supabase.storage.from("avatars").remove([`${user.id}/avatar`]);

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  });
  return error ? { error: "Não foi possível remover a foto." } : {};
}

export async function updateDisplayName(
  name: string
): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe seu nome." };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: trimmed },
  });
  return error ? { error: "Não foi possível salvar o nome." } : {};
}
