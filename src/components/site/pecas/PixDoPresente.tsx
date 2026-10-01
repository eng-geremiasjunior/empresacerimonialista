"use client";

// O painel do Pix depois da escolha: o QR com o valor, o copia-e-cola e
// para quem vai o dinheiro. Sem visual próprio — cada modelo veste por
// classe (a barra fixa do T05, a folha do T03, o card do T01).
//
// O QR é desenhado aqui no navegador porque o valor nasce da escolha do
// convidado. A lib qrcode só é baixada quando o painel abre.

import { useEffect, useState } from "react";
import { formatarReais } from "@/lib/site-conteudo";
import "./pecas.css";

export type ClassesDoPix = {
  qr?: string;
  valor?: string;
  botao?: string;
  nota?: string;
  copiado?: string;
  trocar?: string;
};

export function PixDoPresente({
  codigo,
  valorCentavos,
  titular,
  copiado,
  aoCopiar,
  aoTrocar,
  className,
  classes = {},
}: {
  codigo: string;
  valorCentavos: number;
  titular: string | null;
  copiado: boolean;
  aoCopiar: () => void;
  /** "Escolher outro presente" */
  aoTrocar: () => void;
  className?: string;
  classes?: ClassesDoPix;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setSvg(null);
    import("qrcode")
      .then((q) =>
        // M, margem 1: o mesmo do QR da entrada (src/lib/qr.ts)
        q.toString(codigo, { type: "svg", errorCorrectionLevel: "M", margin: 1 })
      )
      .then((s) => vivo && setSvg(s), () => vivo && setSvg(null));
    return () => {
      vivo = false;
    };
  }, [codigo]);

  return (
    <div className={className}>
      <div
        className={`sm-pix-qr ${classes.qr ?? ""}`}
        role="img"
        aria-label="QR Code do Pix"
        // o SVG vem da lib, a partir do nosso próprio código Pix
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <p className={classes.valor}>{formatarReais(valorCentavos)}</p>
      <button type="button" className={classes.botao} onClick={aoCopiar}>
        Copiar código Pix
      </button>
      {titular && <p className={classes.nota}>O valor vai direto para {titular}</p>}
      <div aria-live="polite">
        {copiado && (
          <>
            <p className={classes.copiado}>Código copiado. Cole no app do seu banco.</p>
            <button type="button" className={classes.trocar} onClick={aoTrocar}>
              Escolher outro presente
            </button>
          </>
        )}
      </div>
    </div>
  );
}
