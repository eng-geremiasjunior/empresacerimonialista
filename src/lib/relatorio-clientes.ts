// CSV de clientes — mesmo formato do relatório de fornecedores.
//
// Separador ";" e BOM na frente: é o que faz o Excel em pt-BR abrir sem
// pedir assistente de importação.

import { COLUNAS_CSV, linhaCsv, type ClienteLinha } from "@/lib/clientes-lista";

/**
 * Campo que começa com = + - @ é executado como FÓRMULA pelo Excel, pelo
 * LibreOffice e pelo Sheets. Nome de cliente vem de digitação livre, então
 * a aspa simples na frente é o que impede a planilha de rodar o que ela
 * não deveria.
 */
function neutralizarFormula(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function campo(v: string): string {
  const seguro = neutralizarFormula(v);
  return /[",\n\r;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function gerarCsvClientes(linhas: ClienteLinha[]): string {
  const cabecalho = COLUNAS_CSV.map(campo).join(";");
  const corpo = linhas.map((c) => linhaCsv(c).map(campo).join(";"));
  return "\uFEFF" + [cabecalho, ...corpo].join("\r\n");
}
