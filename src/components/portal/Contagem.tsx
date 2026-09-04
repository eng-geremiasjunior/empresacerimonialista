// O cartão de contagem regressiva — o bloco mais emocional da tela.
// Degradê creme, borda champagne, fio dourado no topo e o número em
// EB Garamond.
//
// Sem animação de contagem: no tema novo o movimento do portal é o fio
// dourado, e dois movimentos competindo na mesma tela cansam.
//
// O coração é do casal, não do calendário: quem produz um show ou fecha um
// evento de empresa lê o mesmo cartão, e ali a emoção do casamento soa
// deslocada. Por isso o tipo decide tanto o ícone quanto a linha de baixo.

import { CalendarDays, CalendarHeart, TAMANHO_GRANDE, TRACO } from "./icones";
import { CartaoOuro, ChipIcone, Rotulo } from "./Nucleo";
import { contagemComCoracao, rotuloContagem } from "@/lib/papel";

export function Contagem({ dias, tipo }: { dias: number; tipo?: string | null }) {
  const IconeData = contagemComCoracao(tipo) ? CalendarHeart : CalendarDays;

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
        <IconeData size={TAMANHO_GRANDE} strokeWidth={TRACO} />
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
          {rotuloContagem(tipo)}
        </div>
      </div>
    </CartaoOuro>
  );
}
