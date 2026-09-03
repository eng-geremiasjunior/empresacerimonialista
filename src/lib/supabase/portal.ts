// Leitura do Portal da Cliente. Toda query roda no servidor com a sessão
// da cliente — a RLS é a guarda: se ela não tem vínculo com o evento, a
// consulta volta vazia e a página responde notFound(). O endereço diz QUAL
// evento mostrar; nunca SE ela pode vê-lo.
//
// PERFORMANCE (padrão novo no repo): React cache() deduplica por request —
// layout e page pedem o mesmo evento e sai UMA query. As funções por tela
// disparam seus fetches em paralelo (Promise.all) e nunca em cascata.
// Orçamento de round-trips: home ≤6 (auth + evento + 4 em paralelo),
// telas internas ≤4.
//
// Um detalhe que NÃO é redundância: os filtros responsavel in (noivos,
// ambos) e visivel_portal=true aparecem aqui MESMO a RLS já garantindo
// isso para a cliente — porque a equipe também pode abrir o portal (a
// dona testando), e para ela a RLS da equipe devolveria tudo. O filtro na
// query faz o portal mostrar O MESMO para qualquer principal.

import { cache } from "react";
import { differenceInCalendarDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";
import { valorDoCampo, type Campo, type TipoCampo } from "@/lib/planejamento-shared";
import type { PrestacaoPayload } from "@/lib/prestacao-core";
import { hojeBR, inicioDoDiaBR } from "@/lib/tempo";

export type EventoDoPortal = {
  id: string;
  tipo: EventType;
  nome: string | null;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  papel: string;
  diasRestantes: number | null;
  marca: { nome: string; logoUrl: string | null } | null;
};

export type ContatoCerimonialista = {
  nome: string | null;
  whatsapp: string | null;
};

export type DecisaoDoPortal = {
  id: string;
  titulo: string;
  prazoPrevisto: string | null;
  /** nome do objetivo (a "categoria" da linha) — vem por RPC, nunca da
   *  tabela: evento_objetivo continua fechado para a cliente */
  objetivoNome: string | null;
};

export type FornecedorContratado = {
  supplierId: string;
  fornecedor: string;
  categoria: string;
  decididaEm: string | null;
  valor: number | null;
};

export type ParcelaDoPortal = {
  fornecedor: string | null;
  descricao: string | null;
  valor: number;
  dueDate: string;
  paid: boolean;
  paidAt: string | null;
};

export type InvestimentoDoPortal = {
  contratado: number;
  pago: number;
  parcelas: ParcelaDoPortal[];
};

export type ItemLinhaDoTempo = {
  tipo: "aceite" | "contratacao" | "compromisso";
  titulo: string;
  detalhe: string | null;
  valor: number | null;
  quando: string | null;
};

export type PerguntaDoPortal = {
  campoId: string;
  label: string;
  tipo: TipoCampo;
  opcoes: string[] | null;
  unidade: string | null;
  /** resposta atual (null = ainda sem resposta) */
  valor: string | number | boolean | null;
  /** a versão que a tela viu — vai junto na escrita (trava otimista) */
  updatedAt: string;
  decisaoTitulo: string;
  prazoPrevisto: string | null;
};

export type HomeDoPortal = {
  faltaDecidir: DecisaoDoPortal[];
  totalAFechar: number;
  contratados: FornecedorContratado[];
  investimento: InvestimentoDoPortal | null;
  /** Quantas perguntas a tela de Perguntas mostra AGORA (3–5), nunca o
   *  backlog inteiro — "135 perguntas" assusta e não orienta. */
  perguntas: number;
  proximaPergunta: PerguntaDoPortal | null;
};

function diasAte(data: string | null): number | null {
  if (!data) return null;
  return differenceInCalendarDays(
    new Date(`${data}T00:00:00`),
    inicioDoDiaBR()
  );
}

/** Quem está logada — 1 chamada de auth por request, compartilhada. */
export const getUsuarioPortal = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Eventos em que a pessoa logada tem acesso ativo. */
export async function getEventosDaCliente(): Promise<EventoDoPortal[]> {
  const user = await getUsuarioPortal();
  if (!user) return [];
  const supabase = createClient();
  // O filtro por user_id casa com o índice parcial da 086. Sem ele a
  // consulta varria evento_acesso inteiro autorizando linha a linha.
  const { data } = await supabase
    .from("evento_acesso")
    .select("papel, events(id, type, name, date, time, location, city)")
    .eq("status", "ativo")
    .eq("user_id", user.id);

  const linhas = (data ?? []) as unknown as {
    papel: string;
    events: {
      id: string;
      type: EventType;
      name: string | null;
      date: string;
      time: string | null;
      location: string | null;
      city: string | null;
    } | null;
  }[];

  return linhas
    .filter((l) => l.events !== null)
    .map((l) => ({
      id: l.events!.id,
      tipo: l.events!.type,
      nome: l.events!.name,
      data: l.events!.date,
      hora: l.events!.time,
      local: l.events!.location,
      cidade: l.events!.city,
      papel: l.papel,
      diasRestantes: diasAte(l.events!.date),
      marca: null,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Um evento específico + a marca da cerimonialista, em UMA query (embed
 * events → empresas). null = sem vínculo (a RLS não devolveu nada).
 * cache(): layout e page pedem — o banco responde uma vez.
 */
export const getEventoDoPortal = cache(
  async (eventId: string): Promise<EventoDoPortal | null> => {
    const user = await getUsuarioPortal();
    if (!user) return null;
    const supabase = createClient();
    const { data } = await supabase
      .from("evento_acesso")
      .select(
        "papel, events(id, type, name, date, time, location, city, empresas(nome, logo_url))"
      )
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .maybeSingle();

    const linha = data as unknown as {
      papel: string;
      events: {
        id: string;
        type: EventType;
        name: string | null;
        date: string;
        time: string | null;
        location: string | null;
        city: string | null;
        empresas: { nome: string; logo_url: string | null } | null;
      } | null;
    } | null;

    if (!linha?.events) return null;
    const ev = linha.events;
    return {
      id: ev.id,
      tipo: ev.type,
      nome: ev.name,
      data: ev.date,
      hora: ev.time,
      local: ev.location,
      cidade: ev.city,
      papel: linha.papel,
      diasRestantes: diasAte(ev.date),
      marca: ev.empresas
        ? { nome: ev.empresas.nome, logoUrl: ev.empresas.logo_url ?? null }
        : null,
    };
  }
);

/** Marca da cerimonialista — sai da MESMA query do evento (cache). */
export async function getMarcaDaEmpresa(
  eventId: string
): Promise<{ nome: string; logoUrl: string | null } | null> {
  const evento = await getEventoDoPortal(eventId);
  return evento?.marca ?? null;
}

/**
 * Contato da cerimonialista. Vem por RPC porque a fonte é fraca: o
 * telefone da PESSOA não existe no schema, então cai no WhatsApp
 * institucional da empresa (que varia por tipo de evento desde a 057).
 */
export const getContatoCerimonialista = cache(
  async (eventId: string): Promise<ContatoCerimonialista> => {
    const supabase = createClient();
    const { data } = await supabase
      .rpc("portal_contato_cerimonialista", { p_event_id: eventId })
      .maybeSingle();

    const linha = data as ContatoCerimonialista | null;
    return { nome: linha?.nome ?? null, whatsapp: linha?.whatsapp ?? null };
  }
);

// ------------------------------------------------------------------
// Fetches internos das telas (compartilhados via cache por request)
// ------------------------------------------------------------------

const COLUNAS_CAMPO =
  "id, codigo, label, label_portal, tipo, opcoes, unidade, ordem, valor_texto, valor_numero, valor_bool, valor_data, valor_hora, valor_opcao, valor_supplier_id";

type LinhaCampo = {
  id: string;
  codigo: string;
  label: string;
  label_portal: string | null;
  tipo: TipoCampo;
  opcoes: string[] | null;
  unidade: string | null;
  ordem: number;
  valor_texto: string | null;
  valor_numero: number | null;
  valor_bool: boolean | null;
  valor_data: string | null;
  valor_hora: string | null;
  valor_opcao: string | null;
  valor_supplier_id: string | null;
  evento_decisao: {
    id: string;
    titulo: string;
    prazo_previsto: string | null;
    estado: string;
    responsavel: string;
    /** ≤ 0 = decisão do dia ou de depois dele (a nota de 0 a 10, por exemplo) */
    offset_ideal_dias: number | null;
  } | null;
};

function comoCampo(l: LinhaCampo): Campo {
  return {
    id: l.id,
    codigo: l.codigo,
    label: l.label,
    tipo: l.tipo,
    opcoes: l.opcoes,
    unidade: l.unidade,
    ordem: l.ordem,
    valorTexto: l.valor_texto,
    valorNumero: l.valor_numero,
    valorBool: l.valor_bool,
    valorData: l.valor_data,
    valorHora: l.valor_hora,
    valorOpcao: l.valor_opcao,
    valorSupplierId: l.valor_supplier_id,
  };
}

/** Decisões pendentes da cliente, por prazo, com o nome do assunto. */
const getDecisoesPendentes = cache(async (eventId: string) => {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_falta_decidir", {
    p_event_id: eventId,
  });
  const linhas = (data ?? []) as unknown as {
    id: string;
    titulo: string;
    prazo_previsto: string | null;
    objetivo_nome: string | null;
  }[];
  return linhas.map((d) => ({
    id: d.id,
    titulo: d.titulo,
    prazoPrevisto: d.prazo_previsto,
    objetivoNome: d.objetivo_nome,
  })) as DecisaoDoPortal[];
});

/**
 * As perguntas da cliente: campos `pergunta_cliente` de decisões
 * PENDENTES dela, separados entre abertas (sem resposta) e respondidas.
 *
 * `pergunta_cliente` é o filtro que separa a pergunta da noiva da anotação
 * de trabalho: dentro de uma mesma decisão do casal convivem "O que não
 * pode faltar" (dela) e "Tem gerador / Orçamentos até 3" (da
 * cerimonialista). Sem ele, a noiva recebia a lista de tarefas da
 * profissional como se fosse pergunta.
 *
 * CUIDADO: false é resposta (sim_nao) — o vazio é valorDoCampo === null.
 *
 * Duas peneiras além do filtro da query (141):
 *   - só decisões de objetivo ATIVO — os ids vêm da mesma RPC da home
 *     (portal_falta_decidir), que é quem sabe de evento_objetivo.ativo;
 *   - decisão do dia do evento em diante (offset_ideal_dias <= 0) só
 *     pergunta quando a data já chegou — a nota de 0 a 10 não aparece
 *     no dia 1.
 */
const getPerguntasDaCliente = cache(
  async (eventId: string, dataEvento: string) => {
    const supabase = createClient();
    const [{ data }, ativas] = await Promise.all([
      supabase
        .from("evento_campo_valor")
        .select(
          `${COLUNAS_CAMPO}, updated_at, evento_decisao!inner(id, titulo, prazo_previsto, estado, responsavel, offset_ideal_dias)`
        )
        .eq("event_id", eventId)
        .eq("visivel_portal", true)
        .eq("pergunta_cliente", true)
        .eq("evento_decisao.estado", "pendente")
        .in("evento_decisao.responsavel", ["noivos", "ambos"]),
      getDecisoesPendentes(eventId),
    ]);

    const idsAtivos = new Set(ativas.map((d) => d.id));
    const diaChegou = dataEvento <= hojeBR();

    const linhas = (data ?? []) as unknown as (LinhaCampo & {
      updated_at: string;
    })[];
    const todas = linhas
      .filter((l) => l.evento_decisao && idsAtivos.has(l.evento_decisao.id))
      .filter((l) => {
        const offset = l.evento_decisao!.offset_ideal_dias;
        return offset === null || offset > 0 || diaChegou;
      })
      .map((l) => ({
        campoId: l.id,
        // o mesmo campo dito na voz dela; sem rótulo próprio, o interno serve
        label: l.label_portal?.trim() || l.label,
        tipo: l.tipo,
        opcoes: l.opcoes,
        unidade: l.unidade,
        valor: valorDoCampo(comoCampo(l)),
        updatedAt: l.updated_at,
        decisaoTitulo: l.evento_decisao!.titulo,
        prazoPrevisto: l.evento_decisao!.prazo_previsto,
      }))
      .sort((a, b) =>
        (a.prazoPrevisto ?? "9999").localeCompare(b.prazoPrevisto ?? "9999")
      ) as PerguntaDoPortal[];

    return {
      abertas: todas.filter((p) => p.valor === null),
      respondidas: todas.filter((p) => p.valor !== null),
    };
  }
);

const getContratados = cache(async (eventId: string) => {
  const supabase = createClient();
  const { data } = await supabase.rpc("portal_fornecedores_contratados", {
    p_event_id: eventId,
  });
  const linhas = (data ?? []) as unknown as {
    supplier_id: string;
    fornecedor: string;
    categoria: string;
    decidida_em: string | null;
    valor: number | null;
  }[];
  return linhas.map((l) => ({
    supplierId: l.supplier_id,
    fornecedor: l.fornecedor,
    categoria: l.categoria,
    decididaEm: l.decidida_em,
    valor: l.valor,
  })) as FornecedorContratado[];
});

export const getInvestimento = cache(
  async (eventId: string): Promise<InvestimentoDoPortal | null> => {
    const supabase = createClient();
    const { data } = await supabase.rpc("portal_investimento", {
      p_event_id: eventId,
    });
    const bruto = data as unknown as {
      contratado: number;
      pago: number;
      parcelas: {
        fornecedor: string | null;
        descricao: string | null;
        valor: number;
        due_date: string;
        paid: boolean;
        paid_at: string | null;
      }[];
    } | null;
    if (!bruto) return null;
    return {
      contratado: Number(bruto.contratado ?? 0),
      pago: Number(bruto.pago ?? 0),
      parcelas: (bruto.parcelas ?? []).map((p) => ({
        fornecedor: p.fornecedor,
        descricao: p.descricao,
        valor: Number(p.valor),
        dueDate: p.due_date,
        paid: p.paid,
        paidAt: p.paid_at,
      })),
    };
  }
);

/**
 * A prestação de contas entregue — a FOTOGRAFIA da versão mais recente,
 * nunca o dado vivo. A RPC (136) devolve null quando nada foi entregue
 * ou quando este acesso não alcança o evento.
 */
export const getPrestacaoDeContas = cache(
  async (
    eventId: string
  ): Promise<{
    versao: number;
    entregueEm: string;
    conteudo: PrestacaoPayload;
  } | null> => {
    const supabase = createClient();
    const { data } = await supabase.rpc("portal_prestacao_de_contas", {
      p_event_id: eventId,
    });
    const bruto = data as unknown as {
      versao: number;
      entregue_em: string;
      conteudo: PrestacaoPayload;
    } | null;
    if (!bruto?.conteudo) return null;
    return {
      versao: Number(bruto.versao),
      entregueEm: bruto.entregue_em,
      conteudo: bruto.conteudo,
    };
  }
);

export const getLinhaDoTempo = cache(
  async (eventId: string): Promise<ItemLinhaDoTempo[]> => {
    const supabase = createClient();
    const { data } = await supabase.rpc("portal_linha_do_tempo", {
      p_event_id: eventId,
    });
    return ((data ?? []) as unknown as ItemLinhaDoTempo[]).map((i) => ({
      tipo: i.tipo,
      titulo: i.titulo,
      detalhe: i.detalhe,
      valor: i.valor === null ? null : Number(i.valor),
      quando: i.quando,
    }));
  }
);

export async function getPerguntas(
  eventId: string,
  dataEvento: string
): Promise<{
  abertas: PerguntaDoPortal[];
  respondidas: PerguntaDoPortal[];
}> {
  return getPerguntasDaCliente(eventId, dataEvento);
}

/** Tudo da home, em paralelo. */
export async function getHomePortal(
  eventId: string,
  dataEvento: string
): Promise<HomeDoPortal> {
  const [pendentes, perguntas, contratados, investimento] = await Promise.all([
    getDecisoesPendentes(eventId),
    getPerguntasDaCliente(eventId, dataEvento),
    getContratados(eventId),
    getInvestimento(eventId),
  ]);
  return {
    faltaDecidir: pendentes.slice(0, 3),
    totalAFechar: pendentes.length,
    contratados,
    investimento,
    perguntas: Math.min(perguntas.abertas.length, 5),
    proximaPergunta: perguntas.abertas[0] ?? null,
  };
}

/** "Marina & João" quando existe; senão o rótulo do tipo. */
export function nomeDeExibicao(ev: EventoDoPortal): string {
  return ev.nome?.trim() || "Seu evento";
}
