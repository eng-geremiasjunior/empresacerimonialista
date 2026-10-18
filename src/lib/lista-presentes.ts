// A lista de presentes — as regras, sem tela e sem banco.
//
// Decisões dele (26/09/2026): taxa de 3,89% sobre o presente; do que
// sobra depois da tarifa da Pagar.me, metade é da cerimonialista (repasse
// mensal por Pix) e metade do eOrganizei; quem presenteia no cartão paga a
// taxa do cartão. Valor mínimo por presente para a divisão não ficar
// negativa (Pix 1,19% + R$ 0,55 fixos).

export const TAXA_DA_LISTA = 0.0389;

/**
 * A conta que recebe já serve para a lista ir ao ar e o convidado pagar
 * (05/10/2026, decisão dele): basta estar CADASTRADA na Pagar.me e não
 * recusada, suspensa, bloqueada ou inativa. A prova de vida só segura a
 * transferência para o banco do casal — isso é da Pagar.me, não da lista.
 * A mesma regra está no banco (200: portal_salvar_lista e lista_publica).
 */
export const CONTA_QUE_NAO_RECEBE: ReadonlySet<string> = new Set(["refused", "suspended", "blocked", "inactive"]);
export const contaRecebe = (r: { status?: string | null } | null | undefined): boolean =>
  !!r && !!r.status && !CONTA_QUE_NAO_RECEBE.has(r.status);
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

/** A tarifa da Pagar.me no Pix: 1,19% do total + R$ 0,55 (centavos). */
export const tarifaDoPix = (totalCentavos: number) => Math.round(totalCentavos * 0.0119) + 55;

/**
 * A parte da cerimonialista num presente pago (centavos): metade do que
 * sobra da taxa da plataforma depois da tarifa (decisão dele, 26/09/2026).
 * No cartão a tarifa e o antifraude vêm no acréscimo de quem presenteia,
 * e a plataforma fica com o mesmo que no Pix — a conta é a mesma.
 */
export function comissaoDaCerimonialista(p: { taxa_centavos: number; total_centavos: number; taxa_cartao_centavos?: number | null }): number {
  const totalSemCartao = p.total_centavos - (p.taxa_cartao_centavos ?? 0);
  return Math.max(0, Math.floor((p.taxa_centavos - tarifaDoPix(totalSemCartao)) / 2));
}

/** O preço que a lista mostra ao convidado (o que ele vai pagar). */
export const precoNaLista = (precoCentavos: number, taxaDoCasal: boolean) =>
  valoresDoPresente(precoCentavos, taxaDoCasal).total;

// ------------------------------------------------------------ o cartão

/**
 * A taxa do cartão por número de parcelas (1x a 6x), em centésimos de
 * ponto percentual (538 = 5,38%): a tabela "Depois" que o gerente da conta
 * na Pagar.me mandou em 03/10/2026, o custo efetivo com recebimento em
 * D+15. Mudou o contrato, muda aqui — e só aqui.
 */
export const TAXAS_DO_CARTAO = [538, 771, 909, 1047, 1185, 1323] as const;
/** O antifraude da Pagar.me, por transação de crédito (centavos). */
export const ANTIFRAUDE_CENTAVOS = 44;
export const PARCELAS_NO_CARTAO = TAXAS_DO_CARTAO.length;

/**
 * Quanto o convidado paga no cartão e como o valor se divide (centavos).
 * A taxa do cartão é de quem presenteia (decisão dele, 26/09 e 03/10): a
 * Pagar.me cobra o percentual sobre o TOTAL e o antifraude, os dois da
 * parte da plataforma. O acréscimo resolve
 *   acréscimo = taxa × (total do Pix + acréscimo) + antifraude,
 * com inteiros e arredondado para cima: a plataforma fica com o mesmo que
 * fica no Pix (a taxa de serviço) e o casal recebe o mesmo que no Pix.
 */
export function valoresNoCartao(
  precoCentavos: number,
  taxaDoCasal: boolean,
  parcelas: number
): { total: number; taxa: number; taxaCartao: number; familia: number; plataforma: number; parcelas: number; valorDaParcela: number } {
  const pix = valoresDoPresente(precoCentavos, taxaDoCasal);
  const n = Math.min(Math.max(Math.trunc(parcelas) || 1, 1), PARCELAS_NO_CARTAO);
  const bp = TAXAS_DO_CARTAO[n - 1];
  const taxaCartao = Math.ceil((bp * pix.total + ANTIFRAUDE_CENTAVOS * 10_000) / (10_000 - bp));
  const total = pix.total + taxaCartao;
  return {
    total,
    taxa: pix.taxa,
    taxaCartao,
    familia: pix.familia,
    plataforma: pix.plataforma + taxaCartao,
    parcelas: n,
    valorDaParcela: Math.ceil(total / n),
  };
}

export type EnderecoDeCobranca = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

const UFS_DO_BRASIL = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ")
);

/** O primeiro problema do endereço da fatura do cartão, ou null. */
export function problemaNoEnderecoDeCobranca(e: EnderecoDeCobranca): string | null {
  if (so(e.cep).length !== 8) return "Confira o CEP.";
  if (!e.rua.trim() || e.rua.trim().length > 120) return "Informe a rua.";
  if (!e.numero.trim() || e.numero.trim().length > 10) return "Informe o número.";
  if (e.complemento.trim().length > 60) return "Use um complemento de até 60 letras.";
  if (!e.bairro.trim() || e.bairro.trim().length > 60) return "Informe o bairro.";
  if (!e.cidade.trim() || e.cidade.trim().length > 60) return "Informe a cidade.";
  if (!UFS_DO_BRASIL.has(e.uf.trim().toUpperCase())) return "Escolha o estado.";
  return null;
}

/** O token de uso único que a Pagar.me devolve para o cartão. */
export const TOKEN_DO_CARTAO = /^token_[A-Za-z0-9]{8,64}$/;

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
