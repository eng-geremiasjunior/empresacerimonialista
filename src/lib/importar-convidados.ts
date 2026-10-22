// Importar a lista de convidados (13/10/2026). Na vida real a noiva manda
// a lista num Excel, num Word ou colada no WhatsApp — e alguém redigitava
// 150 nomes. Aqui a lista vira linhas para CONFERIR antes de salvar.
//
// Puro (sem React, sem banco): roda no navegador, que lê o arquivo, e no
// servidor, que confere de novo antes de gravar.

export type LinhaImportada = {
  nome: string;
  telefone: string | null;
  email: string | null;
  grupo: string | null;
  lado: "noiva" | "noivo" | null;
  acompanhantes: number;
  /** só a leitura com IA preenche (22/10/2026); a regra não conta crianças */
  criancas?: number;
};

export const MAX_IMPORTACAO = 1500;

const EMAIL = /[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}/i;
// 10 a 13 dígitos, com ou sem +55, parênteses, espaços e traços
const TELEFONE = /(\+?\(?\d[\d\s().-]{8,}\d)/;

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** A chave de "este nome já está na lista": sem acento, sem caixa, espaços únicos. */
export function chaveDoNome(nome: string): string {
  return semAcento(nome).toLowerCase().replace(/\s+/g, " ").trim();
}

function texto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return "";
  return String(v).trim();
}

function soTelefone(v: string): string | null {
  const m = v.match(TELEFONE);
  if (!m) return null;
  const digitos = m[1].replace(/\D/g, "");
  return digitos.length >= 10 && digitos.length <= 13 ? m[1].trim().slice(0, 40) : null;
}

function soEmail(v: string): string | null {
  const m = v.match(EMAIL);
  return m ? m[0].toLowerCase().slice(0, 160) : null;
}

function ladoDe(v: string): "noiva" | "noivo" | null {
  const t = chaveDoNome(v);
  if (/\bnoiva\b/.test(t)) return "noiva";
  if (/\bnoivo\b/.test(t)) return "noivo";
  return null;
}

function inteiro(v: string): number | null {
  const m = v.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function limitar(l: LinhaImportada): LinhaImportada {
  return {
    ...l,
    nome: l.nome.replace(/\s+/g, " ").trim().slice(0, 120),
    grupo: l.grupo ? l.grupo.trim().slice(0, 60) || null : null,
    acompanhantes: Math.max(0, Math.min(20, Math.round(l.acompanhantes || 0))),
  };
}

type Coluna = "nome" | "telefone" | "email" | "grupo" | "lado" | "acompanhantes" | "pessoas";

function colunaDoCabecalho(cel: string): Coluna | null {
  const t = chaveDoNome(cel);
  if (!t) return null;
  if (/^(nome|convidad|nome completo|nomes)/.test(t)) return "nome";
  if (/(whats|telefone|celular|fone|contato|tel\b)/.test(t)) return "telefone";
  if (/e-?mail/.test(t)) return "email";
  if (/^lado|noiv/.test(t)) return "lado";
  if (/acompanhante|\+ ?1|acomp/.test(t)) return "acompanhantes";
  if (/^(pessoas|qtd|quantidade|total)/.test(t)) return "pessoas";
  if (/(grupo|categoria|relacao|parentesco|familia ou amigo)/.test(t)) return "grupo";
  return null;
}

/**
 * Uma planilha (Excel ou CSV) já lida em linhas. Procura o cabeçalho nas
 * 5 primeiras linhas; sem cabeçalho reconhecível, a primeira coluna é o
 * nome e as outras são vasculhadas atrás de telefone e e-mail.
 */
export function linhasDaPlanilha(linhas: unknown[][]): LinhaImportada[] {
  const celulas = linhas.map((l) => (Array.isArray(l) ? l.map(texto) : []));
  let inicio = 0;
  let mapa: (Coluna | null)[] | null = null;
  for (let i = 0; i < Math.min(5, celulas.length); i++) {
    const m = celulas[i].map(colunaDoCabecalho);
    if (m.includes("nome")) {
      mapa = m;
      inicio = i + 1;
      break;
    }
  }

  const saida: LinhaImportada[] = [];
  for (const cel of celulas.slice(inicio)) {
    if (cel.every((c) => !c)) continue;
    let l: LinhaImportada = { nome: "", telefone: null, email: null, grupo: null, lado: null, acompanhantes: 0 };
    if (mapa) {
      cel.forEach((v, j) => {
        const col = mapa![j];
        if (!v || !col) return;
        if (col === "nome") l.nome = l.nome ? `${l.nome} ${v}` : v;
        else if (col === "telefone") l.telefone = l.telefone ?? soTelefone(v);
        else if (col === "email") l.email = l.email ?? soEmail(v);
        else if (col === "grupo") l.grupo = l.grupo ?? v;
        else if (col === "lado") l.lado = l.lado ?? ladoDe(v);
        else if (col === "acompanhantes") l.acompanhantes = inteiro(v) ?? 0;
        else if (col === "pessoas") {
          const n = inteiro(v);
          if (n && n > 1) l.acompanhantes = n - 1;
        }
      });
    } else {
      l.nome = cel[0] ?? "";
      for (const v of cel.slice(1)) {
        if (!l.email) l.email = soEmail(v);
        if (!l.telefone && !soEmail(v)) l.telefone = soTelefone(v);
      }
    }
    if (!l.lado && l.grupo) l.lado = ladoDe(l.grupo);
    l = limitar(l);
    if (l.nome.length >= 2 && /[a-zà-ú]/i.test(l.nome)) saida.push(l);
  }
  return saida.slice(0, MAX_IMPORTACAO);
}

/**
 * Uma lista colada (do Word, do WhatsApp, de um bloco de notas): uma
 * pessoa por linha. Tira numeração e marcadores, acha telefone, e-mail e
 * "+2"; o que sobra é o nome.
 */
export function linhasDoTexto(conteudo: string): LinhaImportada[] {
  const saida: LinhaImportada[] = [];
  for (const crua of conteudo.split(/\r?\n/)) {
    let resto = crua.replace(/^\s*(\d{1,4}\s*[.)\-–]\s*|[-•*·–]\s*)/, "").trim();
    if (!resto) continue;
    const email = soEmail(resto);
    if (email) resto = resto.replace(EMAIL, " ");
    const telefone = soTelefone(resto);
    if (telefone) resto = resto.replace(telefone, " ");
    let acompanhantes = 0;
    const mais = resto.match(/\+\s*(\d{1,2})\b/);
    if (mais) {
      acompanhantes = Number(mais[1]);
      resto = resto.replace(mais[0], " ");
    }
    const nome = resto.replace(/[|;,\t]+/g, " ").replace(/\s[-–]\s/g, " ").replace(/[-–:]+\s*$/, "").trim();
    const l = limitar({ nome, telefone, email, grupo: null, lado: null, acompanhantes });
    if (l.nome.length >= 2 && /[a-zà-ú]/i.test(l.nome)) saida.push(l);
  }
  return saida.slice(0, MAX_IMPORTACAO);
}

/** Separa o que já está na lista (pelo nome) e o que se repete dentro do próprio arquivo. */
export function separarRepetidos(
  novas: LinhaImportada[],
  nomesExistentes: string[]
): { novas: LinhaImportada[]; repetidas: LinhaImportada[] } {
  const vistos = new Set(nomesExistentes.map(chaveDoNome));
  const ok: LinhaImportada[] = [];
  const repetidas: LinhaImportada[] = [];
  for (const l of novas) {
    const k = chaveDoNome(l.nome);
    if (vistos.has(k)) repetidas.push(l);
    else {
      vistos.add(k);
      ok.push(l);
    }
  }
  return { novas: ok, repetidas };
}
