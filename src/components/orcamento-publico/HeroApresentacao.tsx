"use client";

// Hero da proposta pública.
//
// Template 1: imagem full-bleed com o texto branco por cima.
// Template 2 (arte Karina Dries): duas colunas — texto escuro sobre o
// creme à esquerda, foto em cartão à direita. Mesmos dados nos dois.

import { CalendarDays, Leaf, MapPin, Users } from "lucide-react";
import { formatDateBR } from "@/lib/orcamentos";
import { IMAGEM_PADRAO } from "@/lib/landing-imagens";
import { useTema } from "./TemaContexto";

type Props = {
  nome: string;
  tipoLabel: string;
  dataEvento: string | null;
  convidados: number | null;
  local: string | null;
  cidade: string | null;
  diasRestantes: number;
  imagemUrl: string | null;
  cta?: React.ReactNode;
};

function Badge({ dias }: { dias: number }) {
  if (dias <= 0) return null;
  return (
    <div
      className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold"
      style={{ color: "var(--cor-acento)" }}
    >
      <CalendarDays size={13} />
      Proposta válida por {dias} {dias === 1 ? "dia" : "dias"}
    </div>
  );
}

// Item de dado do hero dividido: valor em cima, rótulo embaixo.
function Dado({
  Icone,
  valor,
  rotulo,
}: {
  Icone: typeof CalendarDays;
  valor: string;
  rotulo: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icone
        size={18}
        strokeWidth={1.6}
        className="mt-0.5 flex-shrink-0"
        style={{ color: "var(--cor-texto-principal)" }}
      />
      <div>
        <div
          className="text-[13.5px] font-medium"
          style={{ color: "var(--cor-texto-principal)" }}
        >
          {valor}
        </div>
        <div className="text-[11.5px]" style={{ color: "var(--cor-texto-terciario)" }}>
          {rotulo}
        </div>
      </div>
    </div>
  );
}

export function HeroApresentacao(props: Props) {
  const tema = useTema();
  const {
    nome,
    tipoLabel,
    dataEvento,
    convidados,
    local,
    cidade,
    diasRestantes,
    imagemUrl,
    cta,
  } = props;
  const imagem = imagemUrl || IMAGEM_PADRAO.hero;
  const lugar = [local, cidade].filter(Boolean).join(" — ");

  // ---------- Template 2: duas colunas ----------
  if (tema.heroDividido) {
    return (
      <section id="apresentacao" className="scroll-mt-6 pt-2">
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div
              className="mb-2.5 text-[11px] font-semibold tracking-[2px]"
              style={{ color: "var(--cor-texto-terciario)" }}
            >
              PROPOSTA DE ASSESSORIA — {tipoLabel.toUpperCase()}
            </div>

            <h1
              className="mb-3.5 flex items-center gap-2.5 text-[36px] font-medium leading-tight sm:text-[52px] [font-family:var(--font-playfair)]"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              {nome}
              <Leaf
                size={26}
                strokeWidth={1.4}
                className="flex-shrink-0"
                style={{ color: "var(--cor-detalhe)" }}
              />
            </h1>

            <p
              className="mb-6 max-w-[420px] text-base leading-[1.5]"
              style={{ color: "var(--cor-texto-secundario)" }}
            >
              Transformamos sonhos em experiências inesquecíveis.
            </p>

            <div className="mb-7 flex flex-wrap gap-x-9 gap-y-4">
              <Dado
                Icone={CalendarDays}
                valor={dataEvento ? formatDateBR(dataEvento) : "A definir"}
                rotulo="Data do evento"
              />
              {convidados != null && (
                <Dado
                  Icone={Users}
                  valor={`${convidados} convidados`}
                  rotulo="Estimativa"
                />
              )}
              {lugar && (
                <Dado
                  Icone={MapPin}
                  valor={local || cidade || ""}
                  rotulo={local && cidade ? cidade : "Local do evento"}
                />
              )}
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-5"
              style={{
                background: "var(--cor-card)",
                boxShadow: "0 2px 10px rgba(40,40,20,0.05)",
              }}
            >
              <p
                className="max-w-[320px] text-[13.5px] leading-[1.5]"
                style={{ color: "var(--cor-texto-secundario)" }}
              >
                Olá, {nome}! Preparamos uma proposta personalizada com muito
                carinho para o seu grande dia.
              </p>
              {cta}
            </div>
          </div>

          <div
            className="relative h-[280px] overflow-hidden rounded-[20px] bg-cover bg-center lg:h-[390px]"
            style={{
              backgroundColor: "var(--cor-placeholder)",
              backgroundImage: `url(${imagem})`,
            }}
          >
            <Badge dias={diasRestantes} />
          </div>
        </div>
      </section>
    );
  }

  // ---------- Template 1: imagem full-bleed ----------
  return (
    <section id="apresentacao" className="scroll-mt-6">
      <div
        className="relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[20px] p-6 sm:min-h-[380px] sm:p-8"
        style={{ background: "var(--gradiente-hero)" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imagem})` }}
          role="presentation"
        />
        <Badge dias={diasRestantes} />
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
        style={{ background: "var(--cor-fundo-destaque)" }}
      >
        <p
          className="max-w-[480px] text-[13.5px]"
          style={{ color: "var(--cor-texto-secundario)" }}
        >
          Olá, {nome}! Preparamos uma proposta personalizada com muito carinho
          para o seu grande dia.
        </p>
        {cta}
      </div>
    </section>
  );
}
