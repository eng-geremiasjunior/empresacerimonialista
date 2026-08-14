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
  PAPEL_ROTULO,
  resumirConvidados,
  agruparCortejo,
} from "@/lib/portal-pessoas-shared";

export const getConvidados = cache(
  async (eventId: string): Promise<Convidado[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_convidado")
      .select(
        "id, nome, telefone, email, lado, grupo, mesa, confirmacao, acompanhantes, criancas, restricao_alimentar, hash, confirmado_via, origem"
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
      mesa: c.mesa,
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

export const getCortejo = cache(
  async (eventId: string): Promise<PessoaCortejo[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_cortejo_pessoa")
      .select("id, papel, nome, contato, o_que_leva, responsavel, chegada, ordem")
      .eq("event_id", eventId)
      .order("ordem")
      .order("nome");

    return (data ?? []).map((p) => ({
      id: p.id,
      papel: p.papel,
      nome: p.nome,
      contato: p.contato,
      oQueLeva: p.o_que_leva,
      responsavel: p.responsavel,
      chegada: p.chegada,
      ordem: p.ordem ?? 0,
    })) as PessoaCortejo[];
  }
);
