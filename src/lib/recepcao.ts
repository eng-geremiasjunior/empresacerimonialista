// O que a porta (componente no celular da recepcionista) e a rota
// /api/recepcao compartilham: os tipos do JSON que recepcao_lista (148)
// devolve, o item da fila offline e três constantes de comportamento.
//
// Mora em lib porque os dois lados leem os MESMOS nomes — e a fila, que
// dorme no localStorage do celular enquanto o sinal não volta, não pode
// ter formato decidido em dois lugares. Ela nunca carrega nome de
// ninguém: só ids, contagens e a hora do toque.

/** Por quanto tempo a última marcação pode ser desfeita pela porta.
 *  Espelha a janela do servidor (recepcao_desfazer); passar disso só a
 *  equipe logada resolve. */
export const JANELA_DESFAZER_MIN = 15;

/** Item da fila mais velho que isto é descartado ao reabrir: o servidor
 *  prende `em` a [agora − 12h, agora], e uma chegada de ontem sendo
 *  enviada hoje seria mentira com carimbo. */
export const FILA_MAX_HORAS = 12;

/** A busca pelo nome só filtra a partir daqui — com uma letra a lista
 *  inteira "casa" e a tela vira um paredão de nomes. */
export const BUSCA_MIN_CHARS = 2;

export type Confirmacao = "aguardando" | "confirmado" | "nao_vai";

export type AcompanhanteDaPorta = {
  id: string;
  nome: string;
  crianca: boolean;
  presente_em: string | null;
};

/** Um convidado como a porta o vê: nome, quem vem com ele, presença.
 *  NUNCA telefone, e-mail, lado, grupo ou restrição — a RPC não manda. */
export type ConvidadoDaPorta = {
  id: string;
  /** upper(right(checkin_hash, 6)) — o que se digita quando a câmera falha */
  codigo: string;
  nome: string;
  confirmacao: Confirmacao;
  presente_em: string | null;
  /** acompanhantes contados mas sem nome (entram junto com o titular) */
  sem_nome: number;
  acompanhantes: AcompanhanteDaPorta[];
};

export type ListaRecepcao = {
  evento: { nome: string; data: string | null; hora: string | null };
  posto: { nome: string };
  esperados: number;
  presentes: number;
  convidados: ConvidadoDaPorta[];
};

/** O que recepcao_posto_publico devolve a quem só tem o link. */
export type PostoPublico = {
  posto_nome: string;
  evento_nome: string;
  evento_data: string | null;
  aberto: boolean;
};

export type AcaoRecepcao = "lista" | "consultar" | "marcar" | "desfazer" | "avulso";

export type RespostaMarcar = {
  ok: true;
  ja_entrou_em: string | null;
  marcados: number;
  presentes: number;
};

export type RespostaDesfazer = { ok: true; presentes: number } | { erro: string };

export type RespostaAvulso = { ok: true; id: string; presentes: number };

export type RespostaConsultar = { id: string } | { erro: string };

/**
 * A fila offline. Cada toque na porta vira um item aqui ANTES de ir ao
 * servidor; o item some quando o servidor responde. `pessoas` fica
 * guardado para o contador do topo continuar certo enquanto o servidor
 * não conta — sem isso, cada resposta que chega "esqueceria" as chegadas
 * que ainda estão na fila.
 */
export type ItemFila =
  | {
      id: string;
      acao: "marcar";
      convidadoId: string;
      acompanhantes: string[];
      /** null = "confie no que o banco tem" (via 'qr'); número = ajustado
       *  na porta ou marcado pela busca (via 'busca') */
      semNome: number | null;
      pessoas: number;
      /** ISO da hora do toque no celular */
      em: string;
    }
  | {
      id: string;
      acao: "desfazer";
      convidadoId: string;
      acompanhanteId: string | null;
      pessoas: number;
      em: string;
    };

export const HEX64 = /^[0-9a-f]{64}$/;
export const CODIGO6 = /^[0-9a-z]{6}$/i;
export const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O QR carrega o checkin_hash em MAIÚSCULAS (hex é indiferente a caixa;
 * maiúsculo cai no modo alfanumérico do QR e o desenho sai menor). Quem
 * lê devolve em minúsculas — é assim que está no banco. Tolera o hash
 * dentro de um texto maior (uma URL, se um dia o QR virar link).
 */
export function extrairCheckinHash(texto: string): string | null {
  const m = texto.trim().toLowerCase().match(/[0-9a-f]{64}/);
  return m ? m[0] : null;
}

/** O código curto: os 6 últimos caracteres do hash, em maiúsculas —
 *  exatamente como recepcao_lista o entrega em `codigo`. */
export function codigoDoHash(hash: string): string {
  return hash.slice(-6).toUpperCase();
}

/** "José" e "jose" têm de casar: sem acento, sem caixa, sem espaço sobrando. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Chaves de armazenamento por posto: dois links no mesmo celular não se
 *  misturam, e o que um deixa não vaza para o outro. */
export function chaveFila(hash: string): string {
  return `recepcao:fila:${hash}`;
}

export function chaveOperador(hash: string): string {
  return `recepcao:operador:${hash}`;
}
