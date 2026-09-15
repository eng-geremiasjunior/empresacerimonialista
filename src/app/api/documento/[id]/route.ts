// Abre um documento da cliente (termo de aceite em PDF, contrato de
// prestação) guardado no balde privado.
//
// Quem decide é a RLS de evento_documento, lida com a sessão de quem
// clicou: a equipe vê os documentos da própria empresa (pelo crivo do
// evento ou do orçamento), a cliente do portal vê só o contrato de
// prestação do próprio evento (policy evento_documento_portal_le, 163 — a
// de equipe exige meu_cargo(), que a conta de portal não tem). O termo de
// aceite nunca abre pelo portal: tem valor e CPF, e é só de quem contrata. Só depois disso a chave de serviço
// assina a URL — porque o caminho do termo pode ter o ORÇAMENTO no 2º
// segmento (a proposta sem data ainda não tem evento), e a política do
// balde (119) só deixa a sessão dela ler caminhos com evento. A URL vale
// poucos minutos: a cada clique, uma nova.
//
// Molde: src/app/api/contrato/route.ts.

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { BALDE_CONTRATOS, urlParaLerDe } from "@/lib/contratos";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!UUID.test(params.id)) {
    return NextResponse.json({ error: "documento não encontrado" }, { status: 404 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  // Pela sessão dela: se a RLS não deixar ver, volta vazio — e "não
  // encontrado" é a resposta certa, sem confirmar que o id existe.
  const { data: doc } = await supabase
    .from("evento_documento")
    .select("id, storage_path")
    .eq("id", params.id)
    .maybeSingle();
  const caminho = (doc as { storage_path?: string } | null)?.storage_path;
  if (!caminho) {
    return NextResponse.json({ error: "documento não encontrado" }, { status: 404 });
  }

  const servico = admin();
  if (!servico) {
    return NextResponse.json({ error: "indisponível" }, { status: 503 });
  }

  const url = await urlParaLerDe(servico, BALDE_CONTRATOS, caminho, 300);
  if (!url) {
    return NextResponse.json({ error: "arquivo não encontrado" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
