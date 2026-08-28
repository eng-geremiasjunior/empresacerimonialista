"use client";

// O convite digital — do design aprovado.
//
// Cliente por causa de três coisas que só existem no navegador: o
// envelope que abre, a contagem que anda e o "copiar" do PIX. O dado
// todo vem pronto do servidor (a RPC site_publico), então este arquivo
// não busca nada — só desenha e reage.
//
// A ordem das seções é a do desenho: envelope → capa → contagem →
// mensagem → história → local → dress code → RSVP → presentes →
// hospedagens → álbum → música → recados → rodapé. Cada bloco só
// aparece se tiver conteúdo — convite com seção vazia parece defeito.

import { useEffect, useMemo, useState } from "react";
import { ComoChegar } from "@/components/ComoChegar";
import { convitePara, dataLonga, quandoLegivel } from "@/lib/rsvp-convite";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { RsvpConvite } from "@/components/convite/RsvpConvite";
import {
  AlbumDoConvite,
  MusicaDoConvite,
  RecadosDoConvite,
} from "@/components/convite/BlocosDoConvidado";

function useContagem(dataIso: string, hora: string | null) {
  // começa em null e só anda depois de montar: relógio no primeiro
  // render quebra a hidratação (a lição já custou uma tela em produção)
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    if (agora === null) return null;
    const alvo = new Date(`${dataIso}T${(hora ?? "12:00").slice(0, 5)}:00`).getTime();
    const s = Math.max(0, Math.floor((alvo - agora) / 1000));
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      d: Math.floor(s / 86400),
      h: pad(Math.floor(s / 3600) % 24),
      m: pad(Math.floor(s / 60) % 60),
      s: pad(s % 60),
    };
  }, [agora, dataIso, hora]);
}

export function ConviteCompleto({
  dados,
  fotosAlbum,
  fotoCasalUrl,
}: {
  dados: SitePublico;
  /** URLs já assinadas no servidor (bucket privado) */
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
}) {
  const { evento, empresa, site, cores, paleta, espaco, rsvp, blocos, recados } = dados;
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const contagem = useContagem(evento.data, evento.hora);

  const onde = [evento.local, evento.cidade].filter(Boolean).join(" · ");
  const enderecoMapa = [evento.local, evento.cidade].filter(Boolean).join(", ");
  const hospedagens = espaco?.hospedagens ?? [];
  const tituloAgenda = `${convitePara(evento.tipo)} ${evento.anfitrioes}`
    .replace(/^o /, "")
    .replace(/^a /, "");

  // as três cores mandam na página; sem elas, a paleta do guia; sem ela,
  // o padrão do CSS
  const doGuia = (papel: string) => paleta?.find((c) => c.papel === papel)?.hex;
  const vars = {
    ...(cores?.acento || doGuia("acento") || doGuia("principal")
      ? { "--cv-acento": cores?.acento ?? doGuia("acento") ?? doGuia("principal") }
      : {}),
    ...(cores?.tinta ? { "--cv-tinta": cores.tinta } : {}),
    ...(cores?.fundo ? { "--cv-fundo": cores.fundo } : {}),
  } as React.CSSProperties;

  async function copiarPix() {
    if (!site?.pix_chave) return;
    try {
      await navigator.clipboard.writeText(site.pix_chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      /* navegador sem permissão: a chave está na tela para copiar à mão */
    }
  }

  return (
    <main className="cv" style={vars}>
      {!aberto && (
        <div className="cv-envelope">
          <div className="cv-envelope-moldura" />
          <div className="cv-envelope-conteudo">
            <div className="cv-envelope-eyebrow">Convite</div>
            <div className="cv-envelope-nomes">{evento.anfitrioes}</div>
            <div className="cv-envelope-filete" />
            <div className="cv-envelope-quando">
              {dataLonga(evento.data)}
              {evento.cidade ? ` · ${evento.cidade}` : ""}
            </div>
            <button
              type="button"
              className="cv-botao cv-envelope-botao"
              onClick={() => setAberto(true)}
            >
              Abrir convite
            </button>
          </div>
        </div>
      )}

      {/* capa */}
      <header className="cv-capa">
        {evento.capa_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.capa_url} alt="" className="cv-capa-foto" />
        )}
        <div className="cv-capa-veu" />
        <div className="cv-capa-conteudo">
          <div className="cv-capa-eyebrow">Você está convidado para</div>
          <div className="cv-capa-para">{convitePara(evento.tipo)}</div>
          <h1 className="cv-capa-nomes">{evento.anfitrioes}</h1>
        </div>
        <div className="cv-cartao">
          <div>
            <div className="cv-rotulo">Quando</div>
            <div className="cv-cartao-valor">
              {quandoLegivel(evento.data, evento.hora)}
            </div>
          </div>
          {onde && (
            <>
              <div className="cv-cartao-divisor" />
              <div>
                <div className="cv-rotulo">Onde</div>
                <div className="cv-cartao-valor">{onde}</div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* contagem */}
      <div className="cv-contagem">
        {[
          { v: contagem ? String(contagem.d).padStart(3, "0") : "—", r: "dias" },
          { v: contagem?.h ?? "—", r: "horas" },
          { v: contagem?.m ?? "—", r: "minutos" },
          { v: contagem?.s ?? "—", r: "segundos" },
        ].map((c) => (
          <div className="cv-contagem-celula" key={c.r}>
            <div className="cv-contagem-numero">{c.v}</div>
            <div className="cv-rotulo cv-contagem-rotulo">{c.r}</div>
          </div>
        ))}
      </div>

      {/* mensagem */}
      {site?.mensagem && (
        <section className="cv-mensagem">
          <p className="cv-mensagem-texto">“{site.mensagem}”</p>
          <div className="cv-mensagem-assinatura">{evento.anfitrioes}</div>
        </section>
      )}

      {/* história */}
      {site?.historia && (
        <section className="cv-historia">
          {fotoCasalUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoCasalUrl} alt="" className="cv-historia-foto" />
          ) : (
            <div className="cv-historia-foto" />
          )}
          <div className="cv-historia-texto">
            <div className="cv-eyebrow">Nossa história</div>
            {site.historia_titulo && (
              <h2 className="cv-historia-titulo">{site.historia_titulo}</h2>
            )}
            <p className="cv-texto">{site.historia}</p>
          </div>
        </section>
      )}

      {/* local */}
      {(evento.local || evento.cidade) && (
        <section className="cv-local">
          <div className="cv-eyebrow">Cerimônia e recepção</div>
          <h2 className="cv-titulo">{evento.local ?? evento.cidade}</h2>
          <p className="cv-local-endereco">
            {[evento.cidade, quandoLegivel(evento.data, evento.hora)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {enderecoMapa && (
            <div className="cv-local-acoes">
              <ComoChegar endereco={enderecoMapa} />
            </div>
          )}
        </section>
      )}

      {/* dress code */}
      {site?.dress_code && (
        <section className="cv-escuro">
          <div className="cv-eyebrow">O que vestir</div>
          {site.dress_code_titulo && (
            <h2 className="cv-escuro-titulo">{site.dress_code_titulo}</h2>
          )}
          <p className="cv-escuro-texto">{site.dress_code}</p>
          {paleta && paleta.length > 0 && (
            <div className="cv-paleta" style={{ justifyContent: "center", marginTop: 22 }}>
              {paleta.map((c, i) => (
                <span
                  key={i}
                  className="cv-cor"
                  style={{ background: c.hex }}
                  title={c.nome}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* RSVP */}
      <section className="cv-secao cv-secao-centro" id="rsvp">
        <div className="cv-eyebrow">Confirmação de presença</div>
        <h2 className="cv-titulo">Você vai poder ir?</h2>
        <div style={{ marginTop: 24, textAlign: "left" }}>
          <RsvpConvite
            hash={rsvp.hash}
            aberto={rsvp.aberto}
            prazo={rsvp.prazo}
            menu={rsvp.menu ?? []}
            tituloAgenda={tituloAgenda}
            data={evento.data}
            hora={evento.hora}
            local={onde || null}
          />
        </div>
      </section>

      {/* presentes */}
      {(site?.pix_chave || site?.presentes_texto || site?.presentes_link) && (
        <section className="cv-presentes">
          <div className="cv-eyebrow">Presentes</div>
          {site.presentes_texto && (
            <p className="cv-presentes-frase">{site.presentes_texto}</p>
          )}
          {site.pix_chave && (
            <div className="cv-pix">
              <div className="cv-rotulo">Chave PIX</div>
              <div className="cv-pix-linha">
                <span className="cv-pix-chave">{site.pix_chave}</span>
                <button
                  type="button"
                  className="cv-copiar"
                  data-copiado={copiado ? "sim" : "nao"}
                  onClick={copiarPix}
                >
                  {copiado ? "Copiada" : "Copiar"}
                </button>
              </div>
              {site.pix_titular && (
                <p className="cv-pix-titular">{site.pix_titular}</p>
              )}
            </div>
          )}
          {site.presentes_link && /^https?:\/\//i.test(site.presentes_link) && (
            <p style={{ marginTop: 26 }}>
              <a
                className="cv-botao-leve"
                href={site.presentes_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver lista de presentes
              </a>
            </p>
          )}
        </section>
      )}

      {/* vindo de fora */}
      {(hospedagens.length > 0 || espaco?.transporte) && (
        <section className="cv-hospedagens">
          <div className="cv-eyebrow">Vindo de fora</div>
          <h2 className="cv-titulo">Onde ficar</h2>
          {hospedagens.length > 0 && (
            <ul className="cv-hospedagem-lista">
              {hospedagens.map((h, i) => {
                const href = h.link && /^https?:\/\//i.test(h.link) ? h.link : null;
                return (
                  <li key={i} className="cv-hospedagem">
                    <p className="cv-hospedagem-nome">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {h.nome}
                        </a>
                      ) : (
                        h.nome
                      )}
                    </p>
                    <p className="cv-hospedagem-info">
                      {[h.distancia, h.faixa_preco, h.nota].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          {espaco?.transporte && (
            <p className="cv-texto" style={{ marginTop: 26 }}>
              {espaco.transporte}
            </p>
          )}
        </section>
      )}

      {blocos?.album && <AlbumDoConvite hash={rsvp.hash} fotos={fotosAlbum} />}
      {blocos?.playlist && <MusicaDoConvite hash={rsvp.hash} />}
      {blocos?.recados && (
        <RecadosDoConvite hash={rsvp.hash} recados={recados ?? []} />
      )}

      <footer className="cv-rodape">
        {evento.data.split("-").reverse().join(" . ")}
      </footer>

      {empresa && (
        <div style={{ padding: "0 0 40px", textAlign: "center" }}>
          {empresa.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={empresa.logo_url}
              alt={empresa.nome}
              style={{ maxHeight: 34, opacity: 0.55 }}
            />
          ) : null}
        </div>
      )}
    </main>
  );
}
