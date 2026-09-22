// A chave de renovação do Google de cada pessoa fica no banco CIFRADA
// (168): quem tem a tabela não tem a chave. Não existe variável de
// ambiente nova para isso — a chave de cifra é derivada (HKDF) da chave
// de serviço do Supabase, que o servidor já guarda. Trocar a chave de
// serviço invalida as cifras: todo mundo conecta de novo, e só isso.

import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

const IV = 12;
const TAG = 16;

function chave(): Buffer {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
  return Buffer.from(hkdfSync("sha256", base, "eorganizei-google-agenda", "refresh-token", 32));
}

/** iv | tag | dados, em base64. */
export function cifrar(texto: string): string {
  const iv = randomBytes(IV);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), dados]).toString("base64");
}

export function decifrar(cifrado: string): string {
  const b = Buffer.from(cifrado, "base64");
  if (b.length < IV + TAG + 1) throw new Error("cifra curta demais");
  const d = createDecipheriv("aes-256-gcm", chave(), b.subarray(0, IV));
  d.setAuthTag(b.subarray(IV, IV + TAG));
  return Buffer.concat([d.update(b.subarray(IV + TAG)), d.final()]).toString("utf8");
}
