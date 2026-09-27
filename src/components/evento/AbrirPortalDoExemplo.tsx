"use client";

// "Ver como a família vê" (27/09/2026): abre o portal do evento de exemplo
// numa aba nova, já logada, como a cliente vê. Serve à faixa do exemplo e
// ao bloco "Conheça por dentro" (painel e Ajuda).

import { useState, useTransition, type ReactNode } from "react";
import { abrirPortalDoExemplo } from "@/app/(app)/eventos/exemplo-actions";

export function AbrirPortalDoExemplo({
  modelo,
  className,
  rotulo,
  children,
  aoAbrir,
  envolver,
}: {
  modelo: "casamento" | "debutante";
  className?: string;
  rotulo?: string;
  children?: ReactNode;
  aoAbrir?: () => void;
  /** num grid, o aviso de erro fica junto do botão, dentro desta caixa */
  envolver?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  function abrir() {
    setAviso(null);
    // a aba abre já no clique (o navegador bloqueia janela aberta depois de espera)
    const aba = window.open("about:blank", "_blank");
    iniciar(async () => {
      const r = await abrirPortalDoExemplo(modelo);
      if ("error" in r) {
        aba?.close();
        setAviso(r.error);
        return;
      }
      aoAbrir?.();
      if (aba) aba.location.href = r.url;
      else window.location.href = r.url;
    });
  }

  const miolo = (
    <>
      <button type="button" onClick={abrir} disabled={pendente} className={className} aria-busy={pendente}>
        {children ?? (pendente ? "Abrindo…" : rotulo)}
      </button>
      {aviso ? <span className="w-full text-xs text-red-700">{aviso}</span> : null}
    </>
  );
  return envolver ? <div className={envolver}>{miolo}</div> : miolo;
}
