"use client";

// A tag do Google e o pixel da Meta, carregados SÓ onde podem.
//
// Este componente não decide nada sozinho: ele confere a rota contra a
// lista de permissão de lib/marketing.ts a cada navegação. Se a pessoa
// entrar por /login (medida) e navegar para o portal (não medida), os
// scripts param de registrar página — porque a rota deixou de ser
// permitida, não porque alguém lembrou de desligar.
//
// Sem os identificadores no ambiente, não renderiza nada: a tela abre
// igual, e o desenvolvimento não polui a conta de anúncio com visita de
// localhost.

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { idDoGoogle, idDoPixelMeta, telaDeMarketing } from "@/lib/marketing";

export function Medicao() {
  const pathname = usePathname();
  const ga = idDoGoogle();
  const pixel = idDoPixelMeta();
  const podeMedir = telaDeMarketing(pathname);
  // a primeira visita já é contada pelos próprios scripts; este efeito
  // cuida das navegações seguintes, que no App Router não recarregam a
  // página e passariam despercebidas
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (!podeMedir) return;
    try {
      if (ga) window.gtag?.("event", "page_view", { page_path: pathname });
      if (pixel) window.fbq?.("track", "PageView");
    } catch {
      /* bloqueador de anúncio: a tela não muda por causa disso */
    }
  }, [pathname, podeMedir, ga, pixel]);

  if (!podeMedir || (!ga && !pixel)) return null;

  return (
    <>
      {ga && (
        <>
          <Script
            id="ga-carregar"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
          />
          <Script id="ga-iniciar" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;
gtag('js',new Date());
gtag('config','${ga}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
