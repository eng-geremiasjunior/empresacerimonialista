// O que o "Nosso site" faz com a estrutura antes de mostrar e de gravar.
//
// · estruturaDoModelo: ao entrar num modelo novo, os blocos que ele
//   desenha e a lista ainda não tem entram (vazios) perto de onde o
//   desenho os põe. Nada sai: trocar de modelo nunca perde conteúdo. O
//   texto livre só entra quando ela pede.
// · paraGravar: só vai ao banco o que a 191 aceita — conteúdo só nos
//   tipos que guardam conteúdo, e conteúdo vazio não vai.
// · nomesDaCapa: os nomes da capa como a noiva vê em Detalhes.
// · fotosCruas: toda foto da estrutura, como a 191 conta (o item
//   incompleto também), para assinar no editor e contar o teto de 60.
// · comPresentesSalvos: os itens de presente trocados pelos salvos (quem
//   não é 'gestao' reenvia os do banco, não os da aba).
// · mensagemCurta: o motivo do banco em uma linha.
//
// Módulo puro (sem React, sem servidor).

import { BLOCOS_FIXOS, type BlocoDoSite, type TipoBloco } from "@/lib/site-blocos";
import { MODELOS, type ModeloId } from "@/lib/site-modelos";
import { partirNomes } from "@/lib/site-conteudo";

/** Os tipos cujo conteúdo a 191 confere; nos outros, conteúdo é recusado. */
const GUARDAM_CONTEUDO: ReadonlySet<TipoBloco> = new Set([
  "texto",
  "capa",
  "historia",
  "momentos",
  "cenas",
  "local",
  "dress_code",
  "galeria",
  "especiais",
  "presentes",
  "jeito",
  "rsvp",
]);

/** Os tipos que só entram na lista quando ela pede (Adicionar bloco). */
const SO_QUANDO_PEDE: ReadonlySet<TipoBloco> = new Set(["texto"]);

/** O teto de fotos da estrutura inteira (a 191). */
export const TETO_DE_FOTOS_DA_ESTRUTURA = 60;

/** Um id livre para o bloco novo, no formato que o banco aceita. */
function idLivre(tipo: TipoBloco, usados: Set<string>): string {
  const base = tipo.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 30);
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  usados.add(id);
  return id;
}

/** A estrutura com os blocos que o modelo desenha e ela ainda não tem. */
export function estruturaDoModelo(estrutura: BlocoDoSite[], modelo: ModeloId): BlocoDoSite[] {
  if (modelo === "convite") return estrutura;
  const desenho = MODELOS[modelo].desenha;
  const tem = new Set(estrutura.map((b) => b.tipo));
  const faltam = desenho.filter((t) => !tem.has(t) && !BLOCOS_FIXOS.has(t) && !SO_QUANDO_PEDE.has(t));
  if (faltam.length === 0) return estrutura;

  const usados = new Set(estrutura.map((b) => b.id));
  const nova = [...estrutura];
  for (const tipo of faltam) {
    // depois do último bloco que vem antes dele no desenho; sem nenhum,
    // logo depois da capa
    const antes = desenho.slice(0, desenho.indexOf(tipo)).reverse();
    let pos = -1;
    for (const t of antes) {
      const i = nova.map((b) => b.tipo).lastIndexOf(t);
      if (i >= 0 && t !== "rodape") {
        pos = i;
        break;
      }
    }
    if (pos < 0) pos = Math.max(0, nova.findIndex((b) => b.tipo === "capa"));
    // nunca depois do rodapé
    const rodape = nova.findIndex((b) => b.tipo === "rodape");
    let onde = pos + 1;
    if (rodape >= 0 && onde > rodape) onde = rodape;
    nova.splice(onde, 0, { id: idLivre(tipo, usados), tipo });
  }
  return nova;
}

/** A estrutura como o banco aceita. */
export function paraGravar(estrutura: BlocoDoSite[]): BlocoDoSite[] {
  return estrutura.map((b) => {
    const { conteudo, ...resto } = b;
    if (!conteudo || !GUARDAM_CONTEUDO.has(b.tipo) || Object.keys(conteudo).length === 0) return resto;
    return { ...resto, conteudo };
  });
}

/** Os nomes da capa; sem a chave, a quebra do nome do evento. */
export function nomesDaCapa(estrutura: BlocoDoSite[], nomeDoEvento: string): { nome1: string; nome2: string } {
  const c = estrutura.find((b) => b.tipo === "capa")?.conteudo ?? {};
  const partidos = partirNomes(nomeDoEvento);
  return {
    nome1: typeof c.nome1 === "string" ? c.nome1 : partidos.nome1,
    nome2: typeof c.nome2 === "string" ? c.nome2 : partidos.nome2,
  };
}

/** Os ids de presente dos OUTROS blocos de presentes (o id não repete). */
export function idsDePresenteFora(estrutura: BlocoDoSite[], blocoId: string): string[] {
  const ids: string[] = [];
  for (const b of estrutura) {
    if (b.tipo !== "presentes" || b.id === blocoId) continue;
    const itens = Array.isArray(b.conteudo?.itens) ? (b.conteudo.itens as unknown[]) : [];
    for (const i of itens) {
      const id = i && typeof i === "object" ? (i as Record<string, unknown>).id : null;
      if (typeof id === "string") ids.push(id);
    }
  }
  return ids;
}

const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** As fotos de um objeto: a chave 'foto' e a lista 'fotos'. */
function fotosDe(o: Record<string, unknown>, saida: string[]) {
  if (typeof o.foto === "string") saida.push(o.foto);
  if (Array.isArray(o.fotos)) for (const f of o.fotos) if (typeof f === "string") saida.push(f);
}

/**
 * Toda foto da estrutura, repetidas inclusive, na régua da 191: a foto e
 * as fotos do bloco e de cada item das listas (marcos, cenas, pares,
 * presentes). Sem passar pelos leitores do site: o item incompleto conta
 * no teto e precisa aparecer no editor. Só nos tipos que guardam conteúdo.
 */
export function fotosCruas(estrutura: BlocoDoSite[]): string[] {
  const saida: string[] = [];
  for (const b of estrutura) {
    const c = objeto(b.conteudo);
    if (!c || !GUARDAM_CONTEUDO.has(b.tipo)) continue;
    fotosDe(c, saida);
    for (const v of Object.values(c)) {
      if (!Array.isArray(v)) continue;
      for (const item of v) {
        const o = objeto(item);
        if (o) fotosDe(o, saida);
      }
    }
  }
  return saida;
}

/** Os itens de presente de uma estrutura, na ordem (site_itens_de_presente). */
function itensDePresente(estrutura: BlocoDoSite[]): unknown[] {
  return estrutura.flatMap((b) =>
    b.tipo === "presentes" && Array.isArray(b.conteudo?.itens) ? (b.conteudo.itens as unknown[]) : []
  );
}

function comItens(b: BlocoDoSite, itens: unknown[]): BlocoDoSite {
  const conteudo: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b.conteudo ?? {})) if (k !== "itens") conteudo[k] = v;
  if (itens.length > 0) conteudo.itens = itens;
  const saida: BlocoDoSite = { ...b };
  delete saida.conteudo;
  return Object.keys(conteudo).length > 0 ? { ...saida, conteudo } : saida;
}

/**
 * A estrutura com os itens de presente da SALVA. A 191 compara a lista
 * inteira de itens (todos os blocos de presentes, em ordem) e só 'gestao'
 * muda; quem não é reenvia a do banco, mesmo que outra aba tenha mudado.
 * Cada bloco fica com os itens salvos do bloco de mesmo id; se a ordem
 * assim não bater com a salva (blocos trocados ou tirados), a lista salva
 * inteira vai para o primeiro bloco de presentes. Sem bloco de presentes
 * aqui, a estrutura volta como está.
 */
export function comPresentesSalvos(estrutura: BlocoDoSite[], salva: BlocoDoSite[]): BlocoDoSite[] {
  const primeiro = estrutura.find((b) => b.tipo === "presentes")?.id;
  if (primeiro === undefined) return estrutura;
  const todos = itensDePresente(salva);
  const porBloco = estrutura.map((b) =>
    b.tipo === "presentes" ? comItens(b, itensDePresente(salva.filter((s) => s.tipo === "presentes" && s.id === b.id))) : b
  );
  if (JSON.stringify(itensDePresente(porBloco)) === JSON.stringify(todos)) return porBloco;
  return estrutura.map((b) => (b.tipo === "presentes" ? comItens(b, b.id === primeiro ? todos : []) : b));
}

/** O motivo do banco em uma linha: maiúscula no começo, ponto no fim. */
export function mensagemCurta(m: string): string {
  const t = m.replace(/\s+/g, " ").trim();
  if (!t) return "Não foi possível salvar agora.";
  const curta = t.length > 140 ? `${t.slice(0, 139).trimEnd()}…` : t;
  const cap = curta.charAt(0).toUpperCase() + curta.slice(1);
  return /[.!?…]$/.test(cap) ? cap : `${cap}.`;
}
