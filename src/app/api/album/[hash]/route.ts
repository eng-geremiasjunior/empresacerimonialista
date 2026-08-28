import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// A porta do álbum para quem não tem conta.
//
// Mesmo desenho do contrato do fornecedor (110): o servidor confere o
// hash, monta o caminho e devolve um token que vale para UM arquivo. O
// bucket nunca fica aberto ao anônimo — e o caminho começa pelo id do
// evento, que é o que a policy e a função de registro conferem.
//
// POST devolve o token; PUT registra a linha depois que o arquivo subiu.

const JANELA_MS = 60_000;
const MAX_POR_JANELA = 12; // uma pessoa mandando um punhado de fotos
const ultimos = new Map<string, number[]>();

function excedeu(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimos.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimos.set(ip, anteriores);
  return anteriores.length > MAX_POR_JANELA;
}

function servico() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (i: RequestInfo | URL, x?: RequestInit) =>
          fetch(i, { ...x, cache: "no-store" }),
      },
    }
  );
}

/** O evento por trás do hash, e só se o álbum estiver aberto. */
async function eventoDoAlbum(hash: string): Promise<string | null> {
  const { data } = await servico().rpc("evento_do_convite", {
    p_hash: hash,
    p_bloco: "album",
  });
  return (data as string | null) ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";
  if (excedeu(ip)) {
    return NextResponse.json({ ok: false, erro: "muitas_tentativas" }, { status: 429 });
  }

  const eventId = await eventoDoAlbum(params.hash);
  if (!eventId) {
    return NextResponse.json({ ok: false, erro: "fechado" }, { status: 403 });
  }

  const supabase = servico();

  // teto por evento conferido ANTES de emitir o token: sem isto, o
  // arquivo subiria e só depois o registro seria recusado
  const { count } = await supabase
    .from("evento_album_foto")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((count ?? 0) >= 3000) {
    return NextResponse.json({ ok: false, erro: "cheio" }, { status: 409 });
  }

  const caminho = `${eventId}/${crypto.randomUUID()}.jpg`;
  const { data, error } = await supabase.storage
    .from("album")
    .createSignedUploadUrl(caminho);

  if (error || !data?.token) {
    return NextResponse.json({ ok: false, erro: "falhou" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, caminho, token: data.token });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const corpo = (await request.json().catch(() => ({}))) as {
    caminho?: string;
    autor?: string | null;
    legenda?: string | null;
  };
  if (!corpo.caminho) {
    return NextResponse.json({ ok: false, erro: "caminho" }, { status: 400 });
  }

  // a função confere de novo o hash, o bloco aberto, o teto e se o
  // caminho é da pasta deste evento — a rota não é a única guarda
  const { data, error } = await servico().rpc("registrar_foto_album", {
    p_hash: params.hash,
    p_caminho: corpo.caminho,
    p_autor: corpo.autor ?? null,
    p_legenda: corpo.legenda ?? null,
  });

  const r = data as { ok?: boolean; erro?: string } | null;
  if (error || !r?.ok) {
    return NextResponse.json(
      { ok: false, erro: r?.erro ?? "falhou" },
      { status: r?.erro ? 400 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
