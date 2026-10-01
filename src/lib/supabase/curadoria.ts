// Escolhas curadas: a cerimonialista pesquisa, separa de 2 a 4 opções e
// publica. A cliente escolhe uma ou recusa todas com motivo.
//
// A opção é uma REFERÊNCIA, não um cadastro. Durante o Planejamento o
// fornecedor ainda é "aquele buffet que apareceu na conversa" — mostrar
// três não pode obrigar a cadastrar três e descartar dois. O vínculo com
// o CRM (supplier_id) só acontece quando fecha.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type OpcaoCurada = {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number | null;
  inclui: string[];
  prazoReserva: string | null;
  nota: string | null;
  fotoPath: string | null;
  recomendada: boolean;
  supplierId: string | null;
  ordem: number;
};

export type Curadoria = {
  id: string;
  decisaoId: string;
  decisaoTitulo: string;
  objetivoNome: string | null;
  estado: "rascunho" | "publicada" | "escolhida" | "recusada";
  escolhidaOpcaoId: string | null;
  motivoRecusa: string | null;
  publicadaEm: string | null;
  respondidaEm: string | null;
  opcoes: OpcaoCurada[];
};

const COLUNAS_OPCAO =
  "id, nome, descricao, valor, inclui, prazo_reserva, nota, foto_path, recomendada, supplier_id, ordem";

function mapearOpcao(o: Record<string, unknown>): OpcaoCurada {
  return {
    id: o.id as string,
    nome: o.nome as string,
    descricao: (o.descricao as string) ?? null,
    valor: o.valor === null ? null : Number(o.valor),
    inclui: (o.inclui as string[]) ?? [],
    prazoReserva: (o.prazo_reserva as string) ?? null,
    nota: (o.nota as string) ?? null,
    fotoPath: (o.foto_path as string) ?? null,
    recomendada: Boolean(o.recomendada),
    supplierId: (o.supplier_id as string) ?? null,
    ordem: (o.ordem as number) ?? 0,
  };
}

/**
 * As rodadas que a CLIENTE enxerga: só as publicadas (rascunho é
 * trabalho da cerimonialista) — a policy da 092 já garante isso, e o
 * filtro aqui repete porque a equipe também abre o portal.
 *
 * As opções vêm pela RPC da 190 (portal_opcoes_das_escolhas): o preço só
 * chega a quem vê o Financeiro; para os outros níveis o valor vem nulo e
 * as telas já não o mostram. Sem a 190 aplicada, a leitura direta de
 * antes (a RLS decide).
 */
export const getCuradoriasDoPortal = cache(
  async (eventId: string): Promise<Curadoria[]> => {
    const supabase = createClient();
    const [{ data }, rpc] = await Promise.all([
      supabase
        .from("decisao_curadoria")
        .select(
          `id, evento_decisao_id, estado, escolhida_opcao_id, motivo_recusa, publicada_em, respondida_em,
           evento_decisao!inner(titulo, evento_objetivo(nome))`
        )
        .eq("event_id", eventId)
        .in("estado", ["publicada", "escolhida", "recusada"])
        .order("publicada_em", { ascending: false }),
      supabase.rpc("portal_opcoes_das_escolhas", { p_event_id: eventId }),
    ]);

    const linhas = (data ?? []) as unknown as Record<string, unknown>[];

    let opcoes = (rpc.error ? null : rpc.data ?? []) as Record<string, unknown>[] | null;
    if (!opcoes) {
      const ids = linhas.map((c) => c.id as string);
      const { data: diretas } = ids.length
        ? await supabase.from("decisao_opcao").select(`curadoria_id, ${COLUNAS_OPCAO}`).in("curadoria_id", ids)
        : { data: [] };
      opcoes = (diretas ?? []) as Record<string, unknown>[];
    }
    const opcoesPor = new Map<string, OpcaoCurada[]>();
    for (const o of opcoes) {
      const k = o.curadoria_id as string;
      opcoesPor.set(k, [...(opcoesPor.get(k) ?? []), mapearOpcao(o)]);
    }

    return linhas.map((c) => {
      const dec = c.evento_decisao as {
        titulo: string;
        evento_objetivo: { nome: string } | null;
      };
      return {
        id: c.id as string,
        decisaoId: c.evento_decisao_id as string,
        decisaoTitulo: dec?.titulo ?? "",
        objetivoNome: dec?.evento_objetivo?.nome ?? null,
        estado: c.estado as Curadoria["estado"],
        escolhidaOpcaoId: (c.escolhida_opcao_id as string) ?? null,
        motivoRecusa: (c.motivo_recusa as string) ?? null,
        publicadaEm: (c.publicada_em as string) ?? null,
        respondidaEm: (c.respondida_em as string) ?? null,
        opcoes: (opcoesPor.get(c.id as string) ?? []).sort((a, b) => a.ordem - b.ordem),
      };
    });
  }
);

/** A rodada de UMA decisão, para o drawer da cerimonialista. */
export const getCuradoriaDaDecisao = cache(
  async (decisaoId: string): Promise<Curadoria | null> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("decisao_curadoria")
      .select(
        `id, evento_decisao_id, estado, escolhida_opcao_id, motivo_recusa, publicada_em, respondida_em,
         decisao_opcao(${COLUNAS_OPCAO})`
      )
      .eq("evento_decisao_id", decisaoId)
      .maybeSingle();

    if (!data) return null;
    const c = data as unknown as Record<string, unknown>;
    return {
      id: c.id as string,
      decisaoId: c.evento_decisao_id as string,
      decisaoTitulo: "",
      objetivoNome: null,
      estado: c.estado as Curadoria["estado"],
      escolhidaOpcaoId: (c.escolhida_opcao_id as string) ?? null,
      motivoRecusa: (c.motivo_recusa as string) ?? null,
      publicadaEm: (c.publicada_em as string) ?? null,
      respondidaEm: (c.respondida_em as string) ?? null,
      opcoes: ((c.decisao_opcao as Record<string, unknown>[]) ?? [])
        .map(mapearOpcao)
        .sort((a, b) => a.ordem - b.ordem),
    };
  }
);

/** Quantas rodadas esperam resposta da cliente (para o bloco da home). */// contarEscolhasAbertas saiu: exportada, nunca montada em tela nenhuma.
