// O Pix estático do casal, já com o valor do presente (decisão de 30/09).
//
// O BR Code é montado no navegador com a chave, o titular e a cidade que a
// família cadastrou: o QR e o copia-e-cola levam o valor do item, e o
// dinheiro vai direto para a conta deles — o eOrganizei não toca no
// pagamento nem sabe se ele aconteceu (por isso o site não diz "obrigado").
//
// Formato EMV-MPM do Manual do BR Code (BCB): cada campo é ID (2) +
// tamanho (2) + valor; o CRC16-CCITT-FALSE fecha o payload. Um caractere
// errado e o app do banco recusa o código, então tudo aqui é ASCII.

import { cpfValido } from "@/lib/lista-presentes";

export type ChavePix = { tipo: "email" | "telefone" | "cpf" | "cnpj" | "aleatoria"; valor: string };

/** CRC16-CCITT-FALSE (polinômio 0x1021, início 0xFFFF), 4 hex maiúsculos. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function cnpjValido(c: string): boolean {
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dig = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((t, p, i) => t + Number(c[i]) * p, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dig(12) === Number(c[12]) && dig(13) === Number(c[13]);
}

/** DDD + número de celular ou fixo, sem o 55. */
function telefoneBR(d: string): string | null {
  if (!/^[1-9][1-9]\d{8,9}$/.test(d)) return null;
  // celular tem 9 dígitos começando com 9; fixo tem 8 começando de 2 a 5
  if (d.length === 11 && d[2] !== "9") return null;
  if (d.length === 10 && !/[2-5]/.test(d[2])) return null;
  return d;
}

/**
 * A chave como o DICT guarda: e-mail minúsculo, telefone +55DDDNUMERO,
 * CPF e CNPJ só dígitos, aleatória minúscula com hífens. Chave que não
 * fecha com nenhum formato = null (o site mostra só a vitrine).
 *
 * 11 dígitos podem ser CPF ou celular: a máscara digitada decide ("(11)",
 * "+55" ou o DDD separado, "11 98765-4321", é telefone; "000.000.000-00" é
 * CPF). Só dígitos, com cara de celular E dígito de CPF que fecha (1 em cada
 * 100 celulares), não dá para saber: null, porque Pix para a chave errada
 * pode cair na conta de um estranho.
 */
export function normalizarChavePix(chave: string): ChavePix | null {
  const c = (chave ?? "").trim();
  if (!c) return null;

  if (c.includes("@")) {
    const e = c.toLowerCase();
    return e.length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? { tipo: "email", valor: e } : null;
  }

  // a aleatória é um UUID: 32 hex, com ou sem os hífens
  const hex = c.toLowerCase().replace(/-/g, "");
  if (/^[0-9a-f-]+$/i.test(c) && /^[0-9a-f]{32}$/.test(hex)) {
    const v = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return { tipo: "aleatoria", valor: v };
  }

  if (!/^[\d\s().+\-/]+$/.test(c)) return null;
  const d = c.replace(/\D/g, "");
  // o separador logo depois dos 2 primeiros dígitos é o DDD; no CPF ele vem depois do 3º
  const pareceTelefone = c.startsWith("+") || c.includes("(") || /^\d{2}[\s-]/.test(c);
  const pareceCpf = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(c);

  if (pareceTelefone) {
    const semPais = d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
    const t = telefoneBR(semPais);
    return t ? { tipo: "telefone", valor: `+55${t}` } : null;
  }
  if (d.length === 14 && cnpjValido(d)) return { tipo: "cnpj", valor: d };
  if (d.length === 11 && cpfValido(d)) {
    if (!pareceCpf && telefoneBR(d)) return null;
    return { tipo: "cpf", valor: d };
  }
  if (pareceCpf) return null;
  if (d.length === 12 || d.length === 13) {
    const t = d.startsWith("55") ? telefoneBR(d.slice(2)) : null;
    if (t) return { tipo: "telefone", valor: `+55${t}` };
  }
  const t = telefoneBR(d);
  return t ? { tipo: "telefone", valor: `+55${t}` } : null;
}

/** Nome e cidade do recebedor: sem acento e só o que o manual aceita. */
function ascii(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/**
 * O copia-e-cola do Pix estático (é também o texto do QR). A chave deve
 * vir normalizada (normalizarChavePix); se não vier, é normalizada aqui,
 * e a que não fecha com nenhum formato vai como está.
 */
export function montarPixEstatico(p: {
  chave: string;
  titular: string;
  cidade: string;
  valorCentavos?: number | null;
  txid?: string;
}): string {
  const chave = normalizarChavePix(p.chave)?.valor ?? p.chave.trim();
  const titular = ascii(p.titular, 25) || "RECEBEDOR";
  const cidade = ascii(p.cidade, 15) || "BRASIL";
  const txid = (p.txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const v = p.valorCentavos;
  const valor = typeof v === "number" && Number.isFinite(v) && v > 0 ? (Math.round(v) / 100).toFixed(2) : null;

  const corpo =
    campo("00", "01") +
    campo("26", campo("00", "br.gov.bcb.pix") + campo("01", chave)) +
    campo("52", "0000") +
    campo("53", "986") +
    (valor ? campo("54", valor) : "") +
    campo("58", "BR") +
    campo("59", titular) +
    campo("60", cidade) +
    campo("62", campo("05", txid)) +
    "6304";
  return corpo + crc16(corpo);
}
