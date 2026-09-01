// A lista de convidados colada — a leitura, sem tela e sem banco.
//
// Duas formas chegam (aposta 3 do mapa de IA — determinística, sem IA):
//   1. LINHAS: um nome por linha, com "+ 2" no fim (o que já existia).
//   2. TABELA: a planilha da noiva colada com cabeçalho — células
//      separadas por tab (é assim que Excel/Sheets colam) ou por ";".
//      As colunas são reconhecidas PELO NOME do cabeçalho (nome, grupo,
//      mesa, telefone, lado, restrição…), o molde do importador de
//      extrato: coluna que o sistema não conhece é ignorada e DITA.
//
// Sem cabeçalho reconhecível, a tabela vira linhas (primeira célula =
// nome) — nada é adivinhado.

// Mesa NÃO entra aqui de propósito: desde a 098 a mesa do convidado mora
// no croqui (evento_convidado.mesa foi removida). Uma coluna "mesa" na
// planilha é dita como ignorada, nunca gravada às escondidas.
export type ConvidadoColado = {
  nome: string;
  acompanhantes: number;
  criancas: number;
  grupo: string | null;
  telefone: string | null;
  email: string | null;
  lado: "noiva" | "noivo" | null;
  restricao_alimentar: string | null;
};

export type ColunaConhecida =
  | "nome"
  | "acompanhantes"
  | "criancas"
  | "grupo"
  | "telefone"
  | "email"
  | "lado"
  | "restricao_alimentar";

export type AnaliseLista = {
  modo: "linhas" | "tabela";
  /** colunas do cabeçalho que o sistema reconheceu, na ordem da planilha */
  colunas: ColunaConhecida[];
  /** cabeçalhos que vieram e o sistema NÃO conhece — ditos, não escondidos */
  ignoradas: string[];
  convidados: ConvidadoColado[];
};

/** Nome sem acento e sem caixa — só para comparar, nunca para gravar. */
export function chaveDoNome(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const normal = (s: string) => chaveDoNome(s).replace(/[^a-z0-9 ]/g, "");

// o que cada cabeçalho pode se chamar, do jeito que as planilhas vêm
const APELIDOS: Record<ColunaConhecida, string[]> = {
  nome: ["nome", "convidado", "convidados", "nome completo", "pessoa"],
  acompanhantes: ["acompanhantes", "acomp", "acompanhante", "qtd", "quantidade", "pessoas", "adultos"],
  criancas: ["criancas", "crianca", "kids", "infantil"],
  grupo: ["grupo", "familia", "lista", "categoria", "origem"],
  telefone: ["telefone", "whatsapp", "zap", "celular", "fone", "contato", "tel"],
  email: ["email", "e mail", "mail"],
  lado: ["lado", "de quem", "parte"],
  restricao_alimentar: ["restricao", "restricoes", "restricao alimentar", "alimentar", "dieta", "alergia", "alergias"],
};

function reconhecer(cabecalho: string): ColunaConhecida | null {
  const c = normal(cabecalho);
  if (!c) return null;
  for (const [coluna, nomes] of Object.entries(APELIDOS) as [ColunaConhecida, string[]][]) {
    if (nomes.includes(c)) return coluna;
  }
  return null;
}

const MAX_LINHAS = 500;

function separador(linha: string): "\t" | ";" | null {
  if (linha.includes("\t")) return "\t";
  if (linha.split(";").length >= 2) return ";";
  return null;
}

/** "João Silva + 2" → { nome, acompanhantes } (o parser de linhas de sempre). */
function lerLinha(bruta: string): { nome: string; acompanhantes: number } | null {
  // numeração e marcadores de planilha/lista
  const limpa = bruta.replace(/^\s*(?:\d+[.)-]|[-–—•*])\s*/, "").trim();
  // "+ 2", "(2)", "+2 acompanhantes" no fim da linha
  const m = limpa.match(/^(.*?)\s*(?:\+\s*(\d{1,2})|\((\d{1,2})\))\s*(?:acompanhantes?)?$/i);
  // Só corta o sufixo quando o número faz sentido como acompanhante.
  // "Zé + 99" fica inteiro: descartar em silêncio um pedaço do que ela
  // colou é pior do que deixar um nome estranho na lista.
  const contado = m ? Number(m[2] ?? m[3]) : 0;
  const valido = Number.isFinite(contado) && contado > 0 && contado <= 20;
  const nome = (valido && m ? m[1] : limpa).trim().slice(0, 120);
  if (!nome) return null;
  return { nome, acompanhantes: valido ? contado : 0 };
}

const inteiro = (v: string, max: number): number => {
  const n = Number(String(v).replace(/\D/g, ""));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : 0;
};

const lado = (v: string): "noiva" | "noivo" | null => {
  const c = normal(v);
  if (!c) return null;
  if (c.startsWith("noiva") || c === "dela" || c === "ela") return "noiva";
  if (c.startsWith("noivo") || c === "dele" || c === "ele") return "noivo";
  return null;
};

const vazio = (): ConvidadoColado => ({
  nome: "",
  acompanhantes: 0,
  criancas: 0,
  grupo: null,
  telefone: null,
  email: null,
  lado: null,
  restricao_alimentar: null,
});

export function analisarLista(texto: string): AnaliseLista {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim())
    .slice(0, MAX_LINHAS + 1);

  const vistos = new Set<string>();
  const convidados: ConvidadoColado[] = [];
  const guardar = (c: ConvidadoColado) => {
    const chave = chaveDoNome(c.nome);
    if (!c.nome || vistos.has(chave)) return; // repetido na própria colagem
    vistos.add(chave);
    convidados.push(c);
  };

  // ---- tabela? a primeira linha precisa ter separador E um cabeçalho
  // com a coluna "nome" reconhecível — senão é lista de linhas
  const sep = linhas[0] ? separador(linhas[0]) : null;
  const cabecalhos = sep ? linhas[0].split(sep).map((h) => h.trim()) : [];
  const mapa = cabecalhos.map(reconhecer);
  const temNome = mapa.includes("nome");

  if (sep && temNome) {
    const colunas = mapa.filter((c): c is ColunaConhecida => c !== null);
    const ignoradas = cabecalhos.filter((h, i) => h && mapa[i] === null);
    for (const linha of linhas.slice(1, MAX_LINHAS + 1)) {
      const celulas = linha.split(sep).map((c) => c.trim());
      const c = vazio();
      mapa.forEach((coluna, i) => {
        const v = celulas[i] ?? "";
        if (!coluna || !v) return;
        switch (coluna) {
          case "nome": {
            const lida = lerLinha(v);
            if (lida) {
              c.nome = lida.nome;
              // "+ 2" na célula do nome vale se a coluna de acompanhantes não vier
              if (lida.acompanhantes && !c.acompanhantes) c.acompanhantes = lida.acompanhantes;
            }
            break;
          }
          case "acompanhantes":
            c.acompanhantes = inteiro(v, 20);
            break;
          case "criancas":
            c.criancas = inteiro(v, 20);
            break;
          case "grupo":
            c.grupo = v.slice(0, 60);
            break;
          case "telefone":
            c.telefone = v.slice(0, 30);
            break;
          case "email":
            c.email = v.slice(0, 120);
            break;
          case "lado":
            c.lado = lado(v);
            break;
          case "restricao_alimentar":
            c.restricao_alimentar = v.slice(0, 200);
            break;
        }
      });
      guardar(c);
    }
    return { modo: "tabela", colunas, ignoradas, convidados };
  }

  // ---- linhas (o de sempre)
  for (const linha of linhas.slice(0, MAX_LINHAS)) {
    const lida = lerLinha(linha);
    if (!lida) continue;
    guardar({ ...vazio(), ...lida });
  }
  return { modo: "linhas", colunas: [], ignoradas: [], convidados };
}

export const ROTULO_COLUNA: Record<ColunaConhecida, string> = {
  nome: "nome",
  acompanhantes: "acompanhantes",
  criancas: "crianças",
  grupo: "grupo",
  telefone: "telefone",
  email: "e-mail",
  lado: "lado",
  restricao_alimentar: "restrição alimentar",
};
