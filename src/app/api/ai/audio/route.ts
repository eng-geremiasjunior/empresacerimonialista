// Áudio → texto (fase 3 do plano "IA que trabalha", 21/10/2026).
//
// O navegador quebra o áudio em pedaços de até ~2 minutos (WAV 16 kHz
// mono, ~3,5 MB) e manda um por vez: o corpo de uma chamada da Vercel vai
// até 4,5 MB e 60 s. Aqui o pedaço passa pela memória e vai ao Whisper;
// o áudio NÃO é guardado. Cada segundo conta na cota de áudio do mês.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcreverAudio } from "@/lib/ia-provedor";
import { estadoDaIa, reservarIa } from "@/lib/ia-ajustes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TETO_BYTES = 4_300_000;

/** a duração lida do cabeçalho do WAV; null quando não é WAV */
function segundosDoWav(buf: ArrayBuffer): number | null {
  if (buf.byteLength < 44) return null;
  const v = new DataView(buf);
  const riff = String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3));
  if (riff !== "RIFF") return null;
  const taxa = v.getUint32(28, true); // bytes por segundo
  return taxa > 0 ? Math.ceil((buf.byteLength - 44) / taxa) : null;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (!(await estadoDaIa()).liberada) {
    return NextResponse.json({ error: "Esta função ainda não está liberada para a sua conta." }, { status: 403 });
  }

  const forma = await req.formData().catch(() => null);
  const arquivo = forma?.get("audio");
  if (!(arquivo instanceof Blob) || arquivo.size === 0) {
    return NextResponse.json({ error: "Nenhum áudio chegou." }, { status: 400 });
  }
  if (arquivo.size > TETO_BYTES) {
    return NextResponse.json({ error: "Este pedaço de áudio é grande demais." }, { status: 413 });
  }
  const buf = await arquivo.arrayBuffer();
  // a cota conta pelo áudio de verdade: no WAV, pelo cabeçalho; nos outros
  // formatos (pedaço que o navegador não conseguiu converter), pelo maior
  // entre o que o navegador disse e uma estimativa pelo tamanho
  const informados = Math.max(1, Math.min(600, Number(forma?.get("segundos")) || 0));
  const segundos = segundosDoWav(buf) ?? Math.max(informados, Math.ceil(arquivo.size / 4000));

  const reserva = await reservarIa({ acoes: 0, audioSeg: segundos });
  if (!reserva.ok) {
    return NextResponse.json(
      {
        error:
          reserva.motivo === "cota"
            ? "A cota de áudio deste mês acabou. Ela volta no dia 1º."
            : "Esta função ainda não está liberada para a sua conta.",
      },
      { status: 403 }
    );
  }

  const nome = (arquivo as File).name || (segundosDoWav(buf) ? "pedaco.wav" : "audio.ogg");
  const r = await transcreverAudio({ rota: "audio", userId: user.id, arquivo: new Blob([buf], { type: arquivo.type || "audio/wav" }), nome });
  if (!r.ok) {
    await reserva.devolver();
    return NextResponse.json(
      {
        error:
          r.motivo === "limite"
            ? "A transcrição recusou por limite agora. Espere um minuto e tente de novo."
            : "A transcrição não respondeu agora. Tente de novo.",
      },
      { status: r.motivo === "sem_chave" ? 503 : 502 }
    );
  }
  return NextResponse.json({ texto: r.conteudo, segundos });
}
