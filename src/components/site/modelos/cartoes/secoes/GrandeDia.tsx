"use client";

// O grande dia (#dia, T03 e T04), cartão de raio 32: "O grande dia",
// "Sábado, 31 de outubro" (headSizeSm), a programação em linhas soft de
// raio 18 (a hora em 600 tabular; o rótulo em headFont 22px; a nota de
// 13.5px) e "Adicionar à minha agenda" (ink, com o ícone), que baixa o
// .ics de verdade (hora de Brasília, fim, local e endereço).
//
// A programação vem do bloco "Momentos do dia". Sem ela, a hora do evento
// vira a linha única da cerimônia; sem hora, as linhas somem.
//
// Ao lado do local quando os dois são vizinhos na ordem (o modelo junta
// os dois na mesma grade); sozinho, ocupa a largura toda.

import { lerMomentos } from "@/lib/site-conteudo";
import { BotaoAgenda } from "@/components/site/pecas/BotaoAgenda";
import { diaDaSemanaEData, horaDoDesenho, horaValida, Icone, Rotulo, type PropsDaSecao } from "../comum";

export function GrandeDia({ dados, bloco, casal, ancora, atraso }: PropsDaSecao & { atraso?: number }) {
  const { evento } = dados;
  const itens = lerMomentos(bloco.conteudo).itens;
  const agenda =
    itens.length > 0
      ? itens
      : horaValida(evento.hora)
        ? [{ rotulo: "Cerimônia", hora: evento.hora.slice(0, 5), nota: evento.local ?? "" }]
        : [];
  const nomes = [casal.nome1, casal.nome2].filter(Boolean).join(" & ");
  // o modelo atende casamento e bodas: o título da agenda segue o tipo
  const ocasiao = evento.tipo === "bodas" ? "Bodas" : "Casamento";

  return (
    <div id={ancora} data-sec={ancora} data-revelar="up" data-atraso={atraso || undefined} className="k-cartao k-dia">
      <Rotulo className="k-rotulo--acento">O grande dia</Rotulo>
      <h2 className="k-h2 k-h2--sm">{diaDaSemanaEData(evento.data)}</h2>
      {agenda.length > 0 && (
        <div className="k-agenda">
          {agenda.map((a, i) => (
            <div key={i} className="k-agenda-linha">
              <span className="k-agenda-hora">{horaDoDesenho(a.hora)}</span>
              <div className="k-agenda-textos">
                <span className="k-agenda-rotulo">{a.rotulo}</span>
                {a.nota && <span className="k-agenda-nota">{a.nota}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <BotaoAgenda
        className="k-botao k-botao--icone"
        evento={{
          titulo: nomes ? `${ocasiao} ${nomes}` : ocasiao,
          data: evento.data,
          hora: evento.hora,
          local: evento.local,
          endereco: [evento.endereco, evento.cidade].filter(Boolean).join(", ") || null,
        }}
      >
        {(_, texto) => (
          <>
            <Icone nome="agenda" className="k-icone--20" />
            {texto}
          </>
        )}
      </BotaoAgenda>
    </div>
  );
}
