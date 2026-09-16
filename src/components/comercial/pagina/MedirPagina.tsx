"use client";

// A medição da página pública — só contadores do dia, sem pessoa.
//
// O que conta: a visita (uma vez por aba, depois de a página rodar no
// navegador — robô de prévia de link não executa nada e não entra), o
// toque no botão do WhatsApp e o toque no link do Instagram. O que NÃO
// conta: quem é a pessoa, se a mensagem foi enviada, quanto tempo ficou.
// Nada de cookie; a única memória é a da aba (sessionStorage), que some
// ao fechar.
//
// A casa não conta: quando quem abre é da própria empresa, a página já
// chega aqui com `contar = false`.
//
// A origem da visita (Instagram, Google, link direto, campanha) é lida
// UMA vez, na chegada, e guardada na aba: o toque e o formulário usam a
// mesma, para as contas do dia caírem na mesma linha.

import { useEffect } from "react";
import { chegadaDaVisita, type Chegada } from "@/lib/comercial/origem";
import { eventoDoPixel } from "@/lib/comercial/pixel-vitrine";

type Toque = "page_view" | "whatsapp_click" | "instagram_click";

const chaveChegada = (slug: string) => `eorg-chegada:${slug}`;
const chaveVisita = (slug: string) => `eorg-visita:${slug}`;

/** A chegada desta aba; lida da memória da aba ou calculada agora. */
export function chegadaDaAba(slug: string): Chegada {
  try {
    const guardada = sessionStorage.getItem(chaveChegada(slug));
    if (guardada) return JSON.parse(guardada) as Chegada;
  } catch {
    // aba sem armazenamento: calcula de novo, sem guardar
  }
  const nova = chegadaDaVisita(window.location.search, document.referrer, window.location.host);
  try {
    sessionStorage.setItem(chaveChegada(slug), JSON.stringify(nova));
  } catch {
    /* segue sem guardar */
  }
  return nova;
}

/**
 * Manda o toque ao banco e esquece. `keepalive` deixa a requisição
 * terminar mesmo se a pessoa sair da página no mesmo instante (o toque
 * no WhatsApp costuma abrir outro aplicativo).
 */
function registrar(slug: string, tipo: Toque) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return;
  const chegada = chegadaDaAba(slug);
  try {
    void fetch(`${url}/rest/v1/rpc/registrar_toque_pagina`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_ref: slug,
        p_tipo: tipo,
        p_origem: chegada.origem,
        p_campanha: chegada.campanha,
      }),
    }).catch(() => undefined);
  } catch {
    // medir nunca atrapalha a página
  }
}

/** A visita: uma por aba. */
export function MedirPagina({ slug, contar }: { slug: string; contar: boolean }) {
  useEffect(() => {
    // a chegada é lida sempre (o formulário precisa dela), a visita só
    // quando a página conta
    chegadaDaAba(slug);
    if (!contar) return;
    try {
      if (sessionStorage.getItem(chaveVisita(slug))) return;
      sessionStorage.setItem(chaveVisita(slug), "1");
    } catch {
      // sem armazenamento, conta assim mesmo: melhor um número um pouco
      // alto do que nenhum (a régua da 155)
    }
    registrar(slug, "page_view");
  }, [slug, contar]);

  return null;
}

/**
 * Um link que conta o toque. Conta TOQUE: se a conversa começou do outro
 * lado, o sistema não sabe, e a tela dela nunca diz que sabe.
 */
export function LinkMedido({
  href,
  slug,
  tipo,
  contar,
  className,
  children,
  rotulo,
  foco,
}: {
  href: string;
  slug: string;
  tipo: "whatsapp_click" | "instagram_click";
  contar: boolean;
  className?: string;
  children: React.ReactNode;
  rotulo?: string;
  /** tabIndex: -1 quando o link está numa barra escondida */
  foco?: number;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={rotulo}
      tabIndex={foco}
      className={className}
      onClick={() => {
        if (contar) registrar(slug, tipo);
        // o pixel dela, se a pessoa permitiu: toque, não mensagem enviada
        if (tipo === "whatsapp_click") eventoDoPixel("Contact");
      }}
    >
      {children}
    </a>
  );
}
