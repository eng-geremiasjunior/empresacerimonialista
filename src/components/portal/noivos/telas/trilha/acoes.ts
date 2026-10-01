"use server";

// A trilha do casamento grava pela mesma porta da trilha da debutante
// (escolherMusica, 180 — RLS pela sessão da família). A primeira dança
// também responde a pergunta do método "Qual será a música da primeira
// dança?", que é o que a folha do DJ (/imprimir/musica) já imprime — o
// molde da valsa e do parabéns na v2, com a mesma trava otimista.

import { revalidatePath } from "next/cache";
import { escolherMusica } from "@/app/(portal)/portal/[eventoId]/trilha/actions";
import { createClient } from "@/lib/supabase/server";
import { getEventoDoPortal, getPerguntas } from "@/lib/supabase/portal";
import { usaPortalNoivos } from "@/lib/portal-noivos";
import type { MusicaEscolhida } from "@/lib/trilha";
import { MOMENTOS_DO_CASAMENTO } from "./momentos";

type Retorno = { ok: true } | { error: string };

export async function escolherNoCasamento(eventoId: string, momento: string, m: MusicaEscolhida): Promise<Retorno> {
  const def = MOMENTOS_DO_CASAMENTO.find((x) => x.id === momento);
  if (!def) return { error: "Momento inválido." };

  const r = await escolherMusica(eventoId, momento, m);
  if ("error" in r) return r;

  if (def.pergunta) {
    const evento = await getEventoDoPortal(eventoId);
    if (evento && usaPortalNoivos(evento.tipo)) {
      const perguntas = await getPerguntas(eventoId, evento.data);
      const pergunta = [...perguntas.abertas, ...perguntas.respondidas].find((p) => p.label === def.pergunta);
      if (pergunta) {
        const titulo = m.titulo.trim().slice(0, 160);
        const artista = m.artista?.trim().slice(0, 160);
        await createClient().rpc("portal_escrever_campo", {
          p_campo_id: pergunta.campoId,
          p_valor: artista ? `${titulo} · ${artista}` : titulo,
          p_updated_at_visto: pergunta.updatedAt,
        });
      }
    }
  }

  // a Visão geral mostra a mesma trilha
  revalidatePath(`/portal/${eventoId}`);
  return r;
}
