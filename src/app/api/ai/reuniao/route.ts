// Registrar a reunião (T3 do plano "IA que trabalha", 21/10/2026).
//
// Chega a conversa (o que ela escreveu, ou a transcrição do áudio já feita
// pela rota /api/ai/audio). Sai o PACOTE: a ata, as decisões tomadas, as
// tarefas, os horários que mudaram e a mensagem-resumo à família — tudo
// pela allowlist. Nada é gravado aqui: quem grava é a confirmação dela
// (reunioes/ia-actions.ts). O texto da conversa não é guardado.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarModelo, lerJsonDaIa } from "@/lib/ia-provedor";
import { estadoDaIa, reservarIa } from "@/lib/ia-ajustes";
import { criarTrabalho } from "@/lib/ia-trabalhos";
import { redigirParaExtracao } from "@/lib/contrato-extracao-core";
import { hojeBR } from "@/lib/tempo";
import { TETO_TEXTO_REUNIAO, instrucaoDaReuniao, pacoteDaReuniao } from "@/lib/ia-reuniao";
import { lerContextoDaReuniao } from "@/lib/supabase/ia-reuniao-dados";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const estado = await estadoDaIa();
  if (!estado.liberada || !estado.empresaId) {
    return NextResponse.json({ error: "Esta função ainda não está liberada para a sua conta." }, { status: 403 });
  }

  const corpo = (await req.json().catch(() => null)) as { eventId?: string; compromissoId?: string | null; texto?: string } | null;
  const eventId = corpo?.eventId ?? "";
  const compromissoId = corpo?.compromissoId && UUID.test(corpo.compromissoId) ? corpo.compromissoId : null;
  const texto = (corpo?.texto ?? "").trim().slice(0, TETO_TEXTO_REUNIAO);
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Evento não informado." }, { status: 400 });
  if (texto.length < 20) return NextResponse.json({ error: "Escreva ou grave o que foi conversado." }, { status: 400 });

  const { data: podeEditar } = await supabase.rpc("pode_editar_evento", { p_event_id: eventId });
  if (podeEditar !== true) return NextResponse.json({ error: "Você não pode mudar este evento." }, { status: 403 });
  if (compromissoId) {
    const { data: comp } = await supabase.from("compromisso").select("id").eq("id", compromissoId).eq("event_id", eventId).maybeSingle();
    if (!comp) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  }

  const contexto = await lerContextoDaReuniao(supabase, eventId, hojeBR());
  if (!contexto) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  const reserva = await reservarIa({ acoes: 1 });
  if (!reserva.ok) {
    return NextResponse.json(
      {
        error:
          reserva.motivo === "cota"
            ? "A cota de inteligência artificial deste mês acabou. Ela volta no dia 1º."
            : "Esta função ainda não está liberada para a sua conta.",
      },
      { status: 403 }
    );
  }

  const { texto: seguro } = redigirParaExtracao(texto);
  const r = await chamarModelo({
    rota: "reuniao",
    userId: user.id,
    maxTokens: 6000,
    mensagens: [
      { role: "system", content: instrucaoDaReuniao(contexto) },
      { role: "user", content: `=== CONVERSA ===\n${seguro}\n=== FIM DA CONVERSA ===` },
    ],
  });
  if (!r.ok) {
    await reserva.devolver();
    if (r.motivo === "cortada") {
      return NextResponse.json({ error: "A conversa é longa demais para ler de uma vez. Registre em duas partes." }, { status: 422 });
    }
    return NextResponse.json({ error: "A leitura não respondeu agora. Tente de novo em instantes." }, { status: 502 });
  }
  const json = lerJsonDaIa(r.conteudo);
  if (json === null) return NextResponse.json({ error: "A leitura voltou bagunçada. Tente de novo." }, { status: 502 });

  const pacote = pacoteDaReuniao(json, contexto, seguro, compromissoId);
  if (!pacote.ata.length && !pacote.decisoes.length && !pacote.tarefas.length && !pacote.roteiro.length) {
    return NextResponse.json({ error: "Não encontrei nada combinado nessa conversa." }, { status: 422 });
  }
  const trabalhoId = await criarTrabalho({
    empresaId: estado.empresaId,
    eventId,
    userId: user.id,
    tipo: "registrar_reuniao",
    pacote,
  });
  if (!trabalhoId) return NextResponse.json({ error: "Não foi possível guardar a proposta. Tente de novo." }, { status: 500 });
  return NextResponse.json({ trabalhoId, pacote });
}
