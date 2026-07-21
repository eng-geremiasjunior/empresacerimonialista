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
export const dynamic = 'force-dynamic';

const AFIRMATIVAS = ['sim', 'confirmado', 'confirmo', 'confirmar', 'ok'];
const NEGATIVAS = ['nao', 'não', 'recuso', 'não poderei', 'nao poderei'];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'vela_teste_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verificado com sucesso!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  let payload: unknown = null;

  try {
    payload = await req.json();
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
