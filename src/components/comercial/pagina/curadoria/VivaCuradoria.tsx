"use client";

// O que o modelo Curadoria faz no navegador: o menu lateral que marca a
// seção à vista, os serviços em acordeão, o portfólio com filtro por tipo,
// os depoimentos um por vez, o vídeo que só baixa no play, a ilha do pé e
// a entrada desfocada de cada bloco — como fotografia revelando.
//
// O estado da vitrine (tipo escolhido, pedido enviado) é o mesmo dos
// outros modelos (EstadoDaVitrine). Movimento reduzido: nada anima e nada
// entra desfocado; o conteúdo nunca depende de efeito.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MessageCircle, Play } from "lucide-react";
import type { DepoimentoDaVitrine } from "../DepoimentosVitrine";
import { LinkMedido } from "../MedirPagina";
import { useVitrine } from "../VitrineViva";

const movimentoReduzido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------ o vídeo */

/**
 * O vídeo dela. Até o play, só a capa: o arquivo não é baixado por quem não
 * assiste (preload none). O play chama o vídeo dentro do próprio toque,
 * senão o iPhone não deixa tocar com som. A moldura toma a proporção da
 * capa, que é um quadro do próprio vídeo.
 */
export function VideoCuradoria({
  url,
  capa,
  nome,
}: {
  url: string;
  capa: string | null;
  nome: string;
}) {
  const [tocando, setTocando] = useState(false);
  const [proporcao, setProporcao] = useState<number | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const imagem = useRef<HTMLImageElement>(null);

  // a capa pode ter carregado antes de o React ligar o onLoad
  useEffect(() => {
    const img = imagem.current;
    if (img?.complete && img.naturalWidth) setProporcao(img.naturalWidth / img.naturalHeight);
  }, []);

  const estilo = proporcao
    ? ({ "--cu-video-proporcao": proporcao.toFixed(4) } as CSSProperties)
    : undefined;

  return (
    <div className="cu-video" data-focar="" data-tocando={tocando ? "" : undefined} style={estilo}>
      <video
        ref={video}
        src={url}
        poster={capa ?? undefined}
        preload="none"
        playsInline
        controls={tocando}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (!proporcao && v.videoWidth && v.videoHeight) setProporcao(v.videoWidth / v.videoHeight);
        }}
      />
      {!tocando && (
        <button
          type="button"
          className="cu-video-capa"
          aria-label={`Assistir ao vídeo de ${nome}`}
          onClick={() => {
            setTocando(true);
            video.current?.play().catch(() => {});
          }}
        >
          {capa && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imagem}
              src={capa}
              alt=""
              loading="lazy"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth) setProporcao(img.naturalWidth / img.naturalHeight);
              }}
            />
          )}
          <span className="cu-video-play" aria-hidden="true">
            <Play />
          </span>
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ o menu */

export type ItemDoMenu = { id: string; rotulo: string };

/**
 * Os itens nascem das seções que existem (a página decide): seção vazia
 * não deixa item órfão. Vale a seção que está no meio da tela.
 */
export function MenuCuradoria({ itens }: { itens: ItemDoMenu[] }) {
  const [ativo, setAtivo] = useState(itens[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const alvos = itens
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!alvos.length) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        const vistas = entradas.filter((e) => e.isIntersecting);
        if (!vistas.length) return;
        vistas.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setAtivo(vistas[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [itens]);

  return (
    <nav className="cu-menu" aria-label="Nesta página">
      {itens.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className="cu-menu-item"
          aria-current={ativo === i.id ? "true" : undefined}
        >
          <span className="cu-menu-icone" aria-hidden="true" />
          <span className="cu-menu-rotulo">{i.rotulo}</span>
        </a>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------ os serviços */

/**
 * Um aberto por vez, e o primeiro já vem aberto para o padrão ficar claro.
 * Toque no cabeçalho inteiro, não num ícone pequeno. Serviço sem descrição
 * não abre: não há o que mostrar.
 */
export function ServicosCuradoria({
  servicos,
}: {
  servicos: { nome: string; descricao: string | null }[];
}) {
  const [aberto, setAberto] = useState(0);
  return (
    <>
      {servicos.map((s, i) => {
        const temTexto = Boolean(s.descricao);
        const estaAberto = temTexto && aberto === i;
        const idTexto = `cu-servico-${i}`;
        return (
          <div
            key={`${i}-${s.nome}`}
            className="cu-servico"
            data-focar
            data-aberto={estaAberto ? "" : undefined}
          >
            <button
              type="button"
              className="cu-servico-cabeca"
              data-fixo={temTexto ? undefined : ""}
              aria-expanded={temTexto ? estaAberto : undefined}
              aria-controls={temTexto ? idTexto : undefined}
              disabled={!temTexto}
              onClick={() => temTexto && setAberto(estaAberto ? -1 : i)}
            >
              <span className="cu-servico-n" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <b className="cu-servico-nome">{s.nome}</b>
              {temTexto && (
                <span className="cu-servico-mais" aria-hidden="true">
                  +
                </span>
              )}
            </button>
            {temTexto && (
              <div className="cu-servico-caixa" id={idTexto}>
                <p className="cu-servico-desc">{s.descricao}</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------ o portfólio */

export type FotoDaCuradoria = {
  url: string;
  legenda: string;
  alt: string;
  tipo: string;
  rotuloDoTipo: string;
};

// as quatro formas que se alternam, inclusive uma em arco pleno
const RAIOS = ["20px", "20px 20px 20px 70px", "999px 999px 20px 20px", "20px"];

/**
 * Os filtros nascem dos tipos das fotos que ela marcou — nunca uma lista
 * fixa. Tocar numa foto faz ela ocupar a largura inteira ali mesmo, sem
 * tela cheia por cima. Filtro sem foto convida ao orçamento.
 */
export function EventosCuradoria({ fotos }: { fotos: FotoDaCuradoria[] }) {
  const [filtro, setFiltro] = useState("todos");
  const [aberta, setAberta] = useState<number | null>(null);

  const tipos = useMemo(() => {
    const vistos: { tipo: string; rotulo: string }[] = [];
    for (const f of fotos) {
      if (!vistos.some((v) => v.tipo === f.tipo)) vistos.push({ tipo: f.tipo, rotulo: f.rotuloDoTipo });
    }
    return vistos;
  }, [fotos]);

  const visiveis = fotos
    .map((f, i) => ({ ...f, i }))
    .filter((f) => filtro === "todos" || f.tipo === filtro);

  return (
    <>
      {/* com um tipo só, filtrar não escolhe nada */}
      {tipos.length > 1 && (
        <div className="cu-filtros" role="group" aria-label="Tipo de evento">
          {[{ tipo: "todos", rotulo: "Todos os eventos" }, ...tipos].map((t) => (
            <button
              key={t.tipo}
              type="button"
              className="cu-filtro"
              aria-pressed={filtro === t.tipo}
              onClick={() => {
                setFiltro(t.tipo);
                setAberta(null);
              }}
            >
              {t.rotulo}
            </button>
          ))}
        </div>
      )}

      {visiveis.length > 0 ? (
        <div className="cu-grade">
          {visiveis.map((f, ordem) => {
            const estaAberta = aberta === f.i;
            return (
              <button
                key={`${filtro}-${f.i}`}
                type="button"
                className="cu-foto"
                data-aberta={estaAberta ? "" : undefined}
                aria-expanded={estaAberta}
                onClick={() => setAberta(estaAberta ? null : f.i)}
                style={{ animationDelay: `${Math.min(ordem * 55, 330)}ms` }}
              >
                <span className="cu-foto-moldura" style={{ borderRadius: RAIOS[f.i % RAIOS.length] }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={f.alt} loading="lazy" decoding="async" />
                </span>
                <span className="cu-foto-legenda">
                  {estaAberta ? `${f.legenda} · toque para recolher` : f.legenda}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="cu-vazio-filtro">
          Ainda não há fotos desse tipo por aqui. Escolha outro tipo ou peça um orçamento — a gente
          atende esse evento.
        </p>
      )}
    </>
  );
}

/* ---------------------------------------------------- os depoimentos */

/**
 * Um por vez, com setas e pontos. Só avança no toque — nunca sozinho. Ao
 * escolher o tipo de evento no formulário, o depoimento passa a ser um
 * daquele tipo, quando ela tem um.
 */
export function DepoimentosCuradoria({ depoimentos }: { depoimentos: DepoimentoDaVitrine[] }) {
  const { tipo } = useVitrine();
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (!tipo) return;
    const i = depoimentos.findIndex((d) => d.tipo === tipo);
    if (i >= 0) setIndice(i);
  }, [tipo, depoimentos]);

  if (depoimentos.length === 0) return null;
  const n = depoimentos.length;
  const atual = depoimentos[((indice % n) + n) % n];
  const rotulo = n === 1 ? "Depoimento" : "Depoimentos";

  return (
    <div className="cu-dep-dentro">
      <p className="cu-rotulo">{rotulo}</p>
      {/* a chave remonta o bloco quando o depoimento troca: a entrada recomeça */}
      <figure key={`${atual.quem}|${atual.texto}`} className="cu-dep-atual" aria-live="polite">
        <span className="cu-aspas" aria-hidden="true">
          “
        </span>
        <blockquote className="cu-dep-texto">{atual.texto}</blockquote>
        <figcaption className="cu-dep-quem">{atual.quem}</figcaption>
      </figure>
      {n > 1 && (
        <div className="cu-dep-nav">
          <button
            type="button"
            className="cu-dep-seta"
            aria-label="Depoimento anterior"
            onClick={() => setIndice((i) => i - 1)}
          >
            ‹
          </button>
          <div className="cu-dep-pontos" aria-hidden="true">
            {depoimentos.map((d, i) => (
              <span
                key={`${i}-${d.quem}`}
                className="cu-dep-ponto"
                data-atual={i === ((indice % n) + n) % n ? "" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="cu-dep-seta"
            aria-label="Próximo depoimento"
            onClick={() => setIndice((i) => i + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------- a ilha do pé */

/** Pedido e WhatsApp sempre à mão; depois do pedido, a chamada vira a conversa. */
export function BarraCuradoria({
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
  const { enviado } = useVitrine();
  return (
    <div className="cu-barra">
      <div className="cu-barra-ilha">
        {enviado && whatsapp ? (
          <LinkMedido
            href={whatsapp}
            slug={slug}
            tipo="whatsapp_click"
            contar={contar}
            className="cu-barra-principal"
          >
            Conversar no WhatsApp
          </LinkMedido>
        ) : (
          <a href="#orcamento" className="cu-barra-principal" data-previa={previa ? "" : undefined}>
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
            className="cu-barra-whatsapp"
          >
            <MessageCircle size={20} strokeWidth={1.8} aria-hidden />
          </LinkMedido>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------- a entrada desfocada */

/** Põe o estado inicial sem transição (senão o bloco some à vista). */
function semTransicao(el: HTMLElement, fazer: () => void) {
  el.style.transition = "none";
  fazer();
  void el.offsetWidth;
  el.style.transition = "";
}

export function AnimacoesCuradoria() {
  useEffect(() => {
    if (movimentoReduzido() || typeof IntersectionObserver === "undefined") return;
    const raiz = document.querySelector<HTMLElement>(".cu");
    if (!raiz) return;
    raiz.setAttribute("data-animada", "");

    const blocos = Array.from(raiz.querySelectorAll<HTMLElement>("[data-focar]"));
    blocos.forEach((b) => semTransicao(b, () => b.setAttribute("data-antes", "")));
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.removeAttribute("data-antes");
          obs.unobserve(e.target);
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -5% 0px" }
    );
    blocos.forEach((b) => obs.observe(b));

    return () => {
      obs.disconnect();
      // desmontou antes de entrar: nada fica escondido
      blocos.forEach((b) => b.removeAttribute("data-antes"));
      raiz.removeAttribute("data-animada");
    };
  }, []);

  return null;
}
