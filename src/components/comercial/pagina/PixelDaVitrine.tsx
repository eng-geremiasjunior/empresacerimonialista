"use client";

// A permissão para o pixel da Meta da cerimonialista, na vitrine.
//
// A faixa aparece na primeira visita (ou quando a pessoa pede pelo link do
// rodapé) e some depois da escolha. "Permitir" e "Não permitir" têm o
// mesmo peso: recusar não pode dar mais trabalho que aceitar. A escolha
// fica guardada neste navegador, por vitrine. As regras do pixel moram em
// lib/comercial/pixel-vitrine.ts.

import { useEffect, useState } from "react";
import {
  EVENTO_PREFERENCIAS,
  gravarDecisao,
  lerDecisao,
  ligarPixel,
  pausarPixel,
  type DecisaoDoPixel,
} from "@/lib/comercial/pixel-vitrine";

export function PixelDaVitrine({
  pixelId,
  slug,
  nomeEmpresa,
  prefixo = "vt",
}: {
  pixelId: string;
  slug: string;
  nomeEmpresa: string;
  /** a folha do modelo: "vt" (Clássico) ou "cp" (Capítulos) */
  prefixo?: "vt" | "cp" | "cu";
}) {
  // nada no servidor nem no primeiro desenho: a escolha mora no navegador
  const [decisao, setDecisao] = useState<DecisaoDoPixel | null>(null);
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const salva = lerDecisao(slug);
    setDecisao(salva);
    setAberta(salva === null);
    const reabrir = () => setAberta(true);
    window.addEventListener(EVENTO_PREFERENCIAS, reabrir);
    return () => window.removeEventListener(EVENTO_PREFERENCIAS, reabrir);
  }, [slug]);

  useEffect(() => {
    if (decisao === "sim") ligarPixel(pixelId);
    else if (decisao === "nao") pausarPixel();
  }, [decisao, pixelId]);

  function decidir(nova: DecisaoDoPixel) {
    gravarDecisao(slug, nova);
    setDecisao(nova);
    setAberta(false);
  }

  if (!aberta) return null;

  return (
    <div className={`${prefixo}-consentimento`} role="region" aria-label="Permissão para o pixel da Meta">
      <p className={`${prefixo}-consentimento-texto`}>
        {nomeEmpresa} usa o pixel da Meta para medir os próprios anúncios. Ele só é ativado se
        você permitir.{" "}
        {/* página inteira nova: o pixel desta aba nunca acompanha a navegação
            para outra tela do sistema (onde pode morar o pixel do eOrganizei) */}
        <a href="/privacidade#vitrine">Saiba mais</a>
      </p>
      <div className={`${prefixo}-consentimento-botoes`}>
        <button type="button" className={`${prefixo}-consentimento-botao`} onClick={() => decidir("sim")}>
          Permitir
        </button>
        <button type="button" className={`${prefixo}-consentimento-botao`} onClick={() => decidir("nao")}>
          Não permitir
        </button>
      </div>
      {decisao && (
        <p className={`${prefixo}-consentimento-agora`}>
          Agora: {decisao === "sim" ? "permitido" : "não permitido"}.
        </p>
      )}
    </div>
  );
}

/** O link do rodapé que reabre a escolha. */
export function PreferenciasDoPixel({ prefixo = "vt" }: { prefixo?: "vt" | "cp" | "cu" }) {
  return (
    <button
      type="button"
      className={`${prefixo}-rodape-preferencias`}
      onClick={() => window.dispatchEvent(new Event(EVENTO_PREFERENCIAS))}
    >
      Pixel da Meta: permitir ou não
    </button>
  );
}
