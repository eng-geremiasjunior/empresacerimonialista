// Abre um contrato guardado.
//
// O balde é privado, então não existe URL fixa: a cada clique geramos uma
// assinada, válida por poucos minutos. Quem assina é a sessão DELA — a
// política do Storage (110) só deixa ler o que está na pasta da empresa
// dela, então um caminho de outra empresa simplesmente não abre.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { urlParaLer } from "@/lib/contratos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const caminho = request.nextUrl.searchParams.get("path");
  if (!caminho) {
    return NextResponse.json({ error: "caminho ausente" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const url = await urlParaLer(supabase, caminho);
  if (!url) {
    return NextResponse.json(
      { error: "arquivo não encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.redirect(url);
}
