// Leitura de convidados e cortejo — as duas listas de PESSOAS do portal.
//
// SÓ SERVIDOR: usa next/headers via createClient. Os tipos e as funções
// puras (rótulos, resumo, agrupamento) moram em portal-pessoas-shared,
// que componentes "use client" podem importar sem quebrar o build.
//
// Dado de terceiro: telefone e e-mail aqui não são das clientes da
// cerimonialista. Nunca saem em rota pública, em endereço de página, em
// log ou no contexto da IA.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Convidado, PessoaCortejo } from "@/lib/portal-pessoas-shared";

// reexportados por conveniência de quem já importava daqui (server)
export type {
  Convidado,
  PessoaCortejo,
  ResumoConvidados,
} from "@/lib/portal-pessoas-shared";
export {
  PAPEIS,
  PAPEIS_POR_TIPO,
  PAPEL_ROTULO,
  papeisDoTipo,
  rotuloDoPapel,
  resumirConvidados,
  agruparCortejo,
} from "@/lib/portal-pessoas-shared";

export const getConvidados = cache(
  async (eventId: string): Promise<Convidado[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_convidado")
      .select(
        "id, nome, telefone, email, lado, grupo, confirmacao, acompanhantes, criancas, restricao_alimentar, hash, confirmado_via, origem"
      )
      .eq("event_id", eventId)
      .order("nome");

    return (data ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      lado: c.lado,
      grupo: c.grupo,
      confirmacao: c.confirmacao,
      acompanhantes: c.acompanhantes ?? 0,
      criancas: c.criancas ?? 0,
      restricaoAlimentar: c.restricao_alimentar,
      hash: c.hash,
      confirmadoVia: c.confirmado_via,
      origem: c.origem,
    })) as Convidado[];
  }
);

// As colunas do cortejo, da mais nova para a mais antiga: sem a 192 (par,
// lado, musica) ou sem a 125 (pronuncia), a leitura degrada em vez de
// derrubar a lista inteira.
const COLUNAS_DO_CORTEJO = [
  // a observação (193) é da equipe: só esta primeira lista a pede, e só
  // para getCortejoDaEquipe
  "id, papel, nome, contato, o_que_leva, responsavel, chegada, pronuncia, ordem, par, lado, musica, observacao",
  "id, papel, nome, contato, o_que_leva, responsavel, chegada, pronuncia, ordem, par, lado, musica",
  "id, papel, nome, contato, o_que_leva, responsavel, chegada, pronuncia, ordem",
  "id, papel, nome, contato, o_que_leva, responsavel, chegada, ordem",
];

async function lerCortejo(eventId: string, daEquipe = false): Promise<PessoaCortejo[]> {
  const supabase = createClient();
  let data: Record<string, unknown>[] | null = null;
  for (const colunas of daEquipe ? COLUNAS_DO_CORTEJO : COLUNAS_DO_CORTEJO.slice(1)) {
    const res = await supabase
      .from("evento_cortejo_pessoa")
      .select(colunas)
      .eq("event_id", eventId)
      .order("ordem")
      .order("nome");
    if (!res.error) {
      data = res.data as unknown as Record<string, unknown>[];
      break;
    }
  }

  return (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    papel: p.papel,
    nome: p.nome,
    contato: p.contato,
    oQueLeva: p.o_que_leva,
    responsavel: p.responsavel,
    chegada: p.chegada,
    pronuncia: (p.pronuncia as string | null) ?? null,
    ordem: (p.ordem as number | null) ?? 0,
    par: (p.par as string | null) ?? null,
    lado: (p.lado as "noivo" | "noiva" | null) ?? null,
    musica: (p.musica as string | null) ?? null,
    observacao: daEquipe ? ((p.observacao as string | null) ?? null) : null,
  })) as PessoaCortejo[];
}

/**
 * O cortejo como a FAMÍLIA vê (portal): sem as entradas "a definir" do
 * cortejo tradicional (nome vazio, 192), que só fazem sentido para a equipe.
 */
export const getCortejo = cache(async (eventId: string): Promise<PessoaCortejo[]> =>
  (await lerCortejo(eventId)).filter((p) => p.nome.trim() !== "")
);

/** O cortejo da equipe: tudo, as entradas "a definir" incluídas. */
export const getCortejoDaEquipe = cache((eventId: string) => lerCortejo(eventId, true));
