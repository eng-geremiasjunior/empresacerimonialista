// O vídeo da vitrine, no navegador: conferir antes de enviar, tirar a capa
// e enviar mostrando o andamento.
//
// Regras do dono (18/09/2026): até 30 MB, guardado como MP4, dentro da
// vitrine.
//
// Por que conferir a codificação e não só a extensão: o vídeo da câmera do
// iPhone vem em HEVC, que parte dos Android e dos computadores Windows não
// abre — ela veria o vídeo e a cliente não. O Reels baixado do Instagram
// vem em H.264, que abre em todo lugar. Não há conversão no servidor (seria
// um serviço pago à parte), então a porta é aqui. Quem decide é a
// codificação, não a extensão: o iPhone no modo "mais compatível" grava
// H.264 num .mov, e esse abre em todo lugar.
//
// O balde (vitrine-videos, 165) tem o mesmo teto de tamanho e de tipo: a
// tela avisa antes, o banco garante depois.

import type { SupabaseClient } from "@supabase/supabase-js";

export const VIDEO_MAX_MB = 30;
export const VIDEO_MAX_SEGUNDOS = 90;

const ERRO_FORMATO =
  "Este vídeo está num formato que nem todo celular abre. Baixe o seu Reels do Instagram e envie esse arquivo.";

/* ------------------------------------------------------------------ */
/* A codificação, lida no próprio arquivo                               */
/* ------------------------------------------------------------------ */

async function bytes(arquivo: Blob, inicio: number, fim: number): Promise<Uint8Array> {
  return new Uint8Array(await arquivo.slice(inicio, fim).arrayBuffer());
}

const tipoEm = (b: Uint8Array, i: number) =>
  String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

/** Onde está a caixa `moov` (o índice do MP4, que pode vir no fim). */
async function acharMoov(arquivo: Blob): Promise<[number, number] | null> {
  let pos = 0;
  for (let n = 0; n < 64 && pos + 8 <= arquivo.size; n++) {
    const h = await bytes(arquivo, pos, pos + 16);
    const dv = new DataView(h.buffer, h.byteOffset, h.byteLength);
    let tamanho = dv.getUint32(0);
    if (tamanho === 1 && h.length >= 16) tamanho = dv.getUint32(8) * 2 ** 32 + dv.getUint32(12);
    else if (tamanho === 0) tamanho = arquivo.size - pos;
    if (tamanho < 8) return null;
    if (tipoEm(h, 4) === "moov") return [pos, Math.min(pos + tamanho, arquivo.size)];
    pos += tamanho;
  }
  return null;
}

/**
 * A codificação do vídeo: o formato de cada faixa fica na caixa `stsd`.
 * "desconhecida" quando não deu para ler — aí o navegador decide.
 */
async function codificacao(arquivo: Blob): Promise<"h264" | "outra" | "desconhecida"> {
  try {
    const moov = await acharMoov(arquivo);
    if (!moov || moov[1] - moov[0] > 16 * 1024 * 1024) return "desconhecida";
    const b = await bytes(arquivo, moov[0], moov[1]);
    const formatos: string[] = [];
    for (let i = 0; i + 20 < b.length; i++) {
      // [tipo 'stsd'][versão 4][quantas 4][tamanho da 1ª 4][formato 4]
      if (b[i] === 0x73 && tipoEm(b, i) === "stsd") formatos.push(tipoEm(b, i + 16));
    }
    if (formatos.some((f) => f === "avc1" || f === "avc3")) return "h264";
    const outros = ["hvc1", "hev1", "dvh1", "dvhe", "av01", "vp09", "vp08", "mp4v"];
    if (formatos.some((f) => outros.includes(f))) return "outra";
    return "desconhecida";
  } catch {
    return "desconhecida";
  }
}

/* ------------------------------------------------------------------ */
/* Conferir e tirar a capa                                             */
/* ------------------------------------------------------------------ */

function abrirVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((ok, falha) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const desiste = setTimeout(() => falha(new Error("tempo")), 20000);
    v.onloadeddata = () => {
      clearTimeout(desiste);
      ok(v);
    };
    v.onerror = () => {
      clearTimeout(desiste);
      falha(new Error("video"));
    };
    v.src = url;
  });
}

/** Um quadro do começo do vídeo, em JPEG, com o lado maior até 1280 px. */
async function tirarCapa(v: HTMLVideoElement): Promise<Blob | null> {
  try {
    const alvo = Math.min(1, v.duration / 3);
    await new Promise<void>((ok) => {
      const pronto = setTimeout(ok, 5000);
      v.onseeked = () => {
        clearTimeout(pronto);
        ok();
      };
      v.currentTime = alvo;
    });
    const escala = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * escala);
    canvas.height = Math.round(v.videoHeight * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width || !canvas.height) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return await new Promise((ok) => canvas.toBlob((b) => ok(b), "image/jpeg", 0.82));
  } catch {
    return null;
  }
}

function duracaoEmPalavras(s: number): string {
  const min = Math.floor(s / 60);
  const seg = Math.round(s % 60);
  return min ? `${min} min${seg ? ` ${seg} s` : ""}` : `${seg} s`;
}

export type VideoPronto = { capa: Blob | null };

/**
 * Confere o vídeo que ela escolheu (tamanho, formato, duração) e tira a
 * capa. A frase de erro diz o que fazer, não o que o sistema é.
 */
export async function conferirVideo(
  arquivo: File
): Promise<{ ok: true; video: VideoPronto } | { ok: false; erro: string }> {
  const nome = arquivo.name.toLowerCase();
  const ehMov = arquivo.type === "video/quicktime" || nome.endsWith(".mov");
  const ehMp4 = arquivo.type === "video/mp4" || nome.endsWith(".mp4") || nome.endsWith(".m4v");
  if (!ehMp4 && !ehMov) return { ok: false, erro: "Envie um vídeo do celular ou um Reels baixado do Instagram." };

  const mb = arquivo.size / (1024 * 1024);
  if (mb > VIDEO_MAX_MB) {
    return {
      ok: false,
      erro: `O vídeo tem ${Math.ceil(mb)} MB e o limite é ${VIDEO_MAX_MB} MB. Um Reels de até 1 minuto baixado do Instagram costuma caber.`,
    };
  }

  const cod = await codificacao(arquivo);
  if (cod === "outra" || (ehMov && cod !== "h264")) return { ok: false, erro: ERRO_FORMATO };

  const url = URL.createObjectURL(arquivo);
  try {
    let v: HTMLVideoElement;
    try {
      v = await abrirVideo(url);
    } catch {
      return { ok: false, erro: "Não foi possível abrir este vídeo. Tente outro arquivo." };
    }
    if (!Number.isFinite(v.duration) || v.duration > VIDEO_MAX_SEGUNDOS + 0.5) {
      return {
        ok: false,
        erro: Number.isFinite(v.duration)
          ? `O vídeo tem ${duracaoEmPalavras(v.duration)}. Envie um de até 1 minuto e meio.`
          : "Não foi possível abrir este vídeo. Tente outro arquivo.",
      };
    }
    if (!v.videoWidth || !v.videoHeight) {
      return { ok: false, erro: "Não foi possível abrir este vídeo. Tente outro arquivo." };
    }
    return {
      ok: true,
      video: { capa: await tirarCapa(v) },
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ------------------------------------------------------------------ */
/* Enviar                                                              */
/* ------------------------------------------------------------------ */

/**
 * O envio por endereço assinado, como a biblioteca do Supabase faz, mas
 * pelo XMLHttpRequest: é ele que conta o andamento (30 MB no 4G levam quase
 * um minuto, e "Enviando…" parado parece travado).
 */
function subirComAndamento(
  enderecoAssinado: string,
  arquivo: Blob,
  aoAndar: (porcento: number) => void
): Promise<boolean> {
  return new Promise((ok) => {
    const corpo = new FormData();
    corpo.append("cacheControl", "31536000");
    corpo.append("", arquivo, "video.mp4");
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", enderecoAssinado);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoAndar(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => ok(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => ok(false);
    xhr.send(corpo);
  });
}

/**
 * Sobe o vídeo (balde vitrine-videos) e a capa (balde de fotos), os dois
 * na pasta da empresa. Os endereços só valem para a vitrine quando ela
 * salvar; arquivo que sobrar é limpo no salvar seguinte.
 */
export async function enviarVideo(
  supabase: SupabaseClient,
  empresaId: string,
  arquivo: File,
  capa: Blob | null,
  aoAndar: (porcento: number) => void
): Promise<{ videoUrl: string; capaUrl: string | null } | null> {
  const id = crypto.randomUUID();
  const caminho = `${empresaId}/video-${id}.mp4`;
  const { data: assinado, error } = await supabase.storage
    .from("vitrine-videos")
    .createSignedUploadUrl(caminho);
  if (error || !assinado) return null;

  // o tipo vai explícito: seletor de arquivo do Android às vezes não diz
  const corpo = new Blob([arquivo], { type: "video/mp4" });
  if (!(await subirComAndamento(assinado.signedUrl, corpo, aoAndar))) return null;

  let capaUrl: string | null = null;
  if (capa) {
    const caminhoCapa = `${empresaId}/video-capa-${id}.jpg`;
    const { error: erroCapa } = await supabase.storage
      .from("portfolio-fotos")
      .upload(caminhoCapa, capa, { contentType: "image/jpeg", upsert: false });
    if (!erroCapa) {
      capaUrl = supabase.storage.from("portfolio-fotos").getPublicUrl(caminhoCapa).data.publicUrl;
    }
  }
  aoAndar(100);
  return {
    videoUrl: supabase.storage.from("vitrine-videos").getPublicUrl(caminho).data.publicUrl,
    capaUrl,
  };
}
