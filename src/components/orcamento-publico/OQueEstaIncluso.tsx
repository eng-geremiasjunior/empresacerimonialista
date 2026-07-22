// "O que está incluso": os itens do orçamento como cards com ícone.
// Sem valor individual aqui de propósito — o número aparece uma única vez,
// na seção Investimento ("menos números, mais confiança").

import {
  Camera,
  ClipboardList,
  Flower2,
  Handshake,
  Heart,
  Music,
  Sparkles,
  UtensilsCrossed,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Card, Secao } from "./SecaoBase";
import type { OrcamentoPublicoItem } from "@/lib/orcamento-publico";

// Categorias vêm do modelo de precificação (mesmos slugs de Fornecedores).
const POR_CATEGORIA: Record<string, LucideIcon> = {
  buffet: UtensilsCrossed,
  fotografia: Camera,
  filmagem: Video,
  dj: Music,
  banda: Music,
  som: Music,
  iluminacao: Sparkles,
  decoracao: Flower2,
  flores: Flower2,
  celebrante: Heart,
  mestre_cerimonias: Users,
  seguranca: Users,
};

// Itens digitados à mão não têm categoria; o nome costuma dizer o bastante.
const POR_PALAVRA: [RegExp, LucideIcon][] = [
  [/assessor|planejamen|consultor/i, ClipboardList],
  [/fornecedor|parceir|negocia/i, Handshake],
  [/cerimonial|equipe|coordena/i, Users],
  [/foto/i, Camera],
  [/film|v[ií]deo|drone/i, Video],
  [/decora|flor/i, Flower2],
  [/buffet|jantar|gastronom/i, UtensilsCrossed],
];

function iconeDoItem(item: OrcamentoPublicoItem): LucideIcon {
  if (item.categoria && POR_CATEGORIA[item.categoria]) {
    return POR_CATEGORIA[item.categoria];
  }
  for (const [re, Icone] of POR_PALAVRA) {
    if (re.test(item.nome)) return Icone;
  }
  return Sparkles;
}

export function OQueEstaIncluso({
  itens,
}: {
  itens: OrcamentoPublicoItem[];
}) {
  if (itens.length === 0) return null;

  return (
    <Secao id="incluso" titulo="O que está incluso">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {itens.map((item, i) => {
          const Icone = iconeDoItem(item);
          return (
            <Card key={`${item.nome}-${i}`} className="px-3.5 py-4">
              <Icone
                size={22}
                strokeWidth={1.5}
                style={{ color: "#A85950" }}
                className="mb-2"
              />
              <div
                className="mb-1 text-[13.5px] font-semibold"
                style={{ color: "#2E2621" }}
              >
                {item.nome}
              </div>
              {item.descricao && (
                <p className="text-xs leading-[1.5]" style={{ color: "#8A7B73" }}>
                  {item.descricao}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </Secao>
  );
}
