// A linha "Agenda + Perguntas" da Visão geral (desenho v4, README §9;
// protótipo, template 293–327). A agenda do casal (Google Agenda) é de
// outra fase e entra pela prop `agenda`: com ela, a grade `1.5fr 1fr` do
// desenho; sem ela, só o cartão de Perguntas.

import type { ReactNode } from "react";
import { PerguntasDoMomento } from "./PerguntasDoMomento";
import type { PerguntaDoMomento } from "./montar";

export function AgendaEPerguntas({
  agenda,
  perguntas,
  exemploHashtag,
}: {
  agenda?: ReactNode;
  perguntas: PerguntaDoMomento[];
  exemploHashtag: string;
}) {
  const temPerguntas = perguntas.length > 0;
  if (!agenda && !temPerguntas) return null;
  const cartao = temPerguntas ? <PerguntasDoMomento perguntas={perguntas} exemploHashtag={exemploHashtag} /> : null;
  return (
    <div className={`pn-visao-geral-agenda${agenda && temPerguntas ? " com-agenda" : ""}`}>
      {agenda}
      {cartao}
    </div>
  );
}
