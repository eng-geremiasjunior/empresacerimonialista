"use client";

// Os blocos que funcionam hoje e o desenho do T05 não tem — hospedagem,
// álbum dos convidados, música, mural de recados e texto livre — vestidos
// no estilo do França: rótulo pequeno em francês na cor goldText, título
// de seção e o cartão de papel com as duas molduras de ouro (o mesmo do
// programa e do RSVP), campos só com a linha de baixo, botões de 11px.
// Trocar de modelo nunca esconde o que a família já usa. A lógica é a de
// sempre (useAlbumDoConvite, useMusicaDoConvite, useRecadosDoConvite, em
// BlocosDoConvidado); os textos são os do convite de hoje. O T06 pode
// importar daqui também.

import type { ReactNode } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { lerTexto } from "@/lib/site-conteudo";
import type { BlocoDoSite } from "@/lib/site-blocos";
import { useAlbumDoConvite, useMusicaDoConvite, useRecadosDoConvite } from "@/components/convite/BlocosDoConvidado";
import { MolduraDupla } from "./comum";

function Casca({
  rotulo,
  titulo,
  fundo,
  children,
  depois,
}: {
  rotulo?: string;
  titulo?: string;
  fundo?: "alt" | "escuro";
  /** o que vai dentro do cartão de papel */
  children?: ReactNode;
  /** o que vem depois do cartão (a grade do álbum, os recados) */
  depois?: ReactNode;
}) {
  return (
    <section className={`f-secao f-bloco ${fundo === "alt" ? "f-alt" : fundo === "escuro" ? "f-escuro" : ""}`}>
      <div className="f-bloco-miolo">
        {(rotulo || titulo) && (
          <div className="f-cabeca">
            {rotulo && (
              <div data-revelar="up" className={`f-eyebrow ${fundo === "escuro" ? "f-eyebrow--claro" : ""}`}>
                {rotulo}
              </div>
            )}
            {titulo && (
              <h2 data-revelar="up" data-atraso="120" className="f-h2 f-h2--balance">
                {titulo}
              </h2>
            )}
          </div>
        )}
        {children && (
          <div data-revelar="up" data-atraso="200" className="f-papel f-bloco-cartao">
            <MolduraDupla />
            <div className="f-papel-miolo f-bloco-form">{children}</div>
          </div>
        )}
        {depois}
      </div>
    </section>
  );
}

const linkSeguro = (l: string | null | undefined) => (l && /^https?:\/\//i.test(l) ? l : null);

// ------------------------------------------------------------ hospedagem

export function temHospedagem(dados: SitePublico): boolean {
  return !!(dados.espaco?.hospedagens?.length || dados.espaco?.transporte);
}

export function Hospedagem({ dados }: { dados: SitePublico }) {
  const hospedagens = dados.espaco?.hospedagens ?? [];
  const transporte = dados.espaco?.transporte;
  return (
    <Casca rotulo="Hébergement" titulo="Onde ficar" fundo="alt">
      {hospedagens.length > 0 && (
        <ul className="f-lista">
          {hospedagens.map((h, i) => {
            const href = linkSeguro(h.link);
            const info = [h.distancia, h.faixa_preco, h.nota].filter(Boolean).join(" · ");
            return (
              <li key={i} className="f-lista-item">
                <span className="f-lista-titulo">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {h.nome} <span aria-hidden>→</span>
                    </a>
                  ) : (
                    h.nome
                  )}
                </span>
                {info && <span className="f-lista-info">{info}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {transporte && <p className="f-bloco-p">{transporte}</p>}
    </Casca>
  );
}

// ----------------------------------------------------------------- álbum

export function Album({ hash, fotos }: { hash: string; fotos: { url: string; autor: string | null }[] }) {
  const { enviando, erro, enviadas, autor, setAutor, subir } = useAlbumDoConvite(hash);
  return (
    <Casca
      rotulo="L'album"
      titulo="As fotos de quem esteve aqui"
      depois={
        fotos.length > 0 ? (
          <div className="f-album-grade">
            {fotos.map((f, i) => (
              <div key={i} className="f-album-passe">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.url}
                  alt={f.autor ? `Foto de ${f.autor}` : "Foto da festa"}
                  className="f-album-foto"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="f-bloco-nota">Ainda não há fotos. Seja o primeiro — as suas aparecem aqui na hora.</p>
        )
      }
    >
      <input
        className="f-campo-entrada f-campo-entrada--centro"
        placeholder="Seu nome (opcional)"
        aria-label="Seu nome (opcional)"
        value={autor}
        onChange={(e) => setAutor(e.target.value)}
      />
      <label className="f-btn f-btn--cheio f-btn--grande f-arquivo">
        {enviando ? "Enviando…" : "Enviar minhas fotos"}
        <input type="file" accept="image/*" multiple hidden disabled={enviando} onChange={(e) => subir(e.target.files)} />
      </label>
      <div aria-live="polite">
        {enviadas > 0 && (
          <p className="f-bloco-nota">{enviadas === 1 ? "Foto enviada" : `${enviadas} fotos enviadas`}. Obrigado!</p>
        )}
        {erro && <p className="f-campo-erro">{erro}</p>}
      </div>
    </Casca>
  );
}

// ---------------------------------------------------------------- música

export function Musica({ hash }: { hash: string }) {
  const m = useMusicaDoConvite(hash);
  return (
    <Casca rotulo="La musique" titulo="Qual música não pode faltar?" fundo="alt">
      <input
        className="f-campo-entrada"
        placeholder="Nome da música"
        aria-label="Nome da música"
        value={m.titulo}
        onChange={(e) => m.setTitulo(e.target.value)}
      />
      <input
        className="f-campo-entrada"
        placeholder="Artista (opcional)"
        aria-label="Artista (opcional)"
        value={m.artista}
        onChange={(e) => m.setArtista(e.target.value)}
      />
      <input
        className="f-campo-entrada"
        placeholder="Seu nome (opcional)"
        aria-label="Seu nome (opcional)"
        value={m.nome}
        onChange={(e) => m.setNome(e.target.value)}
      />
      <div aria-live="polite">
        {m.erro && <p className="f-campo-erro">{m.erro}</p>}
        {m.pronto && !m.erro && <p className="f-bloco-nota">Anotada! Pode sugerir outra.</p>}
      </div>
      <button type="button" className="f-btn f-btn--cheio f-btn--grande" onClick={m.enviar} disabled={m.enviando || !m.titulo.trim()}>
        {m.enviando ? "Enviando…" : "Sugerir música"}
      </button>
    </Casca>
  );
}

// ----------------------------------------------------------------- mural

export function Mural({ hash, recados }: { hash: string; recados: { nome: string | null; texto: string }[] }) {
  const r = useRecadosDoConvite(hash);
  return (
    <Casca
      rotulo="Les mots doux"
      titulo="Deixe uma palavra para nós"
      fundo="escuro"
      depois={
        recados.length > 0 && (
          <div className="f-recados">
            {recados.map((x, i) => (
              <div key={i} className="f-recados-item">
                <p className="f-recados-texto">“{x.texto}”</p>
                {x.nome && <p className="f-recados-nome">{x.nome}</p>}
              </div>
            ))}
          </div>
        )
      }
    >
      <input
        className="f-campo-entrada"
        placeholder="Seu nome"
        aria-label="Seu nome"
        value={r.nome}
        onChange={(e) => r.setNome(e.target.value)}
      />
      <textarea
        className="f-campo-entrada f-campo-texto"
        rows={3}
        placeholder="Seu recado"
        aria-label="Seu recado"
        value={r.texto}
        onChange={(e) => r.setTexto(e.target.value)}
      />
      <div aria-live="polite">
        {r.erro && <p className="f-campo-erro">{r.erro}</p>}
        {r.pronto && !r.erro && <p className="f-bloco-nota">Recebido — obrigado!</p>}
      </div>
      <button type="button" className="f-btn f-btn--cheio f-btn--grande" onClick={r.enviar} disabled={r.enviando || !r.texto.trim()}>
        {r.enviando ? "Enviando…" : "Enviar recado"}
      </button>
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
    <section className="f-secao f-bloco">
      <div className="f-bloco-miolo f-texto-livre">
        {t.titulo && (
          <h2 data-revelar="up" className="f-h2 f-h2--balance">
            {t.titulo}
          </h2>
        )}
        {t.texto && (
          <p data-revelar="up" data-atraso={t.titulo ? "120" : undefined} className="f-bloco-p f-bloco-p--livre">
            {t.texto}
          </p>
        )}
      </div>
    </section>
  );
}
