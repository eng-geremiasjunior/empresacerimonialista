"use client";

// A tela de planos a cada login de quem não paga (23/09/2026, pedido do
// dono): o login grava a marca `eorg-planos-ao-entrar` e este componente,
// no layout do app, abre o banner uma vez e apaga a marca. Fechar no X
// vale até o próximo login.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanosBanner } from "./PlanosBanner";
import { bannerAoEntrar } from "@/app/(app)/planos-actions";
import type { DadosDoBanner } from "@/lib/planos-banner";

export const MARCA_DO_LOGIN = "eorg-planos-ao-entrar";

export function BannerAoEntrar() {
  const router = useRouter();
  const [aberto, setAberto] = useState<{ dados: DadosDoBanner; planoAtual: string } | null>(null);

  useEffect(() => {
    let marcado = false;
    try {
      marcado = sessionStorage.getItem(MARCA_DO_LOGIN) === "1";
    } catch {
      /* sem armazenamento: não abre */
    }
    if (!marcado) return;
    // a marca só sai quando a resposta chega: em desenvolvimento o efeito
    // roda duas vezes, e apagar antes deixava as duas sem banner
    bannerAoEntrar().then((r) => {
      try {
        sessionStorage.removeItem(MARCA_DO_LOGIN);
      } catch {
        /* nada */
      }
      if (r) setAberto(r);
    });
  }, []);

  if (!aberto) return null;

  return (
    <PlanosBanner
      dados={aberto.dados}
      modo="login"
      planoAtual={aberto.planoAtual}
      onFechar={() => setAberto(null)}
      onEscolher={(codigo) => {
        setAberto(null);
        if (codigo !== "gratuito") router.push(`/assinatura?plano=${codigo}`);
      }}
    />
  );
}
