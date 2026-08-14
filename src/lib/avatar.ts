import { createClient } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// URL pública da foto de qualquer usuário (bucket avatars é público, path
// fixo por user_id). Retorna null se não houver user_id. Se o usuário não
// tiver foto, a URL 404 e o componente Avatar cai para as iniciais.
export function avatarPublicUrl(userId: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!userId || !base) return null;
  return `${base}/storage/v1/object/public/avatars/${userId}/avatar`;
}

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

/**
 * Nome e WhatsApp da pessoa — FONTE ÚNICA: membros_equipe.
 *
 * Não grava mais em user_metadata.display_name. Duas fontes espelhadas
 * divergem, e foi exatamente assim que o portal passou a mostrar
 * "Sua cerimonialista: Proprietária" para a noiva: o nome de gente estava
 * no auth, e o portal lê membros_equipe (a única fonte que outra pessoa
 * consegue enxergar — user_metadata só é legível pela própria sessão).
 *
 * Via RPC porque membro não-dono não tem permissão de UPDATE na própria
 * linha (024: só a dona gerencia a equipe).
 */
export async function atualizarMeuPerfil(
  name: string,
  whatsapp: string
): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe seu nome." };

  const supabase = createClient();
  const { error } = await supabase.rpc("atualizar_meu_perfil", {
    p_nome: trimmed,
    p_whatsapp: whatsapp.trim(),
  });
  return error ? { error: "Não foi possível salvar." } : {};
}
