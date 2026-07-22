// Hero da proposta pública. A imagem de fundo é a customizada pela
// cerimonialista (empresas.hero_imagem_url) ou o asset padrão do sistema.
// O gradiente continua ATRÁS da imagem como cor de base: se o arquivo
// faltar ou demorar, a área fica elegante em vez de um retângulo cinza.

import { CalendarDays, MapPin, Users } from "lucide-react";
import { formatDateBR } from "@/lib/orcamentos";
import { IMAGEM_PADRAO } from "@/lib/landing-imagens";

const BASES: Record<string, string> = {
  casamento: "linear-gradient(135deg, #EFDCD5 0%, #E7CDC4 45%, #D9B3A8 100%)",
  debutante: "linear-gradient(135deg, #EFD9E2 0%, #E4C3D2 45%, #CFA5B8 100%)",
};
const BASE_PADRAO =
  "linear-gradient(135deg, #ECE2D6 0%, #DFCFC0 45%, #C9B49F 100%)";

export function HeroApresentacao({
  nome,
  tipoEvento,
  tipoLabel,
  dataEvento,
  convidados,
  local,
  cidade,
  diasRestantes,
  imagemUrl,
  cta,
}: {
  nome: string;
  tipoEvento: string;
  tipoLabel: string;
  dataEvento: string | null;
  convidados: number | null;
  local: string | null;
  cidade: string | null;
  diasRestantes: number;
  imagemUrl: string | null;
  cta?: React.ReactNode;
}) {
  const lugar = [local, cidade].filter(Boolean).join(" — ");
  const imagem = imagemUrl || IMAGEM_PADRAO.hero;

  return (
    <section id="apresentacao" className="scroll-mt-6">
      <div
        className="relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[20px] p-6 sm:min-h-[380px] sm:p-8"
        style={{ background: BASES[tipoEvento] ?? BASE_PADRAO }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imagem})` }}
          role="presentation"
        />

        {diasRestantes > 0 && (
          <div
            className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold sm:right-[18px] sm:top-[18px]"
            style={{ color: "#A85950" }}
          >
            <CalendarDays size={13} />
            Proposta válida por {diasRestantes}{" "}
            {diasRestantes === 1 ? "dia" : "dias"}
          </div>
        )}

        {/* Overlay: garante contraste do texto branco sobre qualquer foto.
            Mais forte que na versão de gradiente, porque agora pode haver
            uma imagem clara embaixo. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(46,34,28,0.10) 0%, rgba(46,34,28,0.30) 45%, rgba(46,34,28,0.72) 100%)",
          }}
        />

        <div className="relative z-[1] text-white">
          <div className="mb-1.5 text-[13px] tracking-[1px] opacity-90">
            Proposta de Assessoria — {tipoLabel}
          </div>
          <h1 className="mb-2 text-[32px] font-medium leading-tight sm:text-[44px] [font-family:var(--font-playfair)]">
            {nome}
          </h1>
          <p className="mb-4 max-w-[420px] text-sm opacity-90">
            Transformamos sonhos em experiências inesquecíveis.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} />
              {dataEvento ? formatDateBR(dataEvento) : "Data a definir"}
            </span>
            {convidados != null && (
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {convidados} convidados
              </span>
            )}
            {lugar && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {lugar}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[14px] px-6 py-5"
        style={{ background: "#F6E9E6" }}
      >
        <p className="max-w-[480px] text-[13.5px]" style={{ color: "#5B4A43" }}>
          Olá, {nome}! Preparamos uma proposta personalizada com muito carinho
          para o seu grande dia.
        </p>
        {cta}
      </div>
    </section>
  );
}
