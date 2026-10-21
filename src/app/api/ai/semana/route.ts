// Preparar a semana do evento (T2 do plano "IA que trabalha", 21/10/2026).
//
// O código levanta o estado do evento (quem confirmou, os horários de cada
// fornecedor, o que falta da família, as parcelas) e monta o pacote; a IA
// só escreve as mensagens, e cada uma passa pela conferência de horário e
// data. Se a IA falhar, o pacote sai com os textos fixos — a tela funciona
// igual. Nada é enviado nem gravado aqui: as tarefas entram na confirmação
// dela (semana/ia-actions.ts); as mensagens, ela abre e manda uma a uma.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarModelo, lerJsonDaIa } from "@/lib/ia-provedor";
import { estadoDaIa, reservarIa } from "@/lib/ia-ajustes";
import { criarTrabalho } from "@/lib/ia-trabalhos";
import { publicBase } from "@/lib/app-url";
import { hojeBR } from "@/lib/tempo";
import { instrucaoDaSemana, mensagensDaSemana, tarefasDaSemana, type PacoteDaSemana } from "@/lib/ia-semana";
import { lerLevantamentoDaSemana } from "@/lib/supabase/ia-semana-dados";

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

  const corpo = (await req.json().catch(() => null)) as { eventId?: string } | null;
  const eventId = corpo?.eventId ?? "";
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Evento não informado." }, { status: 400 });

  const { data: podeEditar } = await supabase.rpc("pode_editar_evento", { p_event_id: eventId });
  if (podeEditar !== true) return NextResponse.json({ error: "Você não pode mudar este evento." }, { status: 403 });

  const hoje = hojeBR();
  const l = await lerLevantamentoDaSemana(supabase, eventId, publicBase(), hoje);
  if (!l) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  // a IA só entra se houver o que escrever; a cota só conta se ela entrar
  let json: unknown = null;
  const temTexto = l.fornecedores.length > 0 || l.daNoiva.length > 0 || l.rsvp.aguardando > 0 || l.parcelas.some((p) => p.tipo === "receber");
  if (temTexto) {
    const reserva = await reservarIa({ acoes: 1 });
    if (!reserva.ok && reserva.motivo === "cota") {
      return NextResponse.json({ error: "A cota de inteligência artificial deste mês acabou. Ela volta no dia 1º." }, { status: 403 });
    }
    if (reserva.ok) {
      const r = await chamarModelo({
        rota: "semana",
        userId: user.id,
        maxTokens: 5000,
        mensagens: [
          { role: "system", content: instrucaoDaSemana(l) },
          { role: "user", content: "Escreva as mensagens." },
        ],
      });
      if (r.ok) json = lerJsonDaIa(r.conteudo);
      else await reserva.devolver();
    }
  }

  const pacote: PacoteDaSemana = {
    mensagens: mensagensDaSemana(l, json),
    tarefas: tarefasDaSemana(l, hoje),
    parcelas: l.parcelas,
    rsvp: l.rsvp,
  };
  const trabalhoId = await criarTrabalho({
    empresaId: estado.empresaId,
    eventId,
    userId: user.id,
    tipo: "preparar_semana",
    pacote,
  });
  if (!trabalhoId) return NextResponse.json({ error: "Não foi possível guardar o pacote. Tente de novo." }, { status: 500 });
  return NextResponse.json({ trabalhoId, pacote });
}
