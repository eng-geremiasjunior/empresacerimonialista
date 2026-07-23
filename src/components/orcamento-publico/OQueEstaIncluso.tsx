"use client";

// "O que está incluso": os itens do orçamento como cards com ícone.
// Sem valor individual aqui de propósito — o número aparece uma única vez,
// na seção Investimento ("menos números, mais confiança").
//
// Template 2 segue a arte: título centralizado, ícone dentro de um círculo
// creme e itens sem moldura, tudo num único cartão branco.

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
import { useTema } from "./TemaContexto";
import type { OrcamentoPublicoItem } from "@/lib/orcamento-publico";

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

export function OQueEstaIncluso({ itens }: { itens: OrcamentoPublicoItem[] }) {
  const tema = useTema();
  if (itens.length === 0) return null;

  // Arte: até 5 colunas, itens centrados, ícone em medalhão creme.
  if (tema.secoesEmCartao || tema.cartaoComSombra) {
    return (
      <Secao id="incluso" titulo="O que está incluso" centralizado>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {itens.map((item, i) => {
            const Icone = iconeDoItem(item);
            return (
              <div
                key={`${item.nome}-${i}`}
                className="px-1.5 text-center transition-transform duration-200 ease-out hover:-translate-y-0.5"
              >
                <div
                  className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-full"
                  style={{
                    background: "var(--cor-fundo-destaque)",
                    color: "var(--cor-acento)",
                  }}
                >
                  <Icone size={24} strokeWidth={1.7} />
                </div>
                <div
                  className="mb-1.5 text-[14.5px] font-medium"
                  style={{ color: "var(--cor-texto-principal)" }}
                >
                  {item.nome}
                </div>
                {item.descricao && (
                  <p
                    className="text-xs leading-[1.5]"
                    style={{ color: "var(--cor-texto-terciario)" }}
                  >
                    {item.descricao}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Secao>
    );
  }

  return (
    <Secao id="incluso" titulo="O que está incluso">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {itens.map((item, i) => {
          const Icone = iconeDoItem(item);
          return (
            <Card
              key={`${item.nome}-${i}`}
              className="px-3.5 py-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_14px_32px_-16px_rgba(46,34,28,0.4)]"
            >
              <Icone
                size={22}
                strokeWidth={1.5}
                style={{ color: "var(--cor-acento)" }}
                className="mb-2"
              />
              <div
                className="mb-1 text-[13.5px] font-semibold"
                style={{ color: "var(--cor-texto-principal)" }}
              >
                {item.nome}
              </div>
              {item.descricao && (
                <p
                  className="text-xs leading-[1.5]"
                  style={{ color: "var(--cor-texto-terciario)" }}
                >
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
