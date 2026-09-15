import "server-only";

// O termo de aceite da proposta: o texto que a cliente marca, a versão
// dele, e as duas contas pequenas que o documento e a página de
// verificação fazem a partir do hash da linha.
//
// O hash em si (`orcamento_aceites.sha256_conteudo`) NÃO nasce aqui: a
// RPC `registrar_aceite_proposta` calcula no Postgres, sobre o json
// canônico da própria linha, e grava junto com o insert. O TypeScript só
// lê — se dois lados calculassem, uma vírgula de diferença na serialização
// faria o QR do PDF apontar para um hash que o banco não reconhece.
//
// O texto e a versão moram em `src/lib/aceite-termo-texto.ts`, módulo
// puro: os modais (navegador) mostram o mesmo texto que a rota grava, e
// componente cliente não pode importar um módulo server-only. Aqui só a
// reexportação, para quem roda no servidor continuar importando daqui.

export {
  TERMOS_ACEITE_VERSAO,
  TERMOS_ACEITE_TEXTO,
  termosAceiteTexto,
  contratoCitadoNoTermo,
  nomeDoContratoNoTermo,
} from "@/lib/aceite-termo-texto";

/**
 * O verificador que vai na URL: os 12 primeiros caracteres hex do hash.
 *
 * O recibo tem 6 hex — força bruta alcança. Exigir também um pedaço do
 * hash na URL neutraliza isso sem expor o hash inteiro no link, e 12 hex
 * (48 bits) cabem num QR pequeno e numa linha de e-mail.
 */
export function verificadorDe(sha256: string): string {
  return sha256.trim().toLowerCase().slice(0, 12);
}

/** `/aceite/<recibo>?v=<verificador>` sobre a base pública do site. */
export function urlVerificacao(base: string, recibo: string, sha256: string): string {
  return `${base.replace(/\/+$/, "")}/aceite/${encodeURIComponent(recibo)}?v=${verificadorDe(sha256)}`;
}

/**
 * CPF para as telas da equipe: `***.456.789-**`.
 *
 * O CPF completo fica só no documento (PDF) — na tela ele não decide
 * nada, e cada lugar que o mostra é um lugar a mais de onde vaza. Os seis
 * do meio bastam para a cerimonialista reconhecer de quem é.
 */
export function mascararCpf(cpf: string | null | undefined): string {
  const digitos = (cpf ?? "").replace(/\D/g, "");
  // CNPJ (empresa que assina a proposta corporativa): o miolo, sem as pontas
  if (digitos.length === 14) {
    return `**.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-**`;
  }
  if (digitos.length !== 11) return "";
  return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
}
