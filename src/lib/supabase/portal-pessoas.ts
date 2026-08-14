// Convidados e cortejo — as duas listas de PESSOAS do portal.
//
// Dado de terceiro: telefone e e-mail aqui não são das clientes da
// cerimonialista. Nunca saem em rota pública, em endereço de página, em
// log ou no contexto da IA. A leitura abaixo é toda com sessão; a porta
// pública do convidado tem arquivo próprio e devolve outra coisa.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Convidado = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  lado: "noiva" | "noivo" | null;
  grupo: string | null;
  mesa: string | null;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  acompanhantes: number;
  criancas: number;
  restricaoAlimentar: string | null;
  hash: string;
  confirmadoVia: "link" | "manual" | null;
};

export type ResumoConvidados = {
  total: number;
  confirmados: number;
  aguardando: number;
  naoVao: number;
  /** confirmados + acompanhantes + crianças: o número que vai ao buffet */
  pessoasNaFesta: number;
  comRestricao: number;
};

export type PessoaCortejo = {
  id: string;
  papel: "padrinho" | "madrinha" | "dama" | "pajem" | "porta_alianca";
  nome: string;
  contato: string | null;
  oQueLeva: string | null;
  responsavel: string | null;
  chegada: string | null;
  ordem: number;
};

export const PAPEL_ROTULO: Record<PessoaCortejo["papel"], string> = {
  padrinho: "Padrinhos",
  madrinha: "Madrinhas",
  dama: "Damas",
  pajem: "Pajens",
  porta_alianca: "Porta-alianças",
};

/** A ordem em que os grupos aparecem na tela. */
export const PAPEIS: PessoaCortejo["papel"][] = [
  "padrinho",
  "madrinha",
  "dama",
  "pajem",
  "porta_alianca",
];

export const getConvidados = cache(
  async (eventId: string): Promise<Convidado[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_convidado")
      .select(
        "id, nome, telefone, email, lado, grupo, mesa, confirmacao, acompanhantes, criancas, restricao_alimentar, hash, confirmado_via"
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
    })) as Convidado[];
  }
);

/** Os números que a cliente (e a cerimonialista) precisam ver. */
export function resumirConvidados(lista: Convidado[]): ResumoConvidados {
  const confirmados = lista.filter((c) => c.confirmacao === "confirmado");
  return {
    total: lista.length,
    confirmados: confirmados.length,
    aguardando: lista.filter((c) => c.confirmacao === "aguardando").length,
    naoVao: lista.filter((c) => c.confirmacao === "nao_vai").length,
    pessoasNaFesta: confirmados.reduce(
      (s, c) => s + 1 + c.acompanhantes + c.criancas,
      0
    ),
    comRestricao: confirmados.filter((c) => c.restricaoAlimentar?.trim()).length,
  };
}

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

/** Agrupa por papel, mantendo a ordem dos grupos e omitindo os vazios. */
export function agruparCortejo(
  lista: PessoaCortejo[]
): { papel: PessoaCortejo["papel"]; rotulo: string; pessoas: PessoaCortejo[] }[] {
  return PAPEIS.map((papel) => ({
    papel,
    rotulo: PAPEL_ROTULO[papel],
    pessoas: lista.filter((p) => p.papel === papel),
  })).filter((g) => g.pessoas.length > 0);
}
