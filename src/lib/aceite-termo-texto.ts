// O texto que a cliente marca antes de assinar a proposta, e a versão dele.
//
// Módulo PURO de propósito (sem "server-only", sem I/O): a caixa "Li e
// aceito" dos modais roda no navegador e precisa mostrar EXATAMENTE o
// texto que a rota vai gravar na linha do aceite — se fossem duas cópias,
// uma vírgula de diferença faria a cliente aceitar um texto e o banco
// registrar outro. `src/lib/aceite-termo.ts` (server-only) reexporta os
// dois para quem roda no servidor.
//
// Molde de versão: `src/lib/termos.ts` — a data AAAA-MM-DD da publicação
// do texto, gravada na linha do aceite. Mudou uma palavra do texto, muda a
// versão: é por ela que se prova QUAL texto a pessoa aceitou.
//
// 2026-09-14: o texto da proposta.
// 2026-09-15: a mesma frase ganha a variante com o contrato de prestação
//             da cerimonialista (163), citado pelo nome do arquivo. O texto
//             exato vai inteiro para `orcamento_aceites.termos_texto`, que
//             entra no SHA-256 da linha — o contrato aceito fica dentro da
//             prova sem mudar a assinatura da RPC.

/** A versão vigente do texto abaixo. Muda SÓ quando o texto muda. */
export const TERMOS_ACEITE_VERSAO = "2026-09-15";

const ADMISSAO =
  "Reconheço esta assinatura eletrônica como válida (MP 2.200-2/2001, art. 10, § 2º; Lei 14.063/2020) e autorizo o uso da assinatura desenhada para este fim.";

/**
 * O que a cliente marca antes de assinar, quando a proposta não tem
 * contrato anexo. Cita as duas bases que dão validade à assinatura
 * desenhada: a MP 2.200-2 (vale quando as partes admitem — e este texto é
 * a admissão) e a Lei 14.063 (assinatura eletrônica simples/avançada).
 */
export const TERMOS_ACEITE_TEXTO = `Li e aceito as condições desta proposta. ${ADMISSAO}`;

/** Aspas e quebras saem do nome: ele vive entre “ ” dentro da frase. */
export function nomeDoContratoNoTermo(nome: string): string {
  return nome.replace(/[“”"\r\n\t]/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || "contrato.pdf";
}

/**
 * O texto do aceite para ESTA proposta. Com contrato, a cliente declara
 * ter lido e aceitado o arquivo que abriu pelo link do modal; o nome entra
 * na frase, e a rota confere o SHA-256 do arquivo antes de gravar.
 */
export function termosAceiteTexto(contratoNome?: string | null): string {
  if (!contratoNome) return TERMOS_ACEITE_TEXTO;
  return `Li e aceito as condições desta proposta e o contrato de prestação de serviço anexo a ela (arquivo “${nomeDoContratoNoTermo(contratoNome)}”). ${ADMISSAO}`;
}

/**
 * O caminho de volta: dado o texto gravado na linha, o nome do contrato
 * que a cliente aceitou — ou null quando ela aceitou sem contrato. A
 * rotina de reenvio usa para saber se falta anexar um contrato.
 */
export function contratoCitadoNoTermo(texto: string | null | undefined): string | null {
  const m = /contrato de prestação de serviço anexo a ela \(arquivo “([^”]+)”\)/.exec(texto ?? "");
  return m ? m[1] : null;
}
