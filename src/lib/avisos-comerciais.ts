// Os avisos do Comercial (19/10/2026, pedido dele: "sempre que receber uma
// proposta deveria ter uma notificação, talvez exclusiva da área
// comercial"). São os mesmos avisos do sino — pedido de orçamento novo,
// proposta aceita, recusada ou comentada pela cliente — contados à parte
// para o item "Comercial" do menu ganhar o número. Isomórfico: sem banco.

import type { NotificationRow } from "@/lib/notifications-db";

export const TIPOS_COMERCIAIS = [
  "pedido_orcamento",
  "orcamento_aprovado",
  "orcamento_recusado",
  "orcamento_comentario",
] as const;

export const ehAvisoComercial = (tipo: string) => (TIPOS_COMERCIAIS as readonly string[]).includes(tipo);

/**
 * Para onde o aviso leva. O pedido de orçamento nasceu apontando para a
 * fila antiga de Pedidos (165); desde as Oportunidades (18/10/2026), ele
 * abre lá.
 */
export function linkDoAviso(n: Pick<NotificationRow, "type" | "link">): string | null {
  if (n.type === "pedido_orcamento") return "/orcamentos/oportunidades";
  return n.link ?? null;
}
