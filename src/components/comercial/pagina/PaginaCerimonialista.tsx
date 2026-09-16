// A página pública da cerimonialista — o modelo.
//
// Componente de servidor que só DESENHA: recebe a página já lida (a lista
// fechada da função pagina_publica) e decide a forma. Toda a lógica que
// importa mora fora daqui — a medição (MedirPagina), o formulário
// (FormularioPedido), a leitura e o redirecionamento (a rota). É o que
// permite trocar o visual por outro modelo sem tocar em dado, contador ou
// pedido.
//
// Toda seção opcional some quando não tem conteúdo. As fixas são o
// cabeçalho, a apresentação, "como funciona" e o pedido.
//
// A página vende o serviço DELA. O eOrganizei aparece uma vez, no rodapé,
// em tamanho de rodapé.

import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import { comoFunciona, textoWhatsappPagina, type PaginaPublica } from "@/lib/comercial/pagina-publica";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { FormularioPedido } from "./FormularioPedido";
import { LinkMedido, MedirPagina } from "./MedirPagina";

// Paleta própria da vitrine: fundo quente, tinta quase preta, um acento
// verde-grafite calmo, que serve a casamento, formatura e evento de
// empresa sem puxar para nenhum. Página de marketing com um tema só, de
// propósito: todas as cores declaradas, fundo explícito.
const TOKENS: React.CSSProperties = {
  ["--pg-fundo" as string]: "#FBFAF7",
  ["--pg-papel" as string]: "#FFFFFF",
  ["--pg-tinta" as string]: "#1E1C19",
  ["--pg-suave" as string]: "#6A655D",
  ["--pg-linha" as string]: "#E8E3DA",
  ["--pg-acento" as string]: "#34443A",
  ["--pg-acento-claro" as string]: "#EEF1EC",
};

function IconeInstagram({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Iniciais({ nome }: { nome: string }) {
  const letras = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] font-[family-name:var(--font-pagina-titulo)] text-lg text-[color:var(--pg-tinta)]"
    >
      {letras || "·"}
    </span>
  );
}

function Secao({
  id,
  titulo,
  children,
}: {
  id?: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-[color:var(--pg-linha)] py-14 sm:py-20">
      <h2 className="font-[family-name:var(--font-pagina-titulo)] text-[28px] leading-tight text-[color:var(--pg-tinta)] sm:text-[34px] [text-wrap:balance]">
        {titulo}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

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
  const wa = linkWhatsapp(pagina.whatsapp, textoWhatsappPagina());
  const insta = pagina.instagram ? `https://instagram.com/${pagina.instagram}` : null;
  const passos = comoFunciona(nome);

  return (
    <div
      style={TOKENS}
      className="min-h-screen bg-[color:var(--pg-fundo)] font-[family-name:var(--font-pagina-corpo)] text-[color:var(--pg-tinta)] antialiased"
    >
      <MedirPagina slug={slug} contar={contar && !previa} />

      {previa && (
        <div className="bg-[color:var(--pg-tinta)] px-4 py-2.5 text-center text-sm text-white">
          Prévia: esta página ainda não está no ar, só você vê.{" "}
          <Link href="/orcamentos/pagina" className="underline underline-offset-2">
            Voltar ao editor
          </Link>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* cabeçalho */}
        <header className="flex items-center justify-between gap-4 py-6">
          <div className="flex min-w-0 items-center gap-3">
            {pagina.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pagina.logo_url}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border border-[color:var(--pg-linha)] bg-white object-cover"
              />
            ) : (
              <Iniciais nome={nome} />
            )}
            <p className="truncate font-[family-name:var(--font-pagina-titulo)] text-lg">{nome}</p>
          </div>
          <nav aria-label="Contato" className="flex shrink-0 items-center gap-2">
            {insta && (
              <LinkMedido
                href={insta}
                slug={slug}
                tipo="instagram_click"
                contar={contar && !previa}
                rotulo={`Instagram de ${nome}`}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--pg-tinta)] transition hover:bg-[color:var(--pg-acento-claro)]"
              >
                <IconeInstagram />
              </LinkMedido>
            )}
            <a
              href="#orcamento"
              className="hidden rounded-full border border-[color:var(--pg-tinta)] px-4 py-2 text-sm font-medium transition hover:bg-[color:var(--pg-tinta)] hover:text-white sm:inline-block"
            >
              Pedir orçamento
            </a>
          </nav>
        </header>

        {/* apresentação */}
        <section className="pb-16 pt-8 sm:pb-24 sm:pt-16">
          {pagina.cidade && (
            <p className="flex items-center gap-1.5 text-sm text-[color:var(--pg-suave)]">
              <MapPin size={15} aria-hidden />
              {pagina.cidade}
            </p>
          )}
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-pagina-titulo)] text-[40px] leading-[1.05] tracking-[-0.01em] sm:text-[60px] [text-wrap:balance]">
            {pagina.titulo || nome}
          </h1>
          {pagina.posicionamento && (
            <p className="mt-6 max-w-2xl whitespace-pre-line text-[17px] leading-relaxed text-[color:var(--pg-suave)] sm:text-lg">
              {pagina.posicionamento}
            </p>
          )}
          {pagina.para_quem && (
            <p className="mt-4 max-w-2xl text-[15px] text-[color:var(--pg-tinta)]">
              Para {pagina.para_quem.charAt(0).toLowerCase() + pagina.para_quem.slice(1)}
            </p>
          )}
          {pagina.tipos_atendidos.length > 0 && (
            <ul aria-label="Eventos que atende" className="mt-6 flex flex-wrap gap-2">
              {pagina.tipos_atendidos.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] px-3.5 py-1.5 text-sm"
                >
                  {EVENT_TYPE_LABELS[t] ?? t}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#orcamento"
              className="rounded-full bg-[color:var(--pg-acento)] px-7 py-3.5 text-[15px] font-medium text-white transition hover:opacity-90"
            >
              Pedir orçamento
            </a>
            {wa && (
              <LinkMedido
                href={wa}
                slug={slug}
                tipo="whatsapp_click"
                contar={contar && !previa}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] px-6 py-3.5 text-[15px] font-medium transition hover:bg-[color:var(--pg-acento-claro)]"
              >
                <MessageCircle size={17} aria-hidden />
                Conversar no WhatsApp
              </LinkMedido>
            )}
          </div>
        </section>

        {pagina.servicos.length > 0 && (
          <Secao titulo="Serviços">
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {pagina.servicos.map((s) => (
                <li key={s.nome} className="border-l-2 border-[color:var(--pg-acento)] pl-5">
                  <p className="text-lg font-semibold">{s.nome}</p>
                  {s.descricao && (
                    <p className="mt-1.5 leading-relaxed text-[color:var(--pg-suave)]">{s.descricao}</p>
                  )}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {pagina.motivos.length > 0 && (
          <Secao titulo={`Por que escolher ${nome}`}>
            <ul className="space-y-4">
              {pagina.motivos.map((m) => (
                <li key={m} className="flex gap-3 text-[17px] leading-relaxed">
                  <span aria-hidden className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--pg-acento)]" />
                  {m}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <Secao titulo="Como funciona">
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {passos.map((p, i) => (
              <li key={p.titulo}>
                <span className="font-[family-name:var(--font-pagina-titulo)] text-3xl text-[color:var(--pg-acento)]">
                  {i + 1}
                </span>
                <p className="mt-2 font-semibold">{p.titulo}</p>
                <p className="mt-1 leading-relaxed text-[color:var(--pg-suave)]">{p.texto}</p>
              </li>
            ))}
          </ol>
        </Secao>

        {pagina.fotos.length > 0 && (
          <Secao titulo="Eventos realizados">
            <ul className="columns-2 gap-3 sm:columns-3">
              {pagina.fotos.map((f) => (
                <li key={f.url} className="mb-3 break-inside-avoid">
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt={f.legenda || `${EVENT_TYPE_LABELS[f.tipo_evento] ?? "Evento"} organizado por ${nome}`}
                      loading="lazy"
                      className="w-full rounded-xl object-cover"
                    />
                    {f.legenda && (
                      <figcaption className="mt-1.5 text-sm text-[color:var(--pg-suave)]">
                        {f.legenda}
                      </figcaption>
                    )}
                  </figure>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {pagina.depoimentos.length > 0 && (
          <Secao titulo="Depoimentos">
            <ul className="grid gap-6 sm:grid-cols-2">
              {pagina.depoimentos.map((d) => (
                <li key={`${d.autor}-${d.texto.slice(0, 20)}`}>
                  <figure className="h-full rounded-2xl border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)] p-6">
                    <blockquote className="font-[family-name:var(--font-pagina-titulo)] text-lg leading-relaxed">
                      “{d.texto}”
                    </blockquote>
                    <figcaption className="mt-4 text-sm text-[color:var(--pg-suave)]">
                      <span className="font-medium text-[color:var(--pg-tinta)]">{d.autor}</span>
                      {d.contexto ? ` · ${d.contexto}` : ""}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <Secao id="orcamento" titulo="Conte sobre o seu evento">
          <div className="max-w-2xl">
            <FormularioPedido
              slug={slug}
              nomeEmpresa={nome}
              tipos={pagina.tipos_atendidos}
              whatsappEmpresa={pagina.whatsapp}
              contar={contar && !previa}
              previa={previa}
            />
          </div>
        </Secao>

        <footer className="flex flex-col gap-3 border-t border-[color:var(--pg-linha)] py-10 text-sm text-[color:var(--pg-suave)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {nome}
            {pagina.cidade ? ` · ${pagina.cidade}` : ""}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/privacidade" className="hover:text-[color:var(--pg-tinta)]">
              Privacidade
            </Link>
            <a href="/planos" className="hover:text-[color:var(--pg-tinta)]">
              Página feita com eorganizei
            </a>
          </p>
        </footer>
      </div>

      {/* no celular, o pedido e o WhatsApp ficam sempre à mão */}
      <div className="sticky bottom-0 z-10 flex gap-2 border-t border-[color:var(--pg-linha)] bg-[color:var(--pg-fundo)]/95 px-4 py-3 backdrop-blur sm:hidden">
        <a
          href="#orcamento"
          className="flex-1 rounded-full bg-[color:var(--pg-acento)] py-3 text-center text-[15px] font-medium text-white"
        >
          Pedir orçamento
        </a>
        {wa && (
          <LinkMedido
            href={wa}
            slug={slug}
            tipo="whatsapp_click"
            contar={contar && !previa}
            rotulo="Conversar no WhatsApp"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--pg-linha)] bg-[color:var(--pg-papel)]"
          >
            <MessageCircle size={20} aria-hidden />
          </LinkMedido>
        )}
      </div>
    </div>
  );
}
