"use client";

// Os blocos que funcionam hoje e o desenho dos Cartões não tem —
// hospedagem, álbum dos convidados, mural de recados e texto livre —
// vestidos no estilo dele (T03 e T04): cartões de raio 32 em card, o
// rótulo em accentText, o título em headSizeSm, campos de raio 18 em soft
// e o botão ink de raio 18; o mural vai no cartão ink, como as músicas.
// A música (pedido para a pista) é a seção Músicas, desenhada.
//
// A lógica é a de sempre (useAlbumDoConvite, useRecadosDoConvite, em
// BlocosDoConvidado); os textos são os do convite de hoje.

import type { ReactNode } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { lerTexto } from "@/lib/site-conteudo";
import type { BlocoDoSite } from "@/lib/site-blocos";
import { useAlbumDoConvite, useRecadosDoConvite } from "@/components/convite/BlocosDoConvidado";
import { linkSeguro, Rotulo } from "./comum";

function Casca({
  rotulo,
  titulo,
  ink,
  children,
}: {
  rotulo?: string;
  titulo?: string;
  ink?: boolean;
  children?: ReactNode;
}) {
  return (
    <section data-revelar="up" className={`k-cartao k-bloco ${ink ? "k-cartao--ink" : ""}`}>
      {(rotulo || titulo) && (
        <div className="k-bloco-topo">
          {rotulo && <Rotulo className={ink ? "k-rotulo--claro-acento" : "k-rotulo--acento"}>{rotulo}</Rotulo>}
          {titulo && <h2 className="k-h2 k-h2--sm k-h2--balance">{titulo}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}

// ------------------------------------------------------------ hospedagem

export function temHospedagem(dados: SitePublico): boolean {
  return !!(dados.espaco?.hospedagens?.length || dados.espaco?.transporte);
}

export function Hospedagem({ dados }: { dados: SitePublico }) {
  const hospedagens = dados.espaco?.hospedagens ?? [];
  const transporte = dados.espaco?.transporte;
  return (
    <Casca rotulo="Vindo de fora" titulo="Onde ficar">
      {hospedagens.length > 0 && (
        <ul className="k-lista">
          {hospedagens.map((h, i) => {
            const href = linkSeguro(h.link);
            const info = [h.distancia, h.faixa_preco, h.nota].filter(Boolean).join(" · ");
            return (
              <li key={i} className="k-lista-item">
                <span className="k-lista-titulo">{h.nome}</span>
                {info && <span className="k-lista-info">{info}</span>}
                {href && (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="k-lista-link">
                    Ver o lugar
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {transporte && <p className="k-mudo k-bloco-p">{transporte}</p>}
    </Casca>
  );
}

// ----------------------------------------------------------------- álbum

export function Album({ hash, fotos }: { hash: string; fotos: { url: string; autor: string | null }[] }) {
  const { enviando, erro, enviadas, autor, setAutor, subir } = useAlbumDoConvite(hash);
  return (
    <Casca rotulo="Álbum da festa" titulo="As fotos de quem esteve aqui">
      <div className="k-bloco-form">
        <input
          className="k-campo"
          placeholder="Seu nome (opcional)"
          aria-label="Seu nome (opcional)"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <label className="k-botao k-arquivo">
          {enviando ? "Enviando…" : "Enviar minhas fotos"}
          <input type="file" accept="image/*" multiple hidden disabled={enviando} onChange={(e) => subir(e.target.files)} />
        </label>
        <div aria-live="polite">
          {enviadas > 0 && (
            <p className="k-mudo">{enviadas === 1 ? "Foto enviada" : `${enviadas} fotos enviadas`}. Obrigado!</p>
          )}
          {erro && <p className="k-erro">{erro}</p>}
        </div>
      </div>
      {fotos.length > 0 ? (
        <div className="k-album-grade">
          {fotos.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={f.url}
              alt={f.autor ? `Foto de ${f.autor}` : "Foto da festa"}
              className="k-album-foto"
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      ) : (
        <p className="k-mudo">Ainda não há fotos. Seja o primeiro — as suas aparecem aqui na hora.</p>
      )}
    </Casca>
  );
}

// ----------------------------------------------------------------- mural

export function Mural({ hash, recados }: { hash: string; recados: { nome: string | null; texto: string }[] }) {
  const r = useRecadosDoConvite(hash);
  return (
    <Casca rotulo="Recados" titulo="Deixe uma palavra para nós" ink>
      <div className="k-bloco-form">
        <input
          className="k-campo k-campo--ink"
          placeholder="Seu nome"
          aria-label="Seu nome"
          value={r.nome}
          onChange={(e) => r.setNome(e.target.value)}
        />
        <textarea
          className="k-campo k-campo--ink k-campo--texto"
          rows={3}
          placeholder="Seu recado"
          aria-label="Seu recado"
          value={r.texto}
          onChange={(e) => r.setTexto(e.target.value)}
        />
        <div aria-live="polite">
          {r.erro && <p className="k-erro k-erro--claro">{r.erro}</p>}
          {r.pronto && !r.erro && <p className="k-mudo k-mudo--claro">Recebido — obrigado!</p>}
        </div>
        <button
          type="button"
          className="k-botao k-botao--acento"
          onClick={r.enviar}
          disabled={r.enviando || !r.texto.trim()}
        >
          {r.enviando ? "Enviando…" : "Enviar recado"}
        </button>
      </div>
      {recados.length > 0 && (
        <div className="k-recados">
          {recados.map((x, i) => (
            <div key={i} className="k-recados-item">
              <p className="k-recados-texto">“{x.texto}”</p>
              {x.nome && <p className="k-recados-nome">{x.nome}</p>}
            </div>
          ))}
        </div>
      )}
    </Casca>
  );
}

// ----------------------------------------------------------- texto livre

export function temTextoLivre(b: BlocoDoSite): boolean {
  const t = lerTexto(b.conteudo);
  return !!(t.titulo || t.texto);
}

export function TextoLivre({ bloco }: { bloco: BlocoDoSite }) {
  const t = lerTexto(bloco.conteudo);
  return (
    <Casca titulo={t.titulo || undefined}>
      {t.texto && <p className="k-mudo k-bloco-p k-bloco-p--livre">{t.texto}</p>}
    </Casca>
  );
}
