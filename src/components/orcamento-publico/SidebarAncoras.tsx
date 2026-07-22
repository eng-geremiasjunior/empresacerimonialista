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

  const iniciais = nomeEmpresa.slice(0, 2).toUpperCase();

  const conteudo = (
    <>
      <div
        className="mb-5 flex items-center gap-2.5 border-b px-2 pb-6"
        style={{ borderColor: "#ECE0DA" }}
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
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] text-sm [font-family:var(--font-playfair)]"
              style={{ borderColor: "#A6824F", color: "#A6824F" }}
            >
              {iniciais}
            </div>
            <div>
              <div
                className="text-sm tracking-[0.5px] [font-family:var(--font-playfair)]"
                style={{ color: "#2E2621" }}
              >
                {nomeEmpresa}
              </div>
              <div
                className="text-[9px] tracking-[1.5px]"
                style={{ color: "#A6824F" }}
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
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13.5px] transition-colors"
              style={{
                background: atual ? "#F6E9E6" : "transparent",
                color: atual ? "#A85950" : "#584B44",
                fontWeight: atual ? 600 : 400,
              }}
            >
              <Icone size={15} strokeWidth={1.7} />
              {s.label}
            </a>
          );
        })}
      </nav>

      {whatsapp && (
        <div
          className="mt-auto flex items-center gap-2.5 rounded-xl p-3.5"
          style={{ background: "#F6E9E6" }}
        >
          <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-white">
            <MessageCircle size={15} style={{ color: "#A85950" }} />
          </div>
          <div className="text-xs leading-[1.35]" style={{ color: "#584B44" }}>
            Dúvidas?
            <br />
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold"
              style={{ color: "#A85950" }}
            >
              Fale com a gente
            </a>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className="fixed left-0 top-0 hidden h-screen w-[250px] flex-col overflow-y-auto border-r bg-white px-[18px] py-7 lg:flex"
        style={{ borderColor: "#ECE0DA" }}
      >
        {conteudo}
      </aside>

      {/* Celular/tablet: barra fixa + gaveta */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden"
        style={{ borderColor: "#ECE0DA" }}
      >
        <span
          className="text-sm tracking-[0.5px] [font-family:var(--font-playfair)]"
          style={{ color: "#2E2621" }}
        >
          {nomeEmpresa}
        </span>
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir navegação"
          className="rounded-lg p-1.5"
          style={{ color: "#A85950" }}
        >
          <Menu size={20} />
        </button>
      </div>

      {aberto && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={{ background: "rgba(46,34,28,0.45)" }}
          onClick={() => setAberto(false)}
        >
          <div
            className="ml-auto flex h-full w-[270px] max-w-[85vw] flex-col overflow-y-auto bg-white px-[18px] py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar navegação"
              className="mb-2 self-end rounded-lg p-1"
              style={{ color: "#8A7B73" }}
            >
              <X size={20} />
            </button>
            {conteudo}
          </div>
        </div>
      )}
    </>
  );
}
