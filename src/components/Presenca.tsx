"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SINAL_A_CADA_MS, areaDaRota } from "@/lib/presenca";

const EVENTO = "eorganizei:area";

/*
 * A área que a própria tela anuncia, mais fina que a rota. A assinatura é
 * uma rota só com três etapas, e "até onde ela chegou" mora nelas
 * (lib/etapas-da-assinatura.ts). Vale só enquanto a rota for a mesma em
 * que foi anunciada: saiu da tela, volta a valer o nome da rota.
 *
 * Fica fora do React de propósito: a tela pode anunciar antes deste
 * componente montar, e o primeiro sinal já tem de sair com a etapa.
 */
let anunciada: { caminho: string; area: string } | null = null;

/** A tela diz em que parte dela a pessoa está; null devolve à rota. */
export function anunciarArea(area: string | null) {
  anunciada = area ? { caminho: window.location.pathname, area } : null;
  window.dispatchEvent(new Event(EVENTO));
}

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
    const daTela =
      anunciada && anunciada.caminho === window.location.pathname ? anunciada.area : null;
    Promise.resolve(
      cliente.current.rpc("registrar_presenca", {
        p_area: daTela ?? areaAtual.current,
        p_abriu: abriu,
      })
    ).catch(() => undefined);
  }, []);

  // abriu uma área
  useEffect(() => {
    enviar(true);
  }, [area, enviar]);

  // a tela mudou de etapa sem mudar de rota: é uma área nova
  useEffect(() => {
    const aoAnunciar = () => enviar(true);
    window.addEventListener(EVENTO, aoAnunciar);
    return () => window.removeEventListener(EVENTO, aoAnunciar);
  }, [enviar]);

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
