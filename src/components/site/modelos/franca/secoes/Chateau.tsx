"use client";

// 6 · O local (#local), o "château" do desenho: uma seção de 260vh com um
// quadro sticky de 100vh. A foto do espaço aparece por uma janela em arco
// (clip-path inset(26% 33% 7% 33% round …), laterais em 12% abaixo de
// 700px) que abre até a tela cheia com a rolagem; a imagem assenta de 1.25
// para 1. No alto, "Le château" e "Onde vamos celebrar", que somem; no fim,
// embaixo, o nome do espaço, o endereço e "Como chegar →".
//
//   p = −top / (altura − vh);  e = smoothstep(min(p/.7, 1))
//   título: opacidade 1 − 2.4e, sobe 40e px
//   informações: opacidade (p − .6)/.2, sobem de 30px, clicáveis acima de .5
//
// Com reduced-motion o arco continua acompanhando a rolagem (não é
// animação, é posição); só o zoom da imagem sai. Prévia e revisão: o
// quadro final, sem sticky, numa tela só. Sem foto do espaço (público e
// revisão): o nome, o endereço e o "Como chegar" no fundo escuro, sem o
// efeito.
//
// O rótulo pequeno fica em francês, como no desenho; o link da barra diz
// "O local". Exportado para o T06.

import { useRef } from "react";
import { lerLocal } from "@/lib/site-conteudo";
import { ComoChegar } from "@/components/site/pecas/ComoChegar";
import { EspacoDeFoto } from "@/components/site/pecas/EspacoDeFoto";
import { useCena } from "@/components/site/pecas/useCena";
import { enderecoDoLocal, mostraFoto, useUrlDaFoto, type PropsDaSecao } from "../comum";

export function temLocal({ dados }: Pick<PropsDaSecao, "dados">): boolean {
  const e = dados.evento;
  return !!(e.local || e.cidade || e.endereco);
}

const limitar = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const suave = (x: number) => x * x * (3 - 2 * x);

export function Chateau({ dados, bloco, ancora, modo }: PropsDaSecao) {
  const { evento } = dados;
  const resolver = useUrlDaFoto();
  const url = resolver(lerLocal(bloco.conteudo).foto);
  const comFoto = mostraFoto(url, modo);
  const nome = evento.local || evento.cidade || "";
  const endereco = enderecoDoLocal(evento.endereco, evento.local ? evento.cidade : null);

  const secao = useRef<HTMLElement>(null);
  const mascara = useRef<HTMLDivElement>(null);
  const imagem = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);

  useCena(
    secao,
    ({ progresso, rect, final, reduzido }) => {
      const m = mascara.current;
      const im = imagem.current;
      const it = intro.current;
      const inf = info.current;
      if (!m || !im || !it || !inf) return;
      const p = final ? 1 : progresso;
      const e = suave(limitar(p / 0.7));
      const lado = (rect.width < 700 ? 12 : 33) * (1 - e);
      const topo = 26 * (1 - e);
      const baixo = 7 * (1 - e);
      const raio = ((rect.width * (1 - (2 * lado) / 100)) / 2) * (1 - e);
      m.style.clipPath = `inset(${topo.toFixed(2)}% ${lado.toFixed(2)}% ${baixo.toFixed(2)}% ${lado.toFixed(2)}% round ${raio.toFixed(1)}px ${raio.toFixed(1)}px 0 0)`;
      im.style.transform = reduzido ? "none" : `scale(${(1.25 - 0.25 * e).toFixed(4)})`;
      const io = limitar(1 - e * 2.4);
      it.style.opacity = io.toFixed(3);
      it.style.visibility = io <= 0 ? "hidden" : "visible";
      it.style.transform = `translateY(${(-e * 40).toFixed(1)}px)`;
      const fo = limitar((p - 0.6) / 0.2);
      inf.style.opacity = fo.toFixed(3);
      inf.style.visibility = fo <= 0 ? "hidden" : "visible";
      inf.style.transform = `translateY(${((1 - fo) * 30).toFixed(1)}px)`;
      inf.style.pointerEvents = fo > 0.5 ? "auto" : "none";
    },
    { reduzido: "segue", ligado: comFoto }
  );

  const informacoes = (
    <>
      <div className="f-eyebrow f-eyebrow--claro">Onde vamos celebrar</div>
      {nome && <h3 className="f-h2 f-chateau-nome">{nome}</h3>}
      {endereco && <div className="f-chateau-endereco">{endereco}</div>}
      <ComoChegar local={evento.local} endereco={evento.endereco} cidade={evento.cidade} className="f-chateau-ir">
        Como chegar <span aria-hidden>→</span>
      </ComoChegar>
    </>
  );

  if (!comFoto) {
    return (
      <section id={ancora} aria-label="O local" className="f-secao f-escuro f-chateau-so">
        <div data-revelar="up" className="f-chateau-so-miolo">
          <div className="f-eyebrow f-eyebrow--claro">Le château</div>
          {nome && <h2 className="f-h2 f-chateau-nome">{nome}</h2>}
          {endereco && <div className="f-chateau-endereco">{endereco}</div>}
          <ComoChegar local={evento.local} endereco={evento.endereco} cidade={evento.cidade} className="f-chateau-ir">
            Como chegar <span aria-hidden>→</span>
          </ComoChegar>
        </div>
      </section>
    );
  }

  const final = modo !== "publico";
  return (
    <section
      id={ancora}
      ref={secao}
      aria-label="O local"
      className={`f-chateau ${final ? "f-chateau--final" : ""}`}
    >
      <div className="f-chateau-quadro">
        <div ref={mascara} className="f-chateau-mascara">
          <div ref={imagem} className="f-chateau-img">
            <EspacoDeFoto url={url} forma="retangulo" proporcao="tela" />
          </div>
          <div className="f-chateau-veu" />
        </div>
        <div ref={intro} className="f-chateau-intro">
          <div className="f-eyebrow">Le château</div>
          <h2 className="f-h2 f-h2--sm">Onde vamos celebrar</h2>
        </div>
        <div ref={info} className="f-chateau-info">
          {informacoes}
        </div>
      </div>
    </section>
  );
}
