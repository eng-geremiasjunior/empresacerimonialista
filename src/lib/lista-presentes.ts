// A lista de presentes — as regras, sem tela e sem banco.
//
// Decisões dele (26/09/2026): taxa de 3,89% sobre o presente; do que
// sobra depois da tarifa da Pagar.me, metade é da cerimonialista (repasse
// mensal por Pix) e metade do eOrganizei; quem presenteia no cartão paga a
// taxa do cartão. Valor mínimo por presente para a divisão não ficar
// negativa (Pix 1,19% + R$ 0,55 fixos).

export const TAXA_DA_LISTA = 0.0389;
export const VALOR_MINIMO = 50;

export const BANCOS: [string, string][] = [
  ["001", "Banco do Brasil"],
  ["104", "Caixa"],
  ["237", "Bradesco"],
  ["341", "Itaú"],
  ["033", "Santander"],
  ["260", "Nubank"],
  ["077", "Inter"],
  ["336", "C6 Bank"],
  ["290", "PagBank"],
  ["323", "Mercado Pago"],
  ["380", "PicPay"],
  ["756", "Sicoob"],
  ["748", "Sicredi"],
  ["212", "Banco Original"],
  ["208", "BTG Pactual"],
  ["422", "Safra"],
  ["041", "Banrisul"],
  ["070", "BRB"],
  ["004", "Banco do Nordeste"],
];

export const so = (s: string) => s.replace(/\D/g, "");

/** CPF com os dígitos verificadores certos. */
export function cpfValido(v: string): boolean {
  const c = so(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dig = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(c[9]) && dig(10) === Number(c[10]);
}

/** "25/12/1980" → válida e com 18 anos ou mais. */
export function nascimentoValido(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return false;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  if (d.getUTCDate() !== +m[1] || d.getUTCMonth() !== +m[2] - 1) return false;
  const idade = (Date.now() - d.getTime()) / (365.25 * 86_400_000);
  return idade >= 18 && idade < 120;
}

export type DadosDoRecebedor = {
  nome: string;
  cpf: string;
  nascimento: string;
  nomeDaMae: string;
  profissao: string;
  rendaMensal: string;
  celular: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  banco: string;
  agencia: string;
  agenciaDigito: string;
  conta: string;
  contaDigito: string;
  tipoConta: "checking" | "savings";
  /** o e-mail que vai para a Pagar.me (sem ele, o do login de quem cadastra).
   *  A Pagar.me não deixa corrigir depois: e-mail errado = refazer o cadastro. */
  email?: string;
};

/** O primeiro problema do formulário, em português, ou null. */
export function problemaNoCadastro(d: DadosDoRecebedor): string | null {
  if (d.nome.trim().split(/\s+/).length < 2) return "Escreva o nome completo.";
  if (d.email !== undefined && (!emailValido(d.email) || d.email.trim().length > 64)) return "Confira o e-mail.";
  if (!cpfValido(d.cpf)) return "Confira o CPF.";
  if (!nascimentoValido(d.nascimento)) return "Confira a data de nascimento (dd/mm/aaaa, maior de 18).";
  if (d.nomeDaMae.trim().length < 3) return "Escreva o nome da mãe.";
  if (d.profissao.trim().length < 2) return "Escreva a profissão.";
  if (!(Number(so(d.rendaMensal)) > 0)) return "Informe a renda mensal.";
  if (so(d.celular).length < 10 || so(d.celular).length > 11) return "Confira o celular com DDD.";
  if (so(d.cep).length !== 8) return "Confira o CEP.";
  if (!d.rua.trim() || !d.numero.trim() || !d.bairro.trim() || !d.cidade.trim() || !/^[A-Za-z]{2}$/.test(d.uf.trim())) {
    return "Complete o endereço.";
  }
  if (!/^\d{3}$/.test(d.banco)) return "Escolha o banco.";
  if (!/^\d{1,6}$/.test(so(d.agencia))) return "Confira a agência.";
  if (!/^\d{1,13}$/.test(so(d.conta)) || !/^[\dXx]{1,2}$/.test(d.contaDigito.trim())) return "Confira a conta e o dígito.";
  return null;
}

/** "Itaú · conta ···345" — o único pedaço da conta que fica no nosso banco. */
export function resumoDoBanco(banco: string, conta: string): string {
  const nome = BANCOS.find(([c]) => c === banco)?.[1] ?? `Banco ${banco}`;
  return `${nome} · conta ···${so(conta).slice(-3)}`;
}

// ------------------------------------------------------------ o presente dado

/**
 * Quanto o convidado paga e como o valor se divide no split (centavos).
 * Taxa repassada (padrão): o convidado paga o preço + 3,89% e a família
 * recebe o preço inteiro. Taxa do casal: o convidado paga o preço e a
 * família recebe o preço menos a taxa. A parte da plataforma é sempre a
 * taxa; a tarifa da Pagar.me sai dela (charge_processing_fee no
 * recebedor do eOrganizei), e metade do que sobra é da cerimonialista.
 */
export function valoresDoPresente(
  precoCentavos: number,
  taxaDoCasal: boolean
): { total: number; taxa: number; familia: number; plataforma: number } {
  const preco = Math.round(precoCentavos);
  // em décimos de milésimo, com inteiros: 5000 × 0,0389 em ponto flutuante
  // dá 194,4999… e arredondaria para baixo; 5000 × 389 / 10000 dá 194,5
  // exato e o meio centavo sobe, como na conta de papel
  const taxa = Math.round((preco * Math.round(TAXA_DA_LISTA * 10_000)) / 10_000);
  return taxaDoCasal
    ? { total: preco, taxa, familia: preco - taxa, plataforma: taxa }
    : { total: preco + taxa, taxa, familia: preco, plataforma: taxa };
}

/** O preço que a lista mostra ao convidado (o que ele vai pagar). */
export const precoNaLista = (precoCentavos: number, taxaDoCasal: boolean) =>
  valoresDoPresente(precoCentavos, taxaDoCasal).total;

/** E-mail com cara de e-mail (o resto a Pagar.me confere). */
export const emailValido = (v: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(v.trim()) && v.trim().length <= 120;

/** Celular brasileiro com DDD: 10 ou 11 dígitos, DDD de 11 a 99. */
export function celularValido(v: string): boolean {
  const c = so(v);
  return (c.length === 10 || c.length === 11) && Number(c.slice(0, 2)) >= 11;
}

/** O primeiro problema do convidado, em português, ou null. */
export function problemaNoConvidado(d: { quem: string; email: string; cpf: string; celular: string; recado?: string }): string | null {
  const quem = d.quem.trim();
  if (quem.length < 2 || quem.length > 80) return "Escreva o seu nome.";
  if (!emailValido(d.email)) return "Confira o e-mail.";
  // o limite da Pagar.me para o e-mail do cliente
  if (d.email.trim().length > 64) return "Use um e-mail de até 64 letras.";
  if (!cpfValido(d.cpf)) return "Confira o CPF.";
  if (!celularValido(d.celular)) return "Confira o celular com DDD.";
  if ((d.recado ?? "").length > 500) return "O recado passa de 500 letras.";
  return null;
}
