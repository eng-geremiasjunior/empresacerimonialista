// Download do PDF do orçamento — gerado on-demand (nada armazenado).
// Autenticado: a sessão da cerimonialista + RLS decidem o que ela vê.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPdfOrcamento } from "@/lib/gerar-pdf-orcamento";
import type { Orcamento, OrcamentoItem } from "@/lib/orcamentos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const [{ data: orc }, { data: itens }, { data: empresa }] =
    await Promise.all([
      supabase.from("orcamentos").select("*").eq("id", params.id).single(),
      supabase
        .from("orcamento_itens")
        .select("*")
        .eq("orcamento_id", params.id)
        .order("ordem"),
      supabase.from("empresas").select("nome, logo_url").limit(1).maybeSingle(),
    ]);

  if (!orc) {
    return NextResponse.json(
      { error: "orçamento não encontrado" },
      { status: 404 }
    );
  }

  const pdf = await gerarPdfOrcamento({
    orcamento: orc as unknown as Orcamento,
    itens: (itens ?? []) as unknown as OrcamentoItem[],
    empresa: {
      nome: empresa?.nome ?? "Vela",
      logo_url: empresa?.logo_url ?? null,
    },
    contatoEmpresa: user.email ?? null,
  });

  const nomeArquivo = `orcamento-${(orc.contato_nome as string)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
