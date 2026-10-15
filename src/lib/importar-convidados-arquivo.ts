// O arquivo da lista de convidados, lido NO NAVEGADOR (13/10/2026): o
// arquivo não viaja, só as linhas conferidas vão ao servidor. Cada
// leitor entra por import dinâmico.

import { linhasDaPlanilha, linhasDoTexto, type LinhaImportada } from "@/lib/importar-convidados";

export const ACEITOS_NA_LISTA = ".xlsx,.csv,.docx,.txt,.pdf";

function linhasDoCsv(texto: string): unknown[][] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  const amostra = linhas.slice(0, 5).join("\n");
  const sep = (amostra.match(/;/g)?.length ?? 0) > (amostra.match(/,/g)?.length ?? 0) ? ";" : amostra.includes("\t") ? "\t" : ",";
  return linhas.map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()));
}

export async function lerListaDoArquivo(arquivo: File): Promise<LinhaImportada[]> {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".xlsx")) {
    const { default: lerPlanilha } = await import("read-excel-file/browser");
    const abas = await lerPlanilha(arquivo);
    for (const aba of abas) {
      const linhas = linhasDaPlanilha(aba.data as unknown[][]);
      if (linhas.length) return linhas;
    }
    return [];
  }
  if (nome.endsWith(".csv")) return linhasDaPlanilha(linhasDoCsv(await arquivo.text()));
  if (nome.endsWith(".docx")) {
    const m = await import("mammoth");
    const mammoth = (m as unknown as { default?: typeof m }).default ?? m;
    const r = await mammoth.extractRawText({ arrayBuffer: await arquivo.arrayBuffer() });
    return linhasDoTexto(r.value);
  }
  if (nome.endsWith(".pdf")) {
    const { extrairTextoDePdf } = await import("@/lib/pdf-texto-cliente");
    return linhasDoTexto(await extrairTextoDePdf(await arquivo.arrayBuffer()));
  }
  if (nome.endsWith(".txt")) return linhasDoTexto(await arquivo.text());
  throw new Error("Esse formato não abre aqui. Salve como .xlsx ou .docx — ou copie a lista e cole.");
}
