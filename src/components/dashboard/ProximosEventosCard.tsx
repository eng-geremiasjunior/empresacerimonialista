"use client";

// Os próximos eventos, um por foto (29/09/2026, escolha do dono): no painel
// de quem já tem evento, entre os números e a lista. Cada foto é um dos
// três próximos eventos pela data — a capa dele, ou a foto do tipo quando
// não tem capa — e o texto ao lado acompanha: nome, "em 12 dias" e até
// três sugestões do que falta (os alertas da saúde do evento, com o botão
// de resolver). O mesmo álbum do "Comece aqui" (Album.tsx).

import Link from "next/link";
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

export function ProximosEventosCard({ eventos }: { eventos: ProximoEvento[] }) {
  const album = useAlbum(eventos.length);
  if (eventos.length === 0) return null;

  const slides: SlideDoAlbum[] = eventos.map((e) => ({
    chave: e.id,
    foto: e.foto,
    externa: e.externa,
    selo: e.quando,
    rotulo: e.titulo,
  }));

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
        {eventos.map((e, i) => {
          const ativo = i === album.visivel;
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
