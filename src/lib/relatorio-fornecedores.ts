// CSV do cadastro de fornecedores. Puro — a rota só entrega o resultado.
//
// Separador ";" e BOM na frente: é o que faz o Excel em pt-BR abrir o
// arquivo direto, sem passar pelo assistente de importação. Mesmo formato
// do relatório de eventos, para quem abre os dois não ter que aprender
// duas coisas.

import {
  COLUNAS_CSV,
  mesAno,
  rotuloFaixa,
  type FornecedorLinha,
} from "@/lib/fornecedores-lista";
import { STATUS_LABELS, categoriaLabel } from "@/lib/fornecedores-shared";

/**
 * Um campo de CSV que COMEÇA com =, +, - ou @ é lido como FÓRMULA pelo
 * Excel, pelo LibreOffice e pelo Google Sheets. Um fornecedor cadastrado
 * como `=HYPERLINK(...)` vira código executando na planilha de quem abre
 * o arquivo — e o nome vem de campo digitado à mão, inclusive por
 * fornecedor que preenche o próprio cadastro. O apóstrofo à frente
 * neutraliza sem mudar o que a pessoa lê na célula.
 */
function neutralizarFormula(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function campo(v: string): string {
  const seguro = neutralizarFormula(v);
  return /[",\n\r;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** Número para planilha pt-BR: vírgula decimal, sem símbolo de moeda. */
function moeda(v: number | null): string {
  if (v === null) return "";
  return v.toFixed(2).replace(".", ",");
}

export function gerarCsvFornecedores(linhas: FornecedorLinha[]): string {
  const corpo = linhas.map((f) =>
    [
      f.nome,
      f.categorias.map(categoriaLabel).join(" · "),
      f.cidade ?? "",
      f.telefone ?? "",
      f.email ?? "",
      f.cpf ?? "",
      rotuloFaixa(f.faixaPreco),
      STATUS_LABELS[f.status] ?? f.status,
      String(f.eventos),
      f.ultimoUso ? mesAno(f.ultimoUso) : "",
      moeda(f.totalGasto || null),
      moeda(f.ticketMedio),
    ]
      .map(campo)
      .join(";")
  );

  return "﻿" + [COLUNAS_CSV.join(";"), ...corpo].join("\n");
}
