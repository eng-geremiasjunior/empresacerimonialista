// Extração de texto de PDF — NO NAVEGADOR, nunca no servidor.
//
// Doutrina da planta (099) e da extração de contrato (138): o servidor
// não ganha leitor de PDF e o arquivo não viaja. Este módulo é o miolo
// comum dos dois leitores do sistema:
//   - contrato do fornecedor (bucket privado → /api/contrato → aqui)
//   - comprovante de pagamento (o File já está na mão dela → aqui)
//
// O import do pdfjs é dinâmico: o leitor (1 MB) só entra no bundle de
// quem realmente lê.

export async function extrairTextoDePdf(
  dados: ArrayBuffer,
  maxPaginas = 30
): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: dados }).promise;
  let texto = "";
  const paginas = Math.min(doc.numPages, maxPaginas);
  for (let i = 1; i <= paginas; i++) {
    const pg = await doc.getPage(i);
    const tc = await pg.getTextContent();
    // com as quebras de linha do próprio PDF (21/10/2026): sem elas, a
    // página inteira virava uma linha só e as colunas de uma tabela se
    // misturavam ("motorista Seu Raimundo  Pai da noiva")
    texto +=
      tc.items
        .map((it) => {
          const t = it as { str?: string; hasEOL?: boolean };
          return typeof t.str === "string" ? t.str + (t.hasEOL ? "\n" : " ") : "";
        })
        .join("")
        .replace(/[ \t]+\n/g, "\n") + "\n";
  }
  return texto;
}

/** Baixa um contrato do bucket privado (sessão dela) e extrai o texto. */
export async function lerContratoNoNavegador(path: string): Promise<string> {
  const resp = await fetch(`/api/contrato?path=${encodeURIComponent(path)}`);
  if (!resp.ok) throw new Error("não consegui baixar o contrato");
  const buf = await resp.arrayBuffer();
  return extrairTextoDePdf(buf);
}
