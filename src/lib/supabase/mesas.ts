// Leitura do croqui do salão — SÓ SERVIDOR (usa next/headers via
// createClient). As regras (geometria, saúde, contagens) moram em
// croqui-core.ts, puro, que qualquer componente importa.
//
// Dado de terceiro nesta tela: restrição alimentar, acessibilidade e o
// motivo de duas pessoas não sentarem juntas. Tudo isso fica em tela
// logada da equipe. As funções de impresso do core não recebem motivo
// nem nome+condição — o que não entra, não vaza.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ConvidadoCroqui, Elemento, Mesa } from "@/lib/croqui-core";

export type Salao = {
  id: string;
  nome: string | null;
  larguraCm: number;
  alturaCm: number;
  observacao: string | null;
  /** planta baixa do local, quando o espaço mandou */
  planta: {
    path: string;
    tipo: "svg" | "imagem";
    /** URL assinada e temporária — o bucket é privado */
    url: string | null;
    /** nulo = subiu mas ainda falta calibrar a escala */
    larguraCm: number | null;
    alturaCm: number | null;
    xCm: number;
    yCm: number;
    opacidade: number;
  } | null;
};

/** relação completa, com o motivo — só a tela logada consome */
export type Relacao = {
  id: string;
  convidadoA: string;
  convidadoB: string;
  tipo: "junto" | "separado";
  motivoInterno: string | null;
};

export const getSalao = cache(async (eventId: string): Promise<Salao | null> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_salao")
    .select(
      "id, nome, largura_cm, altura_cm, observacao, planta_path, planta_tipo, planta_largura_cm, planta_altura_cm, planta_x_cm, planta_y_cm, planta_opacidade"
    )
    .eq("event_id", eventId)
    .maybeSingle();
  if (!data) return null;

  // bucket privado: a planta só existe por URL assinada, que vence.
  // Uma hora cobre a sessão de montagem sem virar link eterno.
  let url: string | null = null;
  if (data.planta_path) {
    const { data: assinada } = await supabase.storage
      .from("plantas")
      .createSignedUrl(data.planta_path, 60 * 60);
    url = assinada?.signedUrl ?? null;
  }

  return {
    id: data.id,
    nome: data.nome,
    larguraCm: data.largura_cm,
    alturaCm: data.altura_cm,
    observacao: data.observacao,
    planta: data.planta_path
      ? {
          path: data.planta_path,
          tipo: data.planta_tipo,
          url,
          larguraCm: data.planta_largura_cm,
          alturaCm: data.planta_altura_cm,
          xCm: data.planta_x_cm ?? 0,
          yCm: data.planta_y_cm ?? 0,
          opacidade: data.planta_opacidade ?? 45,
        }
      : null,
  } as Salao;
});

export const getMesas = cache(async (eventId: string): Promise<Mesa[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_mesa")
    .select(
      "id, rotulo, tipo, lugares, x_cm, y_cm, rotacao, largura_cm, altura_cm, assento_marcado, ordem"
    )
    .eq("event_id", eventId)
    .order("ordem")
    .order("rotulo");
  return (data ?? []).map((m) => ({
    id: m.id,
    rotulo: m.rotulo,
    tipo: m.tipo,
    lugares: m.lugares,
    xCm: m.x_cm,
    yCm: m.y_cm,
    rotacao: m.rotacao,
    larguraCm: m.largura_cm,
    alturaCm: m.altura_cm,
    assentoMarcado: m.assento_marcado,
    ordem: m.ordem ?? 0,
  })) as Mesa[];
});

export const getElementos = cache(async (eventId: string): Promise<Elemento[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_elemento")
    .select("id, tipo, rotulo, x_cm, y_cm, rotacao, largura_cm, altura_cm")
    .eq("event_id", eventId)
    .order("created_at");
  return (data ?? []).map((e) => ({
    id: e.id,
    tipo: e.tipo,
    rotulo: e.rotulo,
    xCm: e.x_cm,
    yCm: e.y_cm,
    rotacao: e.rotacao,
    larguraCm: e.largura_cm,
    alturaCm: e.altura_cm,
  })) as Elemento[];
});

/** convidados como o croqui precisa — SEM telefone e SEM e-mail, que a
 *  alocação não usa. restricao_alimentar (texto livre) também fica de
 *  fora: aqui circula só a categoria, que vira contagem. */
/** Acompanhante com nome (129) e a presença dele (148): na porta cada um
 *  entra por si, e o titular pode chegar antes da mulher. */
export type AcompanhanteDaLista = {
  id: string;
  nome: string;
  ehCrianca: boolean;
  presenteEm: string | null;
};

/** O convidado da lista da aba Mesas: o croqui + a presença no dia (141).
 *  Fica fora de ConvidadoCroqui de propósito — o croqui e os impressos
 *  não precisam saber quem chegou. */
export type ConvidadoDaLista = ConvidadoCroqui & {
  presenteEm: string | null;
  acompanhantesNominais: AcompanhanteDaLista[];
};

export const getConvidadosCroqui = cache(
  async (eventId: string): Promise<ConvidadoDaLista[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_convidado")
      .select(
        "id, nome, confirmacao, mesa_id, ordem_na_mesa, eh_crianca, responsavel_id, restricao_tipo, acessibilidade, acompanhantes, presente_em, evento_acompanhante(id, nome, eh_crianca, presente_em, ordem)"
      )
      .eq("event_id", eventId)
      .order("nome");
    return (data ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      confirmacao: c.confirmacao,
      mesaId: c.mesa_id,
      ordemNaMesa: c.ordem_na_mesa,
      ehCrianca: c.eh_crianca ?? false,
      responsavelId: c.responsavel_id,
      restricaoTipo: c.restricao_tipo ?? [],
      acessibilidade: c.acessibilidade,
      acompanhantes: c.acompanhantes ?? 0,
      presenteEm: c.presente_em ?? null,
      acompanhantesNominais: (
        (c.evento_acompanhante ?? []) as {
          id: string;
          nome: string;
          eh_crianca: boolean | null;
          presente_em: string | null;
          ordem: number | null;
        }[]
      )
        .slice()
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((a) => ({
          id: a.id,
          nome: a.nome,
          ehCrianca: a.eh_crianca ?? false,
          presenteEm: a.presente_em ?? null,
        })),
    })) as ConvidadoDaLista[];
  }
);

/**
 * Quantos chegaram — a ÚNICA fórmula (148: presentes_do_evento lê o
 * livro de chegadas). Antes cada tela somava do seu jeito: Mesas fazia
 * 1 + acompanhantes, a prestação 1 + acompanhantes + crianças, e as duas
 * divergiam da porta. `origem` diz por onde as pessoas entraram.
 * Nulo quando a migração ainda não rodou — a tela mostra o que tem.
 */
export const getPresentes = cache(
  async (
    eventId: string
  ): Promise<{ quantidade: number; origem: "sem_marcacao" | "porta" | "equipe" | "mista" } | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("presentes_do_evento", { p_event_id: eventId });
    if (error) {
      console.error("[eorganizei:mesas] presentes:", error.message);
      return null;
    }
    const linha = (data as { quantidade: number; origem: string }[] | null)?.[0];
    if (!linha) return null;
    return {
      quantidade: linha.quantidade,
      origem: linha.origem as "sem_marcacao" | "porta" | "equipe" | "mista",
    };
  }
);

export const getRelacoes = cache(async (eventId: string): Promise<Relacao[]> => {
  const supabase = createClient();
  const { data } = await supabase
    .from("evento_convidado_relacao")
    .select("id, convidado_a, convidado_b, tipo, motivo_interno")
    .eq("event_id", eventId)
    .order("created_at");
  return (data ?? []).map((r) => ({
    id: r.id,
    convidadoA: r.convidado_a,
    convidadoB: r.convidado_b,
    tipo: r.tipo,
    motivoInterno: r.motivo_interno,
  })) as Relacao[];
});
