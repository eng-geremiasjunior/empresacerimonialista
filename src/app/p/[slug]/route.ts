import { NextResponse, type NextRequest } from "next/server";
import { parceiraAprovada, UTM_DA_PARCEIRA } from "@/lib/parceiras";

// O link próprio da parceira (183): eorganizei.com.br/p/<slug> leva ao
// site com a marca dela na URL. A página guarda a origem do clique na
// primeira tela (Origem), e o cadastro grava na conta (152) — é assim que
// o painel sabe quantas contas cada parceira trouxe. Link de quem não é
// parceira aprovada leva ao site sem marca.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const destino = new URL("/planos", request.url);
  const slug = (params.slug ?? "").toLowerCase();
  if (await parceiraAprovada(slug).catch(() => false)) {
    destino.searchParams.set("utm_source", UTM_DA_PARCEIRA);
    destino.searchParams.set("utm_medium", "indicacao");
    destino.searchParams.set("utm_campaign", slug);
  }
  return NextResponse.redirect(destino, 307);
}
