"use client";

// "Eventos realizados" — o álbum da vitrine.
//
// Colunas, não grade: fotos de proporções diferentes se encaixam sem corte
// e sem buraco (o desenho testou a grade e ela deixava vãos). Acima de
// doze fotos, onze à vista e um botão para o resto; nada de carrossel.
//
// Cada foto abre em tela cheia. O foco vai para o "Fechar", fica preso
// ali enquanto a foto está aberta e volta para a foto ao fechar.
//
// As entradas do desenho (as três primeiras fotos assentando, a máscara
// que revela as duas primeiras) são atributos que a folha conhece,
// postos aqui depois de montar — nunca antes: sem script, as fotos
// aparecem normalmente.

import { useCallback, useEffect, useRef, useState } from "react";

export type FotoDaVitrine = {
  url: string;
  legenda: string | null;
  /** o tipo do evento, já em palavras ("Casamento") */
  tipo: string;
};

const LIMITE_SEM_BOTAO = 12;
const VISIVEIS_ANTES_DO_BOTAO = 11;

function descricao(f: FotoDaVitrine, nomeEmpresa: string): string {
  if (f.legenda) return f.legenda;
  return f.tipo ? `${f.tipo} organizado por ${nomeEmpresa}` : `Evento organizado por ${nomeEmpresa}`;
}

/**
 * Uma foto do álbum. Antes de carregar, a caixa tem a proporção 4:5 (a
 * coluna não pula a cada foto que chega); depois, a proporção da foto.
 * Foto já carregada antes da hidratação não dispara onLoad — por isso a
 * conferência também na montagem.
 */
function FotoDoAlbum({
  foto,
  nomeEmpresa,
  aoAbrir,
  refBotao,
}: {
  foto: FotoDaVitrine;
  nomeEmpresa: string;
  aoAbrir: () => void;
  refBotao: (el: HTMLButtonElement | null) => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  const [proporcao, setProporcao] = useState<string | null>(null);
  const medir = useCallback(() => {
    const i = img.current;
    if (i && i.naturalWidth && i.naturalHeight) setProporcao(`${i.naturalWidth} / ${i.naturalHeight}`);
  }, []);
  useEffect(() => {
    if (img.current?.complete) medir();
  }, [medir]);

  return (
    <button
      type="button"
      className="vt-foto"
      ref={refBotao}
      onClick={aoAbrir}
      aria-label={`Ampliar foto: ${descricao(foto, nomeEmpresa)}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={foto.url}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={medir}
        style={proporcao ? { aspectRatio: proporcao } : undefined}
      />
    </button>
  );
}

export function GaleriaVitrine({
  fotos,
  nomeEmpresa,
}: {
  fotos: FotoDaVitrine[];
  nomeEmpresa: string;
}) {
  const [todas, setTodas] = useState(false);
  const [aberta, setAberta] = useState<number | null>(null);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const fechar = useRef<HTMLButtonElement>(null);
  const quemAbriu = useRef<number | null>(null);
  const primeiraNova = useRef<number | null>(null);

  const cabem = todas || fotos.length <= LIMITE_SEM_BOTAO;
  const visiveis = cabem ? fotos : fotos.slice(0, VISIVEIS_ANTES_DO_BOTAO);

  // as entradas do desenho
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = botoes.current.filter((b): b is HTMLButtonElement => Boolean(b));
    const semTransicao = (el: HTMLElement, fazer: () => void) => {
      el.style.transition = "none";
      fazer();
      void el.offsetWidth;
      el.style.transition = "";
    };

    const mascaradas = els.slice(0, 2);
    const assentando = els.slice(0, 3);
    mascaradas.forEach((el) =>
      semTransicao(el, () => {
        el.removeAttribute("data-revelada");
        el.setAttribute("data-mascara", "");
      })
    );
    assentando.forEach((el, i) =>
      semTransicao(el, () => {
        el.setAttribute("data-giro", i % 2 ? "impar" : "par");
        el.setAttribute("data-assentando", "");
      })
    );
    const relogios = assentando.map((el, i) =>
      window.setTimeout(() => el.removeAttribute("data-assentando"), 260 + i * 110)
    );

    // A máscara revela quando 30% da foto está na tela (8% de folga no pé),
    // a régua do desenho. Pela posição, e não por IntersectionObserver: o
    // Chrome conta o recorte da própria foto, e a foto recortada nunca
    // "entra" — ficava invisível para sempre (defeito do protótipo).
    let pendentes = [...mascaradas];
    const conferir = () => {
      const pe = window.innerHeight * 0.92;
      pendentes = pendentes.filter((el) => {
        const r = el.getBoundingClientRect();
        const visivel = Math.min(r.bottom, pe) - Math.max(r.top, 0);
        if (visivel < 0.3 * r.height) return true;
        el.setAttribute("data-revelada", "");
        return false;
      });
      if (pendentes.length === 0) {
        window.removeEventListener("scroll", conferir);
        window.removeEventListener("resize", conferir);
      }
    };
    window.addEventListener("scroll", conferir, { passive: true });
    window.addEventListener("resize", conferir);
    // no quadro seguinte: a máscara recém-posta ainda precisa ser desenhada
    const primeiro = window.requestAnimationFrame(conferir);

    return () => {
      relogios.forEach((r) => window.clearTimeout(r));
      window.cancelAnimationFrame(primeiro);
      window.removeEventListener("scroll", conferir);
      window.removeEventListener("resize", conferir);
      // desmontou antes de revelar: nada fica escondido
      els.forEach((el) => {
        el.removeAttribute("data-assentando");
        el.setAttribute("data-revelada", "");
      });
    };
  }, []);

  // "Ver as N fotos": o foco segue para a primeira foto que apareceu
  useEffect(() => {
    if (primeiraNova.current === null) return;
    botoes.current[primeiraNova.current]?.focus();
    primeiraNova.current = null;
  }, [todas]);

  // a foto aberta: foco no "Fechar", Esc fecha, a página não rola atrás
  useEffect(() => {
    if (aberta === null) return;
    // a lista é sempre o mesmo objeto (só as posições mudam)
    const lista = botoes.current;
    fechar.current?.focus();
    const raiz = document.documentElement;
    const antes = raiz.style.overflow;
    raiz.style.overflow = "hidden";
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberta(null);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      raiz.style.overflow = antes;
      const origem = quemAbriu.current;
      if (origem !== null) lista[origem]?.focus();
    };
  }, [aberta]);

  const foto = aberta !== null ? fotos[aberta] : null;

  return (
    <>
      <div className="vt-album">
        {visiveis.map((f, i) => (
          <FotoDoAlbum
            key={`${f.url}-${i}`}
            foto={f}
            nomeEmpresa={nomeEmpresa}
            refBotao={(el) => {
              botoes.current[i] = el;
            }}
            aoAbrir={() => {
              quemAbriu.current = i;
              setAberta(i);
            }}
          />
        ))}
      </div>

      {!cabem && (
        <button
          type="button"
          className="vt-botao-mais"
          onClick={() => {
            primeiraNova.current = VISIVEIS_ANTES_DO_BOTAO;
            setTodas(true);
          }}
        >
          Ver as {fotos.length} fotos
        </button>
      )}

      {foto && (
        <div
          className="vt-foto-aberta"
          role="dialog"
          aria-modal="true"
          aria-label={descricao(foto, nomeEmpresa)}
          onClick={() => setAberta(null)}
          onKeyDown={(e) => {
            // o único ponto de foco é o "Fechar": o Tab não sai daqui
            if (e.key === "Tab") {
              e.preventDefault();
              fechar.current?.focus();
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="vt-foto-aberta-img" src={foto.url} alt={descricao(foto, nomeEmpresa)} />
          <div className="vt-foto-aberta-legenda">
            {foto.tipo && <p className="vt-foto-aberta-tipo">{foto.tipo}</p>}
            {foto.legenda && <p className="vt-foto-aberta-texto">{foto.legenda}</p>}
            <p className="vt-foto-aberta-dica">Toque para fechar</p>
          </div>
          <button
            ref={fechar}
            type="button"
            className="vt-foto-aberta-fechar"
            onClick={() => setAberta(null)}
          >
            Fechar
          </button>
        </div>
      )}
    </>
  );
}
