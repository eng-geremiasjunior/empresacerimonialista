"use client";

// O que vestir (o bloco "Dress code"). O desenho põe o traje dentro do
// cartão do programa ("Tenue · Traje: Social"), e é lá que o texto fica
// quando o programa está no site. Este bloco desenha o resto:
//
//   · com o programa: só as fotos de referência (até 3), nas molduras de
//     ouro com passe-partout da galeria; sem fotos, nada;
//   · sem o programa: o cartão de papel com as molduras, "Tenue · Traje",
//     o título, o texto e as fotos.
//
// Foto que falta some (na prévia, os 3 espaços convidam a foto só no
// cartão próprio; com o traje no programa, sem foto o bloco não sai).

import { lerDressCode } from "@/lib/site-conteudo";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { MolduraDupla, useUrlDaFoto, type PropsDaSecao } from "../comum";

export function fotosDoTraje(caminhos: string[], modo: string, resolver: (c: string) => string | null): (string | null)[] {
  if (modo === "previa") return [0, 1, 2].map((i) => caminhos[i] ?? null);
  return caminhos.filter((c) => !!resolver(c));
}

export function textoDoTraje(dados: PropsDaSecao["dados"]): { titulo: string; texto: string } {
  return { titulo: dados.site?.dress_code_titulo?.trim() ?? "", texto: dados.site?.dress_code?.trim() ?? "" };
}

export function temTraje(p: Pick<PropsDaSecao, "dados" | "bloco" | "modo"> & { resolver: (c: string) => string | null }): boolean {
  const t = textoDoTraje(p.dados);
  return !!(t.titulo || t.texto || fotosDoTraje(lerDressCode(p.bloco.conteudo).fotos, p.modo, p.resolver).length);
}

function Fotos({ fotos }: { fotos: (string | null)[] }) {
  const resolver = useUrlDaFoto();
  return (
    <div className="f-traje-fotos">
      {fotos.map((f, i) => (
        <div key={i} data-revelar="up" data-atraso={i * 120 || undefined} className="f-moldura-ouro f-traje-foto">
          <div className="f-passe">
            <EspacoDeFoto url={resolver(f)} forma="retangulo" proporcao="3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Traje({
  dados,
  bloco,
  modo,
  noPrograma,
  colada,
}: PropsDaSecao & {
  /** o texto já está no cartão do programa */
  noPrograma: boolean;
  /** vem logo depois do programa: continua o fundo dele, sem o respiro de cima */
  colada?: boolean;
}) {
  const resolver = useUrlDaFoto();
  const fotos = fotosDoTraje(lerDressCode(bloco.conteudo).fotos, modo, (c) => resolver(c));
  const t = textoDoTraje(dados);

  if (noPrograma) {
    // o desenho não tem este bloco: sem foto de verdade, nem na prévia
    if (!fotos.some(Boolean)) return null;
    return (
      <section className={`f-secao f-alt f-traje-secao ${colada ? "f-traje-secao--colada" : ""}`}>
        <Fotos fotos={fotos} />
      </section>
    );
  }

  return (
    <section className="f-secao f-traje-secao">
      <div data-revelar="up" className="f-papel f-traje-cartao">
        <MolduraDupla />
        <div className="f-papel-miolo">
          <div className="f-eyebrow">Tenue · Traje</div>
          {t.titulo && <h2 className="f-h2 f-h2--sm">{t.titulo}</h2>}
          {t.texto && <p className="f-traje-p">{t.texto}</p>}
        </div>
      </div>
      {fotos.length > 0 && <Fotos fotos={fotos} />}
    </section>
  );
}
