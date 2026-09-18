// A vitrine profissional, modelo Curadoria (desenho do Claude Design,
// "Modelo 5 — Curadoria", 18/09/2026).
//
// O argumento do modelo é curadoria: a página não empurra uma lista, ela
// mostra escolha — quem escolhe e o que já foi escolhido. Daí o menu
// lateral fixo (a página é um acervo para navegar), o portfólio com filtro
// por tipo de evento e o retrato de quem assina. Verde oliva sobre greige,
// Gilda Display nos títulos, Manrope na interface, e o ARCO como forma.
// Os estilos moram em app/cerimonialista/curadoria.css.
//
// Mesmos campos e mesma lógica dos outros modelos (medição, pedido, pixel,
// estado da vitrine). Seção opcional some inteira quando está vazia, e o
// item dela sai do menu: o menu nasce das mesmas condições que escondem as
// seções, nunca de uma lista fixa.
//
// O que o desenho propôs e ainda não existe: o vídeo de apresentação ("Um
// minuto"). Sem ele a seção não aparece, como o próprio desenho manda.

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  comoFunciona,
  normalizarPixelMeta,
  textoWhatsappPagina,
  type PaginaPublica,
} from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { paletaDaVitrine, variaveisDaPaleta } from "@/lib/comercial/paletas";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { LinkMedido, MedirPagina } from "../MedirPagina";
import { PixelDaVitrine, PreferenciasDoPixel } from "../PixelDaVitrine";
import { EstadoDaVitrine } from "../VitrineViva";
import { FichaCuradoria } from "./FichaCuradoria";
import {
  AnimacoesCuradoria,
  BarraCuradoria,
  DepoimentosCuradoria,
  EventosCuradoria,
  MenuCuradoria,
  ServicosCuradoria,
  type ItemDoMenu,
} from "./VivaCuradoria";

const rotuloDoTipo = (t: string) => EVENT_TYPE_LABELS[t as keyof typeof EVENT_TYPE_LABELS] ?? t;

export function PaginaCuradoria({
  pagina,
  contar,
  previa,
}: {
  pagina: PaginaPublica;
  /** false quando quem abre é da própria empresa: a casa não conta visita */
  contar: boolean;
  /** página ainda não publicada, aberta pela dona */
  previa: boolean;
}) {
  const slug = pagina.slug_atual;
  const nome = pagina.nome_empresa || "Cerimonial";
  const medir = contar && !previa;
  const wa = linkWhatsapp(pagina.whatsapp, textoWhatsappPagina());
  const insta = pagina.instagram ? `https://instagram.com/${pagina.instagram}` : null;
  const pixel = medir ? normalizarPixelMeta(pagina.pixel_meta) : null;
  const cidade = pagina.cidade?.trim() || null;
  const retrato = pagina.retrato_url || null;

  const abertura = pagina.fotos.slice(0, 3);
  const temServicos = pagina.servicos.length > 0;
  const temFotos = pagina.fotos.length > 0;
  const temDepoimentos = pagina.depoimentos.length > 0;
  const temMotivos = pagina.motivos.length > 0;
  const temQuem = Boolean(retrato && (pagina.posicionamento || pagina.para_quem));

  // O menu e o fundo alternado seguem as seções que existem: com uma
  // seção a menos, duas faixas da mesma cor não se encostam.
  const itens: ItemDoMenu[] = [];
  const alterna: Record<string, boolean> = {};
  let n = 0;
  const bloco = (id: string, rotulo: string, existe: boolean) => {
    if (!existe) return;
    itens.push({ id, rotulo });
    alterna[id] = n % 2 === 0;
    n += 1;
  };
  bloco("quem", "Quem assina", temQuem);
  bloco("selecao", "A seleção", temServicos);
  bloco("eventos", "Eventos realizados", temFotos);
  bloco("como", "Como funciona", true);
  bloco("depoimentos", "Depoimentos", temDepoimentos);
  // os motivos se encostam nos depoimentos (mesma faixa); sozinhos, são a
  // faixa seguinte
  const motivosAlt = temDepoimentos ? alterna.depoimentos : n % 2 === 0;
  itens.push({ id: "orcamento", rotulo: "Pedir orçamento" });

  const passos = comoFunciona(nome);

  return (
    <EstadoDaVitrine
      tipoInicial={pagina.tipos_atendidos.length === 1 ? pagina.tipos_atendidos[0] : ""}
    >
      <div className="cu" style={variaveisDaPaleta("curadoria", paletaDaVitrine(pagina.paleta)) as CSSProperties}>
        <MedirPagina slug={slug} contar={medir} />

        {previa && (
          <div className="cu-previa">
            <span>Prévia: sua vitrine ainda não está no ar, só você vê.</span>
            <Link href="/orcamentos/pagina" className="cu-previa-link">
              Voltar ao editor
            </Link>
          </div>
        )}

        <div className="cu-corpo">
          {/* a lateral acompanha a página inteira, da abertura ao rodapé */}
          <aside className="cu-lateral">
            <div className="cu-marca">
              <span className="cu-marca-nome">{nome}</span>
              {cidade && <span className="cu-marca-cidade">{cidade}</span>}
            </div>

            <MenuCuradoria itens={itens} />

            <div className="cu-lateral-pe">
              {wa && (
                <LinkMedido
                  href={wa}
                  slug={slug}
                  tipo="whatsapp_click"
                  contar={medir}
                  className="cu-lateral-whatsapp"
                >
                  Conversar no WhatsApp
                </LinkMedido>
              )}
              {insta && (
                <LinkMedido
                  href={insta}
                  slug={slug}
                  tipo="instagram_click"
                  contar={medir}
                  className="cu-lateral-instagram"
                >
                  Instagram @{pagina.instagram}
                </LinkMedido>
              )}
            </div>
          </aside>

          <main className="cu-principal">
            {/* abertura */}
            <header className="cu-abertura" data-vt-abertura>
              <div className="cu-abertura-grade">
                <div className="cu-abertura-texto">
                  {cidade && <p className="cu-sobre">{cidade}</p>}
                  <h1 className="cu-h1">{nome}</h1>
                  {pagina.titulo && <p className="cu-frase">{pagina.titulo}</p>}
                  {/* sem retrato, a apresentação sobe para a abertura */}
                  {!temQuem && pagina.posicionamento && (
                    <p className="cu-abertura-apresentacao">{pagina.posicionamento}</p>
                  )}
                  <div className="cu-chamadas">
                    <a href="#orcamento" className="cu-botao">
                      Pedir orçamento
                    </a>
                    {wa && (
                      <LinkMedido
                        href={wa}
                        slug={slug}
                        tipo="whatsapp_click"
                        contar={medir}
                        className="cu-botao-contorno"
                      >
                        Conversar no WhatsApp
                      </LinkMedido>
                    )}
                  </div>
                </div>

                {abertura.length > 0 && (
                  <div className="cu-abertura-fotos" data-focar data-n={abertura.length}>
                    {abertura.map((f, i) => (
                      <div key={f.url} className={["cu-foto-a", "cu-foto-b", "cu-foto-c"][i]}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={f.legenda || `${rotuloDoTipo(f.tipo_evento)} organizado por ${nome}`}
                          fetchPriority={i === 0 ? "high" : undefined}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </header>

            {temQuem && retrato && (
              <section
                id="quem"
                className="cu-bloco"
                data-alt={alterna.quem ? "" : undefined}
                aria-label="Quem assina"
              >
                <div className="cu-quem-grade">
                  <div className="cu-retrato" data-focar>
                    <div className="cu-retrato-foto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={retrato} alt={`Quem cuida dos eventos da ${nome}`} />
                    </div>
                  </div>
                  <div className="cu-quem-texto">
                    <p className="cu-rotulo">Quem assina</p>
                    {pagina.posicionamento && (
                      <p className="cu-quem-apresentacao">{pagina.posicionamento}</p>
                    )}
                    {pagina.para_quem && <p className="cu-quem-para">{pagina.para_quem}</p>}
                  </div>
                </div>
              </section>
            )}

            {temServicos && (
              <section
                id="selecao"
                className="cu-bloco"
                data-alt={alterna.selecao ? "" : undefined}
                aria-label="A seleção"
              >
                <div className="cu-selecao-dentro">
                  <p className="cu-rotulo">A seleção</p>
                  <h2 className="cu-h2">Escolha por onde quer que a gente comece</h2>
                  <ServicosCuradoria
                    servicos={pagina.servicos.map((s) => ({
                      nome: s.nome,
                      descricao: s.descricao?.trim() || null,
                    }))}
                  />
                </div>
              </section>
            )}

            {temFotos && (
              <section
                id="eventos"
                className="cu-bloco"
                data-alt={alterna.eventos ? "" : undefined}
                aria-label="Eventos realizados"
              >
                <div className="cu-eventos-dentro">
                  <p className="cu-rotulo">Eventos realizados</p>
                  <h2 className="cu-h2">Escolha um tipo e veja o que já fizemos</h2>
                  <EventosCuradoria
                    fotos={pagina.fotos.map((f) => ({
                      url: f.url,
                      legenda: f.legenda?.trim() || rotuloDoTipo(f.tipo_evento),
                      alt: f.legenda || `${rotuloDoTipo(f.tipo_evento)} organizado por ${nome}`,
                      tipo: f.tipo_evento,
                      rotuloDoTipo: rotuloDoTipo(f.tipo_evento),
                    }))}
                  />
                </div>
              </section>
            )}

            <section
              id="como"
              className="cu-bloco"
              data-alt={alterna.como ? "" : undefined}
              aria-label="Como funciona"
            >
              <div className="cu-como-dentro">
                <p className="cu-rotulo">Como funciona</p>
                <h2 className="cu-h2">Quatro passos, nenhuma surpresa</h2>
                <div className="cu-passos">
                  {passos.map((p, i) => (
                    <div key={i} className="cu-passo" data-focar>
                      <span className="cu-passo-n" aria-hidden="true">
                        {i + 1}
                      </span>
                      <p className="cu-passo-texto">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {temDepoimentos && (
              <section
                id="depoimentos"
                className="cu-bloco cu-depoimentos"
                data-alt={alterna.depoimentos ? "" : undefined}
                aria-label={pagina.depoimentos.length === 1 ? "Depoimento" : "Depoimentos"}
              >
                <DepoimentosCuradoria
                  depoimentos={pagina.depoimentos.map((d) => ({
                    texto: d.texto,
                    quem: d.contexto ? `${d.autor} · ${d.contexto}` : d.autor,
                    tipo: d.tipo_evento ?? null,
                  }))}
                />
              </section>
            )}

            {temMotivos && (
              <div
                className="cu-motivos-bloco"
                data-alt={motivosAlt ? "" : undefined}
                data-solto={temDepoimentos ? undefined : ""}
              >
                <div className="cu-motivos">
                  {pagina.motivos.map((m, i) => (
                    <div key={`${i}-${m}`} className="cu-motivo" data-focar>
                      <p>{m}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <section id="orcamento" className="cu-orcamento" aria-label="Pedir orçamento">
              <div className="cu-cartao">
                <FichaCuradoria
                  slug={slug}
                  nomeEmpresa={nome}
                  tipos={pagina.tipos_atendidos}
                  whatsappEmpresa={pagina.whatsapp}
                  contar={medir}
                  previa={previa}
                />
              </div>
            </section>

            <footer className="cu-rodape">
              <div className="cu-rodape-dentro">
                <span className="cu-rodape-nome">{nome}</span>
                {insta && (
                  <LinkMedido
                    href={insta}
                    slug={slug}
                    tipo="instagram_click"
                    contar={medir}
                    className="cu-rodape-instagram"
                  >
                    Instagram @{pagina.instagram}
                  </LinkMedido>
                )}
                {cidade && <span className="cu-rodape-miudo">{cidade}</span>}
                {/* página inteira nova, como os outros links para fora da vitrine:
                    o pixel dela nunca segue na mesma aba para outra tela */}
                <a href="/privacidade#vitrine" className="cu-rodape-link">
                  Privacidade
                </a>
                {pixel && <PreferenciasDoPixel prefixo="cu" />}
                <a href="/planos" className="cu-rodape-marca">
                  Página feita com eorganizei
                </a>
              </div>
            </footer>

            <BarraCuradoria whatsapp={wa} slug={slug} contar={medir} previa={previa} />
          </main>
        </div>

        {pixel && <PixelDaVitrine pixelId={pixel} slug={slug} nomeEmpresa={nome} prefixo="cu" />}

        <AnimacoesCuradoria />
      </div>
    </EstadoDaVitrine>
  );
}
