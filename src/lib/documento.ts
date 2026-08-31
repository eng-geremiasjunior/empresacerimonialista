// CPF e CNPJ: máscara e validação de verdade (dígito verificador).
//
// O gateway recusa a cobrança sem documento — "The customer Document is
// required" — e recusa de novo se o número for inválido. Validar aqui
// evita uma ida à operadora para descobrir que faltou um dígito, e evita
// a pior versão disso: a assinatura criada lá fora e a cobrança falhando
// depois, com a pessoa achando que assinou.
//
// Módulo PURO: testável sem navegador e sem rede.

export function soDigitos(valor: string): string {
  return String(valor ?? "").replace(/\D/g, "");
}

/** 000.000.000-00 enquanto digita CPF; 00.000.000/0000-00 para CNPJ. */
export function mascararDocumento(valor: string): string {
  const d = soDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function digitoCpf(base: string, peso: number): number {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
  const r = (soma * 10) % 11;
  return r === 10 ? 0 : r;
}

export function cpfValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11) return false;
  // 111.111.111-11 e afins passam na conta do dígito e não são CPF
  if (/^(\d)\1{10}$/.test(d)) return false;
  return (
    digitoCpf(d.slice(0, 9), 10) === Number(d[9]) &&
    digitoCpf(d.slice(0, 10), 11) === Number(d[10])
  );
}

function digitoCnpj(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

export function cnpjValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  return (
    digitoCnpj(d.slice(0, 12)) === Number(d[12]) &&
    digitoCnpj(d.slice(0, 13)) === Number(d[13])
  );
}

export type TipoDocumento = "CPF" | "CNPJ" | null;

/** Qual é o documento — ou null quando não é nenhum dos dois. */
export function tipoDocumento(valor: string): TipoDocumento {
  const d = soDigitos(valor);
  if (d.length === 11) return cpfValido(d) ? "CPF" : null;
  if (d.length === 14) return cnpjValido(d) ? "CNPJ" : null;
  return null;
}

export function documentoValido(valor: string): boolean {
  return tipoDocumento(valor) !== null;
}
