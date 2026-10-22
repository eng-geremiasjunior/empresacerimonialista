// A lista bagunçada (C1 do plano do RSVP, 22/10/2026).
//
// Chega a lista colada; sai a lista em convites (nome, adultos, crianças,
// grupo, lado e o contato de volta), para a mesma conferência da
// importação de sempre. Nada é gravado aqui: quem grava é o "Adicionar à
// lista" dela (importarConvidados, que confere tudo de novo). Telefones e
// e-mails não vão para a IA, e o texto não é guardado.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarModelo, lerJsonDaIa } from "@/lib/ia-provedor";
import { estadoDaIa, reservarIa } from "@/lib/ia-ajustes";
import { redigirParaExtracao } from "@/lib/contrato-extracao-core";
import { tem } from "@/lib/capacidades";
import { TETO_TEXTO_LISTA, instrucaoDaLista, linhasDaIa, marcarContatos } from "@/lib/ia-lista-convidados";

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
  if (!estado.liberada) return NextResponse.json({ error: "Esta função ainda não está liberada para a sua conta." }, { status: 403 });

  const corpo = (await req.json().catch(() => null)) as { eventId?: string; texto?: string } | null;
  const eventId = corpo?.eventId ?? "";
  const texto = (corpo?.texto ?? "").trim().slice(0, TETO_TEXTO_LISTA);
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Evento não informado." }, { status: 400 });
  if (texto.length < 3) return NextResponse.json({ error: "Cole a lista." }, { status: 400 });

  const { data: podeEditar } = await supabase.rpc("pode_editar_evento", { p_event_id: eventId });
  if (podeEditar !== true) return NextResponse.json({ error: "Você não pode mudar este evento." }, { status: 403 });
  const { data: ev } = await supabase.from("events").select("type").eq("id", eventId).maybeSingle();
  if (!ev || !tem(ev.type, "listaNominal")) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

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

  const contatos = marcarContatos(texto);
  const { texto: seguro } = redigirParaExtracao(contatos.texto);
  const r = await chamarModelo({
    rota: "rsvp_lista",
    userId: user.id,
    maxTokens: 4500,
    mensagens: [
      { role: "system", content: instrucaoDaLista() },
      { role: "user", content: `=== LISTA ===\n${seguro}\n=== FIM DA LISTA ===` },
    ],
  });
  if (!r.ok) {
    await reserva.devolver();
    if (r.motivo === "cortada") {
      return NextResponse.json({ error: "A lista é longa demais para ler de uma vez. Cole em duas partes." }, { status: 422 });
    }
    return NextResponse.json({ error: "A leitura não respondeu agora. Tente de novo em instantes." }, { status: 502 });
  }
  const json = lerJsonDaIa(r.conteudo);
  if (json === null) return NextResponse.json({ error: "A leitura voltou bagunçada. Tente de novo." }, { status: 502 });

  const linhas = linhasDaIa(json, contatos);
  if (!linhas.length) return NextResponse.json({ error: "Não encontrei convidados nesse texto." }, { status: 422 });
  return NextResponse.json({ linhas });
}
