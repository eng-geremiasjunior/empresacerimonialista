// O sinal de "com inteligência artificial" (21/10/2026, pedido do dono:
// identificar onde a IA ajuda, sem exagero). Um ícone só, sempre igual —
// o mesmo brilho que o "Perguntar sobre este evento" já usava. Vai só no
// botão que dispara um trabalho da IA e no que a IA escreveu; nunca selo,
// fundo colorido ou a palavra "IA" espalhada. Trocar o sinal é aqui.

import { Sparkles } from "lucide-react";

export function MarcaDaIa({
  tamanho = 13,
  naCorDoTexto = false,
  titulo = "Com inteligência artificial",
}: {
  tamanho?: number;
  /** dentro de botão escuro: herda a cor do texto */
  naCorDoTexto?: boolean;
  titulo?: string;
}) {
  return (
    <span
      role="img"
      aria-label={titulo}
      title={titulo}
      style={{
        display: "inline-flex",
        flexShrink: 0,
        verticalAlign: "-2px",
        color: naCorDoTexto ? "currentColor" : "var(--mo-destaque, var(--ev-accent, #244C50))",
      }}
    >
      <Sparkles size={tamanho} strokeWidth={1.8} aria-hidden />
    </span>
  );
}
