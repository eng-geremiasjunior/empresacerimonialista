// Leitura do Portal da Cliente. Toda query roda no servidor com a sessão
// da cliente — a RLS é a guarda: se ela não tem vínculo com o evento, a
// consulta volta vazia e a página responde notFound(). O endereço diz QUAL
// evento mostrar; nunca SE ela pode vê-lo.
//
// PERFORMANCE (padrão novo no repo): React cache() deduplica por request —
// layout e page pedem o mesmo evento e sai UMA query. As funções por tela
// disparam seus fetches em paralelo (Promise.all) e nunca em cascata.
// Orçamento de round-trips: home ≤6 (auth + evento + 4 em paralelo),
// telas internas ≤4 — e a conta inclui o que uma função pede POR DENTRO
// (getPerguntasDaCliente chama getDecisoesPendentes; numa mesma request o
// cache() faz disso uma RPC só).
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
  /** a decisão a que a pergunta pertence — é por ele que a home sabe se
   *  a decisão que ela lista tem alguma pergunta esperando resposta */
  decisaoId: string;
  decisaoTitulo: string;
  prazoPrevisto: string | null;
};

/**
 * A decisao COMO A HOME a mostra. `temPergunta` decide se a linha vira
 * link: so a decisao com pergunta em aberto leva a /perguntas, porque so
 * dela existe alguma coisa para responder lá.
 */
export type DecisaoDaHome = DecisaoDoPortal & { temPergunta: boolean };

export type HomeDoPortal = {
  faltaDecidir: DecisaoDaHome[];
  contratados: FornecedorContratado[];
  investimento: InvestimentoDoPortal | null;
  /** Quantas perguntas a tela de Perguntas mostra AGORA (3–5), nunca o
   *  backlog inteiro — "135 perguntas" assusta e não orienta. */
  perguntas: number;
  /** Sem pergunta agora, sem pergunta por vir E sem nada respondido, a
   *  porta não se anuncia: num show a tela nunca vai encher. Respondidas
   *  contam porque a cliente volta lá para reeditar — e este cartão é o
   *  único caminho para /perguntas, que não está em menu nenhum. */
  perguntasFuturas: number;
  perguntasRespondidas: number;
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
    const naJanela = (l: LinhaCampo) => {
      const offset = l.evento_decisao!.offset_ideal_dias;
      return offset === null || offset > 0 || diaChegou;
    };

    const doEvento = linhas.filter(
      (l) => l.evento_decisao && idsAtivos.has(l.evento_decisao.id)
    );

    // Quantas perguntas a JANELA está segurando e continuam sem resposta —
    // é o único caso em que a tela vazia pode prometer "aparecem quando a
    // data se aproximar". Sem esta conta a promessa era cega: numa
    // formatura (1 pergunta no método inteiro) e numa debutante (2), a
    // cliente respondia tudo e continuava lendo para sempre que viriam
    // perguntas novas.
    const futuras = doEvento.filter(
      (l) => !naJanela(l) && valorDoCampo(comoCampo(l)) === null
    ).length;

    const todas = doEvento
      .filter(naJanela)
      .map((l) => ({
        campoId: l.id,
        // o mesmo campo dito na voz dela; sem rótulo próprio, o interno serve
        label: l.label_portal?.trim() || l.label,
        tipo: l.tipo,
        opcoes: l.opcoes,
        unidade: l.unidade,
        valor: valorDoCampo(comoCampo(l)),
        updatedAt: l.updated_at,
        decisaoId: l.evento_decisao!.id,
        decisaoTitulo: l.evento_decisao!.titulo,
        prazoPrevisto: l.evento_decisao!.prazo_previsto,
      }))
      .sort((a, b) =>
        (a.prazoPrevisto ?? "9999").localeCompare(b.prazoPrevisto ?? "9999")
      ) as PerguntaDoPortal[];

    return {
      abertas: todas.filter((p) => p.valor === null),
      respondidas: todas.filter((p) => p.valor !== null),
      futuras,
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

/** As perguntas da tela, mais quantas a janela de prazo ainda segura. */
export async function getPerguntas(
  eventId: string,
  dataEvento: string
): Promise<{
  abertas: PerguntaDoPortal[];
  respondidas: PerguntaDoPortal[];
  /** perguntas ainda sem resposta que a janela de prazo está segurando */
  futuras: number;
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

  // A home listava decisões e mandava TODAS para /perguntas — e os dois
  // lados sempre partiram de filtros diferentes: a decisão vem da RPC
  // (responsável noivos/ambos, objetivo ativo) e a pergunta vem de
  // pergunta_cliente = true. Medido em produção, das decisões da cliente
  // com objetivo ativo: casamento 71, das quais só 25 têm pergunta;
  // corporativo 13/5; debutante 51/2; formatura 12/1; show 11/ZERO. Era
  // assim que a debutante anunciava "Definir o tema da festa" e abria uma
  // tela sem tema, e o show anunciava 11 decisões para uma tela vazia
  // para sempre.
  //
  // Esconder as decisões mudas seria pior do que o defeito. Duas causas
  // as fazem mudas, e nenhuma delas é "a cliente não precisa saber":
  //   1. o gatilho trg_campo_curado (146) recusa marcar como pergunta
  //      campo de tipo fornecedor, moeda e anexo — que é tudo o que as
  //      decisões de contratar e pagar têm;
  //   2. a curadoria é uma lista de 32 códigos de CASAMENTO, e os outros
  //      métodos mal a tocam: a debutante compartilha dois códigos, a
  //      formatura um, o show nenhum. Dar voz a um tipo é mexer na
  //      curadoria, não nos tipos de campo.
  // Sumiriam "Definir a data do casamento" e "Contratar o espaço". Então
  // a lista continua inteira e quem muda é o LINK: só a decisão com
  // pergunta em aberto vira link, e leva direto para ela (?decisao=).
  const comPergunta = new Set(perguntas.abertas.map((p) => p.decisaoId));

  return {
    faltaDecidir: pendentes.slice(0, 3).map((d) => ({
      ...d,
      temPergunta: comPergunta.has(d.id),
    })),
    contratados,
    investimento,
    perguntas: Math.min(perguntas.abertas.length, 5),
    perguntasFuturas: perguntas.futuras,
    perguntasRespondidas: perguntas.respondidas.length,
    proximaPergunta: perguntas.abertas[0] ?? null,
  };
}

/** "Marina & João" quando existe; senão "Seu evento" — o tipo NÃO entra
 *  aqui: o cabeçalho do portal não é lugar de dizer à cliente que tipo de
 *  evento ela contratou. */
export function nomeDeExibicao(ev: EventoDoPortal): string {
  return ev.nome?.trim() || "Seu evento";
}
