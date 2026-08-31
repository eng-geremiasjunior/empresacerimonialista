// Telefone e CEP: máscara e validação.
//
// O gateway pede o telefone em partes ("At least one customer phone is
// required" foi o segundo campo obrigatório que descobrimos no susto), e
// pede DDI, DDD e número separados. Quebrar isso aqui, num módulo puro,
// evita espalhar `slice` pela tela e deixa a conta testável.

export function soDigitos(valor: string): string {
  return String(valor ?? "").replace(/\D/g, "");
}

/** (33) 99947-8774 para celular; (33) 3321-4455 para fixo. */
export function mascararTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = resto.length > 8 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

/**
 * Dez dígitos (fixo) ou onze (celular). O DDD brasileiro começa em 11, e
 * celular de onze dígitos sempre começa com 9 — as duas regras cortam a
 * maior parte da digitação errada antes de ela virar recusa.
 */
export function telefoneValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** O telefone do jeito que o gateway quer: DDI, DDD e número separados. */
export function partesTelefone(valor: string): {
  country_code: string;
  area_code: string;
  number: string;
} | null {
  if (!telefoneValido(valor)) return null;
  const d = soDigitos(valor);
  return { country_code: "55", area_code: d.slice(0, 2), number: d.slice(2) };
}

/** 39400-000 */
export function mascararCep(valor: string): string {
  const d = soDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function cepValido(valor: string): boolean {
  return soDigitos(valor).length === 8;
}

/** Sigla de estado — o gateway recusa qualquer coisa fora das 27. */
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export function ufValida(valor: string): boolean {
  return (UFS as readonly string[]).includes(String(valor ?? "").toUpperCase());
}
