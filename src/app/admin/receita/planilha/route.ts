// A planilha do mês, para o contador: o que entrou (confirmado pela
// operadora) e o que saiu (o que o dono lançou). Uma linha por lançamento.
//
// Mesmo gate do resto do painel: sem o super admin, 404 — nem a
// confirmação de que a rota existe.

import { NextResponse, type NextRequest } from "next/server";
import { emailDoSuperAdmin, getSerieMensal } from "@/lib/supabase/admin-painel";
import { getResumoDasContas } from "@/lib/supabase/admin-contas";
import { CATEGORIAS_DE_CUSTO, getCustos, getPagamentosEAvisos } from "@/lib/supabase/admin-receita";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";

function celula(v: string | number): string {
  const t = String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function valorBR(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

export async function GET(request: NextRequest) {
  if (!(await emailDoSuperAdmin())) {
    return new NextResponse("não encontrado", { status: 404 });
  }
  const pedido = request.nextUrl.searchParams.get("mes") ?? "";
  const mes = /^\d{4}-\d{2}$/.test(pedido) ? pedido : hojeBR().slice(0, 7);

  const [serie, resumo, custos, operadora] = await Promise.all([
    getSerieMensal(mes, 1),
    getResumoDasContas(),
    getCustos(mes, mes),
    getPagamentosEAvisos(`${mes}-01T03:00:00Z`),
  ]);
  const nomePor = new Map(resumo.ok ? resumo.dados.map((c) => [c.empresa_id, c.nome]) : []);
  const rotuloDaCategoria = new Map(CATEGORIAS_DE_CUSTO.map((c) => [c.chave, c.rotulo]));

  const linhas: string[] = ["tipo;data;descricao;conta;valor"];
  for (const p of operadora.pagamentos.filter((x) => x.dia.slice(0, 7) === mes)) {
    linhas.push(
      ["Recebido", p.dia, "Assinatura do eOrganizei", nomePor.get(p.empresaId) ?? "conta não identificada", valorBR(p.valor)]
        .map(celula)
        .join(";")
    );
  }
  for (const c of custos.custos) {
    linhas.push(
      [
        "Custo",
        `${c.mes}-01`,
        `${c.servico} (${rotuloDaCategoria.get(c.categoria) ?? c.categoria})${c.pago ? "" : " — a pagar"}`,
        "",
        valorBR(c.valor),
      ]
        .map(celula)
        .join(";")
    );
  }
  const marketing = serie.meses[0]?.gastoMarketing ?? null;
  if (marketing !== null) {
    linhas.push(["Custo", `${mes}-01`, "Marketing (aquisição)", "", valorBR(marketing)].map(celula).join(";"));
  }

  // BOM: o Excel em português abre UTF-8 com acento certo só com ele
  const corpo = `﻿${linhas.join("\r\n")}\r\n`;
  return new NextResponse(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eorganizei-${mes}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
