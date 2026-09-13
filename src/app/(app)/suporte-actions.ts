"use server";

// A caixinha de suporte do lado da cliente (161).
//
// Duas ações e nada mais, as duas pela sessão dela: a função do banco
// resolve a empresa pelo login e só enxerga a conversa do próprio
// auth.uid(). Não existe parâmetro de "de quem" — não há como pedir a
// conversa de outra pessoa.

import { createClient } from "@/lib/supabase/server";

export type MensagemDeSuporte = {
  id: string;
  autor: "cliente" | "eorganizei";
  texto: string;
  em: string;
};

export type ConversaDeSuporte = {
  naoLidas: number;
  mensagens: MensagemDeSuporte[];
};

export async function enviarMensagemDeSuporte(
  texto: string,
  pagina: string | null
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const limpo = (texto ?? "").trim();
  if (!limpo) return { ok: false, erro: "Escreva a mensagem." };

  const supabase = createClient();
  const { error } = await supabase.rpc("enviar_mensagem_suporte", {
    p_texto: limpo.slice(0, 2000),
    p_pagina: pagina ? pagina.slice(0, 200) : null,
  });
  if (error) {
    // As frases de erro da função já são para gente ler (limite por hora,
    // sessão expirada). Qualquer outra coisa vira a frase genérica — e a
    // caixinha oferece o Instagram como saída.
    const conhecida = /Muitas mensagens|Sessao expirada|Escreva a mensagem|longa demais/i.test(error.message);
    return {
      ok: false,
      erro: conhecida
        ? error.message.replace("Sessao", "Sessão")
        : "Não conseguimos enviar agora.",
    };
  }
  return { ok: true };
}

/**
 * A conversa dela. `marcarLidas` só quando a caixinha está ABERTA: a
 * consulta de fundo, que acende o pontinho de "resposta nova", não pode
 * dar a resposta por lida antes de ela ver.
 */
export async function lerConversaDeSuporte(marcarLidas: boolean): Promise<ConversaDeSuporte | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("minha_conversa_suporte", {
    p_marcar_lidas: marcarLidas,
  });
  if (error || !data) return null;
  const d = data as { nao_lidas?: number; mensagens?: MensagemDeSuporte[] };
  return { naoLidas: d.nao_lidas ?? 0, mensagens: d.mensagens ?? [] };
}
