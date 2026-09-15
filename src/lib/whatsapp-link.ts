// Links wa.me — o único lugar que sabe pôr o DDI.
//
// Isomórfico de propósito: roda no navegador (menu da lista de orçamentos,
// tela de Clientes, painel de contas) e no servidor (e-mail do aceite,
// fila de solicitações). Sem process.env, sem React, sem Supabase — quem
// importa daqui não arrasta o token da Meta nem o cliente do banco.
//
// Antes cada tela montava o próprio link: metade prefixava "55" fixo (o
// número salvo já com DDI virava 5555…) e a outra metade não prefixava (o
// número salvo sem DDI abria conversa com ninguém). Uma regra, um lugar.

/**
 * Telefone como o wa.me e a API da Meta pedem: só dígitos, com o 55.
 *
 * A armadilha: 55 também é DDD (Santa Maria/RS). "(55) 99999-0000" tem 11
 * dígitos e começa com 55 — mas é DDD+número, não DDI+resto. Quem decide é
 * o TAMANHO: número brasileiro local tem 10-11 dígitos e sempre ganha o
 * DDI; só 12-13 dígitos começando com 55 já vêm com ele. Qualquer outra
 * coisa é cadastro incompleto e devolve null — melhor sem botão do que um
 * botão que abre conversa com um número que não existe.
 */
export function normalizarDDI(numero: string | null | undefined): string | null {
  const d = (numero ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

/** wa.me para um número, com a mensagem já escrita quando houver. */
export function linkWhatsapp(
  numero: string | null | undefined,
  texto?: string
): string | null {
  const digitos = normalizarDDI(numero);
  if (!digitos) return null;
  return `https://wa.me/${digitos}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** Sem destinatário: o WhatsApp abre pedindo para quem mandar. */
export function linkCompartilharWhatsapp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/** "Ana & João Silva" → "Ana". Vazio quando o nome está vazio. */
export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * A mensagem que acompanha a proposta pelo WhatsApp, igual em todo o
 * fluxo comercial (lista de orçamentos, tela do orçamento). O tipo entra
 * em minúscula no meio da frase; sem tipo (ou "Outro"), a frase fecha sem
 * ele — "sua proposta de outro" não é português.
 */
export function textoPropostaWhatsapp(
  nomeContato: string | null | undefined,
  tipoEventoLabel: string | null | undefined,
  link: string
): string {
  const nome = primeiroNome(nomeContato);
  const abertura = nome ? `Oi ${nome}, sua` : "Sua";
  const de = tipoEventoLabel ? ` de ${tipoEventoLabel.toLocaleLowerCase("pt-BR")}` : "";
  return `${abertura} proposta${de} está aqui: ${link}`;
}
