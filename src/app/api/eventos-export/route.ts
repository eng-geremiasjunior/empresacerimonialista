import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getEventosParaExport } from "@/lib/supabase/eventos-list";
import { gerarCsvEventos } from "@/lib/relatorio-eventos";
import { parseEventosParams } from "@/lib/eventos-url";

export const dynamic = "force-dynamic";

// Exporta a listagem de eventos (respeitando os filtros da URL) como CSV.
// Protegida pelo middleware (rota autenticada); usa a sessão para RLS.
export async function GET(request: NextRequest) {
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const params = parseEventosParams(sp);

  const rows = await getEventosParaExport(params);
  const csv = gerarCsvEventos(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eventos-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
