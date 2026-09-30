"use client";

import { useEffect, useState, useTransition } from "react";
import { pedirParaOrganizar } from "./actions";

/** O pedido para organizar: a família confirma no portal (188). */
export function BotaoPedir({ token, quem }: { token: string; quem: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pendente, iniciar] = useTransition();

  if (enviado) {
    return (
      <p role="status" className="text-[15px] leading-relaxed text-[#2f3437]">
        Pedido enviado. Assim que {quem} confirmar, o evento entra na sua agenda e você recebe um aviso.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await pedirParaOrganizar(token);
            if ("error" in r) setErro(r.error);
            else setEnviado(true);
          })
        }
        className="h-12 w-full rounded-lg bg-[#2b2521] px-4 text-[15px] font-medium text-white hover:bg-black disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Pedir para organizar"}
      </button>
      {erro && (
        <p role="alert" className="text-sm text-[#9c5a4c]">
          {erro}
        </p>
      )}
    </div>
  );
}

/**
 * Sem sessão: guarda o convite por 7 dias. Depois de entrar ou de criar a
 * conta, a primeira tela da agenda devolve ela para cá (middleware).
 */
export function GuardarConvite({ token }: { token: string }) {
  useEffect(() => {
    try {
      const seguro = location.protocol === "https:" ? "; secure" : "";
      document.cookie = `eorg_convite=${token}; path=/; max-age=${7 * 24 * 3600}; samesite=lax${seguro}`;
    } catch {
      /* sem cookie, ela abre o link de novo */
    }
  }, [token]);
  return null;
}
