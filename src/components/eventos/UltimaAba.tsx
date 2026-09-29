"use client";

// Última aba lembrada (Modelo A): o navegador guarda a fase e a aba
// abertas de cada evento. Quem volta ao evento cai onde parou.
//
// Guarda o segmento da rota em localStorage (`eorg-ultima-aba:<id>`) a
// cada navegação dentro do evento. Ao ENTRAR em /eventos/<id> vindo de
// fora (primeira montagem deste layout), redireciona para o que estava
// guardado. Clicar em "Visão geral" por dentro do evento NÃO redireciona
// — a navegação interna só grava "" e a pessoa fica no Resumo.

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { chaveDaUltimaAba, segmentoDoCaminho } from "@/lib/fases-do-evento";

// Rotas que não valem como "onde parou": editar é um formulário, e o
// modo evento é tela cheia própria.
const NAO_LEMBRAR = new Set(["editar", "modo-evento"]);

export function UltimaAba({ eventId }: { eventId: string }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const anterior = useRef<string | null>(null);

  useEffect(() => {
    const base = `/eventos/${eventId}`;
    if (!pathname.startsWith(base)) return;
    const seg = segmentoDoCaminho(pathname, eventId);
    const chave = chaveDaUltimaAba(eventId);
    const primeiraVez = anterior.current === null;
    anterior.current = pathname;

    // voltando do Google Agenda (?google=), ela tem de ver o recado na
    // Visão geral — não ser levada para a última aba
    const voltaDoGoogle = /[?&]google=/.test(window.location.search);
    if (pathname === base && primeiraVez && !voltaDoGoogle) {
      let guardada: string | null = null;
      try {
        guardada = localStorage.getItem(chave);
      } catch {
        /* navegação privada: sem memória, sem erro */
      }
      if (guardada && guardada !== "" && !NAO_LEMBRAR.has(guardada)) {
        router.replace(`${base}/${guardada}`);
        return;
      }
    }
    if (NAO_LEMBRAR.has(seg)) return;
    try {
      localStorage.setItem(chave, seg);
    } catch {
      /* idem */
    }
  }, [pathname, eventId, router]);

  return null;
}
