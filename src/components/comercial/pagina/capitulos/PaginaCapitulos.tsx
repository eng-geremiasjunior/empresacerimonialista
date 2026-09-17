// A vitrine profissional, modelo Capítulos (desenho do Claude Design,
// "Modelo 3 — Capítulos", 16/09/2026).
//
// A página é lida como um caderno: depois da abertura vêm as três
// perguntas de toda primeira conversa, e cada capítulo numerado responde
// uma. Quem chega no 01 quer ver o último. Linho e sálvia, Bodoni Moda nos
// títulos, Archivo no texto, nenhum canto arredondado. Os estilos moram em
// app/cerimonialista/capitulos.css.
//
// Mesmos campos e mesma lógica do modelo Clássico (medição, pedido,
// pixel, estado da vitrine); muda só o desenho. Seção opcional some
// inteira quando não tem conteúdo, e a numeração segue o que ficou: um
// capítulo que some não deixa buraco na contagem.

import Link from "next/link";
import {
  comoFunciona,
  entregasDosPassos,
  normalizarPixelMeta,
  textoWhatsappPagina,
  type PaginaPublica,
} from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { GaleriaVitrine } from "../GaleriaVitrine";
import { LinkMedido, MedirPagina } from "../MedirPagina";
import { PixelDaVitrine, PreferenciasDoPixel } from "../PixelDaVitrine";
import { EstadoDaVitrine } from "../VitrineViva";
import { DepoimentosCapitulos } from "./DepoimentosCapitulos";
import { FichaPedido } from "./FichaPedido";
import { AnimacoesCapitulos, BarraCapitulos, TopoCapitulos } from "./VivaCapitulos";

const rotuloDoTipo = (t: string) => EVENT_TYPE_LABELS[t as keyof typeof EVENT_TYPE_LABELS] ?? t;
const doisDigitos = (n: number) => String(n).padStart(2, "0");

const CAPITULOS_POR_EXTENSO = ["", "Um capítulo", "Dois capítulos", "Três capítulos", "Quatro capítulos"];

const PERGUNTAS = [
  "Quem cuida do meu evento, de verdade?",
  "Como eu sei o que vou receber?",
  "E se algo sair do combinado no dia?",
];

/** O número e o rótulo de um capítulo, com a linha fina que cresce embaixo. */
function Cabeca({ numero, children }: { numero: string; children: React.ReactNode }) {
  return (
    <div className="cp-cabeca">
      <span className="cp-numero" aria-hidden="true">
        {numero}
      </span>
      <p className="cp-rotulo">
        {children}
        <span className="cp-rotulo-linha" data-cp-linha aria-hidden="true" />
      </p>
    </div>
  );
}

export function PaginaCapitulos({
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

  const capa = pagina.fotos[0] ?? null;
  const album = pagina.fotos.length >= 2 ? pagina.fotos : [];

  // a numeração segue os capítulos que existem
  const temServicos = pagina.servicos.length > 0;
  const temAlbum = album.length > 0;
  const temDepoimentos = pagina.depoimentos.length > 0;
  let n = 0;
  const nServicos = temServicos ? doisDigitos(++n) : "";
  const nAlbum = temAlbum ? doisDigitos(++n) : "";
  const nComo = doisDigitos(++n);
  const nDepoimentos = temDepoimentos ? doisDigitos(++n) : "";
  const capitulos = n;
  const nOrcamento = doisDigitos(n + 1);

  const passos = comoFunciona(nome);
  const entregas = entregasDosPassos();

  return (
    <EstadoDaVitrine
      tipoInicial={pagina.tipos_atendidos.length === 1 ? pagina.tipos_atendidos[0] : ""}
    >
      <div className="cp">
        <MedirPagina slug={slug} contar={medir} />

        <TopoCapitulos nome={nome} />

        {previa && (
          <div className="cp-previa">
            <span>Prévia: sua vitrine ainda não está no ar, só você vê.</span>
            <Link href="/orcamentos/pagina" className="cp-previa-link">
              Voltar ao editor
            </Link>
          </div>
        )}

        {/* abertura */}
        <header className="cp-abertura" data-vt-abertura data-sem-foto={capa ? undefined : ""}>
          {capa && (
            <div className="cp-abertura-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="cp-abertura-img"
                src={capa.url}
                alt={capa.legenda || `${rotuloDoTipo(capa.tipo_evento)} organizado por ${nome}`}
                fetchPriority="high"
              />
            </div>
          )}
          <div className="cp-abertura-veu" aria-hidden="true" />
          <div className="cp-abertura-texto">
            {cidade && <p className="cp-abertura-cidade">{cidade}</p>}
            <h1 className="cp-abertura-nome">{nome}</h1>
            {pagina.titulo && <p className="cp-abertura-titulo">{pagina.titulo}</p>}
            {pagina.posicionamento && (
              <p className="cp-abertura-apresentacao">{pagina.posicionamento}</p>
            )}
            <div className="cp-chamadas">
              <a href="#orcamento" className="cp-botao cp-chamada">
                Pedir orçamento
              </a>
              {wa && (
                <LinkMedido
                  href={wa}
                  slug={slug}
                  tipo="whatsapp_click"
                  contar={medir}
                  className="cp-botao-contorno cp-chamada"
                >
                  Conversar no WhatsApp
                </LinkMedido>
              )}
            </div>
          </div>
          <div className="cp-abertura-guia" aria-hidden="true">
            <span className="cp-seta">↓</span>
            <span className="cp-abertura-guia-texto">{CAPITULOS_POR_EXTENSO[capitulos]}</span>
          </div>
        </header>

        {/* as três perguntas */}
        <section className="cp-perguntas" aria-label="Perguntas de toda primeira conversa">
          <p className="cp-perguntas-lead">
            Três perguntas aparecem em toda primeira conversa. As respostas estão aqui embaixo.
          </p>
          <div className="cp-perguntas-grade">
            {PERGUNTAS.map((p) => (
              <p key={p} className="cp-pergunta">
                {p}
              </p>
            ))}
          </div>
        </section>

        {temServicos && (
          <section className="cp-capitulo" data-cp-capitulo>
            <Cabeca numero={nServicos}>Serviços</Cabeca>
            <h2 className="cp-h2">Quem cuida do seu evento</h2>
            {pagina.servicos.length > 1 && (
              <p className="cp-intro">Escolha pelo quanto você quer participar do planejamento.</p>
            )}
            <div className="cp-servicos">
              {pagina.servicos.map((s, i) => (
                <div key={`${i}-${s.nome}`} className="cp-servico">
                  <span className="cp-servico-n" aria-hidden="true">
                    {doisDigitos(i + 1)}
                  </span>
                  <div className="cp-servico-corpo">
                    <h3 className="cp-servico-nome">{s.nome}</h3>
                    {s.descricao && <p className="cp-servico-texto">{s.descricao}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {temAlbum && (
          <section className="cp-capitulo cp-capitulo-album" data-cp-capitulo>
            <div className="cp-album-cabeca">
              <Cabeca numero={nAlbum}>Eventos realizados</Cabeca>
              <h2 className="cp-h2 cp-h2-album">O que já saiu do papel</h2>
            </div>
            <GaleriaVitrine
              prefixo="cp"
              legendas
              nomeEmpresa={nome}
              fotos={album.map((f) => ({
                url: f.url,
                legenda: f.legenda,
                tipo: rotuloDoTipo(f.tipo_evento),
              }))}
            />
          </section>
        )}

        {/* 03 — a régua */}
        <section className="cp-capitulo cp-capitulo-como" data-cp-capitulo>
          <Cabeca numero={nComo}>Como funciona</Cabeca>
          <h2 className="cp-h2">Como você sabe o que vai receber</h2>
          <p className="cp-intro cp-intro-como">
            Cada etapa tem uma entrega. Nada fica combinado só na conversa.
          </p>
          <ol className="cp-regua" data-cp-regua>
            {passos.map((passo, i) => (
              <li key={i} className="cp-pauta" data-cp-pauta>
                <span className="cp-pauta-fio" aria-hidden="true" />
                <span className="cp-pauta-n" aria-hidden="true">
                  {doisDigitos(i + 1)}
                </span>
                <div className="cp-pauta-corpo" data-ultima={i === passos.length - 1 ? "" : undefined}>
                  <p className="cp-pauta-passo">{passo}</p>
                  {entregas[i] && (
                    <div>
                      <p className="cp-pauta-rotulo">Você recebe</p>
                      <p className="cp-pauta-entrega">{entregas[i]}</p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <span className="cp-regua-fim" data-cp-regua-fim aria-hidden="true" />
        </section>

        {temDepoimentos && (
          <DepoimentosCapitulos
            numero={nDepoimentos}
            depoimentos={pagina.depoimentos.map((d) => ({
              texto: d.texto,
              quem: d.contexto ? `${d.autor} · ${d.contexto}` : d.autor,
              tipo: d.tipo_evento ?? null,
            }))}
          />
        )}

        {pagina.motivos.length > 0 && (
          <section className="cp-capitulo" data-cp-capitulo>
            <p className="cp-rotulo cp-rotulo-solto">
              Por que escolher {nome}
              <span className="cp-rotulo-linha" data-cp-linha aria-hidden="true" />
            </p>
            <div className="cp-motivos">
              {pagina.motivos.map((m, i) => (
                <p key={`${i}-${m}`} className="cp-motivo">
                  {m}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* 05 — o pedido */}
        <section id="orcamento" className="cp-orcamento">
          <div className="cp-orcamento-dentro">
            <Cabeca numero={nOrcamento}>Orçamento</Cabeca>
            <FichaPedido
              slug={slug}
              nomeEmpresa={nome}
              tipos={pagina.tipos_atendidos}
              whatsappEmpresa={pagina.whatsapp}
              contar={medir}
              previa={previa}
            />
            {insta && (
              <LinkMedido
                href={insta}
                slug={slug}
                tipo="instagram_click"
                contar={medir}
                className="cp-botao-instagram"
              >
                Instagram @{pagina.instagram}
              </LinkMedido>
            )}
          </div>
        </section>

        <footer className="cp-rodape">
          <div className="cp-rodape-nome">{nome}</div>
          {cidade && <div>{cidade}</div>}
          <div>
            {/* página inteira nova, como os outros links para fora da vitrine:
                o pixel dela nunca segue na mesma aba para outra tela */}
            <a href="/privacidade#vitrine">Privacidade</a>
          </div>
          {pixel && (
            <div>
              <PreferenciasDoPixel prefixo="cp" />
            </div>
          )}
          <div>
            <a href="/planos" className="cp-rodape-marca">
              Página feita com eorganizei
            </a>
          </div>
        </footer>

        <BarraCapitulos whatsapp={wa} slug={slug} contar={medir} previa={previa} />

        {pixel && <PixelDaVitrine pixelId={pixel} slug={slug} nomeEmpresa={nome} prefixo="cp" />}

        <AnimacoesCapitulos />
      </div>
    </EstadoDaVitrine>
  );
}
