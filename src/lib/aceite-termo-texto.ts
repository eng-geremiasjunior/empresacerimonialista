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

/** A versão vigente do texto abaixo. Muda SÓ quando o texto muda. */
export const TERMOS_ACEITE_VERSAO = "2026-09-14";

/**
 * O que a cliente marca antes de assinar. Cita as duas bases que dão
 * validade à assinatura desenhada: a MP 2.200-2 (vale quando as partes
 * admitem — e este texto é a admissão) e a Lei 14.063 (assinatura
 * eletrônica simples/avançada).
 */
export const TERMOS_ACEITE_TEXTO =
  "Li e aceito as condições desta proposta. Reconheço esta assinatura eletrônica como válida (MP 2.200-2/2001, art. 10, § 2º; Lei 14.063/2020) e autorizo o uso da assinatura desenhada para este fim.";
