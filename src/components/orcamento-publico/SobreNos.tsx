// Seção "Sobre nós": texto institucional + 4 estatísticas (Etapa 7).
// Estatísticas sem valor cadastrado são omitidas em vez de mostrar "0+",
// que passaria a impressão oposta à pretendida.

import { Award, Heart, Star, Users } from "lucide-react";
import { Secao } from "./SecaoBase";
import type { InstitucionalPublico } from "@/lib/orcamento-publico";

export function SobreNos({ dados }: { dados: InstitucionalPublico }) {
  const stats = [
    dados.stat_anos_experiencia
      ? {
          Icone: Star,
          valor: `${dados.stat_anos_experiencia}+`,
          label: "Anos de experiência",
        }
      : null,
    dados.stat_eventos_realizados
      ? {
          Icone: Users,
          valor: `${dados.stat_eventos_realizados}+`,
          label: "Eventos realizados",
        }
      : null,
    {
      Icone: Heart,
      valor: `${dados.stat_dedicacao_percentual}%`,
      label: "Dedicação",
    },
    { Icone: Award, valor: "Equipe", label: dados.stat_equipe_texto },
  ].filter(Boolean) as {
    Icone: typeof Star;
    valor: string;
    label: string;
  }[];

  return (
    <Secao id="sobre-nos" titulo="Sobre nós">
      {dados.sobre_nos_texto && (
        <p
          className="mb-7 max-w-[640px] text-sm leading-[1.7]"
          style={{ color: "#5B4A43" }}
        >
          {dados.sobre_nos_texto}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ Icone, valor, label }) => (
          <div key={label} className="text-center">
            <Icone
              size={24}
              className="mx-auto"
              style={{ color: "#A85950" }}
              strokeWidth={1.5}
            />
            <div
              className="mb-0.5 mt-1.5 text-[22px] [font-family:var(--font-playfair)]"
              style={{ color: "#2E2621" }}
            >
              {valor}
            </div>
            <div className="text-xs" style={{ color: "#8A7B73" }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </Secao>
  );
}
