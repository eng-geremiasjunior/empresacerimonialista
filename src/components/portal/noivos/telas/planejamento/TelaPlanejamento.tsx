// O planejamento da noiva que abriu a conta sozinha (04/10/2026): "Agora"
// (as três próximas, em tempo) e os 9 capítulos em cartões com foto — ou,
// enquanto a foto não chega, o tom do capítulo com o ícone. Sem estado:
// tudo é link, e o servidor já fez as contas.

import type { CSSProperties } from "react";
import Link from "next/link";
import type { PlanejamentoDaNoiva } from "@/lib/supabase/portal-planejamento";
import { Eyebrow } from "../../primitivas";
import "./planejamento.css";

function estadoDoCapitulo(c: PlanejamentoDaNoiva["capitulos"][number]): string {
  if (c.total === 0) return "Nada para decidir aqui";
  if (c.feitas === c.total) return "Tudo feito";
  const conta = `${c.feitas} de ${c.total}`;
  return c.proxima?.prazo ? `${conta} · a próxima ${c.proxima.prazo}` : conta;
}

export function TelaPlanejamento({ eventoId, plano }: { eventoId: string; plano: PlanejamentoDaNoiva }) {
  const base = `/portal/${eventoId}/planejamento`;
  return (
    <section id="planejamento" className="pn-plan" aria-labelledby="pn-plan-titulo">
      <Eyebrow>Planejamento</Eyebrow>
      <h1 id="pn-plan-titulo" className="pn-t pn-titulo-tela">
        Capítulo a capítulo
      </h1>
      {plano.total > 0 && (
        <p className="pn-sub-tela">
          {plano.feitas} de {plano.total} decisões feitas
        </p>
      )}

      {plano.agora.length > 0 && (
        <div className="pn-plan-agora">
          <h2 className="pn-plan-rotulo">Agora</h2>
          <ol>
            {plano.agora.map((d) => (
              <li key={d.id}>
                <Link href={`${base}/${d.capituloId}#d-${d.id}`}>
                  <span className="pn-plan-agora-texto">
                    <span className="tit">{d.titulo}</span>
                    <span className="sub">{d.capituloNome}</span>
                  </span>
                  {d.prazo && <span className={`pn-plan-quando${d.perto ? "" : " longe"}`}>{d.prazo}</span>}
                  <span className="pn-ic" aria-hidden="true">
                    chevron_right
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <ul className="pn-plan-capitulos">
        {plano.capitulos.map((c) => (
          <li key={c.id}>
            {/* #capitulo: no celular a capa do portal ocupa a primeira tela;
                o capítulo abre já nele, e não no topo de novo */}
            <Link href={`${base}/${c.id}#capitulo`} className="pn-plan-cap" style={{ "--tom": c.tom } as CSSProperties}>
              <span className="pn-plan-cap-foto">
                {c.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.foto} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="pn-ic" aria-hidden="true">
                    {c.icone}
                  </span>
                )}
              </span>
              <span className="pn-plan-cap-texto">
                <span className="pn-t nome">{c.nome}</span>
                <span className="sub">{c.sub}</span>
                <span className={`estado${c.total > 0 && c.feitas === c.total ? " feito" : ""}`}>{estadoDoCapitulo(c)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
