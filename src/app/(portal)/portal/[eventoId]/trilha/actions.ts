"use server";

// A trilha da noite (180). A música da valsa e a do parabéns também
// respondem a pergunta de Escolhas (175), pela mesma porta de escrita do
// portal (portal_escrever_campo, com a trava otimista).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal, getPerguntas } from "@/lib/supabase/portal";
import { MOMENTOS_DA_TRILHA, linkAceito, type MusicaEscolhida } from "@/lib/trilha";

type Retorno = { ok: true } | { error: string };

function revalidar(eventoId: string) {
  revalidatePath(`/portal/${eventoId}/trilha`);
  revalidatePath(`/portal/${eventoId}/cronograma`);
  revalidatePath(`/portal/${eventoId}/escolhas`, "layout");
}

export async function escolherMusica(eventoId: string, momento: string, m: MusicaEscolhida): Promise<Retorno> {
  const def = MOMENTOS_DA_TRILHA.find((x) => x.id === momento);
  if (!def) return { error: "Momento inválido." };
  const titulo = m.titulo.trim().slice(0, 160);
  if (!titulo) return { error: "Escolha uma música." };
  if (m.link && !linkAceito(m.link)) return { error: "Esse link não é do Spotify, do YouTube nem da Apple Music." };
  const supabase = createClient();
  const { error } = await supabase.from("evento_trilha").upsert(
    {
      event_id: eventoId,
      momento,
      titulo,
      artista: m.artista?.trim().slice(0, 160) || null,
      capa_url: m.capa && /^https:\/\/[a-z0-9.-]*mzstatic\.com\//.test(m.capa) ? m.capa : null,
      preview_url: m.preview && /^https:\/\/[a-z0-9.-]*(itunes\.apple\.com|mzstatic\.com)\//.test(m.preview) ? m.preview : null,
      duracao_s: m.duracao && m.duracao > 0 && m.duracao <= 3600 ? Math.round(m.duracao) : null,
      link: m.link || null,
    },
    { onConflict: "event_id,momento" }
  );
  if (error) return { error: "Não foi possível escolher agora." };

  // a valsa e o parabéns: a pergunta de Escolhas recebe a resposta
  if (def.pergunta) {
    const evento = await getEventoDoPortal(eventoId);
    const perguntas = evento ? await getPerguntas(eventoId, evento.data) : { abertas: [], respondidas: [] };
    const pergunta = [...perguntas.abertas, ...perguntas.respondidas].find((p) => p.label === def.pergunta);
    if (pergunta) {
      await supabase.rpc("portal_escrever_campo", {
        p_campo_id: pergunta.campoId,
        p_valor: m.artista ? `${titulo} · ${m.artista}` : titulo,
        p_updated_at_visto: pergunta.updatedAt,
      });
    }
  }
  revalidar(eventoId);
  return { ok: true };
}

export async function tirarMusica(eventoId: string, momento: string): Promise<Retorno> {
  const supabase = createClient();
  const { error } = await supabase.from("evento_trilha").delete().eq("event_id", eventoId).eq("momento", momento);
  if (error) return { error: "Não foi possível tirar agora." };
  revalidar(eventoId);
  return { ok: true };
}
