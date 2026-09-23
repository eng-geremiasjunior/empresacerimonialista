"use client";

// O banner no limite de eventos (23/09/2026): quem tenta criar um evento
// além do que o plano permite vê a tela de planos, em vez de um erro no
// fim do assistente. Vale para todos os planos. Só a proprietária assina;
// para os outros cargos, a frase diz a quem pedir.

import { useRouter } from "next/navigation";
import { PlanosBanner } from "./PlanosBanner";
import type { DadosDoBanner } from "@/lib/planos-banner";

export function BannerNoLimite({
  dados,
  planoAtual,
  mensagem,
  ehDona,
}: {
  dados: DadosDoBanner;
  planoAtual: string;
  mensagem: string;
  ehDona: boolean;
}) {
  const router = useRouter();
  return (
    <PlanosBanner
      dados={dados}
      modo="limite"
      planoAtual={planoAtual}
      mensagem={ehDona ? mensagem : `${mensagem} Peça à proprietária da conta para mudar de plano.`}
      onFechar={() => router.push("/eventos")}
      onEscolher={(codigo) => {
        if (codigo === "gratuito") {
          router.push("/eventos");
          return;
        }
        router.push(ehDona ? `/assinatura?plano=${codigo}` : "/eventos");
      }}
    />
  );
}
