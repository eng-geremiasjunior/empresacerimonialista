"use client";

// A noiva escolhe quando o lembrete sai. Um controle, uma frase, e o
// sistema cuida do resto.
//
// A tela fala em RESULTADO, não em mecânica: mostra a data em que o
// lembrete vai sair e para quantas pessoas — não "cron diário às 12h".

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirLembrete } from "@/app/(portal)/portal/[eventoId]/convidados/actions";
import { Cartao, Rotulo } from "./Nucleo";

const OPCOES = [
  { valor: 30, rotulo: "30 dias antes" },
  { valor: 15, rotulo: "15 dias antes" },
  { valor: 7, rotulo: "1 semana antes" },
  { valor: 3, rotulo: "3 dias antes" },
  { valor: 1, rotulo: "1 dia antes" },
];

function dataDoDisparo(dataEvento: string, dias: number): string {
  const d = new Date(`${dataEvento}T00:00:00`);
  d.setDate(d.getDate() - dias);
  const MESES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function LembreteConvidados({
  eventoId,
  dataEvento,
  diasAtuais,
  aguardando,
  confirmados,
}: {
  eventoId: string;
  dataEvento: string;
  diasAtuais: number | null;
  aguardando: number;
  confirmados: number;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [dias, setDias] = useState<number | null>(diasAtuais);

  function salvar(novo: number | null) {
    setDias(novo);
    iniciar(async () => {
      await definirLembrete(eventoId, novo);
      router.refresh();
    });
  }

  const campo: React.CSSProperties = {
    border: "1px solid var(--cor-borda-botao)",
    borderRadius: "var(--raio-botao)",
    background: "var(--cor-card-suave)",
    padding: "10px 12px",
    minHeight: "var(--toque-min)",
    fontSize: "var(--ts-item-desc)",
    fontFamily: "var(--fonte-corpo)",
    color: "var(--cor-texto)",
    minWidth: 200,
  };

  return (
    <Cartao padding="var(--esp-6)">
      <Rotulo>Lembrete automático</Rotulo>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--esp-4)",
          flexWrap: "wrap",
        }}
      >
        <select
          style={campo}
          value={dias ?? ""}
          disabled={pendente}
          onChange={(e) => salvar(e.target.value === "" ? null : Number(e.target.value))}
        >
          <option value="">Não enviar lembrete</option>
          {OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      <p
        style={{
          fontSize: "var(--ts-desc)",
          lineHeight: 1.55,
          color: "var(--cor-texto-suave)",
        }}
      >
        {dias === null ? (
          "Ninguém recebe lembrete. Vocês podem ligar isso quando quiserem."
        ) : (
          <>
            Em <strong>{dataDoDisparo(dataEvento, dias)}</strong>, quem já
            confirmou recebe os detalhes do dia
            {confirmados > 0 ? ` (${confirmados} ${confirmados === 1 ? "pessoa" : "pessoas"})` : ""}
            {aguardando > 0 ? (
              <>
                , e quem ainda não respondeu recebe um convite gentil para
                confirmar ({aguardando})
              </>
            ) : null}
            . Cada pessoa recebe uma vez só.
          </>
        )}
      </p>
    </Cartao>
  );
}
