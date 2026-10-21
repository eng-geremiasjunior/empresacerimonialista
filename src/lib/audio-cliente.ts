// Áudio no NAVEGADOR (fase 3, 21/10/2026): o áudio gravado ali ou o
// arquivo do WhatsApp (.opus/.ogg, .m4a, .mp3) vira pedaços de até ~110 s
// em WAV 16 kHz mono — cada um cabe numa chamada da Vercel (até 4,5 MB)
// e o Whisper ouve bem nessa taxa. O áudio não sai do aparelho inteiro:
// só os pedaços, um por vez, para a transcrição, e nada fica guardado.

const TAXA = 16_000;
const SEGUNDOS_POR_PEDACO = 110;
const TETO_SEM_CONVERTER = 4_000_000;

export type PedacoDeAudio = { blob: Blob; segundos: number };

function wav(amostras: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + amostras.length * 2);
  const v = new DataView(buf);
  const escreve = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i));
  };
  escreve(0, "RIFF");
  v.setUint32(4, 36 + amostras.length * 2, true);
  escreve(8, "WAVE");
  escreve(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, TAXA, true);
  v.setUint32(28, TAXA * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  escreve(36, "data");
  v.setUint32(40, amostras.length * 2, true);
  for (let i = 0; i < amostras.length; i++) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Pedaços prontos para a transcrição. Se o navegador não souber abrir o
 * formato (ex.: .opus no Safari antigo), manda o arquivo como veio quando
 * ele couber numa chamada; senão, avisa.
 */
export async function pedacosDeAudio(arquivo: Blob): Promise<PedacoDeAudio[]> {
  const Contexto =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  try {
    if (!Contexto) throw new Error("sem AudioContext");
    const ctx = new Contexto();
    const original = await ctx.decodeAudioData(await arquivo.arrayBuffer());
    void ctx.close();
    // reamostra para 16 kHz mono
    const quadros = Math.ceil(original.duration * TAXA);
    const off = new OfflineAudioContext(1, quadros, TAXA);
    const fonte = off.createBufferSource();
    fonte.buffer = original;
    fonte.connect(off.destination);
    fonte.start();
    const mono = (await off.startRendering()).getChannelData(0);
    const passo = SEGUNDOS_POR_PEDACO * TAXA;
    const pedacos: PedacoDeAudio[] = [];
    for (let i = 0; i < mono.length; i += passo) {
      const parte = mono.subarray(i, Math.min(mono.length, i + passo));
      if (parte.length < TAXA / 2) continue; // menos de meio segundo: nada a ouvir
      pedacos.push({ blob: wav(parte), segundos: Math.ceil(parte.length / TAXA) });
    }
    return pedacos;
  } catch {
    if (arquivo.size <= TETO_SEM_CONVERTER) {
      return [{ blob: arquivo, segundos: Math.max(1, Math.ceil(arquivo.size / 4000)) }];
    }
    throw new Error("Este navegador não abre este áudio. Tente pelo computador ou grave aqui mesmo.");
  }
}
