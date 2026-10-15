// A nota como texto (PDF com camada de texto, planilha sem cabeçalho):
// a IA estrutura os itens. Molde de extrair-contrato: o texto chega do
// navegador (o arquivo não viaja), é redigido antes de sair (CPF,
// telefone, e-mail), e a resposta passa pela allowlist antes de voltar.
// Nada vira item aqui: isso é a conferência dela.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { registrarUsoDaIa } from "@/lib/registro-do-sistema";
import { redigirParaExtracao } from "@/lib/contrato-extracao-core";
import { INSTRUCAO_ESTOQUE_TEXTO, normalizarNotaLida, notaVazia } from "@/lib/estoque-leitura-core";
import { CARGOS_QUE_ESCREVEM } from "@/lib/estoque-core";
import { possoUsar } from "@/lib/supabase/nivel-do-plano";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_URL = process.env.LLAMA_BASE_URL || "https://api.groq.com/openai/v1";
const MODELO = process.env.LLAMA_MODEL || "openai/gpt-oss-120b";
const EXTRA = MODELO.includes("gpt-oss") ? { reasoning_effort: "low" } : {};

// uma nota tem uma página, duas no máximo; 40k chars cobre com folga
const TETO_TEXTO = 40_000;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  // planos por recurso (09/10/2026): a leitura por IA é dos planos pagos
  if (!(await possoUsar("leitura_ia"))) return NextResponse.json({ error: "A leitura de arquivos por inteligência artificial é dos planos pagos." }, { status: 403 });

  const { cargo } = await getMeuCargo();
  if (!(CARGOS_QUE_ESCREVEM as readonly string[]).includes(cargo ?? "")) {
    return NextResponse.json({ error: "só quem escreve no estoque lê notas" }, { status: 403 });
  }

  const { texto } = (await req.json().catch(() => ({}))) as { texto?: string };
  if (typeof texto !== "string" || texto.trim().length < 20) {
    return NextResponse.json({ error: "o texto chegou vazio — o PDF parece não ter camada de texto." }, { status: 400 });
  }

  const apiKey = process.env.LLAMA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "leitura indisponível neste servidor." }, { status: 503 });
  }

  const { texto: seguro } = redigirParaExtracao(texto.slice(0, TETO_TEXTO));

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0,
        ...EXTRA,
        messages: [
          { role: "system", content: INSTRUCAO_ESTOQUE_TEXTO },
          { role: "user", content: `=== NOTA ===\n${seguro}\n=== FIM DA NOTA ===` },
        ],
      }),
    });

    if (!res.ok) {
      await registrarUsoDaIa({ userId: user.id, rota: "estoque_texto", ok: false });
      console.error(`[eorganizei:estoque] leitura: provedor respondeu ${res.status}`);
      return NextResponse.json({ error: "a leitura não respondeu agora. Tente de novo." }, { status: 502 });
    }

    const data = await res.json();
    await registrarUsoDaIa({
      userId: user.id,
      rota: "estoque_texto",
      ok: true,
      tokensEntrada: Number(data?.usage?.prompt_tokens) || 0,
      tokensSaida: Number(data?.usage?.completion_tokens) || 0,
    });
    const cru = String(data.choices?.[0]?.message?.content ?? "")
      .replace(/^```(?:json)?/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    let json: unknown;
    try {
      json = JSON.parse(cru);
    } catch {
      return NextResponse.json({ error: "a leitura veio ilegível. Tente de novo." }, { status: 502 });
    }
    const nota = normalizarNotaLida(json);
    if (notaVazia(nota)) {
      return NextResponse.json({ error: "não encontrei itens com quantidade nesta nota." }, { status: 422 });
    }
    return NextResponse.json({ nota });
  } catch {
    return NextResponse.json({ error: "falha ao falar com a leitura." }, { status: 502 });
  }
}
