"use client";

// O que o modelo Capítulos faz no navegador: o cabeçalho compacto e a
// barra do pé (os dois entram quando a abertura sai da tela) e as
// animações do desenho — a foto de abertura se aproximando devagar, a
// seta que flutua, a linha que cresce sob cada rótulo, o capítulo que
// sobe ao entrar e a régua do 03, que se desenha pauta por pauta.
//
// O estado (tipo escolhido, pedido enviado, abertura à vista) é o mesmo
// da vitrine Clássica (EstadoDaVitrine). Movimento reduzido: nada anima;
// a barra fica sempre à mostra e o cabeçalho compacto não aparece.

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { LinkMedido } from "../MedirPagina";
import { useVitrine } from "../VitrineViva";

const movimentoReduzido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TopoCapitulos({ nome }: { nome: string }) {
  const { topoVisivel } = useVitrine();
  return (
    <div
      className="cp-topo"
      data-visivel={topoVisivel ? "" : undefined}
      aria-hidden={topoVisivel ? undefined : true}
    >
      <span className="cp-topo-nome">{nome}</span>
      <a href="#orcamento" className="cp-botao cp-topo-botao" tabIndex={topoVisivel ? undefined : -1}>
        Pedir orçamento
      </a>
    </div>
  );
}

/**
 * A barra do pé: o pedido e o WhatsApp sempre à mão. Depois do pedido
 * enviado, o botão principal vira a conversa.
 */
export function BarraCapitulos({
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
      className="cp-barra"
      data-escondida={barraVisivel ? undefined : ""}
      aria-hidden={barraVisivel ? undefined : true}
    >
      {enviado && whatsapp ? (
        <LinkMedido
          href={whatsapp}
          slug={slug}
          tipo="whatsapp_click"
          contar={contar}
          className="cp-barra-principal"
          foco={foco}
        >
          Conversar no WhatsApp
        </LinkMedido>
      ) : (
        <a
          href="#orcamento"
          className="cp-barra-principal"
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
          className="cp-barra-whatsapp"
          foco={foco}
        >
          <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
        </LinkMedido>
      )}
    </div>
  );
}

/** Põe o estado inicial sem transição (senão o elemento some à vista). */
function semTransicao(el: HTMLElement, fazer: () => void) {
  el.style.transition = "none";
  fazer();
  void el.offsetWidth;
  el.style.transition = "";
}

export function AnimacoesCapitulos() {
  useEffect(() => {
    if (movimentoReduzido() || typeof IntersectionObserver === "undefined") return;
    const raiz = document.querySelector<HTMLElement>(".cp");
    if (!raiz) return;
    const limpar: (() => void)[] = [];

    // a abertura: aproximação lenta da foto e a seta que flutua
    raiz.setAttribute("data-animada", "");
    limpar.push(() => raiz.removeAttribute("data-animada"));

    // o que entra uma vez: a linha sob o rótulo e o capítulo inteiro
    const linhas = Array.from(raiz.querySelectorAll<HTMLElement>("[data-cp-linha]"));
    const capitulos = Array.from(raiz.querySelectorAll<HTMLElement>("[data-cp-capitulo]"));
    linhas.forEach((l) => semTransicao(l, () => l.setAttribute("data-antes", "")));
    capitulos.forEach((c) => semTransicao(c, () => c.setAttribute("data-antes", "")));
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.removeAttribute("data-antes");
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    linhas.forEach((l) => obs.observe(l));
    capitulos.forEach((c) => obs.observe(c));
    limpar.push(() => {
      obs.disconnect();
      // desmontou antes de entrar: nada fica escondido
      [...linhas, ...capitulos].forEach((el) => el.removeAttribute("data-antes"));
    });

    // a régua do 03: cada pauta se desenha, uma a cada 300 ms, e a última
    // linha fecha a régua
    const regua = raiz.querySelector<HTMLElement>("[data-cp-regua]");
    if (regua) {
      const pautas = Array.from(regua.querySelectorAll<HTMLElement>("[data-cp-pauta]"));
      const fim = regua.querySelector<HTMLElement>("[data-cp-regua-fim]");
      const todas = fim ? [...pautas, fim] : pautas;
      todas.forEach((p) => semTransicao(p, () => p.setAttribute("data-antes", "")));
      const relogios: number[] = [];
      const or = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          todas.forEach((p, i) => {
            relogios.push(window.setTimeout(() => p.removeAttribute("data-antes"), i * 300));
          });
          or.disconnect();
        },
        { threshold: 0.2 }
      );
      or.observe(regua);
      limpar.push(() => {
        or.disconnect();
        relogios.forEach((r) => window.clearTimeout(r));
        todas.forEach((p) => p.removeAttribute("data-antes"));
      });
    }

    return () => limpar.forEach((f) => f());
  }, []);

  return null;
}
