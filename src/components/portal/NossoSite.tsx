"use client";

// "Nosso site" — a tela em que a família monta o site (30/09/2026, plano
// "Site e lista"; o desenho é o do app da Wedy que o dono mostrou).
//
// No alto, a prévia com o endereço e o estado da publicação. Depois os
// seis atalhos (Adicionar bloco, Aparência, Detalhes, Ver o site,
// Divulgar, Mural) e a lista dos blocos: tocar abre o bloco para editar,
// ↑ ↓ mudam a ordem (no celular nada de arrastar — a lição das Mesas) e o
// olho esconde. A prévia é o site DE VERDADE (ConviteCompleto) com o que
// está escrito agora, inclusive o que ainda não foi salvo.
//
// Publicar manda a versão para a revisão do dono do sistema; a versão
// aprovada antes continua no ar até a nova passar (migração 185). A
// cerimonialista não mexe no site.

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  LayoutTemplate,
  MessageCircle,
  Palette,
  Plus,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ConviteCompleto } from "@/components/convite/ConviteCompleto";
import { PreviaDoSite } from "@/components/convite/PreviaDoSite";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { dataLonga, quandoLegivel } from "@/lib/rsvp-convite";
import {
  BLOCOS_FIXOS,
  BLOCOS_PRONTOS,
  estruturaEfetiva,
  moverBloco,
  nomeDoBloco,
  type BlocoDoSite,
  type PapelDeCor,
  type TemaDoSite,
} from "@/lib/site-blocos";
import {
  decidirMusica,
  definirBlocos,
  definirEnderecoDoSite,
  ligarSite,
  ocultarFoto,
  ocultarRecado,
  publicarSiteDaFamilia,
  salvarConviteCasal,
  salvarEstruturaSite,
  salvarSiteCasal,
} from "@/app/(portal)/portal/[eventoId]/site/actions";
import type { FotoModeracao, MusicaModeracao, RecadoModeracao } from "./EditorSiteCasal";
import { Cartao, Rotulo } from "./Nucleo";
import { TRACO } from "./icones";

export type EstadoDaRevisao = {
  status: "rascunho" | "em_analise" | "aprovado" | "recusado";
  enviada_em: string | null;
  motivo: string | null;
  revisado_em: string | null;
  /** o dono tirou do ar: só volta com nova aprovação */
  retirado?: boolean;
};

type Textos = { mensagem: string; historia: string; dressCode: string };
type Look = {
  historiaTitulo: string;
  dressCodeTitulo: string;
  corAcento: string;
  corTinta: string;
  corFundo: string;
  presentesTexto: string;
  pixChave: string;
  pixTitular: string;
  presentesLink: string;
};
type Painel = "adicionar" | "aparencia" | "detalhes" | "divulgar" | "mural" | null;

const campo: CSSProperties = {
  width: "100%",
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 12px",
  fontSize: "var(--ts-item-desc)",
  fontFamily: "var(--fonte-corpo)",
  color: "var(--cor-texto)",
};
const botao: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--cor-borda-botao)",
  borderRadius: "var(--raio-botao)",
  background: "var(--cor-card-suave)",
  padding: "10px 16px",
  minHeight: "var(--toque-min)",
  fontSize: "var(--ts-botao)",
  color: "var(--cor-texto-secundario)",
  cursor: "pointer",
  fontFamily: "var(--fonte-corpo)",
};
const botaoForte: CSSProperties = {
  ...botao,
  background: "var(--cor-texto-forte)",
  borderColor: "var(--cor-texto-forte)",
  color: "var(--cor-card)",
};
const nota: CSSProperties = { fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-suave)", margin: 0 };
const iconeBotao: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--toque-min)",
  height: "var(--toque-min)",
  border: "none",
  background: "none",
  color: "var(--cor-texto-suave)",
  cursor: "pointer",
  flex: "none",
};

const CORES_DO_MODELO: Record<PapelDeCor, string> = {
  fundo: "#faf6f0",
  superficie: "#f1eae0",
  tinta: "#3a342c",
  suave: "#6b645b",
  acento: "#b06b4a",
};
const NOME_DA_COR: Record<PapelDeCor, string> = {
  fundo: "Fundo",
  superficie: "Cartões",
  tinta: "Texto",
  suave: "Texto de apoio",
  acento: "Detalhes",
};

/** "há 3 horas", só depois de montar (relógio no 1º render quebra a hidratação) */
function useHaQuanto(iso: string | null): string | null {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => setAgora(Date.now()), []);
  if (!iso || agora === null) return null;
  const min = Math.floor((agora - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  return d === 1 ? "desde ontem" : `há ${d} dias`;
}

/** O site em escala, sem clique nem foco (é só para ver). `largura` é a
 *  do celular em que ele é desenhado; `alturaDoSite`, quanto dele aparece
 *  (640 = a capa inteira no celular: foto, nomes e o cartão da data). */
function SiteEmEscala({
  dados,
  fotosAlbum,
  fotoCasalUrl,
  largura,
  alturaDoSite,
}: {
  dados: SitePublico;
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
  largura: number;
  alturaDoSite: number;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const miolo = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / largura);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [largura]);
  useEffect(() => {
    miolo.current?.setAttribute("inert", "");
  }, []);
  return (
    <div
      ref={caixa}
      aria-hidden
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${largura} / ${alturaDoSite}`,
        overflow: "hidden",
        borderRadius: 10,
        background: "#faf6f0",
      }}
    >
      <div
        ref={miolo}
        style={{
          width: largura,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          pointerEvents: "none",
          opacity: escala ? 1 : 0,
        }}
      >
        <ConviteCompleto dados={dados} fotosAlbum={fotosAlbum} fotoCasalUrl={fotoCasalUrl} semEnvelope />
      </div>
    </div>
  );
}

export function NossoSite({
  eventoId,
  tipoEvento,
  previa,
  revisao,
  publicado,
  publicadoEm,
  fotosAlbum,
  fotoCasalUrl,
  textosIniciais,
  lookInicial,
  blocosDaFesta,
  endereco,
  urlNoAr,
  qrSvg,
  fotos,
  musicas,
  recados,
}: {
  eventoId: string;
  tipoEvento: string;
  /** a página montada com o que está salvo agora (portal_previa_site) */
  previa: SitePublico;
  revisao: EstadoDaRevisao;
  publicado: boolean;
  publicadoEm: string | null;
  fotosAlbum: { url: string; autor: string | null }[];
  fotoCasalUrl: string | null;
  textosIniciais: Textos;
  lookInicial: Look;
  blocosDaFesta: { album: boolean; playlist: boolean; recados: boolean };
  endereco: { slug: string | null; congelado: boolean; base: string };
  urlNoAr: string | null;
  qrSvg: string | null;
  fotos: FotoModeracao[];
  musicas: MusicaModeracao[];
  recados: RecadoModeracao[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [estrutura, setEstrutura] = useState<BlocoDoSite[]>(() => estruturaEfetiva(previa.site?.estrutura));
  const [tema, setTema] = useState<TemaDoSite>(() => {
    const t = (previa.site?.tema ?? {}) as TemaDoSite;
    if (t.cores && Object.keys(t.cores).length > 0) return t;
    // sem tema salvo, as três cores de antes entram como ponto de partida
    const cores: TemaDoSite["cores"] = {};
    if (/^#[0-9a-f]{6}$/i.test(lookInicial.corFundo)) cores.fundo = lookInicial.corFundo;
    if (/^#[0-9a-f]{6}$/i.test(lookInicial.corTinta)) cores.tinta = lookInicial.corTinta;
    if (/^#[0-9a-f]{6}$/i.test(lookInicial.corAcento)) cores.acento = lookInicial.corAcento;
    return { ...t, cores };
  });
  const [textos, setTextos] = useState<Textos>(textosIniciais);
  const [look, setLook] = useState<Look>(lookInicial);
  const [painel, setPainel] = useState<Painel>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [verSite, setVerSite] = useState(false);
  const [slug, setSlug] = useState(endereco.slug ?? "");
  const [copiado, setCopiado] = useState(false);

  const desde = useHaQuanto(revisao.enviada_em);

  // a prévia desenha o que está escrito AGORA, salvo ou não
  const dadosDaPrevia: SitePublico = useMemo(
    () => ({
      ...previa,
      site: {
        ...(previa.site ?? {
          foto_casal_path: null,
          blocos: [],
          pix_chave: null,
          pix_titular: null,
          presentes_link: null,
          presentes_texto: null,
          historia_titulo: null,
          dress_code_titulo: null,
          mensagem: null,
          historia: null,
          dress_code: null,
        }),
        mensagem: textos.mensagem.trim() || null,
        historia: textos.historia.trim() || null,
        dress_code: textos.dressCode.trim() || null,
        historia_titulo: look.historiaTitulo.trim() || null,
        dress_code_titulo: look.dressCodeTitulo.trim() || null,
        presentes_texto: look.presentesTexto.trim() || null,
        pix_chave: look.pixChave.trim() || null,
        pix_titular: look.pixTitular.trim() || null,
        presentes_link: look.presentesLink.trim() || null,
        estrutura,
        tema,
      },
      blocos: blocosDaFesta,
    }),
    [previa, textos, look, estrutura, tema, blocosDaFesta]
  );

  function rodar(fn: () => Promise<{ error?: string }>, ok?: string) {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await fn();
      if (r.error) {
        setErro(r.error);
        return;
      }
      if (ok) setAviso(ok);
      router.refresh();
    });
  }

  function gravarEstrutura(nova: BlocoDoSite[], novoTema: TemaDoSite = tema) {
    setEstrutura(nova);
    setTema(novoTema);
    rodar(() => salvarEstruturaSite(eventoId, nova, novoTema));
  }

  async function salvarTudo(): Promise<{ error?: string }> {
    const a = await salvarSiteCasal(eventoId, textos);
    if (a.error) return a;
    const b = await salvarConviteCasal(eventoId, look);
    if (b.error) return b;
    return salvarEstruturaSite(eventoId, estrutura, tema);
  }

  /* ---------- o estado da publicação, em palavras ---------- */

  const estado = (() => {
    if (revisao.status === "em_analise") {
      return publicado
        ? `No ar · a nova versão está em análise ${desde ?? ""}`.trim()
        : `Em análise ${desde ?? ""}`.trim();
    }
    if (revisao.retirado) return "Tirado do ar pelo eorganizei";
    if (revisao.status === "recusado") {
      return publicado ? "No ar · a última versão enviada voltou para ajustes" : "Voltou para ajustes";
    }
    if (publicado) return publicadoEm ? `No ar desde ${dataLonga(publicadoEm.slice(0, 10))}` : "No ar";
    if (revisao.status === "aprovado") return "Fora do ar";
    return "Rascunho · ainda não publicado";
  })();

  /* ---------- o resumo de cada bloco na lista ---------- */

  const hospedagens = previa.espaco?.hospedagens?.length ?? 0;
  function resumo(b: BlocoDoSite): string {
    const corta = (t: string, n = 56) => (t.length > n ? `${t.slice(0, n).trimEnd()}…` : t);
    switch (b.tipo) {
      case "capa":
        return [previa.evento.anfitrioes, dataLonga(previa.evento.data)].filter(Boolean).join(" · ");
      case "contagem":
        return "Dias, horas, minutos e segundos até a festa";
      case "mensagem":
        return textos.mensagem.trim() ? corta(textos.mensagem.trim()) : "Vazio · não aparece";
      case "historia":
        return look.historiaTitulo.trim() || (textos.historia.trim() ? corta(textos.historia.trim()) : "Vazio · não aparece");
      case "local":
        return previa.evento.local
          ? [previa.evento.local, previa.evento.cidade].filter(Boolean).join(" · ")
          : "Vem do evento · ainda sem local";
      case "dress_code":
        return look.dressCodeTitulo.trim() || (textos.dressCode.trim() ? corta(textos.dressCode.trim()) : "Vazio · não aparece");
      case "rsvp":
        return previa.rsvp.aberto
          ? previa.rsvp.prazo
            ? `Aberta até ${previa.rsvp.prazo.slice(8, 10)}/${previa.rsvp.prazo.slice(5, 7)}`
            : "Aberta"
          : "Fechada";
      case "presentes": {
        const partes = [look.pixChave.trim() && "Pix", look.presentesLink.trim() && "link da lista"].filter(Boolean);
        return partes.length ? partes.join(" · ") : look.presentesTexto.trim() ? "Só o texto" : "Vazio · não aparece";
      }
      case "hospedagem":
        return hospedagens > 0
          ? `${hospedagens} ${hospedagens === 1 ? "lugar para ficar" : "lugares para ficar"} · vem do espaço`
          : "Vem do espaço · nenhum lugar ainda";
      case "album":
        return blocosDaFesta.album ? "Ligado · os convidados mandam fotos" : "Desligado";
      case "playlist":
        return blocosDaFesta.playlist ? "Ligado · os convidados sugerem músicas" : "Desligado";
      case "mural":
        return blocosDaFesta.recados ? "Ligado · os convidados deixam recados" : "Desligado";
      case "texto": {
        const t = typeof b.conteudo?.titulo === "string" ? b.conteudo.titulo.trim() : "";
        const x = typeof b.conteudo?.texto === "string" ? b.conteudo.texto.trim() : "";
        return t || (x ? corta(x) : "Vazio · não aparece");
      }
      case "rodape":
        return quandoLegivel(previa.evento.data, null);
      default:
        return "";
    }
  }

  /* ---------- o editor de cada bloco ---------- */

  function editor(b: BlocoDoSite): ReactNode {
    const salvarTextos = (
      <button type="button" style={botao} disabled={pendente} onClick={() => rodar(salvarTudo, "Salvo.")}>
        {pendente ? "Salvando…" : "Salvar"}
      </button>
    );
    switch (b.tipo) {
      case "mensagem":
        return (
          <>
            <textarea
              style={campo}
              rows={3}
              maxLength={2000}
              value={textos.mensagem}
              onChange={(e) => setTextos({ ...textos, mensagem: e.target.value })}
              placeholder="Uma frase de vocês — sai logo abaixo dos nomes."
            />
            <div>{salvarTextos}</div>
          </>
        );
      case "historia":
        return (
          <>
            <input
              style={campo}
              maxLength={120}
              value={look.historiaTitulo}
              onChange={(e) => setLook({ ...look, historiaTitulo: e.target.value })}
              placeholder="Um título (ex.: Do mesmo mar, sete anos depois)"
            />
            <textarea
              style={campo}
              rows={5}
              maxLength={4000}
              value={textos.historia}
              onChange={(e) => setTextos({ ...textos, historia: e.target.value })}
              placeholder="Como tudo começou, do jeito de vocês."
            />
            <div>{salvarTextos}</div>
          </>
        );
      case "dress_code":
        return (
          <>
            <input
              style={campo}
              maxLength={60}
              value={look.dressCodeTitulo}
              onChange={(e) => setLook({ ...look, dressCodeTitulo: e.target.value })}
              placeholder="Em duas palavras (ex.: Social completo)"
            />
            <textarea
              style={campo}
              rows={2}
              maxLength={400}
              value={textos.dressCode}
              onChange={(e) => setTextos({ ...textos, dressCode: e.target.value })}
              placeholder="O detalhe (ex.: cerimônia na grama — evitem salto fino)."
            />
            <div>{salvarTextos}</div>
          </>
        );
      case "presentes":
        return (
          <>
            <textarea
              style={campo}
              rows={2}
              maxLength={400}
              value={look.presentesTexto}
              onChange={(e) => setLook({ ...look, presentesTexto: e.target.value })}
              placeholder="Sua presença é o nosso maior presente. Se desejar nos presentear…"
            />
            <input
              style={campo}
              maxLength={120}
              value={look.pixChave}
              onChange={(e) => setLook({ ...look, pixChave: e.target.value })}
              placeholder="Chave Pix"
            />
            <input
              style={campo}
              maxLength={120}
              value={look.pixTitular}
              onChange={(e) => setLook({ ...look, pixTitular: e.target.value })}
              placeholder="Quem recebe (ex.: Lya Dias · Banco Inter)"
            />
            <input
              style={campo}
              value={look.presentesLink}
              onChange={(e) => setLook({ ...look, presentesLink: e.target.value })}
              placeholder="Link da lista de presentes na loja (opcional)"
            />
            <div>{salvarTextos}</div>
          </>
        );
      case "texto": {
        const titulo = typeof b.conteudo?.titulo === "string" ? b.conteudo.titulo : "";
        const texto = typeof b.conteudo?.texto === "string" ? b.conteudo.texto : "";
        const mudar = (campoDoBloco: "titulo" | "texto", valor: string) =>
          setEstrutura((atual) =>
            atual.map((x) => (x.id === b.id ? { ...x, conteudo: { ...(x.conteudo ?? {}), [campoDoBloco]: valor } } : x))
          );
        return (
          <>
            <input
              style={campo}
              maxLength={120}
              value={titulo}
              onChange={(e) => mudar("titulo", e.target.value)}
              placeholder="Título"
            />
            <textarea
              style={campo}
              rows={4}
              maxLength={3000}
              value={texto}
              onChange={(e) => mudar("texto", e.target.value)}
              placeholder="O texto"
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={botao}
                disabled={pendente}
                onClick={() => rodar(() => salvarEstruturaSite(eventoId, estrutura, tema), "Salvo.")}
              >
                {pendente ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                style={{ ...botao, border: "none" }}
                disabled={pendente}
                onClick={() => {
                  setAberto(null);
                  gravarEstrutura(estrutura.filter((x) => x.id !== b.id));
                }}
              >
                Tirar este bloco
              </button>
            </div>
          </>
        );
      }
      case "album":
      case "playlist":
      case "mural": {
        const chave = b.tipo === "mural" ? "recados" : b.tipo;
        const ligado = blocosDaFesta[chave];
        return (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ligado}
                disabled={pendente}
                onChange={(e) => rodar(() => definirBlocos(eventoId, { [chave]: e.target.checked }))}
              />
              <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
                {ligado ? "Ligado" : "Desligado"} · vale na hora, sem publicar de novo
              </span>
            </label>
            <button type="button" style={{ ...botao, alignSelf: "flex-start" }} onClick={() => setPainel("mural")}>
              Ver o que chegou
            </button>
          </>
        );
      }
      case "local":
      case "hospedagem":
        return <p style={nota}>Vem do evento, e sua cerimonialista mantém atualizado.</p>;
      case "rsvp":
        return <p style={nota}>O formulário de confirmação. O prazo e o menu vêm do evento.</p>;
      case "capa":
        return <p style={nota}>Os nomes, a data e a foto de capa do evento.</p>;
      case "contagem":
        return <p style={nota}>Conta sozinha até a hora da festa.</p>;
      case "rodape":
        return <p style={nota}>A data e o logo da sua cerimonialista.</p>;
      default:
        return null;
    }
  }

  /* ---------- a tela ---------- */

  const atalhos: { chave: Exclude<Painel, null> | "ver"; rotulo: string; Icone: typeof Plus; forte?: boolean; contador?: number }[] = [
    { chave: "adicionar", rotulo: "Adicionar bloco", Icone: Plus, forte: true },
    { chave: "aparencia", rotulo: "Aparência", Icone: Palette },
    { chave: "detalhes", rotulo: "Detalhes", Icone: SlidersHorizontal },
    { chave: "ver", rotulo: "Ver o site", Icone: Eye },
    { chave: "divulgar", rotulo: "Divulgar", Icone: Share2 },
    {
      chave: "mural",
      rotulo: "Mural",
      Icone: MessageCircle,
      contador: musicas.filter((m) => m.estado === "sugerida").length + recados.filter((r) => !r.oculto).length,
    },
  ];

  const escondidos = estrutura.filter((b) => b.visivel === false);
  const linkSite = urlNoAr;

  return (
    <>
      {/* a prévia e a publicação */}
      <Cartao padding="var(--esp-5)">
        {/* o site tem botões (a confirmação de presença): botão dentro de
            botão quebra a hidratação — o toque vai numa camada por cima */}
        <div style={{ position: "relative", width: "100%", maxWidth: 320, margin: "0 auto" }}>
          <SiteEmEscala
            dados={dadosDaPrevia}
            fotosAlbum={fotosAlbum}
            fotoCasalUrl={fotoCasalUrl}
            largura={430}
            alturaDoSite={640}
          />
          <button
            type="button"
            onClick={() => setVerSite(true)}
            style={{ position: "absolute", inset: 0, padding: 0, border: "none", background: "none", cursor: "pointer" }}
            aria-label="Ver o site inteiro"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-forte)" }}>{estado}</p>
          {(revisao.status === "recusado" || revisao.retirado) && revisao.motivo && (
            <p style={{ ...nota, color: "var(--cor-atencao)" }}>Motivo: {revisao.motivo}</p>
          )}
          <p style={{ ...nota, wordBreak: "break-all" }}>
            {endereco.base}/c/{endereco.slug ?? "…"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{ ...botaoForte, flex: "1 1 auto" }}
            disabled={pendente}
            onClick={() => {
              // o endereço vai junto para a revisão: sem ele, primeiro escolher
              if (!endereco.slug) {
                setPainel("detalhes");
                setErro("Escolha o endereço do site antes de publicar.");
                return;
              }
              rodar(async () => {
                const s = await salvarTudo();
                if (s.error) return s;
                return publicarSiteDaFamilia(eventoId);
              }, "Enviado. Vai ao ar assim que for aprovado.");
            }}
          >
            {pendente ? "Enviando…" : revisao.status === "rascunho" ? "Publicar" : "Publicar alterações"}
          </button>
          {publicado ? (
            <button type="button" style={botao} disabled={pendente} onClick={() => rodar(() => ligarSite(eventoId, false))}>
              Tirar do ar
            </button>
          ) : !revisao.retirado && (revisao.status === "aprovado" || revisao.status === "recusado") && publicadoEm ? (
            <button type="button" style={botao} disabled={pendente} onClick={() => rodar(() => ligarSite(eventoId, true))}>
              Voltar ao ar
            </button>
          ) : null}
        </div>
        {(erro || aviso) && (
          <p style={{ ...nota, color: erro ? "var(--cor-atencao)" : "var(--cor-texto-suave)" }}>{erro ?? aviso}</p>
        )}
      </Cartao>

      {/* os seis atalhos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {atalhos.map(({ chave, rotulo, Icone, forte, contador }) => {
          const ativo = chave !== "ver" && painel === chave;
          return (
            <button
              key={chave}
              type="button"
              onClick={() => (chave === "ver" ? setVerSite(true) : setPainel(ativo ? null : chave))}
              aria-pressed={chave === "ver" ? undefined : ativo}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
                minHeight: 84,
                padding: "12px 12px",
                borderRadius: "var(--raio-card)",
                border: `1px solid ${forte || ativo ? "var(--cor-texto-forte)" : "var(--cor-borda)"}`,
                background: forte ? "var(--cor-texto-forte)" : ativo ? "var(--cor-card-suave)" : "var(--cor-card)",
                color: forte ? "var(--cor-card)" : "var(--cor-texto)",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--fonte-corpo)",
              }}
            >
              <Icone size={18} strokeWidth={TRACO} aria-hidden />
              <span style={{ fontSize: "var(--ts-item-desc)", lineHeight: 1.25 }}>{rotulo}</span>
              {contador ? (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: "var(--cor-texto-forte)",
                    color: "var(--cor-card)",
                    fontSize: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {contador}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* o painel do atalho escolhido */}
      {painel && (
        <Cartao padding="var(--esp-5)">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Rotulo>{atalhos.find((a) => a.chave === painel)?.rotulo}</Rotulo>
            <button type="button" style={iconeBotao} aria-label="Fechar" onClick={() => setPainel(null)}>
              <X size={16} strokeWidth={TRACO} />
            </button>
          </div>

          {painel === "adicionar" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                style={{ ...botao, justifyContent: "flex-start" }}
                disabled={pendente}
                onClick={() => {
                  const id = `texto-${Date.now().toString(36)}`;
                  const semRodape = estrutura.filter((b) => b.tipo !== "rodape");
                  const rodape = estrutura.find((b) => b.tipo === "rodape");
                  const nova: BlocoDoSite[] = [
                    ...semRodape,
                    { id, tipo: "texto", conteudo: { titulo: "", texto: "" } },
                    ...(rodape ? [rodape] : []),
                  ];
                  gravarEstrutura(nova);
                  setPainel(null);
                  setAberto(id);
                }}
              >
                <LayoutTemplate size={16} strokeWidth={TRACO} aria-hidden />
                {nomeDoBloco("texto", tipoEvento)}
              </button>
              {escondidos.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  style={{ ...botao, justifyContent: "flex-start" }}
                  disabled={pendente}
                  onClick={() =>
                    gravarEstrutura(estrutura.map((x) => (x.id === b.id ? { ...x, visivel: true } : x)))
                  }
                >
                  <Eye size={16} strokeWidth={TRACO} aria-hidden />
                  Mostrar de novo: {nomeDoBloco(b.tipo, tipoEvento)}
                </button>
              ))}
            </div>
          )}

          {painel === "aparencia" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {(Object.keys(NOME_DA_COR) as PapelDeCor[]).map((papel) => (
                  <label key={papel} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="color"
                      value={tema.cores?.[papel] ?? CORES_DO_MODELO[papel]}
                      onChange={(e) => setTema({ ...tema, cores: { ...(tema.cores ?? {}), [papel]: e.target.value } })}
                      style={{ width: 42, height: 34, border: "none", background: "none", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>
                      {NOME_DA_COR[papel]}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={botao}
                  disabled={pendente}
                  onClick={() => rodar(() => salvarEstruturaSite(eventoId, estrutura, tema), "Salvo.")}
                >
                  {pendente ? "Salvando…" : "Salvar cores"}
                </button>
                <button
                  type="button"
                  style={{ ...botao, border: "none" }}
                  disabled={pendente}
                  onClick={() => gravarEstrutura(estrutura, { ...tema, cores: {} })}
                >
                  Voltar às cores do modelo
                </button>
              </div>
            </>
          )}

          {painel === "detalhes" && (
            <>
              <Rotulo>O endereço do site</Rotulo>
              {revisao.status === "em_analise" && !endereco.congelado ? (
                <p style={nota}>
                  {endereco.base}/c/{endereco.slug} · o site está em análise; o endereço muda depois da resposta.
                </p>
              ) : endereco.congelado ? (
                <p style={nota}>
                  {endereco.base}/c/{endereco.slug} · já foi publicado e não muda mais (o convite impresso usa este).
                </p>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ ...nota, wordBreak: "break-all" }}>{endereco.base}/c/</span>
                    <input
                      style={{ ...campo, flex: "1 1 160px", width: "auto" }}
                      value={slug}
                      maxLength={40}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="marina-e-teo"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      style={botao}
                      disabled={pendente || !slug.trim()}
                      onClick={() => rodar(() => definirEnderecoDoSite(eventoId, slug.replace(/^-+|-+$/g, "")), "Endereço salvo.")}
                    >
                      Salvar endereço
                    </button>
                  </div>
                  <p style={nota}>Letras, números e hífens. Depois da primeira publicação ele fica fixo.</p>
                </>
              )}
            </>
          )}

          {painel === "divulgar" && (
            <>
              {linkSite ? (
                <>
                  <p style={{ ...nota, wordBreak: "break-all", color: "var(--cor-texto)" }}>{linkSite}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={botao}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(linkSite);
                          setCopiado(true);
                          setTimeout(() => setCopiado(false), 2200);
                        } catch {
                          /* sem permissão: o link está na tela */
                        }
                      }}
                    >
                      <Copy size={15} strokeWidth={TRACO} aria-hidden />
                      {copiado ? "Copiado" : "Copiar link"}
                    </button>
                    <a
                      style={botao}
                      href={`https://wa.me/?text=${encodeURIComponent(`O nosso site, com tudo da festa e a confirmação de presença: ${linkSite}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mandar no WhatsApp
                    </a>
                  </div>
                  {qrSvg && (
                    <div style={{ width: 160, background: "#fff", padding: 8, borderRadius: 8 }} dangerouslySetInnerHTML={{ __html: qrSvg }} />
                  )}
                </>
              ) : (
                <p style={nota}>O link para divulgar aparece quando o site for aprovado e estiver no ar.</p>
              )}
            </>
          )}

          {painel === "mural" && (
            <Mural
              eventoId={eventoId}
              fotos={fotos}
              musicas={musicas}
              recados={recados}
              blocosDaFesta={blocosDaFesta}
              rodar={rodar}
              pendente={pendente}
            />
          )}
        </Cartao>
      )}

      {/* os blocos */}
      <Cartao padding="var(--esp-3) var(--esp-4)">
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {estrutura
            .filter((b) => BLOCOS_PRONTOS.has(b.tipo))
            .map((b, i, lista) => {
              const fixo = BLOCOS_FIXOS.has(b.tipo);
              const oculto = b.visivel === false;
              const aberta = aberto === b.id;
              const vizinhoFixo = (j: number) => !lista[j] || BLOCOS_FIXOS.has(lista[j].tipo);
              return (
                <li key={b.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--cor-borda-linha)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: oculto ? 0.5 : 1 }}>
                    <button
                      type="button"
                      onClick={() => setAberto(aberta ? null : b.id)}
                      aria-expanded={aberta}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "12px 4px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "var(--fonte-corpo)",
                      }}
                    >
                      <span style={{ display: "block", fontSize: "var(--ts-item)", color: "var(--cor-texto)" }}>
                        {nomeDoBloco(b.tipo, tipoEvento)}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 2,
                          fontSize: "var(--ts-nota)",
                          color: "var(--cor-texto-suave)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {oculto ? "Escondido" : resumo(b)}
                      </span>
                    </button>
                    {!fixo && (
                      <>
                        <button
                          type="button"
                          style={iconeBotao}
                          aria-label={`Subir ${nomeDoBloco(b.tipo, tipoEvento)}`}
                          disabled={pendente || vizinhoFixo(i - 1)}
                          onClick={() => gravarEstrutura(moverBloco(estrutura, b.id, -1))}
                        >
                          <ChevronUp size={18} strokeWidth={TRACO} />
                        </button>
                        <button
                          type="button"
                          style={iconeBotao}
                          aria-label={`Descer ${nomeDoBloco(b.tipo, tipoEvento)}`}
                          disabled={pendente || vizinhoFixo(i + 1)}
                          onClick={() => gravarEstrutura(moverBloco(estrutura, b.id, 1))}
                        >
                          <ChevronDown size={18} strokeWidth={TRACO} />
                        </button>
                        <button
                          type="button"
                          style={iconeBotao}
                          aria-label={oculto ? `Mostrar ${nomeDoBloco(b.tipo, tipoEvento)}` : `Esconder ${nomeDoBloco(b.tipo, tipoEvento)}`}
                          aria-pressed={oculto}
                          disabled={pendente}
                          onClick={() =>
                            gravarEstrutura(estrutura.map((x) => (x.id === b.id ? { ...x, visivel: oculto } : x)))
                          }
                        >
                          {oculto ? <EyeOff size={17} strokeWidth={TRACO} /> : <Eye size={17} strokeWidth={TRACO} />}
                        </button>
                      </>
                    )}
                  </div>
                  {aberta && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px 14px" }}>
                      {editor(b)}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </Cartao>

      {/* o site inteiro, em tela cheia */}
      {verSite && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="O site como os convidados veem"
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "#fff", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "8px 12px",
              borderBottom: "1px solid var(--cor-borda-linha)",
              background: "var(--cor-card)",
            }}
          >
            <span style={nota}>Como os convidados veem</span>
            <button type="button" style={botao} onClick={() => setVerSite(false)}>
              Fechar
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <PreviaDoSite dados={dadosDaPrevia} fotosAlbum={fotosAlbum} fotoCasalUrl={fotoCasalUrl} />
          </div>
        </div>
      )}
    </>
  );
}

/** O que os convidados mandam: fotos, músicas e recados (a moderação de antes). */
function Mural({
  eventoId,
  fotos,
  musicas,
  recados,
  blocosDaFesta,
  rodar,
  pendente,
}: {
  eventoId: string;
  fotos: FotoModeracao[];
  musicas: MusicaModeracao[];
  recados: RecadoModeracao[];
  blocosDaFesta: { album: boolean; playlist: boolean; recados: boolean };
  rodar: (fn: () => Promise<{ error?: string }>, ok?: string) => void;
  pendente: boolean;
}) {
  const sugeridas = musicas.filter((m) => m.estado === "sugerida");
  const aprovadas = musicas.filter((m) => m.estado === "aprovada");
  const nada = fotos.length === 0 && musicas.length === 0 && recados.length === 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { k: "album" as const, r: "Álbum: os convidados mandam fotos" },
          { k: "playlist" as const, r: "Música: eles sugerem o que tocar" },
          { k: "recados" as const, r: "Recados: o mural de mensagens" },
        ].map((b) => (
          <label key={b.k} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={blocosDaFesta[b.k]}
              disabled={pendente}
              onChange={(e) => rodar(() => definirBlocos(eventoId, { [b.k]: e.target.checked }))}
            />
            <span style={{ fontSize: "var(--ts-item-desc)", color: "var(--cor-texto-secundario)" }}>{b.r}</span>
          </label>
        ))}
      </div>

      {nada && <p style={nota}>Nada chegou ainda.</p>}

      {fotos.length > 0 && (
        <div>
          <Rotulo>Fotos ({fotos.filter((f) => !f.oculta).length})</Rotulo>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginTop: 8 }}>
            {fotos.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={pendente}
                onClick={() => rodar(() => ocultarFoto(eventoId, f.id, !f.oculta))}
                title={f.oculta ? "Trazer de volta" : "Esconder"}
                style={{ padding: 0, border: "none", background: "none", cursor: "pointer", opacity: f.oculta ? 0.32 : 1 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {musicas.length > 0 && (
        <div>
          <Rotulo>
            Músicas ({sugeridas.length} para decidir · {aprovadas.length} na lista)
          </Rotulo>
          {musicas
            .filter((m) => m.estado !== "vetada")
            .map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid var(--cor-borda-linha)" }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto)" }}>
                  {m.titulo}
                  {m.artista ? ` · ${m.artista}` : ""}
                </span>
                {m.estado === "aprovada" ? (
                  <span style={{ fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>vai para o DJ</span>
                ) : (
                  <button type="button" style={{ ...botao, padding: "6px 12px", minHeight: 0 }} disabled={pendente} onClick={() => rodar(() => decidirMusica(eventoId, m.id, "aprovada"))}>
                    Quero
                  </button>
                )}
                <button
                  type="button"
                  style={{ ...botao, padding: "6px 12px", minHeight: 0, border: "none" }}
                  disabled={pendente}
                  onClick={() => rodar(() => decidirMusica(eventoId, m.id, m.estado === "aprovada" ? "sugerida" : "vetada"))}
                >
                  {m.estado === "aprovada" ? "Tirar" : "Não"}
                </button>
              </div>
            ))}
        </div>
      )}

      {recados.length > 0 && (
        <div>
          <Rotulo>Recados ({recados.filter((r) => !r.oculto).length})</Rotulo>
          {recados.map((r) => (
            <div key={r.id} style={{ padding: "10px 0", borderTop: "1px solid var(--cor-borda-linha)", opacity: r.oculto ? 0.45 : 1 }}>
              <p style={{ margin: 0, fontSize: "var(--ts-item-desc)", color: "var(--cor-texto)" }}>“{r.texto}”</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ flex: 1, fontSize: "var(--ts-nota)", color: "var(--cor-texto-suave)" }}>{r.nome ?? "sem nome"}</span>
                <button
                  type="button"
                  style={{ ...botao, padding: "4px 10px", minHeight: 0, border: "none" }}
                  disabled={pendente}
                  onClick={() => rodar(() => ocultarRecado(eventoId, r.id, !r.oculto))}
                >
                  {r.oculto ? "Mostrar" : "Esconder"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
