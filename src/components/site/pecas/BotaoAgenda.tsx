"use client";

// "Adicionar à minha agenda": o .ics de verdade (data e hora de Brasília,
// fim, local e endereço), de src/lib/site-agenda. O rótulo troca depois
// do toque, como no desenho, mas sem o "Salvo na sua agenda ✓" dele: o
// botão só baixa o arquivo (no Android ele fica em Downloads), e dizer
// que salvou seria botão que finge. Data inválida: o botão não aparece.

import { useMemo, useState, type ReactNode } from "react";
import { baixarIcs, gerarIcs, type EventoDaAgenda } from "@/lib/site-agenda";

export function BotaoAgenda({
  evento,
  nomeArquivo = "casamento",
  className,
  rotulo = "Adicionar à minha agenda",
  rotuloFeito = "Arquivo da agenda baixado",
  children,
}: {
  evento: EventoDaAgenda;
  nomeArquivo?: string;
  className?: string;
  rotulo?: string;
  rotuloFeito?: string;
  /** desenho próprio do conteúdo (ícone + texto) */
  children?: (feito: boolean, texto: string) => ReactNode;
}) {
  const [feito, setFeito] = useState(false);
  const ics = useMemo(
    () => gerarIcs(evento),
    // o objeto costuma nascer a cada render; o que importa são os campos
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [evento.titulo, evento.data, evento.hora, evento.duracaoMin, evento.local, evento.endereco, evento.url]
  );
  if (!ics) return null;

  const texto = feito ? rotuloFeito : rotulo;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        baixarIcs(nomeArquivo, ics);
        setFeito(true);
      }}
    >
      {children ? children(feito, texto) : texto}
    </button>
  );
}
