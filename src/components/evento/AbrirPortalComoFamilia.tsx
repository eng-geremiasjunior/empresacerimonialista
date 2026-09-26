"use client";

// O botão do dono do sistema (só aparece para ele, só em conta da casa):
// libera o acesso de responsável e abre o portal numa aba nova, já logado.

import { useState, useTransition } from "react";
import { abrirPortalComoFamilia } from "@/app/(app)/eventos/[id]/area-do-cliente/portal-dono-actions";

export function AbrirPortalComoFamilia({ eventId }: { eventId: string }) {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  function abrir() {
    setAviso(null);
    // a aba abre já no clique (o navegador bloqueia janela aberta depois de espera)
    const aba = window.open("about:blank", "_blank");
    iniciar(async () => {
      const r = await abrirPortalComoFamilia(eventId);
      if ("error" in r) {
        aba?.close();
        setAviso(r.error);
        return;
      }
      if (aba) aba.location.href = r.url;
      else window.location.href = r.url;
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={abrir}
        disabled={pendente}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#6E3F5F] px-3 py-2 text-sm font-medium text-white hover:bg-[#5a3350] disabled:opacity-60"
      >
        {pendente ? "Abrindo…" : "Abrir o portal como a família"}
      </button>
      <span className="text-xs text-gray-500">só você vê · conta da casa</span>
      {aviso && <span className="w-full text-sm text-red-700">{aviso}</span>}
    </div>
  );
}
