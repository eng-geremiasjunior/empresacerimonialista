// O checklist dela, lido NO NAVEGADOR (23/09/2026).
//
// Mesma doutrina do contrato (138) e da planta (099): o arquivo não
// viaja — só o texto vai ao servidor, e só quando ela pedir para ler.
// Cada leitor entra por import dinâmico: quem não importa nada não
// carrega nenhum deles.

import { extrairTextoDePdf } from "@/lib/pdf-texto-cliente";

/** O que ela pode enviar. .doc e .xls antigos ficam de fora: salvar como .docx/.xlsx resolve. */
export const ACEITOS = ".xlsx,.docx,.pdf,.csv,.txt";

export async function textoDoArquivo(arquivo: File): Promise<string> {
  const nome = arquivo.name.toLowerCase();

  if (nome.endsWith(".pdf")) {
    return extrairTextoDePdf(await arquivo.arrayBuffer());
  }

  if (nome.endsWith(".docx")) {
    const m = await import("mammoth");
    const mammoth = (m as unknown as { default?: typeof m }).default ?? m;
    const r = await mammoth.extractRawText({ arrayBuffer: await arquivo.arrayBuffer() });
    return r.value;
  }

  if (nome.endsWith(".xlsx")) {
    const { default: lerPlanilha } = await import("read-excel-file/browser");
    const abas = await lerPlanilha(arquivo);
    // uma linha da planilha vira uma linha de texto, células separadas
    // por " | " — a IA entende colunas como "Mês | Tarefa | Quem"
    return abas
      .map((aba) => {
        const linhas = aba.data
          .map((linha) =>
            linha
              .filter((c) => c !== null && c !== undefined && String(c).trim() !== "")
              .map((c) => (c instanceof Date ? c.toLocaleDateString("pt-BR") : String(c).trim()))
              .join(" | ")
          )
          .filter(Boolean);
        return linhas.length ? `# ${aba.sheet}\n${linhas.join("\n")}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
    return arquivo.text();
  }

  throw new Error("Esse formato não abre aqui. Salve como .xlsx, .docx ou .pdf — ou copie e cole o texto.");
}
