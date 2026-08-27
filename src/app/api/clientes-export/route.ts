// Exporta clientes como CSV.
//
// Protegida pelo middleware; usa a sessão, então a RLS já limita à
// empresa e ao cargo de quem baixa. `?ids=` recorta a seleção da tela;
// sem ele, sai o cadastro inteiro.

import { NextRequest, NextResponse } from "next/server";
import { getClientesTela } from "@/lib/supabase/clientes-tela";
import { gerarCsvClientes } from "@/lib/relatorio-clientes";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const bruto = request.nextUrl.searchParams.get("ids");
  const ids = bruto
    ? new Set(bruto.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  let linhas;
  try {
    linhas = await getClientesTela();
  } catch (e) {
    // Falha de leitura NÃO pode virar planilha vazia com HTTP 200: ela
    // abriria o arquivo, veria só o cabeçalho e concluiria que o cadastro
    // sumiu.
    console.error("[vela:clientes-export]", e);
    return NextResponse.json(
      { error: "Não foi possível ler o cadastro agora." },
      { status: 503 }
    );
  }

  const recorte = ids ? linhas.filter((c) => ids.has(c.id)) : linhas;
  const csv = gerarCsvClientes(recorte);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${hojeBR()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
