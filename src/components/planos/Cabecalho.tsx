// O cabeçalho das telas públicas de venda, com menu.
//
// POR QUE ELE EXISTE (10/09/2026). Até aqui a página de vendas era uma
// rolagem única de quinze mil pixels sem nenhum atalho: quem entrava
// querendo saber o preço tinha de percorrer a narrativa inteira. O dono
// comparou com o site da concorrente — "muito feia, e pouco
// profissional" — e o que faltava, antes de qualquer questão de gosto,
// era isto: um menu que deixa a pessoa ir aonde ela quer.
//
// Os itens não são "as seções do site": são as três perguntas que a
// visitante faz, nesta ordem — o que faz, como é por dentro, quanto
// custa. Entrar e criar conta ficam separados à direita, porque são
// ação, não navegação.
//
// A DONA E A EQUIPE VEEM OUTRA COISA. Quem já tem conta não precisa de
// "criar conta grátis": precisa do caminho de volta. Mesma régua dos
// botões da página, e o mesmo motivo — botão que leva a lugar nenhum
// gasta a confiança de quem já é cliente.

import { Simbolo } from "@/components/marca/Marca";

const TITULO = "var(--font-title, Inter, sans-serif)";

export type AcaoDoCabecalho = { href: string; rotulo: string } | null;

export function Cabecalho({
  ondeEstou,
  acao,
  entrar = true,
}: {
  /** Marca o item do menu correspondente à página atual. */
  ondeEstou?: "vendas" | "precos";
  /** O botão cheio à direita. Null para quem não tem o que assinar. */
  acao?: AcaoDoCabecalho;
  /** "Entrar" some para quem já está logada. */
  entrar?: boolean;
}) {
  // Na página de vendas, âncoras; na de preços, o caminho de volta com a
  // âncora junto — assim o menu funciona igual nas duas.
  const naVenda = ondeEstou === "vendas";
  const itens = [
    { href: naVenda ? "#o-sistema" : "/planos#o-sistema", rotulo: "Recursos" },
    { href: naVenda ? "#experimente" : "/planos#experimente", rotulo: "Demonstração" },
    { href: "/precos", rotulo: "Planos e preços", atual: ondeEstou === "precos" },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: "0",
        zIndex: "20",
        background: "#FAF8F5",
        borderBottom: "1px solid #E6E0D8",
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "0 clamp(20px,4vw,28px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          height: "60px",
        }}
      >
        <a
          href="/planos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            flex: "none",
          }}
        >
          <Simbolo tamanho={26} />
          <span
            style={{
              fontFamily: TITULO,
              fontWeight: "600",
              fontSize: "18px",
              letterSpacing: "-0.03em",
              color: "#221E1B",
              whiteSpace: "nowrap",
            }}
          >
            e<span style={{ color: "#6E3F5F" }}>organizei</span>
          </span>
        </a>

        {/* O menu some no celular: três itens de texto ao lado do botão
            não cabem em 360px, e a barra fixa do rodapé já leva à ação. */}
        <nav
          data-hide-sm="1"
          style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}
        >
          {itens.map((i) => (
            <a
              key={i.rotulo}
              href={i.href}
              className="pl-h-suave"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "38px",
                padding: "0 12px",
                borderRadius: "8px",
                fontWeight: i.atual ? "600" : "500",
                fontSize: "14.5px",
                color: i.atual ? "#221E1B" : "#3D3835",
                textDecoration: "none",
                transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
              }}
            >
              {i.rotulo}
            </a>
          ))}
        </nav>

        <span style={{ display: "flex", alignItems: "center", gap: "6px", flex: "none" }}>
          {entrar && (
            <a
              href="/login"
              className="pl-h-suave"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "40px",
                padding: "0 12px",
                borderRadius: "8px",
                fontWeight: "500",
                fontSize: "14px",
                color: "#3D3835",
                textDecoration: "none",
                transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
              }}
            >
              Entrar
            </a>
          )}
          {acao && (
            <a
              href={acao.href}
              className="pl-h-ameixa"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40px",
                padding: "0 16px",
                borderRadius: "8px",
                background: "#6E3F5F",
                color: "#FAF8F5",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
                whiteSpace: "nowrap",
                transition: "background 120ms cubic-bezier(.2,.8,.3,1)",
              }}
            >
              {acao.rotulo}
            </a>
          )}
        </span>
      </div>
    </header>
  );
}
