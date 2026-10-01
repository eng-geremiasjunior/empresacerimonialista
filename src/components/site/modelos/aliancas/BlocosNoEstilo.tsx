"use client";

// Os blocos que funcionam hoje e o desenho do T02 não tem — hospedagem,
// álbum dos convidados, música, mural de recados e texto livre — vestidos
// no estilo do Alianças (rótulo em accent, título de seção, papel com a
// sombra quente, campos só com o fio de baixo, pílulas de 11px), para
// trocar de modelo nunca esconder o que a família já usa. A lógica é a de
// sempre (useAlbumDoConvite, useMusicaDoConvite, useRecadosDoConvite, em
// BlocosDoConvidado); os textos são os do convite de hoje.

import type { ReactNode } from "react";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { lerTexto } from "@/lib/site-conteudo";
import type { BlocoDoSite } from "@/lib/site-blocos";
import {
  useAlbumDoConvite,
  useMusicaDoConvite,
  useRecadosDoConvite,
} from "@/components/convite/BlocosDoConvidado";

function Casca({
  rotulo,
  titulo,
  fundo,
  children,
}: {
  rotulo?: string;
  titulo?: string;
  fundo?: "alt" | "escuro";
  children?: ReactNode;
}) {
  return (
    <section className={`a-secao a-bloco ${fundo === "alt" ? "a-alt" : fundo === "escuro" ? "a-escuro" : ""}`}>
      <div className="a-bloco-miolo">
        {rotulo && (
          <div data-revelar="up" className="a-eyebrow">
            {rotulo}
          </div>
        )}
        {titulo && (
          <h2 data-revelar="up" data-atraso="120" className="a-h2 a-h2--balance">
            {titulo}
          </h2>
        )}
        {children}
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
    <Casca rotulo="Vindo de fora" titulo="Onde ficar" fundo="alt">
      {hospedagens.length > 0 && (
        <ul data-revelar="up" data-atraso="240" className="a-lista">
          {hospedagens.map((h, i) => {
            const href = linkSeguro(h.link);
            const info = [h.distancia, h.faixa_preco, h.nota].filter(Boolean).join(" · ");
            return (
              <li key={i} className="a-lista-item">
                <span className="a-lista-titulo">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="a-lista-link">
                      {h.nome} <span aria-hidden>→</span>
                    </a>
                  ) : (
                    h.nome
                  )}
                </span>
                {info && <span className="a-lista-info">{info}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {transporte && (
        <p data-revelar="up" data-atraso="300" className="a-bloco-p">
          {transporte}
        </p>
      )}
    </Casca>
  );
}

// ----------------------------------------------------------------- álbum

export function Album({ hash, fotos }: { hash: string; fotos: { url: string; autor: string | null }[] }) {
  const { enviando, erro, enviadas, autor, setAutor, subir } = useAlbumDoConvite(hash);
  return (
    <Casca rotulo="Álbum da festa" titulo="As fotos de quem esteve aqui">
      <div data-revelar="up" data-atraso="240" className="a-bloco-form">
        <input
          className="a-campo-entrada a-campo-entrada--centro"
          placeholder="Seu nome (opcional)"
          aria-label="Seu nome (opcional)"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
        />
        <label className="a-pilula a-pilula--cheia a-pilula--grande a-arquivo">
          {enviando ? "Enviando…" : "Enviar minhas fotos"}
          <input type="file" accept="image/*" multiple hidden disabled={enviando} onChange={(e) => subir(e.target.files)} />
        </label>
        <div aria-live="polite">
          {enviadas > 0 && (
            <p className="a-bloco-nota">
              {enviadas === 1 ? "Foto enviada" : `${enviadas} fotos enviadas`}. Obrigado!
            </p>
          )}
          {erro && <p className="a-campo-erro">{erro}</p>}
        </div>
      </div>
      {fotos.length > 0 ? (
        <div className="a-album-grade">
          {fotos.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={f.url}
              alt={f.autor ? `Foto de ${f.autor}` : "Foto da festa"}
              className="a-album-foto"
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      ) : (
        <p className="a-bloco-nota">Ainda não há fotos. Seja o primeiro — as suas aparecem aqui na hora.</p>
      )}
    </Casca>
  );
}

// ---------------------------------------------------------------- música

export function Musica({ hash }: { hash: string }) {
  const m = useMusicaDoConvite(hash);
  return (
    <Casca rotulo="Pista" titulo="Qual música não pode faltar?" fundo="alt">
      <div data-revelar="up" data-atraso="240" className="a-bloco-form">
        <input
          className="a-campo-entrada"
          placeholder="Nome da música"
          aria-label="Nome da música"
          value={m.titulo}
          onChange={(e) => m.setTitulo(e.target.value)}
        />
        <input
          className="a-campo-entrada"
          placeholder="Artista (opcional)"
          aria-label="Artista (opcional)"
          value={m.artista}
          onChange={(e) => m.setArtista(e.target.value)}
        />
        <input
          className="a-campo-entrada"
          placeholder="Seu nome (opcional)"
          aria-label="Seu nome (opcional)"
          value={m.nome}
          onChange={(e) => m.setNome(e.target.value)}
        />
        <div aria-live="polite">
          {m.erro && <p className="a-campo-erro">{m.erro}</p>}
          {m.pronto && !m.erro && <p className="a-bloco-nota">Anotada! Pode sugerir outra.</p>}
        </div>
        <button
          type="button"
          className="a-pilula a-pilula--cheia a-pilula--grande"
          onClick={m.enviar}
          disabled={m.enviando || !m.titulo.trim()}
        >
          {m.enviando ? "Enviando…" : "Sugerir música"}
        </button>
      </div>
    </Casca>
  );
}

// ----------------------------------------------------------------- mural

export function Mural({ hash, recados }: { hash: string; recados: { nome: string | null; texto: string }[] }) {
  const r = useRecadosDoConvite(hash);
  return (
    <Casca rotulo="Recados" titulo="Deixe uma palavra para nós" fundo="escuro">
      <div data-revelar="up" data-atraso="240" className="a-bloco-form">
        <input
          className="a-campo-entrada"
          placeholder="Seu nome"
          aria-label="Seu nome"
          value={r.nome}
          onChange={(e) => r.setNome(e.target.value)}
        />
        <textarea
          className="a-campo-entrada a-campo-texto"
          rows={3}
          placeholder="Seu recado"
          aria-label="Seu recado"
          value={r.texto}
          onChange={(e) => r.setTexto(e.target.value)}
        />
        <div aria-live="polite">
          {r.erro && <p className="a-campo-erro">{r.erro}</p>}
          {r.pronto && !r.erro && <p className="a-bloco-nota">Recebido — obrigado!</p>}
        </div>
        <button
          type="button"
          className="a-pilula a-pilula--clara a-pilula--grande"
          onClick={r.enviar}
          disabled={r.enviando || !r.texto.trim()}
        >
          {r.enviando ? "Enviando…" : "Enviar recado"}
        </button>
      </div>
      {recados.length > 0 && (
        <div className="a-recados">
          {recados.map((x, i) => (
            <div key={i} className="a-recados-item">
              <p className="a-recados-texto">“{x.texto}”</p>
              {x.nome && <p className="a-recados-nome">{x.nome}</p>}
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
      {t.texto && (
        <p data-revelar="up" data-atraso={t.titulo ? "240" : undefined} className="a-bloco-p a-bloco-p--livre">
          {t.texto}
        </p>
      )}
    </Casca>
  );
}
