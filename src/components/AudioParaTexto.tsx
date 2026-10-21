"use client";

// Gravar ou mandar um áudio e receber o texto (fase 3, 21/10/2026). Vai ao
// lado de uma caixa de texto: a transcrição entra na caixa, ela corrige e
// segue o fluxo de sempre. Pedaço por pedaço, com o andamento à vista; o
// áudio não é guardado. Só com o consentimento de quem fala.

import { useRef, useState } from "react";
import { Mic, Square, Upload } from "lucide-react";
import { MarcaDaIa } from "@/components/MarcaDaIa";
import { pedacosDeAudio } from "@/lib/audio-cliente";

const botao =
  "inline-flex items-center gap-1.5 rounded-[9px] border border-stone-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50";

export function AudioParaTexto({ onTexto }: { onTexto: (texto: string) => void }) {
  const arquivo = useRef<HTMLInputElement>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const [gravando, setGravando] = useState(false);
  const [andamento, setAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function transcrever(audio: Blob) {
    setErro(null);
    setAndamento("Preparando o áudio…");
    try {
      const pedacos = await pedacosDeAudio(audio);
      if (!pedacos.length) throw new Error("O áudio veio vazio.");
      const textos: string[] = [];
      for (let i = 0; i < pedacos.length; i++) {
        setAndamento(pedacos.length > 1 ? `Transcrevendo ${i + 1} de ${pedacos.length}…` : "Transcrevendo…");
        const forma = new FormData();
        forma.append("audio", pedacos[i].blob, pedacos[i].blob.type === "audio/wav" ? "pedaco.wav" : "audio");
        forma.append("segundos", String(pedacos[i].segundos));
        const r = await fetch("/api/ai/audio", { method: "POST", body: forma });
        const j = (await r.json().catch(() => ({}))) as { texto?: string; error?: string };
        if (!r.ok) throw new Error(j.error ?? "A transcrição não respondeu agora.");
        if (j.texto) textos.push(j.texto);
      }
      const texto = textos.join(" ").trim();
      if (!texto) throw new Error("Não consegui entender fala nesse áudio.");
      onTexto(texto);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível transcrever.");
    } finally {
      setAndamento(null);
    }
  }

  async function gravar() {
    setErro(null);
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const g = new MediaRecorder(fluxo);
      partes.current = [];
      g.ondataavailable = (e) => {
        if (e.data.size) partes.current.push(e.data);
      };
      g.onstop = () => {
        fluxo.getTracks().forEach((t) => t.stop());
        void transcrever(new Blob(partes.current, { type: g.mimeType || "audio/webm" }));
      };
      g.start();
      gravador.current = g;
      setGravando(true);
    } catch {
      setErro("O navegador não liberou o microfone.");
    }
  }

  function parar() {
    gravador.current?.stop();
    gravador.current = null;
    setGravando(false);
  }

  const ocupado = !!andamento;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-stone-500">
      <MarcaDaIa tamanho={12} titulo="Transcrição por inteligência artificial" />
      {gravando ? (
        <button type="button" onClick={parar} className={`${botao} border-rose-300 text-rose-700`}>
          <Square size={13} aria-hidden />
          Parar e transcrever
        </button>
      ) : (
        <button type="button" onClick={() => void gravar()} disabled={ocupado} className={botao}>
          <Mic size={13} aria-hidden />
          Gravar
        </button>
      )}
      <input
        ref={arquivo}
        type="file"
        accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav,.webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void transcrever(f);
        }}
      />
      <button type="button" onClick={() => arquivo.current?.click()} disabled={ocupado || gravando} className={botao}>
        <Upload size={13} aria-hidden />
        Mandar um áudio
      </button>
      <span>{andamento ?? (gravando ? "Gravando…" : "Grave só com o consentimento de quem fala.")}</span>
      {erro && <span className="w-full text-rose-600">{erro}</span>}
    </div>
  );
}
