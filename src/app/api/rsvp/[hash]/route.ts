// O convidado se cadastra pelo link do evento.
//
// Passa por aqui, e não direto pela RPC do navegador, por dois motivos:
// a chave do Resend é server-only, e um endpoint próprio permite conter
// abuso antes de tocar o banco.
//
// As travas de verdade estão no banco (link fechado, dedupe por e-mail,
// teto por evento). Esta rota acrescenta o limite por origem, que o
// banco não enxerga.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarEmailConvidado } from "@/lib/email-convidado";

export const dynamic = "force-dynamic";

const CONVITE_PARA: Record<string, string> = {
  casamento: "no casamento de",
  debutante: "nos 15 anos de",
  aniversario: "no aniversário de",
  bodas: "nas bodas de",
  formatura: "na formatura de",
  batizado: "no batizado de",
  cha_revelacao: "no chá revelação de",
  corporativo: "no evento de",
};

// Memória do processo: some no deploy, e é de propósito — é um
// amortecedor contra rajada, não um contador de verdade.
const ultimos = new Map<string, number[]>();
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 5;

function demaisTentativas(ip: string): boolean {
  const agora = Date.now();
  const anteriores = (ultimos.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  anteriores.push(agora);
  ultimos.set(ip, anteriores);
  if (ultimos.size > 5000) ultimos.clear(); // teto de memória
  return anteriores.length > MAX_POR_JANELA;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "desconhecido";

  if (demaisTentativas(ip)) {
    return NextResponse.json(
      { ok: false, erro: "muitas_tentativas" },
      { status: 429 }
    );
  }

  let corpo: {
    nome?: string;
    email?: string;
    confirmacao?: string;
    acompanhantes?: number;
    criancas?: number;
    restricao?: string;
    telefone?: string;
  };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "corpo_invalido" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.rpc("autocadastrar_convidado", {
    p_hash: params.hash,
    p_nome: corpo.nome ?? "",
    p_email: corpo.email ?? "",
    p_confirmacao: corpo.confirmacao ?? "confirmado",
    p_acompanhantes: corpo.acompanhantes ?? 0,
    p_criancas: corpo.criancas ?? 0,
    p_restricao: corpo.restricao ?? null,
    p_telefone: corpo.telefone ?? null,
  });

  const r = data as { ok?: boolean; erro?: string; hash?: string } | null;
  if (error || !r?.ok || !r.hash) {
    return NextResponse.json(
      { ok: false, erro: r?.erro ?? "falhou" },
      { status: r?.erro ? 400 : 500 }
    );
  }

  // O e-mail é cortesia, não parte do cadastro: se o Resend falhar, a
  // presença continua confirmada e a tela não mente para o convidado.
  const { data: ev } = await supabase.rpc("consultar_rsvp_evento", {
    p_hash: params.hash,
  });
  const evento = (ev as Record<string, string | null>[] | null)?.[0];

  if (evento && corpo.email) {
    const confirmado = (corpo.confirmacao ?? "confirmado") === "confirmado";
    const envio = await enviarEmailConvidado({
      para: corpo.email,
      nome: corpo.nome ?? "",
      anfitrioes: evento.anfitrioes ?? "os noivos",
      convitePara: CONVITE_PARA[evento.evento_tipo ?? ""] ?? "no evento de",
      data: evento.evento_data ?? "",
      hora: evento.evento_hora ?? null,
      local: evento.evento_local ?? null,
      cidade: evento.evento_cidade ?? null,
      confirmado,
      pessoas: confirmado
        ? 1 + (corpo.acompanhantes ?? 0) + (corpo.criancas ?? 0)
        : 0,
      hash: r.hash,
    });
    if (envio.ok) {
      await supabase.rpc("marcar_email_convidado_enviado", { p_hash: r.hash });
    }
    return NextResponse.json({ ok: true, emailEnviado: envio.ok });
  }

  return NextResponse.json({ ok: true, emailEnviado: false });
}
