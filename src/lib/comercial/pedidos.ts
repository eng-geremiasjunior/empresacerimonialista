// O pedido de orçamento — regras sem banco e sem React.
//
// É a porta que faltava antes da proposta: quem chega pela página pública
// vira uma linha aqui, e a cerimonialista responde com uma proposta já
// preenchida. Ela não cadastra nada; o pedido já nasce pronto.
//
// A validação vale nos dois lados: no formulário (para a pessoa corrigir
// antes de mandar) e na rota (porque o formulário do navegador não é
// fronteira de nada). A RPC registrar_pedido_publico (165) repete a mesma
// régua no banco, que é a última palavra.

import type { EventType } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/types";

export type PedidoStatus = "novo" | "em_proposta" | "encerrado";
export type CanalDoPedido = "pagina_publica" | "proposta" | "manual" | "outro";
export type OrigemDoAcesso =
  | "instagram"
  | "facebook"
  | "google"
  | "whatsapp"
  | "direto"
  | "outro";

/** A linha como o painel a lê. Nunca sai para fora do painel. */
export type Pedido = {
  id: string;
  canal: CanalDoPedido;
  origem_acesso: OrigemDoAcesso;
  utm_source: string | null;
  utm_campaign: string | null;
  nome: string;
  whatsapp: string;
  email: string | null;
  tipo_evento: EventType;
  data_evento: string | null;
  cidade: string | null;
  convidados: number | null;
  mensagem: string | null;
  repeticoes: number;
  client_id: string | null;
  status: PedidoStatus;
  orcamento_id: string | null;
  created_at: string;
  respondido_em: string | null;
  encerrado_em: string | null;
};

/* ------------------------------------------------------------------ */
/* O telefone, numa régua só                                           */
/* ------------------------------------------------------------------ */

/**
 * O número como o banco guarda: só dígitos, SEM o 55 do país, 10 ou 11.
 *
 * A armadilha é a mesma de `normalizarDDI` (lib/whatsapp-link): 55 também
 * é DDD de Santa Maria. Quem decide é o tamanho — 12 ou 13 dígitos
 * começando com 55 já vêm com o país; 10 ou 11 são locais. Espelha
 * `public.normalizar_whatsapp` na 165: se as duas divergirem, a
 * deduplicação passa a ver dois contatos onde há um.
 */
export function normalizarWhatsapp(valor: string | null | undefined): string | null {
  const d = (valor ?? "").replace(/\D/g, "");
  if (!d) return null;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d.slice(2);
  return d;
}

export function whatsappValido(valor: string | null | undefined): boolean {
  const d = normalizarWhatsapp(valor);
  return d !== null && /^[0-9]{10,11}$/.test(d);
}

/** "(62) 99999-8888" — para a tela, nunca para o banco. */
export function whatsappFormatado(valor: string | null | undefined): string {
  const d = normalizarWhatsapp(valor);
  if (!d) return "";
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/* ------------------------------------------------------------------ */
/* O formulário                                                        */
/* ------------------------------------------------------------------ */

export const LIMITES_PEDIDO = {
  nomeMin: 2,
  nomeMax: 80,
  email: 120,
  cidade: 80,
  mensagem: 500,
  convidadosMin: 1,
  convidadosMax: 5000,
} as const;

export type EntradaDoPedido = {
  nome?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  tipoEvento?: string | null;
  dataEvento?: string | null;
  cidade?: string | null;
  convidados?: number | string | null;
  mensagem?: string | null;
};

export type PedidoValidado = {
  nome: string;
  whatsapp: string;
  email: string | null;
  tipoEvento: EventType;
  dataEvento: string | null;
  cidade: string | null;
  convidados: number | null;
  mensagem: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Os campos que podem dar erro, na ordem em que aparecem na tela. */
export const CAMPOS_DO_PEDIDO = [
  "nome",
  "whatsapp",
  "email",
  "tipoEvento",
  "dataEvento",
  "convidados",
] as const;
export type CampoDoPedido = (typeof CAMPOS_DO_PEDIDO)[number];

/**
 * Uma frase por problema, curta e sem ponto: aparece embaixo do campo,
 * como no desenho da vitrine. A rota devolve a mesma frase, então a tela
 * fala igual quando o erro vem do servidor.
 */
export const ERROS_DO_PEDIDO = {
  nome: "Informe o seu nome",
  whatsapp: "Informe um WhatsApp com DDD",
  email: "Confira o e-mail",
  tipoEvento: "Escolha o tipo de evento",
  tipoForaDaLista: "Escolha um dos tipos de evento atendidos",
  dataEvento: "Confira a data do evento",
  dataPassada: "Essa data já passou",
  convidados: "Informe um número aproximado de convidados",
} as const;

/** A entrada limpa: é o que vai ao banco quando não há erro. */
function lerPedido(entrada: EntradaDoPedido) {
  const convidados = entrada.convidados;
  return {
    nome: (entrada.nome ?? "").trim().slice(0, LIMITES_PEDIDO.nomeMax),
    whatsapp: normalizarWhatsapp(entrada.whatsapp),
    email: (entrada.email ?? "").trim().toLowerCase(),
    tipo: (entrada.tipoEvento ?? "").trim(),
    data: (entrada.dataEvento ?? "").trim() || null,
    convidados:
      convidados === null || convidados === undefined || convidados === ""
        ? null
        : Number(convidados),
    cidade: (entrada.cidade ?? "").trim().slice(0, LIMITES_PEDIDO.cidade) || null,
    mensagem: (entrada.mensagem ?? "").trim().slice(0, LIMITES_PEDIDO.mensagem) || null,
  };
}

/**
 * Todos os problemas do pedido de uma vez, campo a campo: o formulário
 * mostra cada um embaixo do seu campo, sem obrigar a pessoa a descobrir
 * um erro por envio.
 *
 * Só nome, WhatsApp e tipo são obrigatórios: quem ainda não tem data é
 * exatamente quem mais precisa de assessoria, e um formulário que exige
 * data manda essa pessoa embora.
 *
 * `hoje` entra por parâmetro (nunca `new Date()` aqui): este módulo roda
 * no servidor em UTC e no navegador em Brasília, e a data lida no render
 * já quebrou hidratação neste projeto.
 */
export function errosDoPedido(
  entrada: EntradaDoPedido,
  hoje: string,
  tiposAceitos?: string[]
): Partial<Record<CampoDoPedido, string>> {
  const v = lerPedido(entrada);
  const erros: Partial<Record<CampoDoPedido, string>> = {};

  if (v.nome.length < LIMITES_PEDIDO.nomeMin) erros.nome = ERROS_DO_PEDIDO.nome;

  if (!v.whatsapp || !/^[0-9]{10,11}$/.test(v.whatsapp)) {
    erros.whatsapp = ERROS_DO_PEDIDO.whatsapp;
  }

  if (v.email && (!EMAIL.test(v.email) || v.email.length > LIMITES_PEDIDO.email)) {
    erros.email = ERROS_DO_PEDIDO.email;
  }

  // hasOwn, e não `in`: "toString" também está "em" qualquer objeto
  if (!v.tipo || !Object.prototype.hasOwnProperty.call(EVENT_TYPE_LABELS, v.tipo)) {
    erros.tipoEvento = ERROS_DO_PEDIDO.tipoEvento;
  } else if (tiposAceitos && tiposAceitos.length > 0 && !tiposAceitos.includes(v.tipo)) {
    erros.tipoEvento = ERROS_DO_PEDIDO.tipoForaDaLista;
  }

  if (v.data !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.data)) {
      erros.dataEvento = ERROS_DO_PEDIDO.dataEvento;
    } else if (v.data < hoje) {
      // Comparação de texto: as duas datas são yyyy-MM-dd, e comparar
      // string evita fuso no meio (a régua do sistema é hojeBR).
      erros.dataEvento = ERROS_DO_PEDIDO.dataPassada;
    }
  }

  if (v.convidados !== null) {
    const n = v.convidados;
    if (!Number.isFinite(n) || !Number.isInteger(n)
        || n < LIMITES_PEDIDO.convidadosMin || n > LIMITES_PEDIDO.convidadosMax) {
      erros.convidados = ERROS_DO_PEDIDO.convidados;
    }
  }

  return erros;
}

/**
 * O pedido pronto para o banco, ou o PRIMEIRO problema na ordem da tela
 * (é o que a rota devolve). A régua é a de `errosDoPedido`.
 */
export function validarPedido(
  entrada: EntradaDoPedido,
  hoje: string,
  tiposAceitos?: string[]
): { ok: true; dados: PedidoValidado } | { ok: false; erro: string; campo: CampoDoPedido } {
  const erros = errosDoPedido(entrada, hoje, tiposAceitos);
  for (const campo of CAMPOS_DO_PEDIDO) {
    const erro = erros[campo];
    if (erro) return { ok: false, campo, erro };
  }

  const v = lerPedido(entrada);
  return {
    ok: true,
    dados: {
      nome: v.nome,
      whatsapp: v.whatsapp as string,
      email: v.email || null,
      tipoEvento: v.tipo as EventType,
      dataEvento: v.data,
      cidade: v.cidade,
      convidados: v.convidados,
      mensagem: v.mensagem,
    },
  };
}

/* ------------------------------------------------------------------ */
/* O que a tela diz                                                    */
/* ------------------------------------------------------------------ */

export const ORIGEM_LABEL: Record<OrigemDoAcesso, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  whatsapp: "WhatsApp",
  direto: "link direto",
  outro: "outro site",
};

/**
 * "pela vitrine (Instagram)" — de onde o pedido veio, em palavras.
 *
 * A campanha só aparece quando existe: quem não anuncia não precisa ver
 * um campo vazio explicando que não anuncia.
 */
export function origemEmPalavras(p: {
  canal: CanalDoPedido;
  origem_acesso: OrigemDoAcesso;
  utm_campaign?: string | null;
}): string {
  if (p.canal !== "pagina_publica") {
    return p.canal === "manual" ? "anotado por você" : "pelo sistema";
  }
  const campanha = p.utm_campaign?.trim();
  const origem = ORIGEM_LABEL[p.origem_acesso] ?? ORIGEM_LABEL.outro;
  return campanha
    ? `pela vitrine (${origem} · ${campanha})`
    : `pela vitrine (${origem})`;
}

/**
 * "há 3 h", "ontem", "há 4 dias". Tempo é o que decide se ela responde
 * agora — data e hora exata não mudam nada aqui.
 *
 * `agora` entra por parâmetro pelo mesmo motivo de `validarPedido`.
 */
export function haQuanto(iso: string, agora: Date): string {
  const minutos = Math.floor((agora.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

/** Um pedido aberto há mais de 24 h é o que o Copiloto cobra. */
export const HORAS_SEM_RESPOSTA = 24;

export function semResposta(p: { status: PedidoStatus; created_at: string }, agora: Date): boolean {
  if (p.status !== "novo") return false;
  const horas = (agora.getTime() - new Date(p.created_at).getTime()) / 3_600_000;
  return horas >= HORAS_SEM_RESPOSTA;
}

/**
 * O resumo de uma linha da fila: tipo, quando, onde, quantos.
 * Sem o nome e sem o telefone — quem monta a frase decide se mostra
 * dado pessoal, e este módulo é importado também pelo servidor de log.
 */
export function resumoDoEvento(p: {
  tipo_evento: EventType;
  data_evento: string | null;
  cidade: string | null;
  convidados: number | null;
}): string {
  const partes: string[] = [EVENT_TYPE_LABELS[p.tipo_evento] ?? p.tipo_evento];
  if (p.data_evento) {
    const [a, m, d] = p.data_evento.split("-");
    partes.push(`${d}/${m}/${a}`);
  } else {
    partes.push("data a definir");
  }
  if (p.cidade) partes.push(p.cidade);
  if (p.convidados) partes.push(`${p.convidados.toLocaleString("pt-BR")} convidados`);
  return partes.join(" · ");
}
