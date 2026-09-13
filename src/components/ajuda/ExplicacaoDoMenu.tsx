"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ExplicacaoDoMenu as Ficha } from "@/lib/explicacoes-do-menu";
import { useExplicacoes } from "@/components/ajuda/ContextoDasExplicacoes";

/**
 * O `?` ao lado de um item de menu, e a ficha que ele abre.
 *
 * DUAS DECISÕES QUE PARECEM DETALHE E NÃO SÃO:
 *
 * 1. A ficha vai num PORTAL, com posição fixa. A `<nav>` da barra lateral
 *    tem `overflow-y-auto` para o menu poder rolar — e `overflow` recorta
 *    qualquer filho posicionado. Uma ficha `absolute` dentro do menu
 *    apareceria cortada na borda, ou sumiria ao rolar. O mesmo vale para
 *    a barra de abas do evento, que rola para o lado.
 *
 * 2. O `?` é IRMÃO do link, não filho. Botão dentro de link é HTML
 *    inválido, e o clique subiria para o link: a pessoa pediria a
 *    explicação e ganharia a navegação.
 *
 * "Pra não flodar" (palavra do dono): a ficha só abre pelo `?`, nunca por
 * passar o mouse no item; e abre com um atraso curto, para atravessar o
 * menu com o mouse não disparar seis fichas no caminho.
 */

/** Atraso para abrir. Curto o bastante para não parecer travado. */
const ATRASO_ABRIR = 140;
/** Carência para fechar: o tempo de levar o mouse do `?` até a ficha. */
const CARENCIA_FECHAR = 140;

type Props = {
  rotulo: string;
  explicacao: Ficha;
  /**
   * Em que fundo o `?` está. A barra lateral é escura; as fases e as abas
   * do evento são claras, e o traço da barra sumiria nelas.
   */
  tom?: "escuro" | "claro";
  /** De que lado a ficha nasce. A barra lateral empurra para a direita. */
  ancora?: "barra" | "solto";
};

export function ExplicacaoDoMenu({
  rotulo,
  explicacao,
  tom = "escuro",
  ancora = "barra",
}: Props) {
  const { ligadas, desativar } = useExplicacoes();
  const [aberta, setAberta] = useState(false);
  const [caixa, setCaixa] = useState<{ topo: number; esquerda: number } | null>(null);
  const botao = useRef<HTMLButtonElement | null>(null);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  // O portal só existe depois da montagem: no servidor não há `document`,
  // e renderizar a ficha no primeiro render divergiria da hidratação.
  const [montado, setMontado] = useState(false);
  const id = useId();

  useEffect(() => {
    setMontado(true);
    return () => {
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, []);

  const posicionar = useCallback(() => {
    const el = botao.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const LARGURA = 320;
    const MARGEM = 12;

    let esquerda: number;
    if (ancora === "barra") {
      // A partir da borda da BARRA, não da do `?`. Medindo pelo botão, a
      // ficha nascia 10px para dentro da barra e ficava um cartão branco
      // montado sobre o menu escuro.
      const barra = el.closest("aside")?.getBoundingClientRect();
      esquerda = Math.max(r.right, barra?.right ?? r.right) + 10;
    } else {
      // Solto no meio do conteúdo: a ficha desce alinhada pelo `?`, e só
      // recua quando encostaria na borda direita da janela.
      esquerda = r.left - 12;
    }
    esquerda = Math.min(esquerda, window.innerWidth - LARGURA - MARGEM);

    const topo =
      ancora === "barra"
        ? Math.max(MARGEM, Math.min(r.top - 8, window.innerHeight - 260))
        : // Abaixo do `?`; se não couber embaixo, acima dele.
          r.bottom + 8 + 300 > window.innerHeight
          ? Math.max(MARGEM, r.top - 308)
          : r.bottom + 8;

    setCaixa({ topo, esquerda: Math.max(MARGEM, esquerda) });
  }, [ancora]);

  const abrir = useCallback(() => {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => {
      posicionar();
      setAberta(true);
    }, ATRASO_ABRIR);
  }, [posicionar]);

  const fechar = useCallback((imediato = false) => {
    if (relogio.current) clearTimeout(relogio.current);
    if (imediato) {
      setAberta(false);
      return;
    }
    relogio.current = setTimeout(() => setAberta(false), CARENCIA_FECHAR);
  }, []);

  // Rolar ou redimensionar com a ficha aberta deixaria ela órfã, longe do
  // `?` que a abriu. Fecha — é mais honesto que reposicionar a cada quadro.
  useEffect(() => {
    if (!aberta) return;
    const sai = () => setAberta(false);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberta(false);
        botao.current?.focus();
      }
    };
    window.addEventListener("scroll", sai, true);
    window.addEventListener("resize", sai);
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("scroll", sai, true);
      window.removeEventListener("resize", sai);
      window.removeEventListener("keydown", tecla);
    };
  }, [aberta]);

  if (!ligadas) return null;

  const ficha =
    aberta && caixa && montado
      ? createPortal(
          <div
            id={id}
            role="tooltip"
            onMouseEnter={() => {
              if (relogio.current) clearTimeout(relogio.current);
            }}
            onMouseLeave={() => fechar()}
            style={{ top: caixa.topo, left: caixa.esquerda, width: 320 }}
            className="fixed z-[60] rounded-xl border border-stone-200 bg-white p-4 shadow-xl"
          >
            <p className="text-sm font-semibold text-stone-900">{rotulo}</p>

            <p className="mt-2 text-[13px] leading-relaxed text-stone-700">
              {explicacao.oQueE}
            </p>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Para que serve
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-700">
              {explicacao.paraQue}
            </p>

            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Como usar
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-stone-700">
              {explicacao.comoUsar}
            </p>

            {/* O desligamento mora AQUI, dentro da própria ficha — pedido
                do dono. Quem está cansado das explicações está olhando uma
                delas; obrigar a caçar o interruptor em Configurações seria
                justamente o atrito que a ficha existe para evitar. */}
            <button
              type="button"
              onClick={() => {
                setAberta(false);
                desativar();
              }}
              className="mt-4 w-full rounded-lg border border-stone-200 px-3 py-1.5 text-[12px] font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800"
            >
              Desativar explicações
            </button>
            <p className="mt-1.5 text-center text-[11px] text-stone-400">
              Você religa em Configurações.
            </p>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={`O que é ${rotulo}`}
        aria-expanded={aberta}
        aria-describedby={aberta ? id : undefined}
        onMouseEnter={abrir}
        onMouseLeave={() => fechar()}
        onFocus={() => {
          posicionar();
          setAberta(true);
        }}
        onBlur={() => fechar(true)}
        // Sem mouse (celular, tablet) o `?` responde ao toque.
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (aberta) {
            fechar(true);
          } else {
            posicionar();
            setAberta(true);
          }
        }}
        // 11px: o dono pediu uns 30% menor que os 16px iniciais. Nesse
        // tamanho o traço precisa ser mais claro que o texto ao lado,
        // senão o "?" compete com o nome do item em vez de acompanhá-lo.
        className={`flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full border text-[8px] font-semibold leading-none transition-colors ${
          tom === "claro"
            ? aberta
              ? "border-stone-500 bg-stone-700 text-white"
              : "border-stone-300 text-stone-400 hover:border-stone-500 hover:text-stone-700"
            : aberta
              ? "border-stone-300 bg-white text-stone-900"
              : "border-stone-600 text-stone-500 hover:border-stone-400 hover:text-stone-200"
        }`}
      >
        ?
      </button>
      {ficha}
    </>
  );
}
