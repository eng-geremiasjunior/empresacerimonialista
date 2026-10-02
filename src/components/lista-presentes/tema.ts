// As cores e as letras da lista de presentes (/c/<endereço>/presentes):
// as do site do casal, para o convidado sentir que continua no site.
// Roda no servidor; o resultado são só strings (variáveis --lp-*), que
// atravessam para o navegador sem problema.
//
// Papéis: fundo, tinta, suave, linha, acento (decoração) e acento-texto
// (o acento quando vira letra — o pêssego e o ouro claros não têm
// contraste para texto, e os modelos guardam a versão escura deles).
// O botão principal é tinta sobre fundo (invertido), que funciona até na
// paleta Noite, onde o "escuro" do modelo some no fundo.

import { FAMILIAS } from "@/lib/fontes-site";
import { modeloDoTema } from "@/lib/site-modelos";
import { paletaDoModelo } from "@/lib/site-paletas";
import { valoresDoPar } from "@/lib/site-pares";
import type { SitePublico } from "@/lib/site-publico-tipos";

const hex = (v: unknown): string | null => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);

/** As variáveis --lp-* da página, a partir do site publicado. */
export function temaDaLista(site: SitePublico): Record<string, string> {
  const tema = site.site?.tema ?? null;
  const modelo = modeloDoTema(tema);

  if (modelo === "convite") {
    // o "Site do casamento" de sempre: as três cores (ou a paleta do
    // guia), por baixo do tema da 185 — a mesma ordem do ConviteCompleto
    const doGuia = (papel: string) => hex(site.paleta?.find((c) => c.papel === papel)?.hex);
    const c = (tema?.cores ?? {}) as Record<string, unknown>;
    const fundo = hex(c.fundo) ?? hex(site.cores?.fundo) ?? "#faf6f0";
    const tinta = hex(c.tinta) ?? hex(site.cores?.tinta) ?? "#3a342c";
    const acento = hex(c.acento) ?? hex(site.cores?.acento) ?? doGuia("acento") ?? doGuia("principal") ?? "#b06b4a";
    const suave = hex(c.suave) ?? `color-mix(in srgb, ${tinta} 72%, ${fundo})`;
    return {
      "--lp-fundo": fundo,
      "--lp-tinta": tinta,
      "--lp-suave": suave,
      "--lp-linha": `color-mix(in srgb, ${tinta} 14%, ${fundo})`,
      "--lp-acento": acento,
      "--lp-acento-texto": acento,
      "--lp-tit-fam": FAMILIAS.garamond,
      "--lp-tit-peso": "400",
      "--lp-tit-estilo": "normal",
      "--lp-tit-caixa": "none",
      "--lp-tit-ls": "0",
      "--lp-nome-fam": FAMILIAS.garamond,
      "--lp-nome-peso": "400",
      "--lp-nome-estilo": "italic",
      "--lp-nome-caixa": "none",
      "--lp-nome-ls": "0",
      "--lp-texto-fam": FAMILIAS.jost,
    };
  }

  const p = paletaDoModelo(modelo, tema);
  const f = valoresDoPar(tema?.fontes, modelo);
  const proprias = p.proprias ?? {};
  return {
    "--lp-fundo": p.bg,
    "--lp-tinta": p.ink,
    "--lp-suave": p.muted,
    "--lp-linha": p.line,
    "--lp-acento": p.accent,
    "--lp-acento-texto": proprias["--sm-accent-text"] ?? proprias["--sm-gold-text"] ?? p.accent,
    "--lp-tit-fam": FAMILIAS[f.hf],
    "--lp-tit-peso": String(f.hw),
    "--lp-tit-estilo": f.hs,
    "--lp-tit-caixa": f.htt,
    "--lp-tit-ls": f.hls,
    "--lp-nome-fam": FAMILIAS[f.nf],
    "--lp-nome-peso": String(f.nw),
    "--lp-nome-estilo": f.ns,
    "--lp-nome-caixa": f.ntt,
    "--lp-nome-ls": f.nls,
    "--lp-texto-fam": FAMILIAS[f.tf],
  };
}
