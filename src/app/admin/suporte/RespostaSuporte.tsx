"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { responderSuporte } from "@/app/admin/actions";

/** A resposta, e o refresh que traz mensagem nova sem recarregar à mão. */
export function RespostaSuporte({ userId }: { userId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, comecar] = useTransition();

  // A cliente pode estar escrevendo agora: a conversa se atualiza sozinha
  // enquanto a aba está à vista.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 20_000);
    return () => clearInterval(id);
  }, [router]);

  function enviar() {
    const t = texto.trim();
    if (!t) return;
    setErro(null);
    comecar(async () => {
      const r = await responderSuporte(userId, t);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setTexto("");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-stone-100 px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) enviar();
          }}
          rows={2}
          maxLength={2000}
          placeholder="Sua resposta — ela vê na caixinha do sistema"
          className="min-h-[44px] flex-1 resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-30"
        >
          {enviando ? "Enviando…" : "Responder"}
        </button>
      </div>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
