import { publicBase } from "@/lib/app-url";

// A faixa do catálogo vivo (195): quem entrou pelo /conhecer está dentro
// de um portal de EXEMPLO, com o login de visitante que não grava nada.
// A faixa diz isso uma vez, no alto, e leva de volta ao catálogo ou ao
// cadastro (no endereço principal: a sessão do visitante é só do portal).

export function FaixaDoCatalogo() {
  const base = publicBase();
  return (
    <div
      style={{
        position: "relative",
        zIndex: 70,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px 14px",
        padding: "9px 16px",
        background: "#221E1B",
        color: "#FAF8F5",
        font: "500 13px/1.35 system-ui, -apple-system, 'Segoe UI', sans-serif",
        textAlign: "center",
      }}
    >
      <span>
        <b style={{ fontWeight: 700 }}>Exemplo do eorganizei.</b> Mexa à vontade: nada aqui é salvo.
      </span>
      <span style={{ display: "inline-flex", gap: 14 }}>
        <a href={`${base}/conhecer`} style={{ color: "#D9C2D2", textDecoration: "underline" }}>
          Voltar ao catálogo
        </a>
        <a href={`${base}/criar-conta`} style={{ color: "#FAF8F5", fontWeight: 700, textDecoration: "underline" }}>
          Comece seu teste de 7 dias
        </a>
      </span>
    </div>
  );
}
