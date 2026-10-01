"use client";

// "Nosso site" — a tela em que a família monta o site (30/09/2026, plano
// "Site e lista"; o desenho é o do app da Wedy que o dono mostrou). No
// portal dos noivos, a mesma tela é o "Convite".
//
// No alto, a prévia com o endereço e o estado da publicação. Depois os
// seis atalhos (Adicionar bloco, Aparência, Detalhes, Ver o site,
// Divulgar, Mural) e a lista dos blocos: tocar abre o bloco para editar,
// ↑ ↓ mudam a ordem (no celular nada de arrastar — a lição das Mesas) e o
// olho esconde. A prévia é o site DE VERDADE (SiteDoEvento) com o que
// está escrito agora, inclusive o que ainda não foi salvo.
//
// Os modelos (191): em Aparência, o modelo (casamento e bodas: os 6 e o
// Convite; os outros tipos, só o Convite), o par de fontes, a forma do
// nome, a abertura e a paleta; as cores livres só no Convite. Num modelo
// novo, a lista mostra só os blocos que ele desenha, cada um com o seu
// editor (portal/site/editores), e os nomes do casal ficam em Detalhes
// (gravados na capa). No Convite, tudo como antes.
//
// Casamento ou bodas que abre esta tela pela primeira vez (nada salvo,
// nada enviado, nada escrito) nasce no Clássico, gravado na hora. Nenhum
// site que já existe muda de modelo sozinho.
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
import { PreviaDoSite } from "@/components/convite/PreviaDoSite";
import type { SitePublico } from "@/lib/site-publico-tipos";
import { dataLonga, quandoLegivel } from "@/lib/rsvp-convite";
import {
  BLOCOS_FIXOS,
  BLOCOS_PRONTOS,
  estruturaEfetiva,
  lerEstrutura,
  nomeDoBloco,
  type BlocoDoSite,
  type TemaDoSite,
  type TipoBloco,
} from "@/lib/site-blocos";
import { modeloDesenha, modeloDoTema, type ModeloId } from "@/lib/site-modelos";
import {
  lerCenas,
  lerEspeciais,
  lerGaleria,
  lerJeito,
  lerMomentos,
  lerPresentes,
  lerRsvp,
  partirNomes,
} from "@/lib/site-conteudo";
import {
  assinarFotosDoRascunho,
  decidirMusica,
  definirBlocos,
  definirEnderecoDoSite,
  ligarSite,
  ocultarFoto,
  ocultarRecado,
  pedirEnvioDeFoto,
  publicarSiteDaFamilia,
  salvarConviteCasal,
  salvarEstruturaSite,
  salvarSiteCasal,
} from "@/app/(portal)/portal/[eventoId]/site/actions";
import type { FotoModeracao, MusicaModeracao, RecadoModeracao } from "./EditorSiteCasal";
import { Cartao, Rotulo } from "./Nucleo";
import { TRACO } from "./icones";
import { CabemFotos, EDITORES, useFotosEnviadas, type ExtraDoEditor, type PedirEnvio } from "./site/editores";
import { SiteEmEscala } from "./site/SiteEmEscala";
import { Aparencia } from "./site/Aparencia";
import { Detalhes } from "./site/Detalhes";
import { podeMexerNosPresentes } from "./site/acoes";
import {
  TETO_DE_FOTOS_DA_ESTRUTURA,
  comPresentesSalvos,
  estruturaDoModelo,
  fotosCruas,
  idsDePresenteFora,
  mensagemCurta,
  nomesDaCapa,
  paraGravar,
} from "./site/estrutura";

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

const HEX = /^#[0-9a-f]{6}$/i;

/** A server action do envio, no formato que os editores esperam. */
const pedirEnvio: PedirEnvio = async (id) => {
  const r = await pedirEnvioDeFoto(id);
  if (r.ok === true) return { ok: true, caminho: r.caminho, token: r.token };
  return { ok: false, erro: r.error || "Não foi possível enviar agora." };
};

/** "3 fotos", "1 par" — e "Vazio · não aparece" quando não há nenhum. */
function contagem(n: number, um: string, varios: string): string {
  return n > 0 ? `${n} ${n === 1 ? um : varios}` : "Vazio · não aparece";
}

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
  urlsDoSite,
  podeGerir,
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
  /** as fotos do balde 'site' já assinadas no servidor (assinarMidiaDoSite);
   *  ausente = a tela pede as que faltam (assinarFotosDoRascunho) */
  urlsDoSite?: Record<string, string>;
  /** o nível de quem está logado é 'gestao' (muda os itens de presente);
   *  ausente = a tela pergunta ao servidor */
  podeGerir?: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // o ponto de partida, calculado uma vez
  const [inicio] = useState(() => {
    const casal = tipoEvento === "casamento" || tipoEvento === "bodas";
    const bruto = previa.site?.tema && typeof previa.site.tema === "object" ? previa.site.tema : {};
    // casamento NOVO: nada salvo, nada enviado, nada escrito. Só esse
    // nasce no Clássico; site que já existe fica como está.
    const novo =
      casal &&
      !!previa.site &&
      lerEstrutura(previa.site.estrutura).length === 0 &&
      Object.keys(bruto).length === 0 &&
      revisao.status === "rascunho" &&
      !revisao.enviada_em &&
      !publicado &&
      !publicadoEm &&
      Object.values(textosIniciais).every((v) => !v.trim()) &&
      Object.values(lookInicial).every((v) => !v.trim());

    // o que está no banco, como a tela mostra
    const t = bruto as TemaDoSite;
    let temaDoBanco: TemaDoSite;
    if (modeloDoTema(t) !== "convite" || (t.cores && Object.keys(t.cores).length > 0)) {
      temaDoBanco = t;
    } else {
      // Convite sem cor no tema: as três cores de antes entram como ponto de partida
      const cores: TemaDoSite["cores"] = {};
      if (HEX.test(lookInicial.corFundo)) cores.fundo = lookInicial.corFundo;
      if (HEX.test(lookInicial.corTinta)) cores.tinta = lookInicial.corTinta;
      if (HEX.test(lookInicial.corAcento)) cores.acento = lookInicial.corAcento;
      temaDoBanco = { ...t, cores };
    }
    const doBanco = {
      tema: temaDoBanco,
      estrutura: estruturaDoModelo(estruturaEfetiva(previa.site?.estrutura), modeloDoTema(temaDoBanco)),
    };
    if (!novo) return { novo, ...doBanco, doBanco };
    // a abertura gravada explícita: o site e a revisão leem a mesma coisa
    const tema: TemaDoSite = { modelo: "classico", abertura: true };
    const estrutura = estruturaDoModelo(estruturaEfetiva(previa.site?.estrutura), "classico");
    return { novo, tema, estrutura, doBanco };
  });

  const [estrutura, setEstrutura] = useState<BlocoDoSite[]>(inicio.estrutura);
  const [tema, setTema] = useState<TemaDoSite>(inicio.tema);
  // no nascimento, o salvo é o do banco até a gravação dar certo
  const [temaSalvo, setTemaSalvo] = useState(() => JSON.stringify(inicio.doBanco.tema));
  const [textos, setTextos] = useState<Textos>(textosIniciais);
  const [look, setLook] = useState<Look>(lookInicial);
  const [painel, setPainel] = useState<Painel>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [verSite, setVerSite] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const modelo: ModeloId = modeloDoTema(tema);
  const modeloNovo = modelo !== "convite";

  // o casamento novo nasce com o modelo gravado (uma vez). Se o banco
  // recusar (sem nível para escrever), a tela volta ao que está salvo —
  // a não ser que ela já tenha mexido em algo
  const nasceu = useRef(false);
  useEffect(() => {
    if (!inicio.novo || nasceu.current) return;
    nasceu.current = true;
    const naHora = JSON.stringify(inicio.estrutura);
    void salvarEstruturaSite(eventoId, paraGravar(inicio.estrutura), inicio.tema).then((r) => {
      if (!r.error) {
        setTemaSalvo(JSON.stringify(inicio.tema));
        return;
      }
      setTema((t) => (t === inicio.tema ? inicio.doBanco.tema : t));
      setEstrutura((e) => (JSON.stringify(e) === naHora ? inicio.doBanco.estrutura : e));
    });
  }, [eventoId, inicio]);

  // os itens de presente só mudam com 'gestao' (a 191 recusa os outros)
  const [podePresentes, setPodePresentes] = useState(podeGerir === true);
  useEffect(() => {
    if (podeGerir !== undefined) {
      setPodePresentes(podeGerir);
      return;
    }
    let vivo = true;
    void podeMexerNosPresentes(eventoId).then((v) => {
      if (vivo) setPodePresentes(v);
    });
    return () => {
      vivo = false;
    };
  }, [eventoId, podeGerir]);

  // sem 'gestao', os itens de presente são sempre os salvos: depois de
  // cada router.refresh, a lista que outra aba mudou entra aqui também
  // (a action troca de novo na gravação, para a trava da 191 nunca pegar)
  useEffect(() => {
    if (podePresentes) return;
    const salva = lerEstrutura(previa.site?.estrutura);
    setEstrutura((a) => {
      const nova = comPresentesSalvos(a, salva);
      return JSON.stringify(nova) === JSON.stringify(a) ? a : nova;
    });
  }, [previa, podePresentes]);

  // as fotos do balde 'site': as assinadas pelo servidor, as que a tela
  // pede (rascunho que ainda não chegou assinado) e as recém-enviadas
  // nesta aba (URL local, até a assinada chegar)
  const enviadas = useFotosEnviadas();
  const [assinadas, setAssinadas] = useState<Record<string, string>>({});
  const tentadas = useRef(new Set<string>());
  // todas as fotos da estrutura, também a de item incompleto (presente
  // sem valor, par sem nomes): ela precisa vê-la para decidir
  const todasAsFotos = fotosCruas(paraGravar(estrutura));
  const cabem = Math.max(0, TETO_DE_FOTOS_DA_ESTRUTURA - todasAsFotos.length);
  const faltando = Array.from(new Set(todasAsFotos))
    .filter((c) => c.startsWith(`${eventoId}/`) && !urlsDoSite?.[c] && !assinadas[c] && !enviadas[c] && !tentadas.current.has(c))
    .join("|");
  useEffect(() => {
    if (!faltando) return;
    const lista = faltando.split("|");
    lista.forEach((c) => tentadas.current.add(c));
    void assinarFotosDoRascunho(eventoId, lista).then((novas) => {
      if (Object.keys(novas).length > 0) setAssinadas((a) => ({ ...a, ...novas }));
    });
  }, [faltando, eventoId]);
  const urls = useMemo(() => ({ ...(urlsDoSite ?? {}), ...assinadas, ...enviadas }), [urlsDoSite, assinadas, enviadas]);

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
        setErro(mensagemCurta(r.error));
        return;
      }
      if (ok) setAviso(ok);
      router.refresh();
    });
  }

  /** A estrutura e o tema no banco, só com o que a 191 aceita. */
  async function gravar(estr: BlocoDoSite[], t: TemaDoSite): Promise<{ error?: string }> {
    const r = await salvarEstruturaSite(eventoId, paraGravar(estr), t);
    if (!r.error) setTemaSalvo(JSON.stringify(t));
    return r;
  }

  function gravarEstrutura(nova: BlocoDoSite[], novoTema: TemaDoSite = tema) {
    setEstrutura(nova);
    setTema(novoTema);
    rodar(() => gravar(nova, novoTema));
  }

  async function salvarTudo(): Promise<{ error?: string }> {
    const a = await salvarSiteCasal(eventoId, textos);
    if (a.error) return a;
    const b = await salvarConviteCasal(eventoId, look);
    if (b.error) return b;
    return gravar(estrutura, tema);
  }

  /* ---------- o modelo, os nomes e os blocos que aparecem ---------- */

  function trocarModelo(m: ModeloId) {
    // a abertura sai gravada (ausente = ligada, como a caixa mostra)
    setTema((t) => (m !== "convite" && typeof t.abertura !== "boolean" ? { ...t, modelo: m, abertura: true } : { ...t, modelo: m }));
    if (m !== "convite") setEstrutura((e) => estruturaDoModelo(e, m));
  }

  const nomes = nomesDaCapa(estrutura, previa.evento.anfitrioes);
  function mudarNomes(n: { nome1: string; nome2: string }) {
    setEstrutura((atual) =>
      atual.map((b) => (b.tipo === "capa" ? { ...b, conteudo: { ...(b.conteudo ?? {}), nome1: n.nome1, nome2: n.nome2 } } : b))
    );
  }

  /** O bloco aparece na lista: no Convite, os de sempre; num modelo novo,
   *  os que ele desenha. */
  const naLista = (t: TipoBloco) => (modeloNovo ? modeloDesenha(modelo, t) : BLOCOS_PRONTOS.has(t));

  /** ↑ ↓ entre os blocos da lista (os que o modelo não desenha não contam). */
  function mover(id: string, passo: -1 | 1): BlocoDoSite[] {
    const vis = estrutura.filter((b) => naLista(b.tipo));
    const i = vis.findIndex((b) => b.id === id);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= vis.length) return estrutura;
    if (BLOCOS_FIXOS.has(vis[i].tipo) || BLOCOS_FIXOS.has(vis[j].tipo)) return estrutura;
    const a = estrutura.findIndex((b) => b.id === vis[i].id);
    const c = estrutura.findIndex((b) => b.id === vis[j].id);
    const nova = [...estrutura];
    [nova[a], nova[c]] = [nova[c], nova[a]];
    return nova;
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
      case "capa": {
        const quem = modeloNovo
          ? [nomes.nome1.trim(), nomes.nome2.trim()].filter(Boolean).join(" & ")
          : previa.evento.anfitrioes;
        return [quem, dataLonga(previa.evento.data)].filter(Boolean).join(" · ");
      }
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
      case "rsvp": {
        const prazo = (modeloNovo ? lerRsvp(b.conteudo).prazo : null) ?? previa.rsvp.prazo;
        return previa.rsvp.aberto
          ? prazo
            ? `Aberta até ${prazo.slice(8, 10)}/${prazo.slice(5, 7)}`
            : "Aberta"
          : "Fechada";
      }
      case "presentes": {
        const itens = modeloNovo ? lerPresentes(b.conteudo).itens.length : 0;
        const partes = [
          itens > 0 && `${itens} ${itens === 1 ? "presente" : "presentes"}`,
          look.pixChave.trim() && "Pix",
          look.presentesLink.trim() && "link da lista",
        ].filter(Boolean);
        return partes.length ? partes.join(" · ") : look.presentesTexto.trim() ? "Só o texto" : "Vazio · não aparece";
      }
      case "momentos":
        return contagem(lerMomentos(b.conteudo).itens.length, "momento", "momentos");
      case "cenas":
        return contagem(lerCenas(b.conteudo).itens.length, "cena", "cenas");
      case "galeria":
        return contagem(lerGaleria(b.conteudo).fotos.length, "foto", "fotos");
      case "especiais":
        return contagem(lerEspeciais(b.conteudo).pares.length, "par", "pares");
      case "jeito":
        return contagem(lerJeito(b.conteudo).frases.length, "frase", "frases");
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

  /** O que o editor do bloco precisa saber além do conteúdo. */
  function extraDo(b: BlocoDoSite): ExtraDoEditor {
    return {
      nomesDoEvento: partirNomes(previa.evento.anfitrioes),
      // os nomes ficam em Detalhes
      semNomes: true,
      local: { nome: previa.evento.local, endereco: previa.evento.endereco ?? null, cidade: previa.evento.cidade },
      temPix: !!look.pixChave.trim(),
      podeEditarPresentes: podePresentes,
      idsDePresenteFora: idsDePresenteFora(estrutura, b.id),
    };
  }

  /** O conteúdo novo do bloco no rascunho. Na capa, os nomes (de
   *  Detalhes) ficam como estão. */
  function mudarConteudo(b: BlocoDoSite, c: Record<string, unknown>) {
    setEstrutura((atual) =>
      atual.map((x) => {
        if (x.id !== b.id) return x;
        if (x.tipo !== "capa") return { ...x, conteudo: c };
        const antes = x.conteudo ?? {};
        const nomesSalvos: Record<string, unknown> = {};
        if (typeof antes.nome1 === "string") nomesSalvos.nome1 = antes.nome1;
        if (typeof antes.nome2 === "string") nomesSalvos.nome2 = antes.nome2;
        return { ...x, conteudo: { ...c, ...nomesSalvos } };
      })
    );
  }

  function editor(b: BlocoDoSite): ReactNode {
    const salvarTextos = (
      <button type="button" style={botao} disabled={pendente} onClick={() => rodar(salvarTudo, "Salvo.")}>
        {pendente ? "Salvando…" : "Salvar"}
      </button>
    );
    const salvarBloco = (
      <div>
        <button type="button" style={botao} disabled={pendente} onClick={() => rodar(() => gravar(estrutura, tema), "Salvo.")}>
          {pendente ? "Salvando…" : "Salvar"}
        </button>
      </div>
    );
    // num modelo novo, o editor do tipo (fotos, marcos, itens…)
    const Ed = modeloNovo ? EDITORES[b.tipo] : undefined;
    const doModelo = Ed ? (
      <CabemFotos.Provider value={cabem}>
        <Ed
          conteudo={b.conteudo}
          onChange={(c) => mudarConteudo(b, c)}
          modelo={modelo}
          eventoId={eventoId}
          urls={urls}
          desabilitado={pendente}
          pedirEnvio={pedirEnvio}
          extra={extraDo(b)}
        />
      </CabemFotos.Provider>
    ) : null;
    if (doModelo && (b.tipo === "capa" || b.tipo === "local" || b.tipo === "rsvp")) {
      return (
        <>
          {doModelo}
          {salvarBloco}
        </>
      );
    }
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
            {doModelo}
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
            {doModelo}
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
            {doModelo}
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
                onClick={() => rodar(() => gravar(estrutura, tema), "Salvo.")}
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
        // momentos, cenas, galeria, padrinhos, nosso jeito
        return doModelo ? (
          <>
            {doModelo}
            {salvarBloco}
          </>
        ) : null;
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

  const escondidos = estrutura.filter((b) => b.visivel === false && naLista(b.tipo));
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
            urls={urls}
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
            <Aparencia
              tipoEvento={tipoEvento}
              tema={tema}
              onTema={setTema}
              onModelo={trocarModelo}
              dados={dadosDaPrevia}
              fotosAlbum={fotosAlbum}
              fotoCasalUrl={fotoCasalUrl}
              urls={urls}
              nomes={nomes}
              pendente={pendente}
              mudou={JSON.stringify(tema) !== temaSalvo}
              onSalvar={() => rodar(() => gravar(estrutura, tema), "Salvo.")}
            />
          )}

          {painel === "detalhes" && (
            <Detalhes
              mostrarNomes={modeloNovo}
              nomes={nomes}
              onNomes={mudarNomes}
              onSalvarNomes={() => rodar(() => gravar(estrutura, tema), "Nomes salvos.")}
              endereco={endereco}
              emAnalise={revisao.status === "em_analise"}
              pendente={pendente}
              onSalvarEndereco={(slug) => rodar(() => definirEnderecoDoSite(eventoId, slug), "Endereço salvo.")}
            />
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
            .filter((b) => naLista(b.tipo))
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
                          onClick={() => gravarEstrutura(mover(b.id, -1))}
                        >
                          <ChevronUp size={18} strokeWidth={TRACO} />
                        </button>
                        <button
                          type="button"
                          style={iconeBotao}
                          aria-label={`Descer ${nomeDoBloco(b.tipo, tipoEvento)}`}
                          disabled={pendente || vizinhoFixo(i + 1)}
                          onClick={() => gravarEstrutura(mover(b.id, 1))}
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
            <PreviaDoSite dados={dadosDaPrevia} fotosAlbum={fotosAlbum} fotoCasalUrl={fotoCasalUrl} urls={urls} />
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
