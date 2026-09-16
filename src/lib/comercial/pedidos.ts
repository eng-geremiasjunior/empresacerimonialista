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

/**
 * Seis campos e uma mensagem. Só nome, WhatsApp e tipo são obrigatórios:
 * quem ainda não tem data é exatamente quem mais precisa de assessoria, e
 * um formulário que exige data manda essa pessoa embora.
 *
 * `hoje` entra por parâmetro (nunca `new Date()` aqui): este módulo roda
 * no servidor em UTC e no navegador em Brasília, e a data lida no render
 * já quebrou hidratação neste projeto.
 */
export function validarPedido(
  entrada: EntradaDoPedido,
  hoje: string,
  tiposAceitos?: string[]
): { ok: true; dados: PedidoValidado } | { ok: false; erro: string; campo: string } {
  const nome = (entrada.nome ?? "").trim().slice(0, LIMITES_PEDIDO.nomeMax);
  if (nome.length < LIMITES_PEDIDO.nomeMin) {
    return { ok: false, campo: "nome", erro: "Informe seu nome." };
  }

  const whatsapp = normalizarWhatsapp(entrada.whatsapp);
  if (!whatsapp || !/^[0-9]{10,11}$/.test(whatsapp)) {
    return { ok: false, campo: "whatsapp", erro: "Informe um WhatsApp com DDD." };
  }

  const emailCru = (entrada.email ?? "").trim().toLowerCase();
  if (emailCru && (!EMAIL.test(emailCru) || emailCru.length > LIMITES_PEDIDO.email)) {
    return { ok: false, campo: "email", erro: "Confira o e-mail." };
  }

  const tipo = (entrada.tipoEvento ?? "").trim();
  if (!tipo || !(tipo in EVENT_TYPE_LABELS)) {
    return { ok: false, campo: "tipoEvento", erro: "Escolha o tipo do evento." };
  }
  if (tiposAceitos && tiposAceitos.length > 0 && !tiposAceitos.includes(tipo)) {
    return {
      ok: false,
      campo: "tipoEvento",
      erro: "Escolha um dos tipos de evento atendidos.",
    };
  }

  const data = (entrada.dataEvento ?? "").trim() || null;
  if (data !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return { ok: false, campo: "dataEvento", erro: "Confira a data do evento." };
    }
    // Comparação de texto: as duas datas são yyyy-MM-dd, e comparar
    // string evita fuso no meio (a régua do sistema é hojeBR).
    if (data < hoje) {
      return { ok: false, campo: "dataEvento", erro: "Essa data já passou." };
    }
  }

  let convidados: number | null = null;
  if (entrada.convidados !== null && entrada.convidados !== undefined && entrada.convidados !== "") {
    const n = Number(entrada.convidados);
    if (!Number.isFinite(n) || !Number.isInteger(n)
        || n < LIMITES_PEDIDO.convidadosMin || n > LIMITES_PEDIDO.convidadosMax) {
      return {
        ok: false,
        campo: "convidados",
        erro: "Informe um número aproximado de convidados.",
      };
    }
    convidados = n;
  }

  return {
    ok: true,
    dados: {
      nome,
      whatsapp,
      email: emailCru || null,
      tipoEvento: tipo as EventType,
      dataEvento: data,
      cidade: (entrada.cidade ?? "").trim().slice(0, LIMITES_PEDIDO.cidade) || null,
      convidados,
      mensagem:
        (entrada.mensagem ?? "").trim().slice(0, LIMITES_PEDIDO.mensagem) || null,
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
 * "pela página (Instagram)" — de onde o pedido veio, em palavras.
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
    ? `pela página (${origem} · ${campanha})`
    : `pela página (${origem})`;
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
