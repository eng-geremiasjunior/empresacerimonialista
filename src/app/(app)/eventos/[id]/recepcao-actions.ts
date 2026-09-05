"use server";

// A recepção vista de dentro (148): a cerimonialista abre e revoga o
// posto da porta, encerra a contagem e lê o painel ao vivo.
//
// Tudo aqui é fino de propósito: quem decide (permissão, validade do
// posto, o que conta como presente) é a RPC, atrás da sessão dela. Estas
// funções só traduzem o erro do banco para uma frase e avisam o Next de
// que o Modo Evento e as Mesas mudaram — as duas telas leem o mesmo
// número, e uma delas mostrando 84 enquanto a outra mostra 80 é
// exatamente o que a 148 existe para acabar.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PostoDoPainel = {
  id: string;
  nome: string;
  hash: string;
  vale_de: string;
  vale_ate: string;
  revogado_em: string | null;
  aberturas: number;
  marcacoes: number;
  desfazimentos: number;
  avulsos: number;
  /** vivo E dentro da janela (véspera → dia seguinte) — o que o link abre */
  aberto: boolean;
};

export type ChegadaRecente = {
  nome: string;
  pessoas: number;
  em: string;
  porta: "recepcao" | "equipe";
  operador: string | null;
};

/** O JSON de recepcao_painel, como o banco o entrega (nomes do banco). */
export type Painel = {
  presentes: number;
  origem: "sem_marcacao" | "porta" | "equipe" | "mista";
  esperados: number;
  porta_encerrada_em: string | null;
  /** entraram sem ter confirmado (e não são avulsos da porta) */
  sem_confirmar: number;
  /** apareceram sem estar na lista e entraram pela porta */
  avulsos: number;
  ultimas: ChegadaRecente[];
  postos: PostoDoPainel[];
};

export type ResultadoRecepcao = { error: string } | { success: true };

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/modo-evento`);
  revalidatePath(`/eventos/${eventId}/mesas`);
}

// A RPC sobe exceções com nome de máquina; a tela recebe a frase.
function frase(mensagem: string, fallback: string): string {
  if (mensagem.includes("sem_permissao") || mensagem.includes("row-level security")) {
    return "Você não tem permissão para editar este evento.";
  }
  if (mensagem.includes("evento_sem_data")) {
    return "Defina a data do evento antes de abrir a recepção.";
  }
  console.error("[eorganizei:recepcao]", mensagem);
  return fallback;
}

export async function lerPainel(eventId: string): Promise<Painel | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("recepcao_painel", { p_event_id: eventId });
  if (error) {
    console.error("[eorganizei:recepcao] painel:", error.message);
    return null;
  }
  return (data as Painel | null) ?? null;
}

export async function abrirPosto(
  eventId: string,
  nome: string
): Promise<ResultadoRecepcao & { id?: string; hash?: string }> {
  // o banco também cai em "Recepção" quando vazio; aqui só se corta o
  // tamanho para o CHECK (≤ 60) não virar erro genérico
  const n = nome.trim().slice(0, 60);
  const supabase = createClient();
  const { data, error } = await supabase.rpc("recepcao_abrir_posto", {
    p_event_id: eventId,
    p_nome: n || "Recepção",
  });
  if (error) return { error: frase(error.message, "Não foi possível abrir o posto.") };
  revalidar(eventId);
  const posto = data as { id: string; hash: string } | null;
  return { success: true, id: posto?.id, hash: posto?.hash };
}

export async function revogarPosto(eventId: string, postoId: string): Promise<ResultadoRecepcao> {
  const supabase = createClient();
  const { error } = await supabase.rpc("recepcao_revogar_posto", { p_posto_id: postoId });
  if (error) return { error: frase(error.message, "Não foi possível revogar o posto.") };
  revalidar(eventId);
  return { success: true };
}

export async function encerrarPorta(
  eventId: string,
  encerrar: boolean
): Promise<ResultadoRecepcao & { porta_encerrada_em?: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("recepcao_encerrar_porta", {
    p_event_id: eventId,
    p_encerrar: encerrar,
  });
  if (error) {
    return {
      error: frase(
        error.message,
        encerrar ? "Não foi possível encerrar a contagem." : "Não foi possível reabrir a contagem."
      ),
    };
  }
  revalidar(eventId);
  // a prestação de contas lê este carimbo: ela também muda
  revalidatePath(`/eventos/${eventId}/financeiro`);
  const r = data as { porta_encerrada_em: string | null } | null;
  return { success: true, porta_encerrada_em: r?.porta_encerrada_em ?? null };
}
