import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  adminClient,
  buscarUnicaConfirmacaoPendentePorTelefone,
  extrairMensagem,
  notificarCerimonialistaMensagemNaoProcessada,
} from '@/lib/whatsapp-webhook';
import { enviarMensagemWhatsapp } from '@/lib/whatsapp';

// O webhook é chamado pela Meta (sem sessão). O bypass em src/middleware.ts
// mantém esta rota pública — não alterar.
//
// "Sem sessão" NÃO quer dizer "sem autenticação". Quem prova que a
// requisição veio da Meta é a assinatura HMAC no header
// x-hub-signature-256, calculada com o App Secret do aplicativo.
//
// Sem essa conferência esta rota era uma máquina de enviar WhatsApp na
// conta do dono: bastava um POST com um button_reply de id inválido para
// cair no caminho de erro da linha ~116, que responde ao número que veio
// no PRÓPRIO corpo da requisição. Num laço, envio ilimitado para qualquer
// número, no custo dele e com risco de a Meta suspender o número. Também
// dava para confirmar presença em nome de um fornecedor (bastava mandar
// "sim" com o telefone dele) e injetar texto no sino da cerimonialista.
export const dynamic = 'force-dynamic';

const AFIRMATIVAS = ['sim', 'confirmado', 'confirmo', 'confirmar', 'ok'];
const NEGATIVAS = ['nao', 'não', 'recuso', 'não poderei', 'nao poderei'];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Sem token no ambiente, recusa — mesma postura das rotas de cron. O
  // literal que estava aqui como padrão sobrevivia a um deploy sem a
  // variável e deixava qualquer um assinar o webhook.
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) {
    console.error('[vela:webhook] WHATSAPP_VERIFY_TOKEN ausente');
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

/**
 * A requisição veio mesmo da Meta?
 *
 * Assinatura HMAC-SHA256 do corpo CRU com o App Secret, no header
 * x-hub-signature-256, no formato `sha256=<hex>`. Precisa ser calculada
 * sobre o texto exato recebido — por isso o corpo é lido com .text() e só
 * depois vira JSON.
 */
function assinaturaConfere(raw: string, cabecalho: string | null): boolean {
  const segredo = process.env.META_APP_SECRET;
  if (!segredo || !cabecalho) return false;

  const recebida = cabecalho.startsWith('sha256=') ? cabecalho.slice(7) : cabecalho;
  const esperada = createHmac('sha256', segredo).update(raw, 'utf8').digest('hex');

  const a = Buffer.from(recebida, 'hex');
  const b = Buffer.from(esperada, 'hex');
  // timingSafeEqual exige o mesmo tamanho; comprimento diferente já é falha
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  let payload: unknown = null;

  // Fail closed: sem o segredo configurado, ninguém entra. Preferir recusar
  // a processar às cegas — a Meta reenvia, e o custo de um webhook parado é
  // menor que o de um aberto.
  if (!process.env.META_APP_SECRET) {
    console.error('[vela:webhook] META_APP_SECRET ausente — POST recusado');
    return new NextResponse('Forbidden', { status: 403 });
  }

  const raw = await req.text();
  if (!assinaturaConfere(raw, req.headers.get('x-hub-signature-256'))) {
    console.error('[vela:webhook] assinatura inválida');
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    payload = JSON.parse(raw);
    const msg = extrairMensagem(payload);
    const admin = adminClient();

    // Sem service role não há como processar; registra e sai em 200 para
    // a Meta não ficar reenviando.
    if (!admin) {
      console.error('Webhook WhatsApp: SUPABASE_SERVICE_ROLE_KEY ausente');
      return NextResponse.json({ status: 'ok', processado: false }, { status: 200 });
    }

    // Nada reconhecível (ex.: evento de sistema): só audita.
    if (!msg) {
      await admin.from('whatsapp_messages_log').insert({
        from_phone: 'desconhecido',
        message_type: 'outro',
        raw_payload: payload,
        processado: false,
        resultado: 'payload sem mensagem reconhecível',
      });
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // Descarte por idade, aproveitando a visita: o payload cru guarda
    // telefone e mensagem, e só serve para depurar por alguns dias.
    // Fire-and-forget — a limpeza nunca atrasa a resposta à Meta.
    void admin
      .from('whatsapp_messages_log')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
      .then(({ error }) => {
        if (error) console.error('[vela:webhook] descarte do log:', error.message);
      });

    // Auditoria: guarda tudo que chega, processado ou não.
    const { data: logRow } = await admin
      .from('whatsapp_messages_log')
      .insert({
        from_phone: msg.from || 'desconhecido',
        message_type: msg.type,
        raw_payload: payload,
        processado: false,
      })
      .select('id')
      .single();

    const finalizar = async (processado: boolean, resultado: string) => {
      if (logRow?.id) {
        await admin
          .from('whatsapp_messages_log')
          .update({ processado, resultado })
          .eq('id', logRow.id);
      }
      return NextResponse.json({ status: 'ok', processado }, { status: 200 });
    };

    // Recibos de entrega/leitura: nada a fazer.
    if (msg.type === 'status') {
      return finalizar(false, 'recibo de entrega/leitura ignorado');
    }

    // ---- CASO 1: resposta por BOTÃO (fluxo principal, sem ambiguidade) ----
    if (msg.type === 'button_reply' && msg.buttonId) {
      const id = msg.buttonId;

      // Escolha de horário do Secretário: id = agsl_<hash64>_<slotId>.
      // O hash tem exatamente 64 hex; o resto é o id do slot. A RPC
      // revalida a vaga na hora (a Agenda pode ter mudado desde o envio).
      if (id.startsWith('agsl_')) {
        const resto = id.slice(5);
        const hash = resto.slice(0, 64);
        const slotId = resto.slice(65);

        const { data, error } = await admin.rpc('escolher_horario_convite', {
          p_hash: hash,
          p_slot_id: slotId,
        });

        const resp = data as {
          success?: boolean;
          error?: string;
          data?: string;
          hora?: string;
        } | null;
        const falha = error?.message ?? resp?.error;

        if (falha) {
          // O motivo técnico fica com a cerimonialista; ao fornecedor vai
          // uma frase neutra — mensagem de erro do banco no WhatsApp de
          // terceiro é vazamento de detalhe interno.
          await enviarMensagemWhatsapp(
            msg.from,
            "Não foi possível registrar sua escolha. A cerimonialista já foi avisada e vai te retornar."
          );
          if (error) {
            await notificarCerimonialistaMensagemNaoProcessada(
              admin,
              msg.from,
              `Escolha de horário não processada (hash ${hash.slice(0, 8)}…): ${falha}`
            );
          }
          return finalizar(false, `escolha de horário falhou: ${falha}`);
        }

        const [a, m, d] = String(resp?.data ?? '').split('-');
        await enviarMensagemWhatsapp(
          msg.from,
          `Agendado! ${d}/${m}/${a} às ${String(resp?.hora ?? '').slice(0, 5)}. Obrigado!`
        );
        return finalizar(true, `horário escolhido via lista (hash ${hash.slice(0, 8)}…)`);
      }

      // Compromisso da Agenda: id = compromisso_confirmar_<hash> / _recusar_.
      // O hash vem do botão; nunca interpretamos texto livre.
      if (
        id.startsWith('compromisso_confirmar_') ||
        id.startsWith('compromisso_recusar_')
      ) {
        const confirmou = id.startsWith('compromisso_confirmar_');
        const hash = id.replace(
          confirmou ? 'compromisso_confirmar_' : 'compromisso_recusar_',
          ''
        );
        const status = confirmou ? 'confirmado' : 'cancelado';

        const { data, error } = await admin.rpc('responder_compromisso', {
          p_hash: hash,
          p_status: status,
        });

        // Ambiguidade (hash não bate): não adivinhar. Registra e avisa a
        // cerimonialista para resolução manual.
        const falha = error?.message ?? (data as { error?: string })?.error;
        if (falha) {
          const resultado = await notificarCerimonialistaMensagemNaoProcessada(
            admin,
            msg.from,
            `Botão de compromisso não resolvido (hash ${hash.slice(0, 8)}…): ${falha}`
          );
          return finalizar(false, `responder_compromisso falhou: ${falha} — ${resultado}`);
        }

        await enviarMensagemWhatsapp(
          msg.from,
          confirmou
            ? 'Presença confirmada! Obrigado.'
            : 'Ok, registramos que não poderá comparecer.'
        );

        return finalizar(
          true,
          `compromisso ${status} via botão (hash ${hash.slice(0, 8)}…)`
        );
      }

      if (id.startsWith('confirmar_hash_') || id.startsWith('recusar_hash_')) {
        const hash = id.split('_hash_')[1];
        const status = id.startsWith('confirmar_') ? 'confirmado' : 'recusado';

        const { data, error } = await admin.rpc('responder_confirmacao', {
          p_hash: hash,
          p_status: status,
        });

        const falha = error?.message ?? (data as { error?: string })?.error;
        if (falha) {
          return finalizar(false, `responder_confirmacao falhou: ${falha}`);
        }

        await enviarMensagemWhatsapp(
          msg.from,
          status === 'confirmado'
            ? 'Presença confirmada! Obrigado.'
            : 'Ok, registramos que não poderá comparecer.'
        );

        return finalizar(true, `confirmação ${status} via botão (hash ${hash.slice(0, 8)}…)`);
      }

      return finalizar(false, `botão não reconhecido: ${id}`);
    }

    // ---- CASO 2: TEXTO LIVRE (só age quando não há ambiguidade) ----
    if (msg.type === 'text') {
      const texto = (msg.text ?? '').toLowerCase().trim();
      const afirmativa = AFIRMATIVAS.includes(texto);
      const negativa = NEGATIVAS.includes(texto);

      if (afirmativa || negativa) {
        const pendencia = await buscarUnicaConfirmacaoPendentePorTelefone(
          admin,
          msg.from
        );

        if (pendencia) {
          const status = afirmativa ? 'confirmado' : 'recusado';
          const { data, error } = await admin.rpc('responder_confirmacao', {
            p_hash: pendencia.hash,
            p_status: status,
          });

          const falha = error?.message ?? (data as { error?: string })?.error;
          if (falha) {
            return finalizar(false, `responder_confirmacao falhou: ${falha}`);
          }

          await enviarMensagemWhatsapp(
            msg.from,
            status === 'confirmado'
              ? 'Presença confirmada! Obrigado.'
              : 'Ok, registramos que não poderá comparecer.'
          );

          return finalizar(
            true,
            `confirmação ${status} por texto (${pendencia.supplierName})`
          );
        }

        // Zero ou mais de uma pendência: não arriscar o evento errado.
        const resultado = await notificarCerimonialistaMensagemNaoProcessada(
          admin,
          msg.from,
          msg.text ?? ''
        );
        return finalizar(false, `sem pendência única — ${resultado}`);
      }

      const resultado = await notificarCerimonialistaMensagemNaoProcessada(
        admin,
        msg.from,
        msg.text ?? ''
      );
      return finalizar(false, `texto livre — ${resultado}`);
    }

    return finalizar(false, `tipo de mensagem sem tratamento: ${msg.type}`);
  } catch (error) {
    // Nunca devolver 5xx para a Meta: ela reenviaria em loop. Loga e aceita.
    console.error('Erro no webhook WhatsApp:', error);
    return NextResponse.json({ status: 'erro-registrado' }, { status: 200 });
  }
}
