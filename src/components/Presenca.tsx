"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SINAL_A_CADA_MS, areaDaRota } from "@/lib/presenca";

/**
 * O sinal de "estou aqui" que alimenta o "ao vivo" do painel do dono
 * (123, seção 5). Manda só o nome da área (lib/presenca.ts), nunca o que
 * está na tela. Com a aba escondida, fica calado: quem deixou o sistema
 * aberto e foi embora aparece offline em dois minutos e meio.
 *
 * Falhar aqui não pode incomodar ninguém: sem a migração, ou sem rede, a
 * chamada some em silêncio.
 */
export function Presenca() {
  const pathname = usePathname();
  const area = areaDaRota(pathname ?? "");
  const areaAtual = useRef(area);
  areaAtual.current = area;
  const cliente = useRef<ReturnType<typeof createClient> | null>(null);

  const enviar = useCallback((abriu: boolean) => {
    if (document.visibilityState !== "visible") return;
    cliente.current ??= createClient();
    Promise.resolve(
      cliente.current.rpc("registrar_presenca", {
        p_area: areaAtual.current,
        p_abriu: abriu,
      })
    ).catch(() => undefined);
  }, []);

  // abriu uma área
  useEffect(() => {
    enviar(true);
  }, [area, enviar]);

  // o sinal de vida; ao voltar para a aba, sai na hora
  useEffect(() => {
    const relogio = window.setInterval(() => enviar(false), SINAL_A_CADA_MS);
    const aoVoltar = () => enviar(false);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [enviar]);

  return null;
}
