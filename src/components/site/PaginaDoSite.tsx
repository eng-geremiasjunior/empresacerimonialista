// O molde das páginas do site navegável (27/09/2026): /para/<tipo> e
// /funcionalidades/<slug>. Mesma linguagem da página de vendas (modelo 2):
// marfim, vinho, títulos em Newsreader, cantos retos. O conteúdo vem de
// lib/site-paginas.ts; as partes que andam com a rolagem são as da home.

/* eslint-disable @next/next/no-img-element */
import type { PaginaDoSite as Pagina } from "@/lib/site-paginas";
import { CascaDoSite } from "./CascaDoSite";
import { Apresentacao } from "./Apresentacao";
import { Palco } from "./Palco";
import { RoteiroAoVivo } from "./RoteiroAoVivo";

/** "texto {itálico}" → o trecho entre chaves em itálico, na cor. */
export function Titulo({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\{[^}]+\})/).map((p, i) => (p.startsWith("{") ? <em key={i}>{p.slice(1, -1)}</em> : p))}
    </>
  );
}

export function PaginaDoSite({ p, hrefConta = "/criar-conta" }: { p: Pagina; hrefConta?: string }) {
  return (
    <CascaDoSite hrefConta={hrefConta}>
      <section className="ps-g ps-heroi" data-sem-foto={p.foto ? "0" : "1"}>
        <div>
          <p className="ps-sobre">{p.sobre}</p>
          <h1>
            <Titulo texto={p.titulo} />
          </h1>
          <p className="ps-sub">{p.sub}</p>
          <div className="ps-botoes">
            <a href={hrefConta} className="ps-cta">
              Criar meu primeiro evento
            </a>
            <a href="#apresentacao" className="ps-sec">
              Ver por dentro
            </a>
          </div>
        </div>
        {p.foto ? (
          <div className="ps-foto">
            <img src={p.foto.src} alt={p.foto.alt} style={{ objectPosition: p.foto.posicao }} />
          </div>
        ) : null}
      </section>

      {p.lista ? (
        <section className="ps-g ps-lista">
          <h2>{p.lista.titulo}</h2>
          <div className="ps-tipos">
            {p.lista.itens.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="ps-notas">
            {p.lista.notas.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        </section>
      ) : null}

      <Apresentacao passos={p.apresentacao.passos} sobre={p.apresentacao.sobre} titulo={p.apresentacao.titulo} />
      {(p.extras ?? []).map((x) => (x === "palco" ? <Palco key={x} /> : <RoteiroAoVivo key={x} />))}

      <section className="ps-duvidas">
        <h2>Dúvidas</h2>
        {p.perguntas.map(([q, r]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{r}</p>
          </details>
        ))}
      </section>

      <section className="ps-chamada">
        <h2>Comece pelo seu próximo evento.</h2>
        <p>Para 1 evento, sem cartão de crédito.</p>
        <div className="ps-botoes">
          <a href={hrefConta} className="ps-cta">
            Criar meu primeiro evento
          </a>
          <a href="/planos#a-planos" className="ps-sec">
            Ver os planos
          </a>
        </div>
      </section>
    </CascaDoSite>
  );
}
