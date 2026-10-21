// Montar o roteiro do dia (T1 do plano "IA que trabalha", 21/10/2026).
//
// Chega o cronograma que ela já tem (texto, ou o texto do Word/PDF lido
// NO NAVEGADOR), ou nada — aí a IA monta pelo padrão dos eventos
// anteriores dela. Sai o PACOTE: o que entra, o que muda e o que pode
// sair do roteiro, já passado pela allowlist. Nada é gravado no roteiro
// aqui: quem grava é a confirmação dela (roteiro/ia-actions.ts).
//
// Só para quem tem a IA nova liberada (contas da casa, até o dono ligar
// "para todos"), e cada leitura conta na cota do mês.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chamarModelo, lerJsonDaIa } from "@/lib/ia-provedor";
import { estadoDaIa, reservarIa } from "@/lib/ia-ajustes";
import { criarTrabalho } from "@/lib/ia-trabalhos";
import { redigirParaExtracao } from "@/lib/contrato-extracao-core";
import {
  TETO_TEXTO_ROTEIRO,
  conflitosDoRoteiro,
  hhmm,
  instrucaoDoRoteiro,
  montarOperacoes,
  normalizarRoteiroLido,
} from "@/lib/ia-roteiro";
import {
  lerEventoDoRoteiro,
  lerFornecedoresDoRoteiro,
  lerItensDoRoteiro,
  lerPadraoDoRoteiro,
} from "@/lib/supabase/ia-roteiro-dados";
import { EVENT_TYPE_LABELS } from "@/lib/types";

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
  if (!UUID.test(eventId)) return NextResponse.json({ error: "Evento não informado." }, { status: 400 });
  const texto = (corpo?.texto ?? "").trim().slice(0, TETO_TEXTO_ROTEIRO);
  const comTexto = texto.length >= 10;

  // a RLS decide: evento que ela não vê não existe; que não edita, não muda
  const evento = await lerEventoDoRoteiro(supabase, eventId);
  if (!evento) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  const { data: podeEditar } = await supabase.rpc("pode_editar_evento", { p_event_id: eventId });
  if (podeEditar !== true) {
    return NextResponse.json({ error: "Você não pode mudar o roteiro deste evento." }, { status: 403 });
  }

  const [itens, fornecedores] = await Promise.all([
    lerItensDoRoteiro(supabase, eventId),
    lerFornecedoresDoRoteiro(supabase, eventId),
  ]);
  const cerimonia = hhmm(evento.time);
  let padrao: Awaited<ReturnType<typeof lerPadraoDoRoteiro>> = [];
  if (!comTexto) {
    if (!cerimonia) {
      return NextResponse.json(
        { error: "Para montar pelo seu padrão, informe a hora da cerimônia no evento." },
        { status: 422 }
      );
    }
    padrao = await lerPadraoDoRoteiro(supabase, evento);
    if (!padrao.length) {
      return NextResponse.json(
        { error: "Ainda não há outro evento seu deste tipo com roteiro. Cole o cronograma que você já tem." },
        { status: 422 }
      );
    }
  }

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
    rota: "roteiro",
    userId: user.id,
    mensagens: [
      {
        role: "system",
        content: instrucaoDoRoteiro({
          tipoEvento: EVENT_TYPE_LABELS[evento.type as keyof typeof EVENT_TYPE_LABELS] ?? evento.type,
          data: evento.date,
          horaCerimonia: cerimonia,
          local: evento.location,
          convidados: evento.guests,
          itens,
          fornecedores,
          padrao,
          comTexto,
        }),
      },
      {
        role: "user",
        content: comTexto ? `=== CRONOGRAMA ===\n${seguro}\n=== FIM DO CRONOGRAMA ===` : "Monte o dia pelo padrão dela.",
      },
    ],
  });
  if (!r.ok) {
    // a leitura não aconteceu: não conta na cota
    await reserva.devolver();
    return r.motivo === "sem_chave"
      ? NextResponse.json({ error: "A leitura está indisponível agora." }, { status: 503 })
      : NextResponse.json({ error: "A leitura não respondeu agora. Tente de novo em instantes." }, { status: 502 });
  }
  const json = lerJsonDaIa(r.conteudo);
  if (json === null) {
    return NextResponse.json({ error: "A leitura voltou bagunçada. Tente de novo." }, { status: 502 });
  }

  const lidos = normalizarRoteiroLido(json, itens.length, fornecedores.length, comTexto);
  if (!lidos.length) {
    return NextResponse.json({ error: "Não encontrei horários nesse texto." }, { status: 422 });
  }
  const operacoes = montarOperacoes(lidos, itens, fornecedores, comTexto);
  if (!operacoes.length) {
    return NextResponse.json({ trabalhoId: null, operacoes: [], conflitos: [], igual: true });
  }
  const conflitos = conflitosDoRoteiro(operacoes, itens, fornecedores);

  const trabalhoId = await criarTrabalho({
    empresaId: estado.empresaId,
    eventId,
    userId: user.id,
    tipo: "montar_roteiro",
    pacote: { operacoes, conflitos, comTexto },
  });
  if (!trabalhoId) {
    return NextResponse.json({ error: "Não foi possível guardar a proposta. Tente de novo." }, { status: 500 });
  }
  return NextResponse.json({ trabalhoId, operacoes, conflitos, igual: false });
}
