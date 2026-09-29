"use client";

// "O que você encontra aqui" no painel de quem já tem evento (29/09/2026,
// pedido do dono): seis blocos, e os dois primeiros deixam de ser Eventos
// e Clientes para virar "de onde você parou" — a última tela que ela usou
// e o último evento que abriu (lib/ultima-tela.ts, neste navegador). Sem
// memória ainda (aparelho novo), ficam os blocos de antes.

import { useEffect, useState } from "react";
import { CartaoDeArea } from "@/components/dashboard/CartaoDeArea";
import {
  CHAVE_ULTIMA_TELA,
  CHAVE_ULTIMO_EVENTO,
  ler,
  type UltimaTela,
  type UltimoEvento,
} from "@/lib/ultima-tela";

export type AreaDoPainel = { href: string; titulo: string; texto: string; foto: string; posicao: string };

export function AreasDoPainel({
  semMemoriaTela,
  semMemoriaEvento,
  areas,
}: {
  /** o bloco que fica enquanto não há última tela (Eventos) */
  semMemoriaTela: AreaDoPainel;
  /** o bloco que fica enquanto não há último evento (Clientes) */
  semMemoriaEvento: AreaDoPainel;
  areas: AreaDoPainel[];
}) {
  const [tela, setTela] = useState<UltimaTela | null>(null);
  const [evento, setEvento] = useState<UltimoEvento | null>(null);

  // só depois de montar: no servidor não há navegador, e ler no primeiro
  // render faria o painel nascer diferente do HTML
  useEffect(() => {
    setTela(ler<UltimaTela>(CHAVE_ULTIMA_TELA));
    setEvento(ler<UltimoEvento>(CHAVE_ULTIMO_EVENTO));
  }, []);

  // a última tela sendo uma das quatro áreas (Fornecedores, por exemplo),
  // o bloco dela daria dois "Fornecedores": ele cede o lugar a Eventos
  const repetida = tela
    ? areas.find((a) => tela.href === a.href || tela.href.startsWith(`${a.href}/`))
    : undefined;
  const demais = repetida ? areas.map((a) => (a === repetida ? semMemoriaTela : a)) : areas;
  // idem no segundo bloco: última tela Clientes e nenhum evento aberto ainda
  const segundoSemMemoria =
    tela && (tela.href === semMemoriaEvento.href || tela.href.startsWith(`${semMemoriaEvento.href}/`))
      ? semMemoriaTela
      : semMemoriaEvento;

  return (
    <section aria-label="O que você encontra aqui" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ margin: 0, fontFamily: "var(--font-title), Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#221E1B" }}>
        O que você encontra aqui
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(max(220px, calc((100% - 24px) / 3)), 1fr))", gap: 12 }}>
        {tela ? (
          <CartaoDeArea
            href={tela.href}
            titulo={tela.titulo}
            texto={tela.detalhe ? `A última tela que você usou · ${tela.detalhe}` : "A última tela que você usou"}
            foto={tela.foto}
            posicao={tela.posicao}
            externa={tela.externa}
          />
        ) : (
          <CartaoDeArea {...semMemoriaTela} />
        )}
        {evento ? (
          <CartaoDeArea
            href={`/eventos/${evento.id}`}
            titulo={evento.titulo}
            texto={`O último evento que você abriu · ${evento.data}`}
            foto={evento.foto}
            posicao={evento.posicao}
            externa={evento.externa}
          />
        ) : (
          <CartaoDeArea {...segundoSemMemoria} />
        )}
        {demais.map((a) => (
          <CartaoDeArea key={a.href} {...a} />
        ))}
      </div>
    </section>
  );
}
