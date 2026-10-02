"use client";

import { useEffect, useState } from "react";
import { ConviteAnimado, type DadosDoConvite } from "@/components/convite-digital/ConviteAnimado";
import { ehIdDeConvite, type IdDoConvite } from "@/components/convite-digital/catalogo";
import type { FotoDoConvite } from "@/components/convite-digital/motor/montar";
import { ehParDeFonte, type ParDeFonte } from "@/lib/site-pares";

type Config = {
  modelo: IdDoConvite;
  dados: DadosDoConvite;
  fonte: ParDeFonte | null;
  paleta: string | null;
  foto: FotoDoConvite;
};

const CAMPOS: (keyof DadosDoConvite)[] = [
  "nome1",
  "nome2",
  "modoNome",
  "dataISO",
  "siteUrl",
  "frase",
  "referencia",
  "local",
  "endereco",
  "cidade",
  "localRecepcao",
  "enderecoRecepcao",
  "pais1",
  "pais2",
  "formaAbertura",
];

/** A mensagem do editor do portal vem do mesmo endereço; o resto é ignorado. */
function lerMensagem(d: unknown): Config | null {
  if (!d || typeof d !== "object") return null;
  const m = d as Record<string, unknown>;
  if (m.tipo !== "convite-previa" || !ehIdDeConvite(m.modelo)) return null;
  const dados: DadosDoConvite = {};
  const brutos = (m.dados && typeof m.dados === "object" ? m.dados : {}) as Record<string, unknown>;
  for (const c of CAMPOS) {
    const v = brutos[c];
    if (typeof v === "string") dados[c] = v.slice(0, 400);
  }
  let foto: FotoDoConvite = null;
  const f = m.foto as Record<string, unknown> | null | undefined;
  if (f && typeof f.url === "string" && (/^https:\/\//.test(f.url) || f.url.startsWith("/"))) {
    foto = { url: f.url, posicao: typeof f.posicao === "string" ? f.posicao.slice(0, 40) : null };
  }
  return {
    modelo: m.modelo,
    dados,
    fonte: ehParDeFonte(m.fonte) ? m.fonte : null,
    paleta: typeof m.paleta === "string" && /^[a-z0-9-]{1,30}$/.test(m.paleta) ? m.paleta : null,
    foto,
  };
}

export function ConviteDeExemplo({
  modelo,
  fonte,
  paleta,
  forma,
  aoVivo,
}: {
  modelo: IdDoConvite;
  fonte: ParDeFonte | null;
  paleta: string | null;
  forma: string | null;
  aoVivo: boolean;
}) {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    if (!aoVivo) return;
    const ouvir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const c = lerMensagem(e.data);
      if (c) setConfig(c);
    };
    window.addEventListener("message", ouvir);
    if (window.parent !== window) {
      window.parent.postMessage({ tipo: "convite-previa-pronta" }, window.location.origin);
    }
    return () => window.removeEventListener("message", ouvir);
  }, [aoVivo]);

  if (aoVivo) {
    if (!config) return null;
    return (
      <ConviteAnimado
        modelo={config.modelo}
        dados={config.dados}
        fonte={config.fonte}
        paleta={config.paleta}
        foto={config.foto}
        previa
      />
    );
  }
  return (
    <ConviteAnimado
      modelo={modelo}
      dados={forma ? { formaAbertura: forma } : {}}
      fonte={fonte}
      paleta={paleta}
      previa
      exemplo
    />
  );
}
