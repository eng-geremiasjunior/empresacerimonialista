// "Pós-evento": cards institucionais fixos vindos de
// empresa_conteudo_institucional.pos_evento_cards (jsonb, migração 047).

import { BarChart3, MessageCircle, Receipt, type LucideIcon } from "lucide-react";
import { Card, Secao } from "./SecaoBase";

const ICONES: LucideIcon[] = [BarChart3, Receipt, MessageCircle];

export function PosEvento({
  cards,
}: {
  cards: { titulo: string; descricao: string }[];
}) {
  if (cards.length === 0) return null;

  return (
    <Secao id="pos-evento" titulo="Pós-evento">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const Icone = ICONES[i % ICONES.length];
          return (
            <Card key={`${card.titulo}-${i}`} className="p-4">
              <Icone
                size={20}
                strokeWidth={1.5}
                style={{ color: "#A85950" }}
                className="mb-1.5"
              />
              <div
                className="mb-1 text-[13px] font-semibold"
                style={{ color: "#2E2621" }}
              >
                {card.titulo}
              </div>
              <p className="text-xs" style={{ color: "#8A7B73" }}>
                {card.descricao}
              </p>
            </Card>
          );
        })}
      </div>
    </Secao>
  );
}
