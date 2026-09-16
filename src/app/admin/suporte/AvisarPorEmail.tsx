"use client";

// "Avisar por e-mail" numa resposta que ficou sem aviso (as de antes de
// 16/09/2026) ou cujo envio falhou. Um clique manda a resposta por e-mail
// à pessoa; o dono decide caso a caso — o painel não reenvia sozinho.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { avisarRespostaPorEmail } from "@/app/admin/actions";

export function AvisarPorEmail({ mensagemId }: { mensagemId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, comecar] = useTransition();

  function avisar() {
    setErro(null);
    comecar(async () => {
      const r = await avisarRespostaPorEmail(mensagemId);
      if (r.error) {
        setErro(r.error);
        return;
      }
      if (r.aviso === "falhou") setErro(`O e-mail não saiu: ${r.falha}`);
      else if (r.aviso === "sem_email") setErro("A pessoa não tem e-mail no cadastro.");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={avisar}
        disabled={enviando}
        className="rounded-md border border-stone-300 bg-white px-2 py-0.5 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Avisar por e-mail"}
      </button>
      {erro && <span className="w-full text-red-600">{erro}</span>}
    </>
  );
}
