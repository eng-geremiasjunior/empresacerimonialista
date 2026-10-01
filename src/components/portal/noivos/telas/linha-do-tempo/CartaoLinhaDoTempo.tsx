"use client";

// O cartão da linha do tempo (desenho v4, README §7): "O caminho até o
// altar" — a curva com os meses até o casamento e, embaixo, o painel do
// mês escolhido. Os meses chegam prontos do servidor (Secao.tsx); aqui só
// há a escolha do mês e a largura da curva.
//
// A curva é a do desenho (1120×230, nós em x = 70…1050, y alternando
// 160/80). Numa tela mais estreita, o traçado é refeito para a largura
// medida — mesmos pontos, na mesma proporção — e os nós ficam nas mesmas
// posições em %. O primeiro desenho usa os 1120px, como o servidor.

import { useEffect, useRef, useState } from "react";
import { Icone } from "../../primitivas";
import { comQuem, usePortalNoivos } from "../../contexto";
import type { MesDaLinha } from "./montar";
import "./linha-do-tempo.css";

const LARGURA = 1120;
const X = [70, 266, 462, 658, 854, 1050];
const Y = [160, 80, 160, 80, 160, 80];
/** a distância dos pontos de controle ao nó, no desenho */
const ALCA = 98;

const n2 = (v: number) => Math.round(v * 100) / 100;

/** O traçado do desenho para a largura w (em w = 1120, o mesmo texto do protótipo). */
function curva(w: number): string {
  const k = w / LARGURA;
  const x = X.map((v) => v * k);
  const a = ALCA * k;
  let d = `M${n2(x[0])},${Y[0]} C${n2(x[0] + a)},${Y[0]} ${n2(x[1] - a)},${Y[1]} ${n2(x[1])},${Y[1]}`;
  for (let i = 2; i < X.length; i++) d += ` S${n2(x[i] - a)},${Y[i]} ${n2(x[i])},${Y[i]}`;
  return d;
}

export function CartaoLinhaDoTempo({ meses }: { meses: MesDaLinha[] }) {
  const { cerimonialista } = usePortalNoivos();
  const [sel, setSel] = useState(0);
  const [largura, setLargura] = useState(LARGURA);
  const area = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => {
      const w = el.clientWidth;
      // painel oculto mede 0: fica a medida que já havia
      if (w > 0) setLargura(w);
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (meses.length === 0) return null;
  const atual = meses[Math.min(sel, meses.length - 1)];
  const comEquipe = comQuem(cerimonialista, true);
  // sem cerimonialista (conta de família) tudo é "com vocês": a legenda tem uma cor só
  const temEquipe = comEquipe !== comQuem(cerimonialista, false);
  const d = curva(largura);
  const progresso = 100 - (atual.pos / 5) * 100;

  return (
    <section className="pn-linha-do-tempo" aria-label="Linha do tempo">
      <div className="pn-linha-do-tempo-topo">
        <div>
          <div className="pn-eyebrow">Linha do tempo</div>
          <h2 className="pn-t pn-linha-do-tempo-titulo">O caminho até o altar</h2>
          {meses.length > 1 && <div className="pn-linha-do-tempo-sub">Toque em um mês para ver o que acontece nele.</div>}
        </div>
        <div className="pn-linha-do-tempo-legenda">
          <span>
            <span className="pn-linha-do-tempo-ponto" />
            com vocês
          </span>
          {temEquipe && (
            <span>
              <span className="pn-linha-do-tempo-ponto equipe" />
              {comEquipe}
            </span>
          )}
        </div>
      </div>

      <div className="pn-linha-do-tempo-area" ref={area}>
        <svg
          className="pn-linha-do-tempo-svg"
          viewBox={`0 0 ${largura} 230`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={d} fill="none" stroke="#e7e1d6" strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
          <path
            className="pn-linha-do-tempo-progresso"
            d={d}
            pathLength={100}
            fill="none"
            stroke="#e9ae88"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="100"
            style={{ strokeDashoffset: progresso }}
          />
        </svg>

        {meses.map((m, i) => {
          const acima = Y[m.pos] === 80;
          const estado = i === 0 ? "agora" : i === sel ? "sel" : i < sel ? "passado" : "futuro";
          const rotulo = (
            <span className={`pn-linha-do-tempo-rotulo${acima ? " acima" : ""}`} style={{ display: "block" }}>
              <span className="pn-t pn-linha-do-tempo-nome" style={{ display: "block" }}>
                {m.nome}
              </span>
              <span className="pn-linha-do-tempo-tag" style={{ display: "block" }}>
                {m.tag}
              </span>
            </span>
          );
          return (
            <button
              key={m.chave}
              type="button"
              className="pn-linha-do-tempo-no"
              style={{
                left: `${((X[m.pos] + 6) / LARGURA) * 100}%`,
                top: acima ? Y[m.pos] - 88 : Y[m.pos] - 26,
              }}
              aria-pressed={i === sel}
              aria-label={`${m.completo}, ${m.tag}`}
              onClick={() => setSel(i)}
            >
              {acima && rotulo}
              <span className={`pn-linha-do-tempo-circ ${estado}`}>
                <Icone
                  nome={estado === "agora" ? "favorite" : m.icone}
                  tamanho={estado === "agora" || estado === "sel" ? 24 : 20}
                  cheio={estado === "agora"}
                />
              </span>
              {!acima && rotulo}
            </button>
          );
        })}
      </div>

      {/* a chave remonta o painel a cada mês: as entradas tocam de novo */}
      <div key={atual.chave} className="pn-linha-do-tempo-painel">
        <div className="pn-linha-do-tempo-cab">
          <div className="pn-t pn-linha-do-tempo-mes">{atual.completo}</div>
          {atual.nota && <div className="pn-linha-do-tempo-nota">{atual.nota}</div>}
        </div>
        <div className="pn-linha-do-tempo-itens">
          {atual.itens.length === 0 && (
            <div className="pn-linha-do-tempo-vazio" style={{ animationDelay: "0.08s" }}>
              Nada marcado para este mês.
            </div>
          )}
          {atual.itens.map((it, k) => (
            <div
              key={`${k}-${it.t}`}
              className="pn-linha-do-tempo-item"
              style={{ animationDelay: `${0.08 + k * 0.08}s` }}
            >
              <span className={`pn-linha-do-tempo-item-ic${it.equipe && temEquipe ? " equipe" : ""}`}>
                <Icone nome={it.icone} tamanho={21} />
              </span>
              <div className="pn-linha-do-tempo-item-txt">
                <div className="pn-linha-do-tempo-item-t">{it.t}</div>
                <div className="pn-linha-do-tempo-item-q">{it.equipe ? comEquipe : "com vocês"}</div>
              </div>
            </div>
          ))}
          {atual.mais > 0 && (
            <div
              className="pn-linha-do-tempo-mais"
              style={{ animationDelay: `${0.08 + atual.itens.length * 0.08}s` }}
            >
              e mais {atual.mais} neste mês
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
