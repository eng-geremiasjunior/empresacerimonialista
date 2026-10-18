// As Oportunidades do Comercial (18/10/2026, pedido dele com a Wedy de
// referência): o funil que ANDA SOZINHO. Cada cartão está na coluna que o
// sistema comprova — pedido chegou, proposta saiu, a cliente abriu,
// aceitou, recusou, venceu — e tem UMA próxima ação, por regra simples.
// Nada se arrasta; nada se digita para mudar de coluna.
//
// Módulo puro (sem banco, sem React): `hoje` e `agora` entram por
// parâmetro, e os casos montados em ferramentas/sim provam cada regra.

import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import {
  haQuanto,
  origemEmPalavras,
  semResposta,
  type CanalDoPedido,
  type OrigemDoAcesso,
  type PedidoStatus,
} from "@/lib/comercial/pedidos";
import { diaDe, diasEntre } from "@/lib/comercial/relatorio";
import type { OrcamentoStatus } from "@/lib/orcamentos";
import { somarDias } from "@/lib/tempo";

/** Fechados e "não fechou" olham para trás só este tanto. */
export const DIAS_DO_HISTORICO = 30;
/** Enviada e nunca aberta: depois disto, lembrar. */
export const DIAS_SEM_ABRIR = 2;
/** Aberta e sem resposta: depois disto, retomar. */
export const DIAS_SEM_RESPOSTA = 3;
/** A validade acaba em até tantos dias: avisar. */
export const DIAS_PARA_VENCER = 3;
/** Comentário da cliente cobra resposta por este tanto. */
export const DIAS_DO_COMENTARIO = 7;

export type PedidoDaOportunidade = {
  id: string;
  nome: string;
  whatsapp: string | null;
  tipo_evento: string;
  data_evento: string | null;
  status: PedidoStatus;
  canal: CanalDoPedido;
  origem_acesso: OrigemDoAcesso;
  utm_campaign: string | null;
  orcamento_id: string | null;
  created_at: string;
  encerrado_em: string | null;
  motivo_encerramento: string | null;
};

export type PropostaDaOportunidade = {
  id: string;
  contato_nome: string;
  contato_telefone: string | null;
  tipo_evento: string;
  data_evento: string | null;
  valor_total: number;
  status: OrcamentoStatus;
  data_criacao: string;
  data_validade: string;
  enviado_em: string | null;
  respondido_em: string | null;
  recusado_em: string | null;
  motivo_recusa: string | null;
  visitas: number | null;
  ultima_visita_em: string | null;
  evento_gerado_id: string | null;
  pedido_id: string | null;
  /** o endereço público da proposta, montado no servidor */
  link: string;
};

export type DadosDasOportunidades = {
  pedidos: PedidoDaOportunidade[];
  propostas: PropostaDaOportunidade[];
  /** o aceite mais recente de cada proposta */
  aceites: { orcamento_id: string; created_at: string }[];
  /** o comentário mais recente da cliente em cada proposta */
  comentarios: { orcamento_id: string; created_at: string }[];
};

export type AcaoDoCartao = {
  rotulo: string;
  href: string;
  /** abre o WhatsApp dela, em outra aba */
  fora?: boolean;
};

export type CartaoDaOportunidade = {
  chave: string;
  tipo: "pedido" | "proposta";
  id: string;
  nome: string;
  /** "Casamento · 12/12/2026" */
  evento: string;
  /** "pela sua página (Instagram)"; nulo na proposta feita direto */
  origem: string | null;
  /** o tempo do cartão: "vista 3× · sem resposta há 4 dias" */
  linha: string;
  valor: number | null;
  /** a ação passou do tempo: vai também para "Precisa de retorno" */
  urgente: boolean;
  acao: AcaoDoCartao | null;
  /** o pedido em aberto pode ser encerrado ali mesmo */
  encerravel: boolean;
  /** para ordenar a faixa de retorno: o mais antigo primeiro */
  desde: string;
};

export type ChaveDaColuna = "novos" | "negociacao" | "fechados" | "perdidos";

export type ColunaDaOportunidade = {
  chave: ChaveDaColuna;
  titulo: string;
  vazio: string;
  cartoes: CartaoDaOportunidade[];
  /** soma dos valores dos cartões que têm valor */
  valor: number;
};

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

function eventoEmPalavras(tipo: string, data: string | null): string {
  const rotulo = EVENT_TYPE_LABELS[tipo as EventType] ?? "Evento";
  if (!data) return `${rotulo} · data a definir`;
  const [a, m, d] = data.split("-");
  return `${rotulo} · ${d}/${m}/${a}`;
}

const dataCurta = (dia: string) => {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
};

function haDias(n: number): string {
  if (n <= 0) return "hoje";
  if (n === 1) return "ontem";
  return `há ${n} dias`;
}

function tipoEmMinusculas(tipo: string): string {
  return (EVENT_TYPE_LABELS[tipo as EventType] ?? "evento").toLocaleLowerCase("pt-BR");
}

/** O WhatsApp dela já com a mensagem escrita; sem número válido, nada. */
function noWhatsapp(rotulo: string, telefone: string | null, texto: string): AcaoDoCartao | null {
  const href = linkWhatsapp(telefone, texto);
  return href ? { rotulo, href, fora: true } : null;
}

function cartaoDoPedido(p: PedidoDaOportunidade, agora: Date): CartaoDaOportunidade {
  const atrasado = semResposta(p, agora);
  return {
    chave: `pedido-${p.id}`,
    tipo: "pedido",
    id: p.id,
    nome: p.nome,
    evento: eventoEmPalavras(p.tipo_evento, p.data_evento),
    origem: origemEmPalavras(p),
    linha: `pediu ${haQuanto(p.created_at, agora)}${atrasado ? " · sem resposta" : ""}`,
    valor: null,
    urgente: atrasado,
    acao: { rotulo: "Responder com proposta", href: `/orcamentos/novo?pedido=${p.id}` },
    encerravel: true,
    desde: p.created_at,
  };
}

function cartaoDoPedidoEncerrado(p: PedidoDaOportunidade, agora: Date): CartaoDaOportunidade {
  return {
    ...cartaoDoPedido(p, agora),
    chave: `pedido-encerrado-${p.id}`,
    linha: `encerrado ${haQuanto(p.encerrado_em ?? p.created_at, agora)}${
      p.motivo_encerramento?.trim() ? ` · ${p.motivo_encerramento.trim()}` : ""
    }`,
    urgente: false,
    acao: null,
    encerravel: false,
    desde: p.encerrado_em ?? p.created_at,
  };
}

/** A proposta em negociação: a linha de tempo e a próxima ação. */
function emNegociacao(
  o: PropostaDaOportunidade,
  origem: string | null,
  ultimoComentario: string | null,
  hoje: string
): CartaoDaOportunidade {
  const base = {
    chave: `proposta-${o.id}`,
    tipo: "proposta" as const,
    id: o.id,
    nome: o.contato_nome,
    evento: eventoEmPalavras(o.tipo_evento, o.data_evento),
    origem,
    valor: Number(o.valor_total) || 0,
    encerravel: false,
  };
  const abrir: AcaoDoCartao = { rotulo: "Abrir a proposta", href: `/orcamentos/${o.id}` };

  if (o.status === "rascunho") {
    const dias = diasEntre(diaDe(o.data_criacao) ?? hoje, hoje);
    return {
      ...base,
      linha: `proposta em preparo · começou ${haDias(dias)}`,
      urgente: false,
      acao: { rotulo: "Terminar e enviar", href: `/orcamentos/${o.id}` },
      desde: o.data_criacao,
    };
  }

  const nome = primeiroNome(o.contato_nome);
  const enviadaEm = diaDe(o.enviado_em) ?? diaDe(o.data_criacao) ?? hoje;
  const visitas = o.visitas ?? 0;
  const ultimaVisita = diaDe(o.ultima_visita_em);
  const comentouEm = diaDe(ultimoComentario);
  const venceEm = diasEntre(hoje, o.data_validade);
  const vista = visitas > 0 ? `vista ${visitas}×` : "ainda não aberta";

  // 1. a cliente escreveu (nos últimos dias) depois do envio: ler e
  // responder vem antes de tudo. Não há "lido" gravado, então um
  // comentário antigo deixa de cobrar e o cartão segue as outras regras.
  const diasDoComentario = comentouEm ? diasEntre(comentouEm, hoje) : null;
  if (comentouEm && comentouEm >= enviadaEm && diasDoComentario !== null && diasDoComentario <= DIAS_DO_COMENTARIO) {
    const dias = diasDoComentario;
    return {
      ...base,
      linha: `ela comentou ${haDias(dias)} · ${vista}`,
      urgente: true,
      acao: { rotulo: "Ler o comentário", href: `/orcamentos/${o.id}` },
      desde: ultimoComentario ?? o.data_criacao,
    };
  }

  // 2. a validade está acabando
  if (venceEm <= DIAS_PARA_VENCER) {
    const quando = venceEm <= 0 ? "vence hoje" : venceEm === 1 ? "vence amanhã" : `vence em ${venceEm} dias`;
    return {
      ...base,
      linha: `${quando} · ${vista}`,
      urgente: true,
      acao:
        noWhatsapp(
          "Avisar que vence",
          o.contato_telefone,
          `Oi${nome ? `, ${nome}` : ""}! A proposta do seu ${tipoEmMinusculas(o.tipo_evento)} vale até ${dataCurta(
            o.data_validade
          )}. Se quiser ajustar alguma coisa, me fala: ${o.link}`
        ) ?? abrir,
      desde: o.data_validade,
    };
  }

  // 3. abriu e não respondeu
  if (visitas > 0 && ultimaVisita) {
    const dias = diasEntre(ultimaVisita, hoje);
    if (dias >= DIAS_SEM_RESPOSTA) {
      return {
        ...base,
        linha: `${vista} · sem resposta há ${dias} dias`,
        urgente: true,
        acao:
          noWhatsapp(
            "Retomar no WhatsApp",
            o.contato_telefone,
            `Oi${nome ? `, ${nome}` : ""}! Conseguiu ver a proposta? Se precisar, ajusto o que for preciso: ${o.link}`
          ) ?? abrir,
        desde: o.ultima_visita_em ?? o.data_criacao,
      };
    }
    return {
      ...base,
      linha: `${vista} · última vez ${haDias(dias)}`,
      urgente: false,
      acao: abrir,
      desde: o.ultima_visita_em ?? o.data_criacao,
    };
  }

  // 4. saiu e ninguém abriu
  const diasEnviada = diasEntre(enviadaEm, hoje);
  if (diasEnviada >= DIAS_SEM_ABRIR) {
    return {
      ...base,
      linha: `enviada ${haDias(diasEnviada)} · ainda não aberta`,
      urgente: true,
      acao:
        noWhatsapp(
          "Lembrar no WhatsApp",
          o.contato_telefone,
          `Oi${nome ? `, ${nome}` : ""}! Te mandei a proposta do seu ${tipoEmMinusculas(o.tipo_evento)}. Está aqui: ${o.link}`
        ) ?? abrir,
      desde: o.enviado_em ?? o.data_criacao,
    };
  }
  return {
    ...base,
    linha: `enviada ${haDias(diasEnviada)} · ainda não aberta`,
    urgente: false,
    acao: abrir,
    desde: o.enviado_em ?? o.data_criacao,
  };
}

export function montarOportunidades(
  dados: DadosDasOportunidades,
  hoje: string,
  agora: Date
): { colunas: ColunaDaOportunidade[]; retorno: CartaoDaOportunidade[] } {
  const inicio = somarDias(hoje, -DIAS_DO_HISTORICO);
  const pedidoPorId = new Map(dados.pedidos.map((p) => [p.id, p]));
  const aceitePor = new Map<string, string>();
  for (const a of dados.aceites) {
    const atual = aceitePor.get(a.orcamento_id);
    if (!atual || a.created_at > atual) aceitePor.set(a.orcamento_id, a.created_at);
  }
  const comentarioPor = new Map<string, string>();
  for (const c of dados.comentarios) {
    const atual = comentarioPor.get(c.orcamento_id);
    if (!atual || c.created_at > atual) comentarioPor.set(c.orcamento_id, c.created_at);
  }
  const origemDa = (o: PropostaDaOportunidade) => {
    const p = o.pedido_id ? pedidoPorId.get(o.pedido_id) : undefined;
    return p ? origemEmPalavras(p) : null;
  };

  const novos: CartaoDaOportunidade[] = [];
  const negociacao: CartaoDaOportunidade[] = [];
  const fechados: CartaoDaOportunidade[] = [];
  const perdidos: CartaoDaOportunidade[] = [];

  for (const p of dados.pedidos) {
    if (p.status === "novo") novos.push(cartaoDoPedido(p, agora));
    else if (p.status === "encerrado" && (diaDe(p.encerrado_em) ?? "") >= inicio)
      perdidos.push(cartaoDoPedidoEncerrado(p, agora));
  }

  for (const o of dados.propostas) {
    const origem = origemDa(o);
    const vencida = o.status === "expirado" || (o.status === "enviado" && o.data_validade < hoje);

    if (o.status === "aprovado") {
      const instante = aceitePor.get(o.id) ?? o.respondido_em;
      const dia = diaDe(instante);
      if (!dia || dia < inicio) continue;
      fechados.push({
        chave: `proposta-${o.id}`,
        tipo: "proposta",
        id: o.id,
        nome: o.contato_nome,
        evento: eventoEmPalavras(o.tipo_evento, o.data_evento),
        origem,
        linha: `aceita ${haDias(diasEntre(dia, hoje))}${o.evento_gerado_id ? " · evento criado" : " · falta o evento"}`,
        valor: Number(o.valor_total) || 0,
        urgente: !o.evento_gerado_id,
        acao: o.evento_gerado_id
          ? { rotulo: "Abrir o evento", href: `/eventos/${o.evento_gerado_id}` }
          : { rotulo: "Gerar o evento", href: `/orcamentos/${o.id}` },
        encerravel: false,
        desde: instante ?? o.data_criacao,
      });
      continue;
    }

    if (o.status === "recusado" || vencida) {
      const dia = o.status === "recusado" ? diaDe(o.recusado_em ?? o.respondido_em) : o.data_validade;
      if (!dia || dia < inicio) continue;
      const motivo = o.motivo_recusa?.trim();
      perdidos.push({
        chave: `proposta-${o.id}`,
        tipo: "proposta",
        id: o.id,
        nome: o.contato_nome,
        evento: eventoEmPalavras(o.tipo_evento, o.data_evento),
        origem,
        linha:
          o.status === "recusado"
            ? `recusou ${haDias(diasEntre(dia, hoje))}${motivo ? ` · ${motivo}` : ""}`
            : `venceu em ${dataCurta(dia)} sem resposta`,
        valor: Number(o.valor_total) || 0,
        urgente: false,
        acao: { rotulo: "Abrir a proposta", href: `/orcamentos/${o.id}` },
        encerravel: false,
        desde: dia,
      });
      continue;
    }

    if (o.status === "rascunho" || o.status === "enviado") {
      negociacao.push(emNegociacao(o, origem, comentarioPor.get(o.id) ?? null, hoje));
    }
  }

  // o que pede ação primeiro; dentro disso, o mais antigo primeiro
  const ordem = (a: CartaoDaOportunidade, b: CartaoDaOportunidade) =>
    Number(b.urgente) - Number(a.urgente) || a.desde.localeCompare(b.desde);
  novos.sort(ordem);
  negociacao.sort(ordem);
  fechados.sort((a, b) => b.desde.localeCompare(a.desde));
  perdidos.sort((a, b) => b.desde.localeCompare(a.desde));

  const soma = (cs: CartaoDaOportunidade[]) => cs.reduce((s, c) => s + (c.valor ?? 0), 0);
  const colunas: ColunaDaOportunidade[] = [
    { chave: "novos", titulo: "Novos pedidos", vazio: "Nenhum pedido esperando resposta.", cartoes: novos, valor: 0 },
    { chave: "negociacao", titulo: "Em negociação", vazio: "Nenhuma proposta em andamento.", cartoes: negociacao, valor: soma(negociacao) },
    { chave: "fechados", titulo: "Fechados", vazio: `Nenhum fechado nos últimos ${DIAS_DO_HISTORICO} dias.`, cartoes: fechados, valor: soma(fechados) },
    { chave: "perdidos", titulo: "Não fechou", vazio: `Nada perdido nos últimos ${DIAS_DO_HISTORICO} dias.`, cartoes: perdidos, valor: 0 },
  ];
  const retorno = [...novos, ...negociacao, ...fechados].filter((c) => c.urgente).sort(ordem);
  return { colunas, retorno };
}
