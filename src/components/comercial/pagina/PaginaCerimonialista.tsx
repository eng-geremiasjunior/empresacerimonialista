// A vitrine profissional — a página pública da cerimonialista.
//
// O desenho é o do Claude Design (16/09/2026, "Pagina do cerimonialista -
// eOrganizei"): foto de abertura com o nome por cima, rótulo pequeno e
// título em serifa por seção, o depoimento numa faixa escura, e o
// formulário no fim. Os estilos moram em app/cerimonialista/vitrine.css,
// gerado do desenho.
//
// Componente de servidor que só DESENHA: recebe a página já lida (a lista
// fechada da função pagina_publica) e decide a forma. A lógica que importa
// mora fora daqui — a medição (MedirPagina), o formulário
// (FormularioPedido), a leitura e o redirecionamento (a rota). É o que
// permite trocar o visual por outro modelo sem tocar em dado, contador ou
// pedido.
//
// Toda seção opcional some inteira quando não tem conteúdo. As fixas são
// a abertura, a apresentação, "Como funciona", o pedido e o rodapé.
//
// A página vende o serviço DELA. O eOrganizei aparece uma vez, no rodapé,
// em tamanho de rodapé.

import Link from "next/link";
import {
  comoFunciona,
  fraseParaQuem,
  iniciaisDoNome,
  textoWhatsappPagina,
  tiposEmLinha,
  type PaginaPublica,
} from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { DepoimentosVitrine } from "./DepoimentosVitrine";
import { FormularioPedido } from "./FormularioPedido";
import { GaleriaVitrine } from "./GaleriaVitrine";
import { LinkMedido, MedirPagina } from "./MedirPagina";
import { AnimacoesVitrine, BarraVitrine, EstadoDaVitrine, TopoVitrine } from "./VitrineViva";

/** O rótulo pequeno de cada seção, com a linha fina que cresce embaixo. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="vt-rotulo">
      {children}
      <span className="vt-rotulo-linha" data-vt-linha aria-hidden="true" />
    </p>
  );
}

/** A logo dela, em qualquer proporção; sem logo, as iniciais. */
function Marca({ nome, logo }: { nome: string; logo: string | null }) {
  if (logo) {
    return (
      <span className="vt-marca vt-marca-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" />
      </span>
    );
  }
  return (
    <span className="vt-marca vt-marca-iniciais" aria-hidden="true">
      {iniciaisDoNome(nome)}
    </span>
  );
}

const rotuloDoTipo = (t: string) => EVENT_TYPE_LABELS[t as keyof typeof EVENT_TYPE_LABELS] ?? t;

export function PaginaCerimonialista({
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

  // A 1ª foto abre a página. Com uma foto só, ela não se repete embaixo:
  // a seção "Eventos realizados" some e a legenda vem na apresentação.
  const capa = pagina.fotos[0] ?? null;
  const album = pagina.fotos.length >= 2 ? pagina.fotos : [];
  const legendaDaUnica = pagina.fotos.length === 1 ? pagina.fotos[0].legenda : null;

  const tipos = tiposEmLinha(pagina.tipos_atendidos.map(rotuloDoTipo));
  const paraQuem = fraseParaQuem(pagina.para_quem);
  const cidade = pagina.cidade?.trim() || null;

  const aberturaTexto = (
    <>
      {cidade && <p className="vt-abertura-cidade">{cidade}</p>}
      <h1 className="vt-abertura-nome">{nome}</h1>
      {tipos && <p className="vt-abertura-tipos">{tipos}</p>}
    </>
  );

  return (
    <EstadoDaVitrine
      tipoInicial={pagina.tipos_atendidos.length === 1 ? pagina.tipos_atendidos[0] : ""}
    >
      <div className="vt">
        <MedirPagina slug={slug} contar={medir} />

        <TopoVitrine nome={nome} marca={<Marca nome={nome} logo={pagina.logo_url} />} />

        {previa && (
          <div className="vt-previa">
            <span>Prévia: sua vitrine ainda não está no ar, só você vê.</span>
            <Link href="/orcamentos/pagina" className="vt-previa-link">
              Voltar ao editor
            </Link>
          </div>
        )}

        {/* abertura */}
        {capa ? (
          <header className="vt-abertura" data-vt-abertura>
            <div className="vt-abertura-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="vt-abertura-img"
                src={capa.url}
                alt={capa.legenda || `${rotuloDoTipo(capa.tipo_evento)} organizado por ${nome}`}
                // o maior elemento da primeira tela: o navegador busca antes
                fetchPriority="high"
              />
            </div>
            <div className="vt-abertura-veu" />
            <div className="vt-abertura-texto">
              {pagina.logo_url && <Marca nome={nome} logo={pagina.logo_url} />}
              {aberturaTexto}
            </div>
          </header>
        ) : (
          <header className="vt-abertura-sem-foto" data-vt-abertura>
            <Marca nome={nome} logo={pagina.logo_url} />
            {aberturaTexto}
          </header>
        )}

        {/* apresentação */}
        <section className="vt-apresentacao">
          <Rotulo>Apresentação</Rotulo>
          {pagina.titulo && <p className="vt-lead">{pagina.titulo}</p>}
          {pagina.posicionamento && (
            <p
              className="vt-texto whitespace-pre-line"
              style={pagina.titulo ? undefined : { marginTop: 0 }}
            >
              {pagina.posicionamento}
            </p>
          )}
          {paraQuem && <p className="vt-para-quem">{paraQuem}</p>}
          {legendaDaUnica && <p className="vt-para-quem">Na foto: {legendaDaUnica}</p>}
          <div className="vt-chamadas">
            <a href="#orcamento" className="vt-chamada-principal">
              Pedir orçamento
            </a>
            {wa && (
              <LinkMedido
                href={wa}
                slug={slug}
                tipo="whatsapp_click"
                contar={medir}
                className="vt-chamada-secundaria"
              >
                Conversar no WhatsApp
              </LinkMedido>
            )}
          </div>
        </section>

        {pagina.servicos.length > 0 && (
          <section className="vt-secao">
            <Rotulo>Serviços</Rotulo>
            <h2 className="vt-h2-servicos">O que {nome} faz</h2>
            <div className="vt-servicos">
              {pagina.servicos.map((s, i) => (
                <div key={`${i}-${s.nome}`} className="vt-servico">
                  <span className="vt-servico-n">{String(i + 1).padStart(2, "0")}</span>
                  <div className="vt-servico-corpo">
                    <h3 className="vt-servico-nome">{s.nome}</h3>
                    {s.descricao && <p className="vt-corpo">{s.descricao}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {album.length > 0 && (
          <section className="vt-secao">
            <Rotulo>Eventos realizados</Rotulo>
            <h2 className="vt-h2-eventos">Alguns eventos que organizamos</h2>
            <GaleriaVitrine
              nomeEmpresa={nome}
              fotos={album.map((f) => ({
                url: f.url,
                legenda: f.legenda,
                tipo: rotuloDoTipo(f.tipo_evento),
              }))}
            />
          </section>
        )}

        {pagina.depoimentos.length > 0 && (
          <DepoimentosVitrine
            depoimentos={pagina.depoimentos.map((d) => ({
              texto: d.texto,
              quem: d.contexto ? `${d.autor} · ${d.contexto}` : d.autor,
              tipo: d.tipo_evento ?? null,
            }))}
          />
        )}

        <section className="vt-secao">
          <Rotulo>Como funciona</Rotulo>
          <h2 className="vt-h2-roteiro">Do primeiro contato ao dia do evento</h2>
          <div className="vt-roteiro" data-vt-roteiro>
            <div className="vt-roteiro-trilho" aria-hidden="true" />
            <div className="vt-roteiro-fio" data-vt-fio aria-hidden="true" />
            {comoFunciona(nome).map((passo, i) => (
              <div key={i} className="vt-passo">
                <span className="vt-passo-n">{String(i + 1).padStart(2, "0")}</span>
                <p className="vt-corpo">{passo}</p>
              </div>
            ))}
          </div>
        </section>

        {pagina.motivos.length > 0 && (
          <section className="vt-secao">
            <Rotulo>Por que escolher {nome}</Rotulo>
            <div className="vt-motivos">
              {pagina.motivos.map((m, i) => (
                <div key={`${i}-${m}`} className="vt-motivo">
                  <p className="vt-motivo-texto">{m}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="orcamento" className="vt-orcamento">
          <Rotulo>Orçamento</Rotulo>
          <FormularioPedido
            slug={slug}
            nomeEmpresa={nome}
            tipos={pagina.tipos_atendidos}
            whatsappEmpresa={pagina.whatsapp}
            contar={medir}
            previa={previa}
          />
        </section>

        {insta && (
          <div className="vt-instagram">
            <LinkMedido
              href={insta}
              slug={slug}
              tipo="instagram_click"
              contar={medir}
              className="vt-botao-instagram"
            >
              Ver o Instagram @{pagina.instagram}
            </LinkMedido>
          </div>
        )}

        <footer className="vt-rodape">
          <div>
            {nome}
            {cidade ? ` · ${cidade}` : ""}
          </div>
          <div>
            <Link href="/privacidade">Privacidade</Link>
          </div>
          <div>
            <a href="/planos" className="vt-rodape-marca">
              Página feita com eorganizei
            </a>
          </div>
        </footer>

        <BarraVitrine whatsapp={wa} slug={slug} contar={medir} previa={previa} />

        <AnimacoesVitrine />
      </div>
    </EstadoDaVitrine>
  );
}
