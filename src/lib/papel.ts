// Quem decide o quê — o rótulo, não o dado.
//
// No banco o valor continua sendo 'noivos' (CHECK das 064/066), e não é
// só vocabulário: o portal da cliente enxerga exatamente as decisões com
// responsavel in ('noivos','ambos') — é regra de acesso. Renomear a
// coluna é uma migração à parte, para quando existir cliente que não é
// um casal em volume.
//
// O que muda por tipo de evento é como a tela CHAMA esse papel: numa
// debutante quem decide é a família, numa formatura a comissão, num show
// o produtor. Antes desta função a tradução vivia duplicada em dois
// componentes do Planejamento e simplesmente não existia na Organização,
// que escrevia "Noivos" em qualquer tipo de evento.

import type { EventType } from "@/lib/types";
import type { PapelPortal } from "@/lib/portal-admin";

const CLIENTE_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "noivos",
  bodas: "casal",
  debutante: "família",
  formatura: "comissão",
  show: "produtor",
  corporativo: "empresa",
};

/** Como esta cerimonialista chama o cliente deste evento. */
export function rotuloCliente(tipoEvento?: string | null): string {
  return CLIENTE_POR_TIPO[tipoEvento as EventType] ?? "cliente";
}

/** O responsável de uma decisão/tarefa, em minúsculas (corre dentro de frase). */
export function rotuloResponsavel(
  resp: string | null | undefined,
  tipoEvento?: string | null
): string {
  if (resp === "noivos") return rotuloCliente(tipoEvento);
  return resp ?? "";
}

/** O mesmo, capitalizado — para botão, <option> e cabeçalho. */
export function rotuloResponsavelTitulo(
  resp: string | null | undefined,
  tipoEvento?: string | null
): string {
  const r = rotuloResponsavel(resp, tipoEvento);
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "";
}

// Daqui para baixo, o mesmo desenho: um mapa por tipo com o texto que só
// faz sentido para um casal (ou para a debutante), e um fallback neutro.
// Quem não está no mapa nunca lê "noivos".

const ESCOLHAS_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "Escolhas do casal",
  bodas: "Escolhas do casal",
};

/** Título da tela de escolhas do portal. */
export function rotuloEscolhas(tipoEvento?: string | null): string {
  return ESCOLHAS_POR_TIPO[tipoEvento as EventType] ?? "Escolhas";
}

const MESA_PRINCIPAL_POR_TIPO: Partial<
  Record<EventType, { nome: string; curto: string }>
> = {
  casamento: { nome: "Mesa dos noivos", curto: "Noivos" },
  bodas: { nome: "Mesa dos noivos", curto: "Noivos" },
  debutante: { nome: "Mesa da debutante", curto: "Debutante" },
  formatura: { nome: "Mesa de honra", curto: "de honra" },
};

/** O nome do tipo de mesa 'noivos' (o valor no banco não muda). */
export function rotuloMesaPrincipal(tipoEvento?: string | null): string {
  return MESA_PRINCIPAL_POR_TIPO[tipoEvento as EventType]?.nome ?? "Mesa principal";
}

/** O mesmo, curto — vira o nome sugerido da mesa no croqui ("Mesa Principal" no painel). */
export function rotuloMesaPrincipalCurto(tipoEvento?: string | null): string {
  return MESA_PRINCIPAL_POR_TIPO[tipoEvento as EventType]?.curto ?? "Principal";
}

export type LadoConvidado = { valor: "noiva" | "noivo"; rotulo: string };

const LADOS_POR_TIPO: Partial<Record<EventType, LadoConvidado[]>> = {
  casamento: [
    { valor: "noiva", rotulo: "Noiva" },
    { valor: "noivo", rotulo: "Noivo" },
  ],
  bodas: [
    { valor: "noiva", rotulo: "Noiva" },
    { valor: "noivo", rotulo: "Noivo" },
  ],
};

/** Os lados da lista de convidados; vazio = a lista não tem lado. */
export function ladosDoTipo(tipoEvento?: string | null): LadoConvidado[] {
  return LADOS_POR_TIPO[tipoEvento as EventType] ?? [];
}

// Os valores são os do CHECK de evento_acesso (086) — PAPEL_PORTAL_LABELS
// continua sendo quem os traduz.
const PAPEIS_PORTAL_POR_TIPO: Partial<Record<EventType, PapelPortal[]>> = {
  casamento: ["noiva", "noivo", "debutante", "mae", "pai", "outro"],
  bodas: ["noiva", "noivo", "debutante", "mae", "pai", "outro"],
  debutante: ["debutante", "mae", "pai", "outro"],
};

/** Que papéis a cerimonialista pode dar a quem entra no portal. */
export function papeisPortalDoTipo(tipoEvento?: string | null): PapelPortal[] {
  return PAPEIS_PORTAL_POR_TIPO[tipoEvento as EventType] ?? ["outro"];
}

// Só o corporativo entra além do casamento: para o show a mensagem
// continua dizendo "sua festa", como sempre disse.
const POSSESSIVO_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "seu casamento",
  corporativo: "seu evento",
};

/** "seu casamento" / "sua festa" — corre dentro de mensagem ao fornecedor. */
export function rotuloEventoPossessivo(tipoEvento?: string | null): string {
  return POSSESSIVO_POR_TIPO[tipoEvento as EventType] ?? "sua festa";
}

const ASSINANTES_POR_TIPO: Partial<Record<EventType, 1 | 2>> = {
  casamento: 2,
  bodas: 2,
};

/** Quantas pessoas assinam o aceite: um casal são duas; o resto, uma. */
export function assinantesDoTipo(tipoEvento?: string | null): 1 | 2 {
  return ASSINANTES_POR_TIPO[tipoEvento as EventType] ?? 1;
}

// O rótulo do assinante e do documento só mudam quando quem contrata é
// uma empresa: a debutante e a comissão continuam vendo "Nome completo"
// e "CPF", como sempre viram.
const ASSINANTE_POR_TIPO: Partial<Record<EventType, string>> = {
  corporativo: "Quem assina pela empresa",
};
const DOCUMENTO_POR_TIPO: Partial<Record<EventType, string>> = {
  corporativo: "CPF ou CNPJ",
};

/** Rótulo do campo de nome de quem assina o aceite. */
export function rotuloAssinante(tipoEvento?: string | null): string {
  return ASSINANTE_POR_TIPO[tipoEvento as EventType] ?? "Nome completo";
}

/** Rótulo do documento de quem assina ("CPF" mantém a máscara). */
export function rotuloDocumentoAssinante(tipoEvento?: string | null): string {
  return DOCUMENTO_POR_TIPO[tipoEvento as EventType] ?? "CPF";
}
