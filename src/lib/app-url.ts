/**
 * Base pública dos links que saem do sistema — e-mail, WhatsApp e o
 * endereço que a cerimonialista copia para mandar no grupo.
 *
 * Morava em lib/email.ts, o que obrigava quem só queria a URL a importar
 * o módulo inteiro do Resend. O WhatsApp não fez isso: montava o link do
 * agendamento com `NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"` cru,
 * sem o guarda abaixo — então bastava a variável faltar na Vercel para o
 * fornecedor receber, no celular dele, um link para a máquina de quem
 * programou. Uma base, um guarda, todos os canais.
 */
export function appUrl() {
  const explicito = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  const emDeploy = Boolean(process.env.VERCEL);
  const apontaProLocal = explicito
    ? /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(explicito)
    : false;

  // localhost configurado num deploy é sempre esquecimento: o link chega
  // ao fornecedor apontando para a máquina de quem programou. Nesse caso
  // o endereço do próprio deploy vale mais que a variável.
  if (explicito && !(emDeploy && apontaProLocal)) return explicito;

  const producao = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (producao) return `https://${producao}`;
  const deploy = process.env.VERCEL_URL;
  if (deploy) return `https://${deploy}`;
  return "http://localhost:3000";
}

/**
 * Base dos links PÚBLICOS — o que convidado, fornecedor e cliente sem
 * sessão recebem. Hoje é o mesmo host do app; quando o domínio próprio
 * do portal existir, NEXT_PUBLIC_PUBLIC_URL passa a valer e SÓ este
 * arquivo sabe disso.
 *
 * Env vence cabeçalho de host de propósito: `x-forwarded-host` devolve o
 * host em que a página FOI ABERTA — com app e superfícies públicas em
 * domínios distintos, um link montado dentro do app apontaria para o
 * domínio errado. Link que sai do sistema nasce daqui, sempre.
 *
 * Exceção anotada: o link da PROPOSTA (/orcamento/[hash]) continua em
 * appUrl() — proposta é venda da cerimonialista, mora no domínio do app.
 */
export function publicBase(): string {
  const dominio = process.env.NEXT_PUBLIC_PUBLIC_URL?.trim().replace(/\/+$/, "");
  return dominio || appUrl();
}

export function linkPublico(caminho: `/${string}`): string {
  return `${publicBase()}${caminho}`;
}
