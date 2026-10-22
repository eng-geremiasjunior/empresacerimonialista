// As respostas do RSVP em lote (C2 do plano do RSVP, 21/10/2026).
//
// Chega o que ela colou (ou a transcrição do áudio, feita pela rota
// /api/ai/audio). Sai o PACOTE: cada resposta casada com um convidado da
// lista, ou com os candidatos para ela escolher. Nada é gravado aqui:
// quem grava é a confirmação dela (rsvp/ia-actions.ts). O texto não é
// guardado, e a lista de convidados não vai para a IA.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarModelo, lerJsonDaIa } from "@/lib/ia-provedor";
import { estadoDaIa, reservarIa } from "@/lib/ia-ajustes";
import { criarTrabalho } from "@/lib/ia-trabalhos";
import { redigirParaExtracao } from "@/lib/contrato-extracao-core";
import { tem } from "@/lib/capacidades";
import {
  TETO_TEXTO_RESPOSTAS,
  instrucaoDasRespostas,
  pacoteDasRespostas,
  respostasLidas,
  trocarTelefonesPorNomes,
} from "@/lib/ia-rsvp";
import { lerListaParaCasar } from "@/lib/supabase/ia-rsvp-dados";

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

  const corpo = (await req.json().catch(() => null)) as { eventId?: string; texto?: string } | null;
  const eventId = corpo?.eventId ?? "";
  const texto = (corpo?.texto ?? "").trim().slice(0, TETO_TEXTO_RESPOSTAS);
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Evento não informado." }, { status: 400 });
  if (texto.length < 8) return NextResponse.json({ error: "Cole ou grave as respostas." }, { status: 400 });

  const { data: podeEditar } = await supabase.rpc("pode_editar_evento", { p_event_id: eventId });
  if (podeEditar !== true) return NextResponse.json({ error: "Você não pode mudar este evento." }, { status: 403 });

  const { data: ev } = await supabase.from("events").select("id, type, name, date, clients(name)").eq("id", eventId).maybeSingle();
  if (!ev || !tem(ev.type, "listaNominal")) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  const lista = await lerListaParaCasar(supabase, eventId);
  if (!lista.length) return NextResponse.json({ error: "A lista de convidados está vazia." }, { status: 422 });

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

  // o número de quem mandou vira o nome do convidado; o resto dos
  // contatos sai antes de o texto deixar o servidor
  const { texto: seguro } = redigirParaExtracao(trocarTelefonesPorNomes(texto, lista));
  const cliente = (ev.clients as unknown as { name?: string } | null)?.name ?? null;
  const r = await chamarModelo({
    rota: "rsvp_respostas",
    userId: user.id,
    maxTokens: 6000,
    mensagens: [
      { role: "system", content: instrucaoDasRespostas({ nome: ev.name || cliente || "o evento", data: ev.date }) },
      { role: "user", content: `=== RESPOSTAS ===\n${seguro}\n=== FIM DAS RESPOSTAS ===` },
    ],
  });
  if (!r.ok) {
    await reserva.devolver();
    if (r.motivo === "cortada") {
      return NextResponse.json({ error: "São respostas demais para ler de uma vez. Cole em duas partes." }, { status: 422 });
    }
    return NextResponse.json({ error: "A leitura não respondeu agora. Tente de novo em instantes." }, { status: 502 });
  }
  const json = lerJsonDaIa(r.conteudo);
  if (json === null) return NextResponse.json({ error: "A leitura voltou bagunçada. Tente de novo." }, { status: 502 });

  const pacote = pacoteDasRespostas(respostasLidas(json), lista);
  if (!pacote.itens.length) {
    return NextResponse.json(
      { error: pacote.iguais ? "Essas respostas já estavam na lista." : "Não encontrei nenhuma resposta nesse texto." },
      { status: 422 }
    );
  }
  const trabalhoId = await criarTrabalho({
    empresaId: estado.empresaId,
    eventId,
    userId: user.id,
    tipo: "respostas_rsvp",
    pacote,
  });
  if (!trabalhoId) return NextResponse.json({ error: "Não foi possível guardar a proposta. Tente de novo." }, { status: 500 });
  return NextResponse.json({ trabalhoId, pacote });
}
