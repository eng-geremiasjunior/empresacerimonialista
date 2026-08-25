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
