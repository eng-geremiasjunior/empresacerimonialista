"use client";

// Grava, neste navegador, o último evento aberto e a última tela usada
// dentro dele (29/09/2026): são os dois primeiros blocos do painel de quem
// já tem evento (AreasDoPainel). Só nome, data e foto — nada que não
// esteja na própria tela.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rotuloDaTela, segmentoDoCaminho } from "@/lib/fases-do-evento";
import { fotoDoTipo } from "@/lib/fotos-de-evento";
import { CHAVE_ULTIMA_TELA, CHAVE_ULTIMO_EVENTO, gravar } from "@/lib/ultima-tela";

export function LembrarEvento({
  eventId,
  titulo,
  data,
  capa,
  tipo,
}: {
  eventId: string;
  titulo: string;
  /** "30/09/2026" */
  data: string;
  capa: string | null;
  tipo: string;
}) {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (!pathname.startsWith(`/eventos/${eventId}`)) return;
    const doTipo = fotoDoTipo(tipo);
    const foto = capa
      ? { foto: capa, posicao: "50% 50%", externa: /^https?:\/\//.test(capa) }
      : { foto: doTipo.src, posicao: doTipo.posicao, externa: false };
    gravar(CHAVE_ULTIMO_EVENTO, { id: eventId, titulo, data, ...foto });
    const tela = rotuloDaTela(segmentoDoCaminho(pathname, eventId));
    if (tela) gravar(CHAVE_ULTIMA_TELA, { href: pathname, titulo: tela, detalhe: titulo, ...foto });
  }, [pathname, eventId, titulo, data, capa, tipo]);

  return null;
}
