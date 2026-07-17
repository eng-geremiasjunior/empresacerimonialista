"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import {
  removeEventCover,
  uploadEventCover,
} from "@/lib/event-cover";

export function CapaEventoUpload({
  eventId,
  atual,
}: {
  eventId: string;
  atual: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(atual);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    setEnviando(true);
    const r = await uploadEventCover(eventId, file);
    setEnviando(false);
    if (r.error) {
      setErro(r.error);
      return;
    }
    setUrl(r.url ?? null);
    router.refresh();
  }

  async function remover() {
    setEnviando(true);
    await removeEventCover(eventId);
    setEnviando(false);
    setUrl(null);
    router.refresh();
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700">
        Foto de capa{" "}
        <span className="font-normal text-stone-400">(opcional)</span>
      </label>
      <div className="flex items-center gap-4">
        <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Capa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-stone-300">
              <ImageIcon size={24} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-400 disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {url ? "Trocar foto" : "Enviar foto"}
          </button>
          {url && !enviando && (
            <button
              type="button"
              onClick={remover}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-red-600"
            >
              <Trash2 size={13} /> Remover
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={escolher}
          className="hidden"
        />
      </div>
      {erro && <p className="mt-1 text-sm text-rose-600">{erro}</p>}
    </div>
  );
}
