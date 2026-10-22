"use client";

// Os próximos eventos, um por foto (29/09/2026, escolha do dono): no painel
// de quem já tem evento, entre os números e a lista. Cada foto é um dos
// três próximos eventos pela data — a capa dele, ou a foto do tipo quando
// não tem capa — e o texto ao lado acompanha: nome, "em 12 dias" e até
// três sugestões do que falta (os alertas da saúde do evento, com o botão
// de resolver). O mesmo álbum do "Comece aqui" (Album.tsx).

import Link from "next/link";
import { Smartphone, Users, Zap } from "lucide-react";
import { FotosDoAlbum, useAlbum, type SlideDoAlbum } from "@/components/dashboard/Album";
import type { FotoDeEvento } from "@/lib/fotos-de-evento";

const TINTA = "#221E1B";
const CORPO = "#57534E";
const APOIO = "#78716C";
const LINHA = "#E6E0D8";
const SALVIA = "#6E7F63";
const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

export type ProximoEvento = {
  id: string;
  titulo: string;
  /** "30/09/2026 · 19:00 · Orla" */
  linha: string;
  /** "amanhã", "em 12 dias", "hoje" */
  quando: string;
  foto: FotoDeEvento;
  /** a foto é a capa no Storage (fora do otimizador do Next) */
  externa: boolean;
  sugestoes: { texto: string; acao: string; href: string }[];
};

/** O banner do portal dos noivos (20/10/2026, pedido dele): o primeiro
 *  slide, antes dos eventos. A foto é o site de verdade do casal de
 *  exemplo (modelo Clássico), fotografado em tela larga. */
export type AnuncioDoPortal = {
  /** o Portal da cliente do próximo casamento; nulo sem casamento à frente */
  liberarHref: string | null;
};

const FOTO_DO_ANUNCIO: FotoDeEvento = {
  src: "/site/banner-portal-noivos.webp",
  posicao: "50% 35%",
  zoom: 1,
  foco: "50% 50%",
  alt: "O site do casamento de um casal, com o monograma e os nomes",
};

/** O banner do RSVP (21/10/2026, a arte que ele escolheu): o segundo slide.
 *  A foto é ilustrativa (a tela do celular não é a nossa); dentro do
 *  sistema ela clica e vê a tela real logo depois. */
export type AnuncioDoRsvp = {
  /** o RSVP do próximo evento com lista de convidados; nulo sem evento */
  href: string | null;
};

const FOTO_DO_RSVP: FotoDeEvento = {
  src: "/site/banner-confirmacao.webp",
  posicao: "50% 40%",
  zoom: 1,
  foco: "50% 50%",
  alt: "Uma mão segurando o celular com a tela de confirmação de presença, numa mesa com flores",
};

const BENEFICIOS_DO_RSVP = [
  { icone: Smartphone, texto: "Funciona em qualquer celular" },
  { icone: Zap, texto: "Resposta em segundos" },
  { icone: Users, texto: "Você já sabe quem vai" },
];

export function ProximosEventosCard({
  eventos,
  anuncio = null,
  rsvp = null,
}: {
  eventos: ProximoEvento[];
  anuncio?: AnuncioDoPortal | null;
  rsvp?: AnuncioDoRsvp | null;
}) {
  const indiceDoRsvp = rsvp ? (anuncio ? 1 : 0) : -1;
  const extra = (anuncio ? 1 : 0) + (rsvp ? 1 : 0);
  const album = useAlbum(eventos.length + extra);
  if (eventos.length + extra === 0) return null;

  const slides: SlideDoAlbum[] = [
    ...(anuncio
      ? [{ chave: "anuncio-portal", foto: FOTO_DO_ANUNCIO, selo: "PORTAL DOS NOIVOS", rotulo: "Site e lista de presentes" }]
      : []),
    ...(rsvp ? [{ chave: "anuncio-rsvp", foto: FOTO_DO_RSVP, selo: "RSVP", rotulo: "RSVP" }] : []),
    ...eventos.map((e) => ({
      chave: e.id,
      foto: e.foto,
      externa: e.externa,
      selo: e.quando,
      rotulo: e.titulo,
    })),
  ];
  const anuncioAtivo = !!anuncio && album.visivel === 0;
  const rsvpAtivo = !!rsvp && album.visivel === indiceDoRsvp;

  return (
    <section
      aria-label="Seus próximos eventos"
      className="pa-comece"
      onMouseEnter={album.pausar}
      onMouseLeave={album.seguir}
      style={{ display: "flex", minHeight: 250, background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 14, overflow: "hidden" }}
    >
      <FotosDoAlbum
        slides={slides}
        album={album}
        sizes="(max-width: 640px) 100vw, 440px"
        rotuloDoGrupo="Próximos eventos"
        className="pa-comece-foto"
        style={{ flex: "0 1 38%", maxWidth: 440, minWidth: 180 }}
      />

      {/* os textos de todos os eventos empilhados no mesmo lugar: a altura
          do cartão é a do mais alto, e nada pula quando a foto troca */}
      <div style={{ display: "grid", minWidth: 0, flex: 1 }}>
        {anuncio && (
          <div
            aria-hidden={!anuncioAtivo}
            style={{
              gridArea: "1 / 1",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              justifyContent: "center",
              minWidth: 0,
              visibility: anuncioAtivo ? "visible" : "hidden",
              opacity: anuncioAtivo ? 1 : 0,
              transition: "opacity 600ms ease",
            }}
          >
            <span style={{ fontFamily: F_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ev-accent)" }}>
              PARA OS SEUS CASAIS
            </span>
            <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.02em", color: TINTA }}>
              Site do casamento e lista de presentes, no portal dos noivos.
            </h2>
            <ul style={{ listStyle: "none", margin: "2px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "O casal escolhe o modelo do site e publica pelo celular.",
                "Presentes em Pix ou cartão em até 6x. Metade da taxa é sua.",
              ].map((t) => (
                <li key={t} style={{ display: "flex", gap: 8, fontSize: 13.5, lineHeight: 1.45, color: CORPO }}>
                  <span aria-hidden style={{ flex: "none", width: 5, height: 5, borderRadius: 999, background: "var(--ev-accent)", marginTop: 8 }} />
                  {t}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 16px" }}>
              <Link
                href="/conhecer"
                tabIndex={anuncioAtivo ? undefined : -1}
                className="ev-btn-primario ev-foco"
                style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 18px", borderRadius: 10, background: "var(--ev-accent)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 140ms ease" }}
              >
                Ver o portal dos noivos
              </Link>
              {anuncio.liberarHref && (
                <Link href={anuncio.liberarHref} tabIndex={anuncioAtivo ? undefined : -1} style={{ fontSize: 13.5, fontWeight: 600, color: "#3B3835" }}>
                  Liberar para um casal →
                </Link>
              )}
            </div>
          </div>
        )}
        {rsvp && (
          <div
            aria-hidden={!rsvpAtivo}
            style={{
              gridArea: "1 / 1",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              justifyContent: "center",
              minWidth: 0,
              visibility: rsvpAtivo ? "visible" : "hidden",
              opacity: rsvpAtivo ? 1 : 0,
              transition: "opacity 600ms ease",
            }}
          >
            <span style={{ fontFamily: F_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ev-accent)" }}>
              CONFIRMAÇÃO DE PRESENÇA
            </span>
            <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.02em", color: TINTA }}>
              Torne a experiência do seu evento ainda mais especial.
            </h2>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: CORPO }}>
              Com o RSVP, seus convidados confirmam presença de forma simples, rápida e prática.
            </p>
            <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "8px 22px" }}>
              {BENEFICIOS_DO_RSVP.map(({ icone: Icone, texto }) => (
                <li key={texto} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: CORPO }}>
                  <span aria-hidden style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 999, background: "#F2EEE9", color: TINTA }}>
                    <Icone size={14} strokeWidth={1.8} />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
            {rsvp.href && (
              <div style={{ marginTop: 6 }}>
                <Link
                  href={rsvp.href}
                  tabIndex={rsvpAtivo ? undefined : -1}
                  className="ev-btn-primario ev-foco"
                  style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 18px", borderRadius: 10, background: "var(--ev-accent)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 140ms ease" }}
                >
                  Abrir o RSVP →
                </Link>
              </div>
            )}
          </div>
        )}
        {eventos.map((e, i) => {
          const ativo = i + extra === album.visivel;
          return (
            <div
              key={e.id}
              aria-hidden={!ativo}
              style={{
                gridArea: "1 / 1",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                justifyContent: "center",
                minWidth: 0,
                visibility: ativo ? "visible" : "hidden",
                opacity: ativo ? 1 : 0,
                transition: "opacity 600ms ease",
              }}
            >
              <span style={{ fontFamily: F_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: SALVIA }}>
                {i === 0 ? "SEU PRÓXIMO EVENTO" : "E DEPOIS"}
              </span>
              <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.02em", color: TINTA }}>
                {e.titulo}
              </h2>
              <span style={{ fontFamily: F_MONO, fontSize: 12, color: APOIO }}>
                {e.linha} · {e.quando}
              </span>
              {e.sugestoes.length > 0 ? (
                <ul style={{ listStyle: "none", margin: "2px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {e.sugestoes.map((s) => (
                    <li key={s.texto} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 10px", fontSize: 13.5, lineHeight: 1.45, color: CORPO }}>
                      <span>{s.texto}</span>
                      <Link href={s.href} tabIndex={ativo ? undefined : -1} style={{ fontWeight: 600, color: "#3B3835", whiteSpace: "nowrap" }}>
                        {s.acao} →
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, color: CORPO }}>Nada pendente neste evento por enquanto.</p>
              )}
              <div style={{ marginTop: 6 }}>
                <Link
                  href={`/eventos/${e.id}`}
                  tabIndex={ativo ? undefined : -1}
                  className="ev-btn-primario ev-foco"
                  style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 18px", borderRadius: 10, background: "var(--ev-accent)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 140ms ease" }}
                >
                  Abrir o evento
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
