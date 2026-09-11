// Orçamentos (Etapa 3) — tipos, rótulos, formatação e helpers usados na
// listagem, no formulário e na visualização.

import { formatBRL } from "@/lib/modelos-precificacao";
import { hojeBR } from "@/lib/tempo";

export type OrcamentoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "recusado"
  | "expirado";

export type Orcamento = {
  id: string;
  empresa_id: string;
  contato_nome: string;
  contato_telefone: string | null;
  contato_email: string | null;
  tipo_evento: string;
  template_proposta: string | null;
  data_evento: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  numero_convidados: number | null;
  data_criacao: string;
  validade_dias: number;
  data_validade: string;
  valor_total: number;
  status: OrcamentoStatus;
  hash_publico: string;
  evento_gerado_id: string | null;
  // E-mail que o cliente confirmou ao assinar; a lista prefere este ao
  // contato_email, que é o que a cerimonialista digitou na negociação.
  ficha_email: string | null;
  ficha_preenchida_em: string | null;
  respondido_em: string | null;
  // Quem abriu a peça (155). Conta abertura, não pessoa: a cerimonialista
  // fica sabendo QUE foi vista e QUANDO — é o que decide se ela liga hoje
  // ou espera. Opcionais porque a coluna é nova e a lista lê `select("*")`.
  visitas?: number | null;
  primeira_visita_em?: string | null;
  ultima_visita_em?: string | null;
  created_at: string;
};

/**
 * "vista 3× · última há 2 dias" — ou nada.
 *
 * Nada é a resposta certa para proposta em rascunho e para enviada que
 * ninguém abriu ainda: o silêncio aqui já é a informação, e uma linha
 * dizendo "0 visitas" só ocuparia espaço repetindo o status.
 *
 * `hoje` vem de fora (hojeBR, no servidor) e não de `new Date()` aqui: a
 * lista de orçamentos é componente de cliente, e relógio lido no
 * primeiro render diverge entre o servidor (UTC na Vercel) e o navegador
 * (Brasília) — foi assim que o feed do dashboard quebrou a hidratação.
 */
export function visitasEmPalavras(
  o: {
    status: OrcamentoStatus;
    visitas?: number | null;
    ultima_visita_em?: string | null;
  },
  hoje: string
): string | null {
  if (o.status === "rascunho") return null;
  const n = o.visitas ?? 0;
  if (n < 1) return null;
  const vezes = n === 1 ? "vista 1×" : `vista ${n}×`;
  if (!o.ultima_visita_em) return vezes;

  // O dia EM BRASÍLIA, não o pedaço da ISO: uma visita às 22h30 daqui é
  // 01h30 do dia seguinte em UTC, e fatiar a string diria "hoje" para
  // uma visita de ontem à noite. Converter pelo fuso fixo dá o mesmo
  // resultado no servidor e no navegador — não lê relógio, lê instante.
  const dia = hojeBR(new Date(o.ultima_visita_em));
  const emDias = (s: string) => {
    const [a, m, d] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, d) / 86_400_000;
  };
  const dias = Math.round(emDias(hoje) - emDias(dia));
  if (dias <= 0) return `${vezes} · última hoje`;
  if (dias === 1) return `${vezes} · última ontem`;
  return `${vezes} · última há ${dias} dias`;
}

export type OrcamentoItem = {
  id: string;
  orcamento_id: string;
  modelo_precificacao_id: string | null;
  nome: string;
  descricao: string | null;
  tipo_calculo: "fixo" | "por_convidado" | "manual";
  valor_unitario: number | null;
  quantidade_convidados_aplicada: number | null;
  taxa_fixa: number;
  valor_calculado: number;
  ordem: number;
};

// Item ainda não persistido (montagem no formulário).
export type ItemDraft = Omit<OrcamentoItem, "id" | "orcamento_id"> & {
  draftId: string;
};

export const ORCAMENTO_STATUS_LABELS: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
};

// Badges dessaturados, mesmo padrão do resto do sistema.
export const ORCAMENTO_STATUS_BADGE: Record<
  OrcamentoStatus,
  { pill: string; dot: string }
> = {
  rascunho: { pill: "bg-stone-100 text-stone-600", dot: "bg-stone-400" },
  enviado: { pill: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  aprovado: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  recusado: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  expirado: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

export const VALIDADE_OPCOES = [7, 14, 30, 60, 90] as const;

export { formatBRL };

export function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function validadeVencida(o: Pick<Orcamento, "data_validade">): boolean {
  return o.data_validade < hojeBR();
}

// Linha descritiva de um item (card do formulário e visualização).
export function descricaoCalculoItem(
  item: Pick<
    OrcamentoItem,
    "tipo_calculo" | "valor_unitario" | "quantidade_convidados_aplicada" | "taxa_fixa"
  >
): string {
  if (item.tipo_calculo === "por_convidado") {
    const base = `${formatBRL(Number(item.valor_unitario) || 0)}/convidado × ${
      item.quantidade_convidados_aplicada ?? 0
    }`;
    const taxa = Number(item.taxa_fixa) || 0;
    return taxa > 0 ? `${base} + ${formatBRL(taxa)} taxa` : base;
  }
  if (item.tipo_calculo === "fixo") return "Valor fixo";
  return "Valor manual";
}
