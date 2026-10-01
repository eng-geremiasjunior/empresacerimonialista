import { NextResponse } from "next/server";
import { getEventosDaCliente } from "@/lib/supabase/portal";
import { getNomesDoCasal } from "@/lib/supabase/portal-noivos";
import { iniciaisDoCasal } from "@/lib/portal-noivos";

// O "M&T · Faltam N dias" do login dos noivos, depois que a senha confere.
// Mora debaixo de /portal porque o middleware só deixa a família andar
// por aqui (uma rota em /api a mandaria de volta para /portal). Só com UM
// evento: com dois, o /portal pergunta qual, e as iniciais de um deles
// seriam um chute. A RLS decide o evento; só nomes e dias saem daqui.
export const dynamic = "force-dynamic";

export async function GET() {
  const semNada = NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });
  try {
    const eventos = await getEventosDaCliente();
    if (eventos.length !== 1) return semNada;
    const ev = eventos[0];
    const casal = await getNomesDoCasal(ev.id, ev.nome);
    const ini = iniciaisDoCasal(casal);
    return NextResponse.json(
      {
        a: casal ? ini.a : null,
        b: casal ? ini.b : null,
        dias: typeof ev.diasRestantes === "number" && ev.diasRestantes >= 0 ? ev.diasRestantes : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return semNada;
  }
}
