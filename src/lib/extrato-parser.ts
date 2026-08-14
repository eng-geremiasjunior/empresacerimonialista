// Leitura de extrato bancário: OFX e CSV.
//
// O OFX é o formato que todo banco brasileiro exporta, e traz o FITID —
// identificador único da transação. É ele que impede a mesma linha de
// entrar duas vezes quando ela reimporta o arquivo do mês, e é por isso
// que o OFX é melhor que o CSV mesmo dando o mesmo trabalho de baixar.
//
// Parte PURA: sem DOM, sem fetch. Dá para testar com uma string.

export type LinhaExtrato = {
  fitid: string | null;
  data: string;
  /** negativo = saída, positivo = entrada, como vem do banco */
  valor: number;
  descricao: string;
};

/**
 * OFX é SGML, não XML: tags sem fechamento são comuns e parser de XML
 * engasga. Por isso a leitura é por recorte de <STMTTRN>, e não por
 * árvore.
 */
export function lerOFX(texto: string): LinhaExtrato[] {
  const linhas: LinhaExtrato[] = [];
  const blocos = texto.split(/<STMTTRN>/i).slice(1);

  for (const bruto of blocos) {
    const bloco = bruto.split(/<\/STMTTRN>/i)[0];
    const tag = (nome: string) => {
      const m = bloco.match(
        new RegExp(`<${nome}>\\s*([^<\\r\\n]*)`, "i")
      );
      return m ? m[1].trim() : null;
    };

    const dt = tag("DTPOSTED");
    const valor = tag("TRNAMT");
    if (!dt || !valor) continue;

    // DTPOSTED vem como AAAAMMDD, às vezes com hora e fuso colados
    const data = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;

    linhas.push({
      fitid: tag("FITID"),
      data,
      valor: Number(valor.replace(",", ".")),
      descricao: [tag("NAME"), tag("MEMO")].filter(Boolean).join(" · ") || "—",
    });
  }

  return linhas;
}

/**
 * CSV é o plano B: cada banco exporta com um cabeçalho diferente, então
 * procuramos a coluna pelo NOME em vez de pela posição. Sem FITID, a
 * proteção contra duplicata passa a ser o olho dela — por isso o OFX é
 * o caminho recomendado na tela.
 */
export function lerCSV(texto: string): LinhaExtrato[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length < 2) return [];

  const sep = (linhas[0].match(/;/g) ?? []).length >
    (linhas[0].match(/,/g) ?? []).length
    ? ";"
    : ",";

  const cabecalho = partir(linhas[0], sep).map((c) =>
    c.toLowerCase().replace(/["\s]/g, "")
  );
  const acha = (...nomes: string[]) =>
    cabecalho.findIndex((c) => nomes.some((n) => c.includes(n)));

  const iData = acha("data", "date");
  const iValor = acha("valor", "amount", "montante");
  const iDesc = acha("descri", "histor", "memo", "lançamento", "lancamento");

  if (iData < 0 || iValor < 0) return [];

  const out: LinhaExtrato[] = [];
  for (const l of linhas.slice(1)) {
    const cols = partir(l, sep);
    const data = normalizarData(cols[iData]);
    const valor = normalizarValor(cols[iValor]);
    if (!data || valor === null) continue;
    out.push({
      fitid: null,
      data,
      valor,
      descricao: (iDesc >= 0 ? cols[iDesc] : "")?.replace(/"/g, "").trim() || "—",
    });
  }
  return out;
}

/** Respeita aspas: descrição com o separador dentro é comum em banco. */
function partir(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "";
  let dentroDeAspas = false;
  for (const ch of linha) {
    if (ch === '"') dentroDeAspas = !dentroDeAspas;
    else if (ch === sep && !dentroDeAspas) {
      out.push(atual);
      atual = "";
    } else atual += ch;
  }
  out.push(atual);
  return out.map((c) => c.trim());
}

function normalizarData(s: string | undefined): string | null {
  if (!s) return null;
  const limpo = s.replace(/["\s]/g, "");
  // dd/mm/aaaa
  let m = limpo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // aaaa-mm-dd
  m = limpo.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return limpo;
  // dd/mm/aa
  m = limpo.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function normalizarValor(s: string | undefined): number | null {
  if (!s) return null;
  const limpo = s
    .replace(/["\sR$]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** Decide o formato pelo conteúdo, não pela extensão. */
export function lerExtrato(nome: string, texto: string): LinhaExtrato[] {
  if (/<STMTTRN>/i.test(texto)) return lerOFX(texto);
  if (/\.ofx$/i.test(nome)) return lerOFX(texto);
  return lerCSV(texto);
}

/** Só o que sai da conta: é o que casa com pagamento a fornecedor. */
export const somenteSaidas = (linhas: LinhaExtrato[]): LinhaExtrato[] =>
  linhas.filter((l) => l.valor < 0);
