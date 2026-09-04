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

const CORTEJO_POR_TIPO: Partial<Record<EventType, string>> = {
  formatura: "Papéis e chamada",
};

/** O nome do destino "cortejo" no menu do portal — numa formatura a tela
 *  se chama "Papéis e chamada" desde sempre, e o menu não acompanhava. */
export function rotuloCortejo(tipoEvento?: string | null): string {
  return CORTEJO_POR_TIPO[tipoEvento as EventType] ?? "Cortejo";
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

// ------------------------------------------------------------------
// A VOZ DO PORTAL
//
// O portal é a única superfície que a CLIENTE lê, e até 04/09/2026 ele
// falava sempre em casamento — os cinco tipos liam as mesmas frases: "para
// o grande dia", "Ex.: dança com o pai da noiva", "vivam o inesquecível".
// O produtor do show contratando ambulância e brigadista lia isso; a mãe
// da debutante também.
//
// Mesmo desenho do resto do arquivo: mapa por tipo e fallback neutro que
// nunca diz "noivos". Quem não está no mapa (aniversário, batizado, chá,
// outro) cai no neutro e continua fazendo sentido.

const CONTAGEM_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "para o grande dia",
  bodas: "para o grande dia",
  debutante: "para a festa",
  formatura: "para a formatura",
  show: "para o show",
  corporativo: "para o evento",
};

/** A linha de baixo da contagem regressiva ("Faltam 84 dias …"). */
export function rotuloContagem(tipoEvento?: string | null): string {
  return CONTAGEM_POR_TIPO[tipoEvento as EventType] ?? "para o dia do evento";
}

/** O coração no ícone da contagem só cabe onde há um casal. */
export function contagemComCoracao(tipoEvento?: string | null): boolean {
  return tipoEvento === "casamento" || tipoEvento === "bodas";
}

const EVENTO_DE_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "do casamento",
  bodas: "das bodas",
  debutante: "da festa",
  formatura: "da formatura",
  show: "do show",
  corporativo: "do evento",
};

/**
 * "do casamento" / "da festa" — corre dentro de frase do portal
 * ("A identidade visual DO CASAMENTO reunida num lugar só").
 *
 * Irmão de `rotuloEventoPossessivo`, que é o possessivo e serve à
 * mensagem que sai para o FORNECEDOR; este é o artigo e serve à tela da
 * cliente. São dois textos com donos diferentes, por isso duas funções.
 */
export function rotuloEventoDe(tipoEvento?: string | null): string {
  return EVENTO_DE_POR_TIPO[tipoEvento as EventType] ?? "do evento";
}

const EXEMPLO_MOMENTO_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "Ex.: dança com o pai da noiva",
  bodas: "Ex.: homenagem aos filhos",
  debutante: "Ex.: dança com o pai",
  formatura: "Ex.: homenagem aos professores",
  show: "Ex.: passagem de som da banda de abertura",
  corporativo: "Ex.: fala do diretor antes do intervalo",
};

/** O exemplo no campo em que a cliente pede um momento novo no roteiro. */
export function exemploMomentoDoDia(tipoEvento?: string | null): string {
  return (
    EXEMPLO_MOMENTO_POR_TIPO[tipoEvento as EventType] ??
    "Ex.: uma homenagem no meio da festa"
  );
}

const CUIDADO_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento:
    "Cada detalhe conta uma história. Estamos cuidando de tudo para que vocês vivam o inesquecível.",
  bodas:
    "Cada detalhe conta uma história. Estamos cuidando de tudo para que vocês vivam o inesquecível.",
  debutante:
    "Cada detalhe conta uma história. Estamos cuidando de tudo para que a festa saia do jeito que vocês imaginaram.",
  formatura:
    "Cada detalhe está sendo cuidado para que a turma só precise aproveitar o dia.",
  show:
    "Cada detalhe da produção está sendo acompanhado, do palco ao fim da noite.",
  corporativo:
    "Cada detalhe está sendo cuidado para que o evento cumpra o que a empresa espera dele.",
};

/** A frase da faixa assinada pela cerimonialista, na home do portal. */
export function fraseDeCuidado(tipoEvento?: string | null): string {
  return (
    CUIDADO_POR_TIPO[tipoEvento as EventType] ??
    "Cada detalhe está sendo cuidado para que o dia saia como vocês imaginaram."
  );
}

const ASSINATURA_POR_TIPO: Partial<Record<EventType, string>> = {
  casamento: "Com carinho,",
  bodas: "Com carinho,",
  debutante: "Com carinho,",
  formatura: "Com carinho,",
  show: "À disposição,",
  corporativo: "À disposição,",
};

/**
 * Como a cerimonialista assina a faixa da home.
 *
 * Existe porque a frase ao lado já muda por tipo e a assinatura não
 * mudava: o produtor do show lia "Cada detalhe da produção está sendo
 * acompanhado" e, na mesma caixa, "Com carinho, Ana".
 */
export function aberturaDaAssinatura(tipoEvento?: string | null): string {
  return ASSINATURA_POR_TIPO[tipoEvento as EventType] ?? "Com carinho,";
}
