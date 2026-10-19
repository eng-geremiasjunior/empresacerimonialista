"use client";

// Quantos avisos do Comercial ela ainda não viu (19/10/2026). Conta no
// banco (RLS: só os avisos da própria usuária) e reconta:
//   * ao vivo, quando um aviso entra, muda ou sai (canal próprio; o do
//     sino continua só dele);
//   * quando ela volta para a aba;
//   * a cada 30 s, só com a aba à vista — o ao vivo pode demorar a
//     conectar, e a consulta vai direto ao banco (não gasta a Vercel);
//   * na hora, quando a tela das Oportunidades marca tudo como visto.

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_COMERCIAIS } from "@/lib/avisos-comerciais";

const EVENTO_VISTOS = "eorg:avisos-comerciais";
const A_CADA_MS = 30_000;

export function useAvisosComerciais(ligado = true) {
  const [quantos, setQuantos] = useState(0);

  const contar = useCallback(async () => {
    const { count, error } = await createClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .in("type", TIPOS_COMERCIAIS as unknown as string[])
      .is("read_at", null);
    if (!error) setQuantos(count ?? 0);
  }, []);

  useEffect(() => {
    if (!ligado) return;
    const supabase = createClient();
    void contar();
    const canal = supabase
      .channel("avisos-comerciais")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void contar())
      .subscribe();
    const seVisivel = () => {
      if (document.visibilityState === "visible") void contar();
    };
    const relogio = window.setInterval(seVisivel, A_CADA_MS);
    document.addEventListener("visibilitychange", seVisivel);
    window.addEventListener(EVENTO_VISTOS, contar);
    return () => {
      supabase.removeChannel(canal);
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", seVisivel);
      window.removeEventListener(EVENTO_VISTOS, contar);
    };
  }, [ligado, contar]);

  return quantos;
}

/** Abriu as Oportunidades: os avisos do Comercial contam como vistos. */
export async function marcarAvisosComerciaisComoVistos() {
  await createClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("type", TIPOS_COMERCIAIS as unknown as string[])
    .is("read_at", null);
  // o menu reconta na hora, sem esperar o ao vivo
  window.dispatchEvent(new Event(EVENTO_VISTOS));
}
