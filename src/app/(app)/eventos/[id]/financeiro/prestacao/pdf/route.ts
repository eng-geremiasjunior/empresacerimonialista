// A prestação de contas do evento em PDF — gerada na hora, nada
// armazenado. Autenticada: a sessão dela + a RLS decidem o que sai.
//
// É o segundo item do "Exportar" da tela do Financeiro. O documento é o
// mesmo que o casal vê no portal: o payload já passou pelo guarda de
// prestacao-core, que recusa qualquer campo que seja dela.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrestacaoAoVivo } from "@/lib/supabase/prestacao";
import { gerarPdfPrestacao } from "@/lib/gerar-pdf-prestacao";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** "Ana e João" → "ana-e-joao" */
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }

  const [prestacao, { data: empresa }] = await Promise.all([
    getPrestacaoAoVivo(params.id),
    supabase.from("empresas").select("nome").limit(1).maybeSingle(),
  ]);

  if (!prestacao) {
    return NextResponse.json(
      { error: "evento não encontrado" },
      { status: 404 }
    );
  }

  const pdf = await gerarPdfPrestacao({
    empresa: empresa?.nome ?? "eOrganizei",
    emitidoEm: hojeBR().split("-").reverse().join("/"),
    payload: prestacao.payload,
  });

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prestacao-${apelido(
        prestacao.payload.evento.nome
      )}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
