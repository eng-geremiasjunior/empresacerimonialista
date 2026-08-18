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
    .select("id, nome, largura_cm, altura_cm, observacao")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    nome: data.nome,
    larguraCm: data.largura_cm,
    alturaCm: data.altura_cm,
    observacao: data.observacao,
  };
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
export const getConvidadosCroqui = cache(
  async (eventId: string): Promise<ConvidadoCroqui[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_convidado")
      .select(
        "id, nome, confirmacao, mesa_id, ordem_na_mesa, eh_crianca, responsavel_id, restricao_tipo, acessibilidade, acompanhantes"
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
    })) as ConvidadoCroqui[];
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
