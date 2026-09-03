// O fornecedor manda o contrato assinado sem ter login.
//
// Ele nunca fala com o Storage: pede aqui, o eOrganizei revalida o hash e a
// pertinência da solicitação, e devolve uma URL de upload assinada — que
// vale para UM caminho só e expira. Assim nenhuma política do Storage
// precisa ser aberta para 'anon', e um hash roubado não vira permissão
// de escrever onde quiser.
//
// O arquivo sobe direto do navegador dele para o Supabase, sem passar por
// esta função: contrato de casamento passa fácil dos 4,5 MB que o corpo
// de uma serverless aguenta.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  MIMES_ACEITOS,
  caminhoDoContrato,
  nomeSeguro,
  permitirEnvio,
} from "@/lib/contratos";

export const dynamic = "force-dynamic";

const MIMES = new Set<string>(MIMES_ACEITOS);

export async function POST(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "ambiente incompleto" }, { status: 500 });
  }

  const corpo = (await request.json().catch(() => null)) as {
    solicitacaoId?: string;
    nome?: string;
    tipo?: string;
  } | null;

  if (!corpo?.solicitacaoId || !corpo.nome) {
    return NextResponse.json({ error: "pedido incompleto" }, { status: 400 });
  }
  if (corpo.tipo && !MIMES.has(corpo.tipo)) {
    return NextResponse.json(
      { error: "Formato não aceito. Envie PDF, foto ou documento do Word." },
      { status: 400 }
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });

  // Os mesmos três portões da página pública: existe, não revogado, no prazo.
  const { data: acesso } = await supabase
    .from("fornecedor_acesso")
    .select("empresa_id, supplier_id, revogado_em, expira_em")
    .eq("hash", params.hash)
    .maybeSingle();

  if (
    !acesso ||
    acesso.revogado_em !== null ||
    new Date(acesso.expira_em) < new Date()
  ) {
    return NextResponse.json({ error: "link inválido" }, { status: 404 });
  }

  // E a pertinência: a solicitação tem que ser DELE, de contrato, e viva.
  const { data: sol } = await supabase
    .from("solicitacao_fornecedor")
    .select("id, event_id, tipo, status")
    .eq("id", corpo.solicitacaoId)
    .eq("supplier_id", acesso.supplier_id)
    .eq("empresa_id", acesso.empresa_id)
    .maybeSingle();

  if (!sol || sol.tipo !== "contrato") {
    return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  }
  if (!["pendente", "enviada", "reenviada"].includes(sol.status)) {
    return NextResponse.json(
      { error: "este pedido já foi respondido" },
      { status: 409 }
    );
  }

  const caminho = caminhoDoContrato(
    acesso.empresa_id,
    sol.event_id,
    sol.id,
    corpo.nome
  );

  const permissao = await permitirEnvio(supabase, caminho);
  if (!permissao) {
    return NextResponse.json(
      { error: "não foi possível preparar o envio" },
      { status: 500 }
    );
  }

  return NextResponse.json({ permissao, nome: nomeSeguro(corpo.nome) });
}
