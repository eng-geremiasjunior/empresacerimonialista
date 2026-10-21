// A nota como texto (PDF com camada de texto, planilha sem cabeçalho):
// a IA estrutura os itens. Molde de extrair-contrato: o texto chega do
// navegador (o arquivo não viaja), é redigido antes de sair (CPF,
// telefone, e-mail), e a resposta passa pela allowlist antes de voltar.
// Nada vira item aqui: isso é a conferência dela.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { chamarModelo, lerJsonDaIa } from "@/lib/ia-provedor";
import { redigirParaExtracao } from "@/lib/contrato-extracao-core";
import { INSTRUCAO_ESTOQUE_TEXTO, normalizarNotaLida, notaVazia } from "@/lib/estoque-leitura-core";
import { CARGOS_QUE_ESCREVEM } from "@/lib/estoque-core";
import { possoUsar } from "@/lib/supabase/nivel-do-plano";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const { texto: seguro } = redigirParaExtracao(texto.slice(0, TETO_TEXTO));

  try {
    const r = await chamarModelo({
      rota: "estoque_texto",
      userId: user.id,
      mensagens: [
        { role: "system", content: INSTRUCAO_ESTOQUE_TEXTO },
        { role: "user", content: `=== NOTA ===\n${seguro}\n=== FIM DA NOTA ===` },
      ],
    });
    if (!r.ok) {
      return r.motivo === "sem_chave"
        ? NextResponse.json({ error: "leitura indisponível neste servidor." }, { status: 503 })
        : NextResponse.json({ error: "a leitura não respondeu agora. Tente de novo." }, { status: 502 });
    }
    const json = lerJsonDaIa(r.conteudo);
    if (json === null) {
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
