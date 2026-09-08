// A faixa de chamada para a ação, entre seções.
//
// A vendedora apontou que a página explica muito e chama pouco: entre o
// hero e a oferta havia oito seções sem um botão. Esta faixa entra nos
// pontos em que a leitora acabou de entender algo — e é uma só peça,
// para as três ocorrências terem a mesma cara e a página não virar
// feira. Quem decide se ela aparece é a página (só para quem pode
// assinar), com o mesmo critério dos botões que já existiam.

import type { ReactNode } from "react";

const TITULO = "var(--font-title, Inter, sans-serif)";

export type Acao = { href: string; rotulo: string };

export function Chamada({
  titulo,
  texto,
  primaria,
  secundaria,
}: {
  titulo: string;
  texto?: ReactNode;
  primaria: Acao;
  secundaria?: Acao;
}) {
  return (
    <section
      data-chamada="1"
      style={{
        marginTop: "clamp(56px,7vw,88px)",
        padding: "clamp(40px,5vw,56px) clamp(20px,4vw,28px)",
        background: "#F3EBF0",
        borderTop: "1px solid #E9DCE4",
        borderBottom: "1px solid #E9DCE4",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <p
          style={{
            margin: "0",
            fontFamily: TITULO,
            fontWeight: "600",
            fontSize: "clamp(22px,2.9vw,30px)",
            lineHeight: "1.18",
            letterSpacing: "-0.028em",
            color: "#221E1B",
            textWrap: "balance",
          }}
        >
          {titulo}
        </p>
        {texto && (
          <p
            style={{
              margin: "12px auto 0",
              maxWidth: "52ch",
              fontSize: "16px",
              lineHeight: "1.55",
              color: "#6B6259",
              textWrap: "pretty",
            }}
          >
            {texto}
          </p>
        )}
        <div
          data-chamada-botoes="1"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <a
            href={primaria.href}
            className="pl-h-ameixa pl-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "52px",
              padding: "0 28px",
              borderRadius: "8px",
              background: "#6E3F5F",
              color: "#FAF8F5",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "16.5px",
            }}
          >
            {primaria.rotulo}
          </a>
          {secundaria && (
            <a
              href={secundaria.href}
              className="pl-h-contorno"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "52px",
                padding: "0 24px",
                borderRadius: "8px",
                border: "1px solid #6E3F5F",
                background: "transparent",
                color: "#6E3F5F",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "16px",
                transition: "background 120ms cubic-bezier(.2,.8,.3,1),color 120ms cubic-bezier(.2,.8,.3,1)",
              }}
            >
              {secundaria.rotulo}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
