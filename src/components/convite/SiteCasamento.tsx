// O site do casamento como o convidado vê. Componente PURO: recebe o
// JSON de site_publico e renderiza — nunca busca dado.
//
// Tema clássico v1: capa + paleta do guia quando existem, e um caminho
// tipográfico desenhado (não um buraco) quando não existem. A régua de
// ouro vale dobrado aqui: o convidado veio fazer três coisas — saber
// quando/onde, confirmar presença e se preparar. Nada além disso.

import { ComoChegar } from "@/components/ComoChegar";
import { AutocadastroConvidado } from "@/components/rsvp/AutocadastroConvidado";
import { convitePara, quandoLegivel } from "@/lib/rsvp-convite";
import type { SitePublico } from "@/lib/site-publico-tipos";

function corDoPapel(
  paleta: SitePublico["paleta"],
  papel: string
): string | null {
  return paleta?.find((c) => c.papel === papel)?.hex ?? null;
}

/**
 * Segunda trava do link (a primeira é na action): só http(s) vira href.
 * Um `javascript:` aqui rodaria na origem do app, ao lado de /login.
 */
function hrefSeguro(link: string | null): string | null {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : null;
}

export function SiteCasamento({ dados }: { dados: SitePublico }) {
  const { evento, empresa, site, paleta, espaco, rsvp } = dados;
  const onde = [evento.local, evento.cidade].filter(Boolean).join(" · ");
  const enderecoMapa = [evento.local, evento.cidade].filter(Boolean).join(", ");
  const blocos = site?.blocos ?? [];
  const hospedagens = espaco?.hospedagens ?? [];

  const acento = corDoPapel(paleta, "acento") ?? corDoPapel(paleta, "principal");
  const vars = {
    ...(acento ? { "--site-acento": acento } : {}),
  } as React.CSSProperties;

  return (
    <main className="site-raiz" style={vars}>
      {/* hero: capa com véu, ou tipográfico — os dois desenhados */}
      <header className={`site-hero ${evento.capa_url ? "com-capa" : ""}`}>
        {evento.capa_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.capa_url} alt="" className="site-hero-capa" />
        )}
        <div className="site-hero-texto">
          <p className="site-eyebrow">Você está convidado para</p>
          <h1 className="site-nomes">
            {convitePara(evento.tipo)} <span>{evento.anfitrioes}</span>
          </h1>
          <p className="site-quando">{quandoLegivel(evento.data, evento.hora)}</p>
          {onde && <p className="site-onde">{onde}</p>}
        </div>
      </header>

      <div className="site-corpo">
        {enderecoMapa && (
          <section className="site-secao site-como-chegar">
            <ComoChegar endereco={enderecoMapa} />
          </section>
        )}

        {site?.mensagem && (
          <section className="site-secao">
            <p className="site-mensagem">“{site.mensagem}”</p>
          </section>
        )}

        {site?.historia && (
          <section className="site-secao">
            <h2 className="site-titulo">Nossa história</h2>
            <p className="site-texto">{site.historia}</p>
          </section>
        )}

        <section className="site-secao" id="rsvp">
          <h2 className="site-titulo">Confirme sua presença</h2>
          {rsvp.aberto ? (
            <AutocadastroConvidado
              hash={rsvp.hash}
              anfitrioes={evento.anfitrioes}
              convitePara={convitePara(evento.tipo)}
              quando={quandoLegivel(evento.data, evento.hora)}
              onde={onde || null}
            />
          ) : (
            <p className="site-texto">
              As confirmações foram encerradas. Se ainda precisar avisar
              alguma coisa, fale direto com os anfitriões.
            </p>
          )}
        </section>

        {site?.dress_code && (
          <section className="site-secao">
            <h2 className="site-titulo">O que vestir</h2>
            <p className="site-texto">{site.dress_code}</p>
            {paleta && paleta.length > 0 && (
              <div className="site-paleta" aria-label="Cores do evento">
                {/* índice como key: a lista é estática e pode ter nomes
                    repetidos (duas cores "Areia" no guia) */}
                {paleta.map((c, i) => (
                  <span
                    key={i}
                    className="site-cor"
                    style={{ background: c.hex }}
                    title={c.nome}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {blocos.map((b, i) => (
          <section className="site-secao" key={i}>
            <h2 className="site-titulo">{b.titulo}</h2>
            <p className="site-texto">{b.texto}</p>
          </section>
        ))}

        {(hospedagens.length > 0 || espaco?.transporte) && (
          <section className="site-secao">
            <h2 className="site-titulo">Vindo de fora</h2>
            {hospedagens.length > 0 && (
              <ul className="site-hospedagens">
                {hospedagens.map((h, i) => {
                  const href = hrefSeguro(h.link);
                  return (
                  <li key={i} className="site-hospedagem">
                    <p className="site-hospedagem-nome">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {h.nome}
                        </a>
                      ) : (
                        h.nome
                      )}
                    </p>
                    <p className="site-hospedagem-detalhe">
                      {[h.distancia, h.faixa_preco, h.nota]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                  );
                })}
              </ul>
            )}
            {espaco?.transporte && (
              <p className="site-texto">{espaco.transporte}</p>
            )}
          </section>
        )}
      </div>

      {empresa && (
        <footer className="site-rodape">
          {empresa.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={empresa.logo_url} alt={empresa.nome} className="site-logo" />
          ) : (
            <p className="site-rodape-nome">{empresa.nome}</p>
          )}
        </footer>
      )}
    </main>
  );
}
