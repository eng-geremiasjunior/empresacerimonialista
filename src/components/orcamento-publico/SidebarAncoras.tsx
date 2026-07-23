"use client";

// Navegação da proposta pública: barra lateral fixa de 250px no desktop,
// menu colapsável no celular (o cliente abre a proposta no telefone).
// A seção ativa é detectada por IntersectionObserver.

import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  ClipboardList,
  FileText,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Menu,
  MessageCircle,
  PartyPopper,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { SECOES } from "@/lib/orcamento-publico";
import { useTema } from "./TemaContexto";

const ICONES: Record<string, LucideIcon> = {
  apresentacao: MapPin,
  "sobre-nos": Heart,
  incluso: ClipboardList,
  "como-funciona": Workflow,
  "dia-evento": PartyPopper,
  "pos-evento": FileText,
  investimento: CircleDollarSign,
  faq: HelpCircle,
  eventos: ImageIcon,
};

// Ramo de oliveira decorativo (só o Template 2 usa), com o balanço da
// arte "Raminho Animado": o galho inteiro oscila em 7s e a ponta tem um
// segundo movimento em 4.5s, mais rápido, para não parecer um bloco só.
//
// Os keyframes ficam aqui e não no CSS global porque a animação só existe
// nesta peça. Os nomes são prefixados para não colidirem com nada.
function RamoOliveira() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-[-10px] left-[-20px] z-0 h-[280px] w-[150px] select-none"
      style={{ opacity: 0.45, overflow: "visible" }}
    >
      <style>{`
        @keyframes vela-sway {
          0%   { transform: rotate(-3deg) skewX(-2deg) translateX(-3px); }
          22%  { transform: rotate(1.5deg) skewX(1deg) translateX(2px); }
          38%  { transform: rotate(3.5deg) skewX(2.2deg) translateX(3px); }
          55%  { transform: rotate(-1deg) skewX(-0.5deg) translateX(-1px); }
          70%  { transform: rotate(-3.8deg) skewX(-2.5deg) translateX(-4px); }
          86%  { transform: rotate(0.5deg) skewX(0.5deg) translateX(1px); }
          100% { transform: rotate(-3deg) skewX(-2deg) translateX(-3px); }
        }
        @keyframes vela-sway-tip {
          0%   { transform: rotate(-1.5deg); }
          30%  { transform: rotate(2deg); }
          60%  { transform: rotate(-2.5deg); }
          100% { transform: rotate(-1.5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vela-ramo, .vela-ramo img { animation: none !important; }
        }
      `}</style>

      <div
        className="vela-ramo"
        style={{
          height: "100%",
          transformOrigin: "50% 100%",
          animation: "vela-sway 7s cubic-bezier(0.45,0.05,0.55,0.95) infinite",
          willChange: "transform",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/raminho.png"
          alt=""
          style={{
            height: "100%",
            width: "auto",
            display: "block",
            transformOrigin: "50% 85%",
            // O raminho.png nao tem canal alpha (RGB puro, fundo branco).
            // multiply faz o branco desaparecer sobre o creme da barra e
            // preserva as folhas escuras - sem isso apareceria um retangulo.
            mixBlendMode: "multiply",
            animation: "vela-sway-tip 4.5s cubic-bezier(0.45,0.05,0.55,0.95) infinite",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}

export function SidebarAncoras({
  nomeEmpresa,
  logoUrl,
  whatsapp,
  secoesVisiveis,
}: {
  nomeEmpresa: string;
  logoUrl: string | null;
  whatsapp: string | null;
  secoesVisiveis: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [ativa, setAtiva] = useState<string>("apresentacao");

  const itens = SECOES.filter((s) => secoesVisiveis.includes(s.id));

  useEffect(() => {
    const alvos = itens
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (alvos.length === 0) return;

    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel) setAtiva(visivel.target.id);
      },
      // Faixa estreita no topo: a seção "ativa" é a que está encostando no
      // topo da janela, não a que ocupa mais área.
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // itens é derivado de props estáveis dentro de uma mesma proposta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secoesVisiveis.join(",")]);

  function irPara(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setAberto(false);
  }

  const estilo = useTema();
  const iniciais = nomeEmpresa.slice(0, 2).toUpperCase();

  const cardContato = whatsapp ? (
    <div
      className="mt-3 flex flex-shrink-0 items-center gap-2.5 rounded-xl p-3.5"
      style={{ background: "var(--cor-fundo-destaque)" }}
    >
      <div
        className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full"
        style={
          estilo.navAtivaSolida
            ? { background: "var(--cor-acento)", color: "#FFFFFF" }
            : { background: "#FFFFFF", color: "var(--cor-acento)" }
        }
      >
        <MessageCircle size={16} />
      </div>
      <div className="text-xs leading-[1.35]" style={{ color: "var(--cor-texto-secundario)" }}>
        Dúvidas?
        <br />
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold"
          style={{ color: "var(--cor-acento)" }}
        >
          Fale com a gente
        </a>
      </div>
    </div>
  ) : null;

  const conteudo = (
    <>
      <div
        className="mb-5 flex items-center gap-2.5 border-b px-2 pb-6"
        style={{ borderColor: "var(--cor-borda)" }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={nomeEmpresa}
            className="h-9 max-w-[150px] object-contain"
          />
        ) : (
          <>
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border text-[17px] font-semibold [font-family:var(--font-playfair)]"
              style={{ borderColor: "var(--cor-detalhe)", color: "var(--cor-detalhe)" }}
            >
              {iniciais}
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-sm font-semibold uppercase tracking-[1px]"
                style={{ color: "var(--cor-texto-principal)" }}
              >
                {nomeEmpresa}
              </div>
              <div
                className="text-[9px] tracking-[2px]"
                style={{ color: "var(--cor-detalhe)" }}
              >
                EVENTOS
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {itens.map((s) => {
          const Icone = ICONES[s.id] ?? MapPin;
          const atual = ativa === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => irPara(e, s.id)}
              className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[13.5px] transition-colors"
              style={
                atual && estilo.navAtivaSolida
                  ? { background: "var(--cor-acento)", color: "#FFFFFF", fontWeight: 500 }
                  : {
                      background: atual ? "var(--cor-fundo-destaque)" : "transparent",
                      color: atual ? "var(--cor-acento)" : "var(--cor-texto-secundario)",
                      fontWeight: atual ? 600 : 400,
                    }
              }
            >
              <Icone size={15} strokeWidth={1.7} />
              {s.label}
            </a>
          );
        })}
      </nav>

    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className="fixed left-0 top-0 hidden h-screen w-[250px] flex-col overflow-visible border-r px-5 py-8 lg:flex"
        style={{ borderColor: "var(--cor-borda)", background: "var(--cor-sidebar)" }}
      >
        {estilo.ornamentoBotanico && <RamoOliveira />}
        {/* z-10 mantém menu e card de contato acima do ornamento: elemento
            posicionado pinta sobre estático, então o conteúdo precisa de
            um contexto próprio para não ficar por baixo. */}
        {/* Só o miolo rola. O card de contato fica ancorado no rodapé:
            antes ele vivia dentro da área rolável e, em telas mais baixas
            que ~800px, saía da vista sem nenhum indício de que existia. */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">{conteudo}</div>
          {cardContato}
        </div>
      </aside>

      {/* Celular/tablet: barra fixa + gaveta */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 lg:hidden"
        style={{ borderColor: "var(--cor-borda)", background: "var(--cor-sidebar)" }}
      >
        <span
          className="text-sm tracking-[0.5px] [font-family:var(--font-playfair)]"
          style={{ color: "var(--cor-texto-principal)" }}
        >
          {nomeEmpresa}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Abaixo de lg a barra lateral vira gaveta e o card "Dúvidas?"
              fica escondido atrás do menu. Este atalho mantém o contato a
              um toque, sem precisar abrir a navegação. */}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "var(--cor-fundo-destaque)", color: "var(--cor-acento)" }}
            >
              <MessageCircle size={14} />
              Dúvidas?
            </a>
          )}
          <button
            onClick={() => setAberto(true)}
            aria-label="Abrir navegação"
            className="rounded-lg p-1.5"
            style={{ color: "var(--cor-acento)" }}
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {aberto && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={{ background: "rgba(46,34,28,0.45)" }}
          onClick={() => setAberto(false)}
        >
          <div
            className="ml-auto flex h-full w-[270px] max-w-[85vw] flex-col overflow-y-auto px-[18px] py-6"
            style={{ background: "var(--cor-sidebar)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar navegação"
              className="mb-2 self-end rounded-lg p-1"
              style={{ color: "var(--cor-texto-terciario)" }}
            >
              <X size={20} />
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto">{conteudo}</div>
            {cardContato}
          </div>
        </div>
      )}
    </>
  );
}
