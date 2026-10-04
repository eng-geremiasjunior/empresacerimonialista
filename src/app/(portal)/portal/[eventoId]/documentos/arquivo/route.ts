// Abre um contrato ou um comprovante da noiva que abriu a conta sozinha
// (04/10/2026). Fica dentro do /portal porque quem é do portal só navega
// por ele (a /api/contrato da cerimonialista fica fora). O endereço leva
// só o fornecedor ou o pagamento; o caminho do arquivo sai do banco, e a
// URL assinada (poucos minutos) é feita com a sessão DELA — a política do
// armazenamento decide de novo.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import { urlParaLer } from "@/lib/contratos";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nada = () => NextResponse.json({ error: "arquivo não encontrado" }, { status: 404 });

export async function GET(request: NextRequest, { params }: { params: { eventoId: string } }) {
  const eventoId = params.eventoId;
  const contrato = request.nextUrl.searchParams.get("contrato");
  const comprovante = request.nextUrl.searchParams.get("comprovante");
  if (!UUID.test(eventoId) || (contrato && !UUID.test(contrato)) || (comprovante && !UUID.test(comprovante))) return nada();
  if (!(await donaDaFesta(eventoId))) return nada();
  const supabase = createClient();

  if (contrato) {
    const { data } = await supabase
      .from("solicitacao_fornecedor")
      .select("resposta")
      .eq("event_id", eventoId)
      .eq("supplier_id", contrato)
      .eq("tipo", "contrato")
      .neq("status", "cancelada")
      .order("created_at", { ascending: false });
    const caminho = ((data ?? []) as { resposta: { arquivo_path?: string } | null }[]).find((s) => s.resposta?.arquivo_path)
      ?.resposta?.arquivo_path;
    const url = caminho ? await urlParaLer(supabase, caminho) : null;
    return url ? NextResponse.redirect(url) : nada();
  }

  if (comprovante) {
    const { data } = await supabase
      .from("transactions")
      .select("comprovante_path")
      .eq("id", comprovante)
      .eq("event_id", eventoId)
      .maybeSingle();
    const caminho = (data as { comprovante_path: string | null } | null)?.comprovante_path;
    if (!caminho) return nada();
    const { data: assinada } = await supabase.storage.from("comprovantes").createSignedUrl(caminho, 60 * 10);
    return assinada?.signedUrl ? NextResponse.redirect(assinada.signedUrl) : nada();
  }

  return nada();
}
