"use client";

// "Cadastre seu primeiro …" — o cartão principal do painel do primeiro
// acesso, com o álbum vivo (efeito A, escolhido pelo dono em 29/09/2026).
//
// A foto passa por cinco eventos (Album.tsx) e a expressão do título troca
// junto ("seu primeiro casamento", "sua primeira formatura"…). É o que diz
// "o sistema vai além do casamento" sem uma frase explicando (regra do
// sistema operacional de eventos). Com "reduzir movimento", fica parado na
// primeira foto e o título diz "seu primeiro evento".

import Link from "next/link";
import { FotosDoAlbum, useAlbum, type SlideDoAlbum } from "@/components/dashboard/Album";
import { FOTOS_DO_ALBUM } from "@/lib/fotos-de-evento";

const CORPO = "#57534E";
const APOIO = "#78716C";
const LINHA = "#E6E0D8";
const SALVIA = "#6E7F63";
const F_TITLE = "var(--font-title), Inter, system-ui, sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', ui-monospace, monospace";

const SLIDES: SlideDoAlbum[] = FOTOS_DO_ALBUM.map((f) => ({
  chave: f.tipo,
  foto: f.foto,
  selo: f.selo,
  rotulo: f.selo,
}));

export function ComeceAqui() {
  const album = useAlbum(SLIDES.length);
  // a expressão inteira troca, e não só a palavra: "sua primeira formatura"
  const palavra = album.semMovimento ? "seu primeiro evento" : FOTOS_DO_ALBUM[album.visivel].frase;
  const variantes = ["seu primeiro evento", ...FOTOS_DO_ALBUM.map((f) => f.frase)];

  return (
    <section
      aria-label="Comece aqui"
      className="pa-comece"
      onMouseEnter={album.pausar}
      onMouseLeave={album.seguir}
      style={{ display: "flex", minHeight: 250, background: "#fff", border: `1px solid ${LINHA}`, borderRadius: 14, overflow: "hidden" }}
    >
      <FotosDoAlbum
        slides={SLIDES}
        album={album}
        sizes="(max-width: 640px) 100vw, 440px"
        rotuloDoGrupo="Tipos de evento"
        className="pa-comece-foto"
        style={{ flex: "0 1 38%", maxWidth: 440, minWidth: 180 }}
      />

      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", minWidth: 0, flex: 1 }}>
        <span style={{ fontFamily: F_MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: SALVIA }}>COMECE AQUI</span>
        <h2 style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: 22, lineHeight: 1.25, letterSpacing: "-0.02em", display: "grid" }}>
          <span className="sr-only">Cadastre seu primeiro evento</span>
          {/* todas as variantes empilhadas e invisíveis: a altura do título
              é a da frase mais longa, e a página não pula quando a palavra
              troca */}
          {variantes.map((v) => (
            <span key={v} aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden" }}>
              Cadastre {v}
            </span>
          ))}
          <span aria-hidden style={{ gridArea: "1 / 1" }}>
            Cadastre{" "}
            {/* palavra por palavra, com um atraso pequeno entre elas: a
                linha quebra entre as palavras no celular */}
            <span key={palavra}>
              {palavra.split(" ").map((p, i, todas) => (
                <span key={i}>
                  <span className="pa-palavra" style={{ animationDelay: `${i * 60}ms` }}>
                    {p}
                  </span>
                  {i < todas.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </span>
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: CORPO, maxWidth: "52ch", textWrap: "pretty" }}>
          Nome do cliente, tipo de evento, data e local. O resto do sistema se organiza a partir dele.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
          <Link
            href="/eventos/novo"
            className="ev-btn-primario ev-foco"
            style={{ display: "inline-flex", alignItems: "center", height: 40, padding: "0 18px", borderRadius: 10, background: "var(--ev-accent)", color: "#fff", fontSize: 14, fontWeight: 600, transition: "background 140ms ease" }}
          >
            Criar evento
          </Link>
          <span style={{ fontFamily: F_MONO, fontSize: 12, color: APOIO }}>cerca de 2 min</span>
        </div>
      </div>
    </section>
  );
}
