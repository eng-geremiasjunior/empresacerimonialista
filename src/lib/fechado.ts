// "O que já está fechado" (04/10/2026). Pedido do dono: "foi feito, ok,
// onde vejo isso rápido?". A conta mais ativa registrou o resultado de 17
// das 24 decisões (o buffet por R$ 6.230, a data da igreja, o site…), mas
// a tela só dizia "tudo decidido · 8": o resultado só aparecia abrindo
// decisão por decisão.
//
// Módulo puro: a mesma leitura serve o modo Fechado do Planejamento e o
// quadro da Visão geral do evento. Lê as decisões que o getPlanejamento já
// trouxe (com os campos), sem consulta nova.

import type { Campo } from "@/lib/planejamento-shared";
import { valorDoCampo } from "@/lib/planejamento-shared";
import { rotuloDaOpcao } from "@/lib/rotulo-da-opcao";
import { assuntoDaDecisao } from "@/lib/assunto-da-tarefa";

export type FornecedorDoFechado = { id: string; name: string };

/** Fornecedor vinculado ao evento (o link do roteiro), com as categorias dele. */
export type FornecedorVinculado = { nome: string; termos: string[] };

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * O vinculado que responde pela contratação, quando a decisão não anotou:
 * "Fotógrafo" ↔ categoria "Fotografia", "Buffet" ↔ "Buffet". Compara o
 * começo da primeira palavra do assunto (até 5 letras) com cada categoria.
 * Na dúvida (dois candidatos), não chuta.
 */
export function vinculadoDoAssunto(assunto: string, vinculados: FornecedorVinculado[]): string | null {
  const palavra = semAcento(assunto).split(/[s-]+/)[0] ?? "";
  const raiz = palavra.slice(0, Math.min(5, palavra.length));
  if (raiz.length < 2) return null;
  const achados = vinculados.filter((v) =>
    v.termos.some((t) => semAcento(t).split(/[s/,-]+/).some((p) => p.startsWith(raiz)))
  );
  const nomes = [...new Set(achados.map((v) => v.nome))];
  return nomes.length === 1 ? nomes[0] : null;
}

/** O mínimo da decisão que o resumo usa (Decisao e Objetivo do planejamento cabem). */
type DecisaoLida = { id: string; titulo: string; estado: string; campos: Campo[] };
type ObjetivoLido = { id: string; nome: string; ativo: boolean; decisoes: DecisaoLida[] };

export type LinhaFechada = {
  decisaoId: string;
  objetivo: string;
  /** "Buffet" para uma contratação; o título da decisão para o resto */
  assunto: string;
  /** o resultado, campo a campo, já escrito ("Gordinhos Gourmet", "R$ 6.230") */
  partes: string[];
  /** decidida sem nenhum campo preenchido */
  semAnotacao: boolean;
  contratacao: boolean;
  fornecedor: string | null;
  valor: number | null;
};

export type GrupoFechado = { objetivo: string; linhas: LinhaFechada[] };

const brl = (n: number) => {
  const semCentavos = Math.abs(n % 1) < 0.005;
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: semCentavos ? 0 : 2,
    maximumFractionDigits: semCentavos ? 0 : 2,
  });
};

const dataCurta = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

// o valor que diz "quanto custou" dispensa o rótulo; os outros levam o nome
const VALOR_PRINCIPAL = /^valor( contratado| total| fechado)?$/i;

function escreverCampo(c: Campo, fornecedores: Map<string, string>): string | null {
  const v = valorDoCampo(c);
  if (v === null || v === "") return null;
  const rotulo = c.label.trim();
  switch (c.tipo) {
    case "fornecedor":
      return fornecedores.get(String(v)) ?? null;
    case "moeda":
      return VALOR_PRINCIPAL.test(rotulo) ? brl(Number(v)) : `${rotulo} ${brl(Number(v))}`;
    case "numero":
      return `${rotulo}: ${v}${c.unidade ? ` ${c.unidade}` : ""}`;
    case "sim_nao":
      return `${rotulo}: ${v ? "sim" : "não"}`;
    case "data":
      return `${rotulo}: ${dataCurta(String(v))}`;
    case "hora":
      return `${rotulo}: ${String(v).slice(0, 5)}`;
    case "escolha":
      return `${rotulo}: ${rotuloDaOpcao(String(v))}`;
    case "anexo":
      return `${rotulo}: ${String(v).split("/").pop() ?? "anexo"}`;
    default: {
      const t = String(v).trim();
      return t ? `${rotulo}: ${t.length > 80 ? `${t.slice(0, 79)}…` : t}` : null;
    }
  }
}

/** Uma decisão decidida, escrita como linha do Fechado. */
export function linhaDoFechado(
  d: DecisaoLida,
  objetivo: string,
  fornecedores: Map<string, string>
): LinhaFechada {
  const assunto = assuntoDaDecisao(d.titulo);
  const partes: string[] = [];
  let fornecedor: string | null = null;
  let valor: number | null = null;
  // o fornecedor primeiro, depois o valor, depois o resto na ordem do método
  const ordenados = [...d.campos].sort((a, b) => peso(a) - peso(b));
  for (const c of ordenados) {
    const texto = escreverCampo(c, fornecedores);
    if (!texto) continue;
    partes.push(texto);
    if (c.tipo === "fornecedor" && !fornecedor) fornecedor = texto;
    if (c.tipo === "moeda" && valor === null && VALOR_PRINCIPAL.test(c.label.trim())) valor = Number(valorDoCampo(c));
  }
  return {
    decisaoId: d.id,
    objetivo,
    assunto: assunto ?? d.titulo,
    partes,
    semAnotacao: partes.length === 0,
    contratacao: assunto !== null,
    fornecedor,
    valor,
  };
}

function peso(c: Campo): number {
  if (c.tipo === "fornecedor") return 0;
  if (c.tipo === "moeda") return 1;
  return 2;
}

/** Tudo o que está decidido, por assunto do planejamento, na ordem do método. */
export function oQueEstaFechado(
  objetivos: ObjetivoLido[],
  fornecedores: FornecedorDoFechado[],
  vinculados: FornecedorVinculado[] = []
): { grupos: GrupoFechado[]; decididas: number; comAnotacao: number; contratado: number } {
  const porId = new Map(fornecedores.map((f) => [f.id, f.name]));
  const grupos: GrupoFechado[] = [];
  let decididas = 0;
  let comAnotacao = 0;
  let contratado = 0;
  for (const o of objetivos) {
    if (!o.ativo) continue;
    const linhas = o.decisoes
      .filter((d) => d.estado === "decidida")
      .map((d) => {
        const l = linhaDoFechado(d, o.nome, porId);
        // contratação sem fornecedor anotado: o vinculado ao evento, se for um só
        if (l.contratacao && !l.fornecedor) {
          const nome = vinculadoDoAssunto(l.assunto, vinculados);
          if (nome) return { ...l, fornecedor: nome, partes: [nome, ...l.partes], semAnotacao: false };
        }
        return l;
      });
    if (linhas.length === 0) continue;
    decididas += linhas.length;
    comAnotacao += linhas.filter((l) => !l.semAnotacao).length;
    contratado += linhas.reduce((s, l) => s + (l.contratacao && l.valor ? l.valor : 0), 0);
    grupos.push({ objetivo: o.nome, linhas });
  }
  return { grupos, decididas, comAnotacao, contratado };
}
