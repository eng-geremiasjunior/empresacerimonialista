// A leitura do conteúdo de um bloco PARA EDITAR.
//
// Os leitores de src/lib/site-conteudo.ts servem o site: aparam espaços e
// descartam o item incompleto (marco sem título, momento sem hora,
// presente sem valor). No editor isso apagaria o que a noiva está
// digitando — o espaço entre "Ana" e "Maria", o marco recém-criado. Aqui
// a régua é a mesma (LIMITES, os ícones, o formato da foto e da hora), só
// que nada é aparado e item em branco fica.
//
// E a escrita: cada editor grava SÓ as chaves que a 191 aceita para o
// bloco; texto vazio e foto nula saem da chave (o banco aceita ausente).

import { ICONES_DO_MARCO, LIMITES, type IconeDoMarco } from "@/lib/site-conteudo";

export const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Corta por caractere de verdade (o char_length do banco), sem aparar. */
export function cortar(s: string, max: number): string {
  const letras = Array.from(s);
  return letras.length > max ? letras.slice(0, max).join("") : s;
}

export function txt(v: unknown, max: number): string {
  return typeof v === "string" ? cortar(v, max) : "";
}

/** O formato do caminho no balde 'site' ({evento}/{uuid}.jpg|webp) — e
 *  do PRÓPRIO evento, como o banco confere. */
export function fotoDoEvento(v: unknown, eventoId: string): string | null {
  return typeof v === "string" && v.startsWith(`${eventoId}/`) && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|webp)$/.test(v)
    ? v
    : null;
}

export function fotosDoEvento(v: unknown, max: number, eventoId: string): string[] {
  return lista(v)
    .map((f) => fotoDoEvento(f, eventoId))
    .filter((f): f is string => f !== null)
    .slice(0, max);
}

export const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function icone(v: unknown): IconeDoMarco | null {
  return (ICONES_DO_MARCO as readonly string[]).includes(v as string) ? (v as IconeDoMarco) : null;
}

/** Monta o objeto gravado: só as chaves com valor (texto não vazio, foto,
 *  lista). Texto só de espaço também sai — no site ele não apareceria. */
export function compacto(campos: Record<string, string | string[] | number | null | undefined>): Record<string, unknown> {
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(campos)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && !v.trim()) continue;
    saida[k] = v;
  }
  return saida;
}

export { LIMITES };
