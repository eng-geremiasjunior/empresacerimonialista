"use client";

// O que a vitrine faz no navegador, fora do formulário e do álbum.
//
// Um estado só, dividido entre peças que não se enxergam: o tipo de
// evento escolhido no formulário muda o depoimento em destaque; o pedido
// enviado troca o botão da barra fixa; a abertura saindo da tela mostra o
// cabeçalho compacto e a barra. A página continua sendo do servidor —
// isto só embrulha.
//
// Movimento reduzido: nada anima e nada depende de animação. A barra fica
// sempre à mostra (a folha garante isso antes mesmo de o script rodar) e
// o cabeçalho compacto não aparece, como no desenho.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { LinkMedido } from "./MedirPagina";

type EstadoDaVitrine = {
  /** tipo de evento escolhido no formulário ("" = nenhum) */
  tipo: string;
  escolherTipo: (tipo: string) => void;
  enviado: boolean;
  marcarEnviado: () => void;
  /** a barra fixa aparece */
  barraVisivel: boolean;
  /** o cabeçalho compacto aparece */
  topoVisivel: boolean;
};

const Contexto = createContext<EstadoDaVitrine | null>(null);

export function useVitrine(): EstadoDaVitrine {
  const c = useContext(Contexto);
  if (!c) throw new Error("useVitrine fora de <EstadoDaVitrine>");
  return c;
}

const movimentoReduzido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function EstadoDaVitrine({
  tipoInicial,
  children,
}: {
  /** com um tipo só atendido, o formulário já nasce com ele escolhido */
  tipoInicial: string;
  children: React.ReactNode;
}) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [enviado, setEnviado] = useState(false);
  // No servidor e no primeiro desenho a abertura está à vista: barra e
  // cabeçalho escondidos. Quem decide depois é o observador.
  const [passou, setPassou] = useState(false);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    if (movimentoReduzido()) {
      setReduzido(true);
      return;
    }
    const abertura = document.querySelector("[data-vt-abertura]");
    if (!abertura || typeof IntersectionObserver === "undefined") {
      setPassou(true);
      return;
    }
    // a mesma régua do desenho: 12% da abertura à vista ainda é abertura
    const obs = new IntersectionObserver(([e]) => setPassou(!e.isIntersecting), {
      threshold: 0.12,
    });
    obs.observe(abertura);
    return () => obs.disconnect();
  }, []);

  const escolherTipo = useCallback((t: string) => setTipo(t), []);
  const marcarEnviado = useCallback(() => setEnviado(true), []);

  const valor = useMemo<EstadoDaVitrine>(
    () => ({
      tipo,
      escolherTipo,
      enviado,
      marcarEnviado,
      barraVisivel: reduzido || passou,
      topoVisivel: !reduzido && passou,
    }),
    [tipo, escolherTipo, enviado, marcarEnviado, reduzido, passou]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** O cabeçalho compacto: aparece quando a abertura sai da tela. */
export function TopoVitrine({ nome, marca }: { nome: string; marca: React.ReactNode }) {
  const { topoVisivel } = useVitrine();
  return (
    <div
      className="vt-topo"
      data-visivel={topoVisivel ? "" : undefined}
      aria-hidden={topoVisivel ? undefined : true}
    >
      {marca}
      <span className="vt-topo-nome">{nome}</span>
      <a href="#orcamento" className="vt-topo-botao" tabIndex={topoVisivel ? undefined : -1}>
        Pedir orçamento
      </a>
    </div>
  );
}

/**
 * A barra fixa do pé: o pedido e o WhatsApp sempre à mão. Depois do
 * pedido enviado, o botão principal vira a conversa — pedir de novo não
 * faz sentido na mesma visita.
 */
export function BarraVitrine({
  whatsapp,
  slug,
  contar,
  previa,
}: {
  whatsapp: string | null;
  slug: string;
  contar: boolean;
  previa: boolean;
}) {
  const { barraVisivel, enviado } = useVitrine();
  const foco = barraVisivel ? undefined : -1;
  return (
    <div
      className="vt-barra"
      data-escondida={barraVisivel ? undefined : ""}
      aria-hidden={barraVisivel ? undefined : true}
    >
      {enviado && whatsapp ? (
        <LinkMedido
          href={whatsapp}
          slug={slug}
          tipo="whatsapp_click"
          contar={contar}
          className="vt-barra-principal"
          foco={foco}
        >
          Conversar no WhatsApp
        </LinkMedido>
      ) : (
        <a
          href="#orcamento"
          className="vt-barra-principal"
          data-previa={previa ? "" : undefined}
          tabIndex={foco}
        >
          Pedir orçamento
        </a>
      )}
      {whatsapp && (
        <LinkMedido
          href={whatsapp}
          slug={slug}
          tipo="whatsapp_click"
          contar={contar}
          rotulo="Conversar no WhatsApp"
          className="vt-barra-whatsapp"
          foco={foco}
        >
          <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
        </LinkMedido>
      )}
    </div>
  );
}

/**
 * As animações de rolagem do desenho que não pertencem a nenhum
 * componente: a linha fina que cresce sob cada rótulo de seção e o fio
 * que acompanha a leitura do "Como funciona". Os valores são os do
 * protótipo (montarAnimacoes).
 */
export function AnimacoesVitrine() {
  useEffect(() => {
    if (movimentoReduzido()) return;
    const limpar: (() => void)[] = [];

    const linhas = Array.from(document.querySelectorAll<HTMLElement>("[data-vt-linha]"));
    if (linhas.length && typeof IntersectionObserver !== "undefined") {
      // recolhe sem transição (senão a linha já visível encolhe à vista)
      for (const l of linhas) {
        l.style.transition = "none";
        l.setAttribute("data-antes", "");
        void l.offsetWidth;
        l.style.transition = "";
      }
      const obs = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (!e.isIntersecting) continue;
            e.target.removeAttribute("data-antes");
            obs.unobserve(e.target);
          }
        },
        { threshold: 0.3, rootMargin: "0px 0px -8% 0px" }
      );
      linhas.forEach((l) => obs.observe(l));
      limpar.push(() => obs.disconnect());
    }

    const roteiro = document.querySelector<HTMLElement>("[data-vt-roteiro]");
    const fio = document.querySelector<HTMLElement>("[data-vt-fio]");
    if (roteiro && fio) {
      const aoRolar = () => {
        const r = roteiro.getBoundingClientRect();
        const alvo = window.innerHeight * 0.78;
        const p = Math.max(0, Math.min(1, (alvo - r.top) / Math.max(1, r.height)));
        fio.style.height = `${Math.round(p * (r.height - 12))}px`;
      };
      window.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar);
      aoRolar();
      limpar.push(() => {
        window.removeEventListener("scroll", aoRolar);
        window.removeEventListener("resize", aoRolar);
      });
    }

    return () => limpar.forEach((f) => f());
  }, []);

  return null;
}
