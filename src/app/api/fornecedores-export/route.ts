// Exporta fornecedores como CSV.
//
// Mesmo formato do relatório de eventos: separador ";" e BOM na frente,
// que é o que faz o Excel em pt-BR abrir sem pedir assistente de
// importação. Protegida pelo middleware; usa a sessão, então o RLS já
// limita à empresa de quem baixa.
//
// `?ids=` recorta a seleção da tela. Sem ele, sai o cadastro inteiro.

import { NextRequest, NextResponse } from "next/server";
import { getFornecedoresDaTela } from "@/lib/supabase/fornecedores-tela";
import { gerarCsvFornecedores } from "@/lib/relatorio-fornecedores";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const bruto = request.nextUrl.searchParams.get("ids");
  const ids = bruto
    ? new Set(bruto.split(",").map((s) => s.trim()).filter(Boolean))
    : null;

  let linhas, migracaoPendente;
  try {
    ({ linhas, migracaoPendente } = await getFornecedoresDaTela());
  } catch (e) {
    // Falha de leitura NÃO pode virar planilha vazia com HTTP 200: ela
    // abriria o arquivo, veria só o cabeçalho e concluiria que o cadastro
    // sumiu.
    console.error("[vela:fornecedores-export]", e);
    return NextResponse.json(
      { error: "Não foi possível ler o cadastro agora." },
      { status: 503 }
    );
  }
  if (migracaoPendente) {
    return NextResponse.json(
      { error: "Cadastro de fornecedores ainda não migrado (026)." },
      { status: 409 }
    );
  }

  const escolhidas = ids ? linhas.filter((f) => ids.has(f.id)) : linhas;
  const csv = gerarCsvFornecedores(escolhidas);

  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fornecedores-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
