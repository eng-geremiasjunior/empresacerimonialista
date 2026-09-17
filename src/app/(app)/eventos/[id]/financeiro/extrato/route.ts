// O extrato da verba em CSV — o primeiro item do "Exportar" da tela.
//
// Separador ";" e BOM na frente: é o que faz o Excel em pt-BR abrir sem
// pedir assistente de importação. A coluna "registrado por" sai do
// histórico de lançamentos (167); antes dele, fica vazia.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFinanceiroDoEvento } from "@/lib/supabase/financeiro-evento";
import {
  autorPorLancamento,
  daAgenda,
  entradasDoCaixa,
  gerarCsvDoExtrato,
  montarItens,
} from "@/lib/financeiro-tela";

export const dynamic = "force-dynamic";

function apelido(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "evento"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: evento } = await supabase
    .from("events")
    .select("name, clients(name)")
    .eq("id", params.id)
    .maybeSingle();

  // sem evento visível, a RLS já devolveu nada: não existe planilha vazia
  // com HTTP 200 (ela abriria o arquivo e concluiria que o evento sumiu)
  if (!evento) {
    return NextResponse.json({ error: "evento não encontrado" }, { status: 404 });
  }

  const dados = await getFinanceiroDoEvento(params.id);
  const itens = montarItens(
    dados.lancamentos.filter((l) => l.conta === "verba"),
    dados.hoje
  );

  const csv = gerarCsvDoExtrato(
    daAgenda(itens),
    entradasDoCaixa(itens),
    autorPorLancamento(dados.registros)
  );

  const cliente = Array.isArray(evento.clients)
    ? (evento.clients[0] as { name: string } | undefined)?.name
    : (evento.clients as { name: string } | null)?.name;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-${apelido(
        cliente || (evento.name as string) || "evento"
      )}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
