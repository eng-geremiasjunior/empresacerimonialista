// "No dia do evento": responsabilidades assumidas pela cerimonialista.
// Vem de empresa_conteudo_institucional.responsabilidades_dia_evento
// (migração 047), com seed de 6 itens genéricos.

import {
  CalendarCheck,
  CalendarDays,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { FotoPublica } from "@/lib/orcamento-publico";

// Ciclo fixo de ícones: a lista é editável pela cerimonialista, então não
// dá para amarrar ícone a texto — o rodízio mantém o visual variado.
const ICONES: LucideIcon[] = [
  CalendarCheck,
  HeartHandshake,
  CalendarDays,
  Users,
  Sparkles,
  ShieldCheck,
];

export function NoDiaDoEvento({
  titulo,
  itens,
  foto,
}: {
  titulo: string;
  itens: string[];
  foto: FotoPublica | null;
}) {
  if (itens.length === 0) return null;

  return (
    <section id="dia-evento" className="scroll-mt-6 pt-12 sm:pt-14">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        {/* Reaproveita a primeira foto do portfólio; sem portfólio, o bloco
            decorativo some em vez de virar um retângulo vazio. */}
        {foto ? (
          <div
            className="hidden min-h-[220px] overflow-hidden rounded-2xl lg:block"
            style={{ background: "#EFDCD5" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.legenda ?? ""}
              className="h-full min-h-[220px] w-full object-cover"
            />
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}

        <div>
          <h2
            className="mb-4 text-[22px] font-medium sm:text-[24px] [font-family:var(--font-playfair)]"
            style={{ color: "#2E2621" }}
          >
            {titulo}
          </h2>
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {itens.map((item, i) => {
              const Icone = ICONES[i % ICONES.length];
              return (
                <div
                  key={`${item}-${i}`}
                  className="flex gap-2.5 text-[13px]"
                  style={{ color: "#5B4A43" }}
                >
                  <Icone
                    size={16}
                    strokeWidth={1.6}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "#A85950" }}
                  />
                  {item}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
