// O cartão de contagem regressiva — o bloco mais emocional da tela.
// Degradê creme, borda champagne, fio dourado no topo e o número em
// EB Garamond.
//
// Sem animação de contagem: no tema novo o movimento do portal é o fio
// dourado, e dois movimentos competindo na mesma tela cansam.

import { CalendarHeart, TAMANHO_GRANDE, TRACO } from "./icones";
import { CartaoOuro, ChipIcone, Rotulo } from "./Nucleo";

export function Contagem({ dias }: { dias: number }) {
  return (
    <CartaoOuro
      fio="contagem"
      padding="16px 18px"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "var(--esp-4)",
      }}
    >
      <ChipIcone tamanho={56} redondo>
        <CalendarHeart size={TAMANHO_GRANDE} strokeWidth={TRACO} />
      </ChipIcone>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Rotulo>Faltam</Rotulo>
        <div
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "var(--ts-metrica-grande)",
            lineHeight: 1.1,
            color: "var(--cor-texto-forte)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {dias} {dias === 1 ? "dia" : "dias"}
        </div>
        <div style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
          para o grande dia
        </div>
      </div>
    </CartaoOuro>
  );
}
