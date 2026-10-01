"use client";

// 7 · Programa (#dia, o bloco "Momentos do dia"), fundo alt: o cartão de
// menu em papel (max 600px) com as molduras de ouro em 12px e 17px, "Le
// programme", o dia ("Sábado, 31 de outubro") e uma linha por momento —
// o rótulo, o subtítulo em itálico, o pontilhado e a hora (16h30). Depois
// "Tenue · Traje" (quando o traje está no site) e "Adicionar à agenda"
// (.ics de verdade, com a hora de Brasília, o fim e o endereço).
//
// O subtítulo é a nota que a noiva escreve no momento; sem nota, os três
// do desenho em francês (La cérémonie, Le cocktail, Le dîner & le bal)
// para os rótulos conhecidos. Sem programação, a hora do evento vira a
// linha da cerimônia; sem hora, as linhas somem. Exportado para o T06.

import { lerMomentos } from "@/lib/site-conteudo";
import { BotaoAgenda } from "@/components/site/pecas/BotaoAgenda";
import { diaDaSemanaEMes, horaDoDesenho, MolduraDupla, type PropsDaSecao } from "../comum";

const EM_FRANCES: Record<string, string> = {
  "cerimonia": "La cérémonie",
  "cerimonia religiosa": "La cérémonie",
  "cerimonia civil": "La cérémonie civile",
  "recepcao": "Le cocktail",
  "coquetel": "Le cocktail",
  "festa": "Le dîner & le bal",
  "jantar": "Le dîner",
  "baile": "Le bal",
};

function chave(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type TrajeDoPrograma = { titulo: string; texto: string } | null;

export function Programa({
  dados,
  bloco,
  casal,
  ancora,
  traje,
}: PropsDaSecao & {
  /** o "Tenue · Traje" dentro do cartão (bloco Traje visível e com texto) */
  traje?: TrajeDoPrograma;
}) {
  const { evento } = dados;
  const itens = lerMomentos(bloco.conteudo).itens;
  const agenda =
    itens.length > 0
      ? itens
      : evento.hora && /^\d{2}:\d{2}/.test(evento.hora)
        ? [{ rotulo: "Cerimônia", hora: evento.hora.slice(0, 5), nota: "" }]
        : [];
  const nomes = [casal.nome1, casal.nome2].filter(Boolean).join(" & ");
  const dia = diaDaSemanaEMes(evento.data);

  return (
    <section id={ancora} className="f-secao f-alt f-programa">
      <div data-revelar="up" className="f-papel f-programa-cartao">
        <MolduraDupla />
        <div className="f-papel-miolo">
          <div className="f-eyebrow">Le programme</div>
          {dia && <h2 className="f-h2 f-h2--sm">{dia}</h2>}
          {agenda.length > 0 && (
            <div className="f-programa-linhas">
              {agenda.map((a, i) => {
                const sub = a.nota || EM_FRANCES[chave(a.rotulo)] || "";
                return (
                  <div key={i} className="f-programa-linha">
                    <div className="f-programa-rotulos">
                      <span className="f-programa-rotulo">{a.rotulo}</span>
                      {sub && <span className="f-programa-sub">{sub}</span>}
                    </div>
                    <span className="f-programa-pontos" aria-hidden />
                    <span className="f-programa-hora">{horaDoDesenho(a.hora)}</span>
                  </div>
                );
              })}
            </div>
          )}
          {traje && (traje.titulo || traje.texto) && <TrajeNoCartao traje={traje} />}
          <BotaoAgenda
            className="f-btn f-btn--cheio f-programa-agenda"
            rotulo="Adicionar à agenda"
            evento={{
              titulo: nomes ? `Casamento ${nomes}` : "Casamento",
              data: evento.data,
              hora: evento.hora,
              local: evento.local,
              endereco: [evento.endereco, evento.cidade].filter(Boolean).join(", ") || null,
            }}
          />
        </div>
      </div>
    </section>
  );
}

/** "Tenue · Traje" e o traje em itálico (o título; sem título, o texto). */
export function TrajeNoCartao({ traje }: { traje: { titulo: string; texto: string } }) {
  const principal = traje.titulo || traje.texto;
  const detalhe = traje.titulo ? traje.texto : "";
  return (
    <div className="f-traje">
      <span className="f-traje-rotulo">Tenue · Traje</span>
      <span className="f-traje-titulo">{principal}</span>
      {detalhe && <span className="f-traje-texto">{detalhe}</span>}
    </div>
  );
}
