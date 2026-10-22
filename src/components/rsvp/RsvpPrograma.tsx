"use client";

// A aba RSVP — "ficha em três painéis" (handoff do Claude Design,
// 13/10/2026). O dono: "estou vendo a mesma UX em N lugares". A aba deixou
// de ser três cartões empilhados e virou um programa de trabalho:
// filtros à esquerda, a lista no meio, a ficha do convidado e a portaria
// à direita, e uma barra de status embaixo.
//
// O que entrou além do desenho (decidido com ele no mesmo dia):
//   · a portaria vem primeiro no painel direito a partir da véspera, e
//     ocupa o painel quando ninguém está selecionado;
//   · cada confirmado diz se já tem a entrada (o QR) — o problema prático
//     de antes; o cabeçalho dos confirmados conta quem ainda não tem;
//   · "Enviar entrada" e "Pedir confirmação" vão pelo WhatsApp DELA quando
//     há telefone, por e-mail quando só há e-mail, e dizem quando não há
//     nenhum dos dois (a pessoa entra pela busca na porta);
//   · lembrar e mandar entradas por e-mail para a seção inteira;
//   · sem a numeração 001/002 (não significava nada), sem a legenda dos
//     atalhos (os atalhos continuam: ↑ ↓ C N E);
//   · os grupos são os do evento, não Família/Amigos/Trabalho fixos;
//   · importar a lista (Excel, CSV, Word, PDF ou colada);
//   · no celular (container estreito), a lista ocupa a tela, os filtros
//     viram uma faixa, e a ficha e a portaria abrem numa folha por baixo.

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChegadasProps } from "@/components/operacao/ChegadasAoVivo";
import { CSS_RSVP } from "@/components/rsvp/rsvp-programa.css";
import { PortariaDoRsvp } from "@/components/rsvp/PortariaDoRsvp";
import { ImportarLista } from "@/components/rsvp/ImportarLista";
import { RodadaDeConfirmacao, filaDaRodada } from "@/components/rsvp/RodadaDeConfirmacao";
import { FecharLista } from "@/components/rsvp/FecharLista";
import type { LinhaOperacional } from "@/lib/rsvp-fechamento";
import {
  abrirOuFecharConfirmacoes,
  adicionarConvidadoPelaEquipe,
  enviarPorEmail,
  mudarResposta,
  registrarWhatsappAberto,
} from "@/app/(app)/eventos/[id]/rsvp/actions";

type Resposta = "aguardando" | "confirmado" | "nao_vai";

export type ConvidadoNaFicha = {
  id: string;
  nome: string;
  grupo: string | null;
  lado: "noiva" | "noivo" | null;
  confirmacao: Resposta;
  acompanhantes: number;
  criancas: number;
  restricao: string | null;
  origem: "cliente" | "equipe" | "autocadastro";
  telefone: string | null;
  email: string | null;
  link: string;
  whatsEntrada: string | null;
  whatsPedido: string | null;
  /** a mensagem da 2ª vez em diante, na rodada de confirmação */
  whatsLembrete?: string | null;
  /** a entrada (o QR): entrou, viu ao confirmar, mandada por e-mail ou WhatsApp, ou ainda não tem */
  entrada: { estado: "entrou" | "viu" | "email" | "whatsapp" | "sem"; em: string | null };
  pedido: { via: "whatsapp" | "email"; em: string } | null;
};

type Faceta = { tipo: "grupo" | "lado" | "outro"; valor: string } | null;
type FiltroResposta = "todos" | Resposta | "entrou" | "falta";

const COR: Record<FiltroResposta, string> = {
  todos: "#221E1B",
  aguardando: "#A5813C",
  confirmado: "#5E7355",
  nao_vai: "#928A81",
  entrou: "#6E3F5F",
  falta: "#A5544B",
};
const ROTULO: Record<FiltroResposta, string> = {
  todos: "Todos",
  aguardando: "Aguardando",
  confirmado: "Confirmados",
  nao_vai: "Não vão",
  entrou: "Entraram",
  falta: "Faltam chegar",
};
const SECOES: Resposta[] = ["aguardando", "confirmado", "nao_vai"];
const SEM_GRUPO = "__sem__";

const ORIGEM: Record<ConvidadoNaFicha["origem"], string> = {
  cliente: "pela cliente",
  equipe: "pela equipe",
  autocadastro: "pelo link do convite",
};

function dia(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
function dataCurta(iso: string | null) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
const pessoasDe = (c: ConvidadoNaFicha) => 1 + c.acompanhantes + c.criancas;
const temEntrada = (c: ConvidadoNaFicha) => c.entrada.estado !== "sem";

function entradaEmPalavras(c: ConvidadoNaFicha): string {
  const e = c.entrada;
  if (e.estado === "entrou") return `entrou às ${hora(e.em!)}`;
  if (e.estado === "viu") return "viu ao confirmar pelo link";
  if (e.estado === "email") return `por e-mail em ${dia(e.em!)}`;
  if (e.estado === "whatsapp") return `WhatsApp aberto em ${dia(e.em!)}`;
  return "ainda não tem";
}

/** O que a ação principal faz com este convidado, e por onde. */
function acaoDe(c: ConvidadoNaFicha): { rotulo: string; via: "whatsapp" | "email" | null; tipo: "entrada" | "pedido" } | null {
  if (c.entrada.estado === "entrou") return null;
  const tipo = c.confirmacao === "confirmado" ? "entrada" : "pedido";
  const rotulo = c.confirmacao === "confirmado" ? "Enviar entrada" : c.confirmacao === "aguardando" ? "Pedir confirmação" : "Reenviar convite";
  const wa = tipo === "entrada" ? c.whatsEntrada : c.whatsPedido;
  return { rotulo, via: wa ? "whatsapp" : c.email ? "email" : null, tipo };
}

function vespera(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function RsvpPrograma({
  eventId,
  nomeDoEvento,
  dataEvento,
  horaEvento,
  linkDoEvento,
  confirmacoesAbertas,
  convidados: convidadosProp,
  chegadas,
  fechamento = null,
}: {
  eventId: string;
  nomeDoEvento: string;
  dataEvento: string | null;
  horaEvento: string | null;
  linkDoEvento: string | null;
  confirmacoesAbertas: boolean;
  convidados: ConvidadoNaFicha[];
  chegadas: ChegadasProps | null;
  /** fechar a lista (21/10/2026): as linhas da conta do buffet, o último fechamento e o prazo do site */
  fechamento?: { linhas: LinhaOperacional[]; ultimo: string | null; prazo: string | null; hoje: string } | null;
}) {
  const router = useRouter();
  const [convidados, setConvidados] = useState(convidadosProp);
  useEffect(() => setConvidados(convidadosProp), [convidadosProp]);

  const [filtro, setFiltro] = useState<FiltroResposta>("todos");
  const [faceta, setFaceta] = useState<Faceta>(null);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [folha, setFolha] = useState<"ficha" | "portaria" | null>(null);
  const [importando, setImportando] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; ok?: boolean } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [ocupado, comecar] = useTransition();
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())), []);

  // ------------------------------------------------------------ contas
  const conta = useMemo(() => {
    const por = { aguardando: 0, confirmado: 0, nao_vai: 0 } as Record<Resposta, number>;
    let pessoas = 0;
    let entraram = 0;
    for (const c of convidados) {
      por[c.confirmacao] += 1;
      if (c.confirmacao === "confirmado") pessoas += pessoasDe(c);
      if (c.entrada.estado === "entrou") entraram += 1;
    }
    return { por, pessoas, entraram, total: convidados.length };
  }, [convidados]);

  const grupos = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of convidados) {
      const g = c.grupo?.trim() || SEM_GRUPO;
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => (a[0] === SEM_GRUPO ? 1 : b[0] === SEM_GRUPO ? -1 : b[1] - a[1] || a[0].localeCompare(b[0])));
  }, [convidados]);
  const lados = useMemo(() => {
    const n = convidados.filter((c) => c.lado === "noiva").length;
    const o = convidados.filter((c) => c.lado === "noivo").length;
    return [
      ["noiva", "Lado da noiva", n],
      ["noivo", "Lado do noivo", o],
    ].filter((l) => (l[2] as number) > 0) as [string, string, number][];
  }, [convidados]);
  const outros = useMemo(
    () =>
      [
        ["restricao", "Com restrição alimentar", convidados.filter((c) => c.restricao).length],
        ["link", "Cadastrados pelo link", convidados.filter((c) => c.origem === "autocadastro").length],
        ["sem_entrada", "Confirmados sem entrada", convidados.filter((c) => c.confirmacao === "confirmado" && !temEntrada(c)).length],
      ].filter((o) => (o[2] as number) > 0) as [string, string, number][],
    [convidados]
  );

  // ------------------------------------------------------------ a lista
  const passa = useCallback(
    (c: ConvidadoNaFicha) => {
      if (filtro === "entrou") {
        if (c.entrada.estado !== "entrou") return false;
      } else if (filtro === "falta") {
        // no dia: confirmou e ainda não passou pela porta
        if (c.confirmacao !== "confirmado" || c.entrada.estado === "entrou") return false;
      } else if (filtro !== "todos" && c.confirmacao !== filtro) return false;
      if (faceta) {
        if (faceta.tipo === "grupo" && (c.grupo?.trim() || SEM_GRUPO) !== faceta.valor) return false;
        if (faceta.tipo === "lado" && c.lado !== faceta.valor) return false;
        if (faceta.tipo === "outro") {
          if (faceta.valor === "restricao" && !c.restricao) return false;
          if (faceta.valor === "link" && c.origem !== "autocadastro") return false;
          if (faceta.valor === "sem_entrada" && !(c.confirmacao === "confirmado" && !temEntrada(c))) return false;
        }
      }
      const t = busca.trim().toLowerCase();
      return !t || c.nome.toLowerCase().includes(t);
    },
    [filtro, faceta, busca]
  );
  const secoes = useMemo(
    () =>
      SECOES.map((s) => ({ s, itens: convidados.filter((c) => c.confirmacao === s && passa(c)) })).filter((x) => x.itens.length > 0),
    [convidados, passa]
  );
  const ordem = useMemo(() => secoes.flatMap((x) => x.itens), [secoes]);
  const selecionado = convidados.find((c) => c.id === sel) ?? null;

  // ------------------------------------------------------------ ações
  function avisar(texto: string, ok?: boolean) {
    setAviso({ texto, ok });
    if (ok) setTimeout(() => setAviso(null), 8000);
  }

  function responder(c: ConvidadoNaFicha, r: Resposta) {
    if (c.confirmacao === r) return;
    setConvidados((l) => l.map((x) => (x.id === c.id ? { ...x, confirmacao: r } : x)));
    comecar(async () => {
      const res = await mudarResposta(eventId, c.id, r);
      if (res.error) {
        avisar(res.error);
        setConvidados((l) => l.map((x) => (x.id === c.id ? { ...x, confirmacao: c.confirmacao } : x)));
        return;
      }
      router.refresh();
    });
  }

  function agir(c: ConvidadoNaFicha) {
    const a = acaoDe(c);
    if (!a || !a.via) return;
    if (a.via === "whatsapp") {
      window.open((a.tipo === "entrada" ? c.whatsEntrada : c.whatsPedido)!, "_blank", "noopener,noreferrer");
      const agora = new Date().toISOString();
      setConvidados((l) =>
        l.map((x) =>
          x.id !== c.id
            ? x
            : a.tipo === "entrada"
              ? { ...x, entrada: { estado: "whatsapp", em: agora } }
              : { ...x, pedido: { via: "whatsapp", em: agora } }
        )
      );
      void registrarWhatsappAberto(eventId, c.id, a.tipo);
      return;
    }
    comecar(async () => {
      const r = await enviarPorEmail(eventId, a.tipo, [c.id]);
      if (r.error) avisar(r.error);
      else if (r.enviados) avisar(`${a.tipo === "entrada" ? "Entrada mandada" : "Pedido mandado"} por e-mail para ${c.nome}.`, true);
      else avisar("O e-mail não saiu. Tente de novo em instantes.");
      router.refresh();
    });
  }

  function emLote(tipo: "entrada" | "pedido", ids: string[]) {
    if (!ids.length) return;
    const frase = tipo === "entrada" ? `Mandar a entrada por e-mail para ${ids.length} ${ids.length === 1 ? "convidado" : "convidados"}?` : `Mandar o pedido de confirmação por e-mail para ${ids.length} ${ids.length === 1 ? "convidado" : "convidados"}?`;
    if (!window.confirm(frase)) return;
    comecar(async () => {
      let enviados = 0;
      let falharam = 0;
      let restam = ids.length;
      // em lotes de 30 (o servidor manda devagar, o Resend aceita poucas por segundo)
      for (let volta = 0; volta < 20 && restam > 0; volta++) {
        const r = await enviarPorEmail(eventId, tipo, ids);
        if (r.error) {
          avisar(r.error);
          break;
        }
        enviados += r.enviados;
        falharam += r.falharam;
        restam = r.restam;
        if (r.enviados === 0) break;
      }
      avisar(`${enviados} ${enviados === 1 ? "e-mail mandado" : "e-mails mandados"}${falharam ? ` · ${falharam} não saíram` : ""}.`, falharam === 0);
      router.refresh();
    });
  }

  function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    comecar(async () => {
      const r = await adicionarConvidadoPelaEquipe(eventId, { nome, telefone: novoTel });
      if (r.error) {
        avisar(r.error);
        return;
      }
      setNovoNome("");
      setNovoTel("");
      router.refresh();
    });
  }

  function alternarConvite() {
    if (confirmacoesAbertas && !window.confirm("Encerrar as confirmações? Quem abrir o link do convite vai ver que as respostas foram encerradas. Nada é apagado.")) return;
    comecar(async () => {
      const r = await abrirOuFecharConfirmacoes(eventId, !confirmacoesAbertas);
      if (r.error) avisar(r.error);
      router.refresh();
    });
  }

  function copiar(chave: string, texto: string) {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  // atalhos: ↑ ↓ andam, C confirma, N não vai, E faz a ação principal
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.tagName === "SELECT" || alvo.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || importando) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!ordem.length) return;
        e.preventDefault();
        const i = ordem.findIndex((c) => c.id === sel);
        const prox = e.key === "ArrowDown" ? Math.min(ordem.length - 1, i + 1) : Math.max(0, i - 1);
        const id = ordem[i < 0 ? 0 : prox].id;
        setSel(id);
        document.getElementById(`rp-l-${id}`)?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (!selecionado) return;
      const k = e.key.toLowerCase();
      if (k === "c") responder(selecionado, "confirmado");
      else if (k === "n") responder(selecionado, "nao_vai");
      else if (k === "e") agir(selecionado);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordem, sel, selecionado, importando]);

  const perto = !!(hoje && dataEvento && hoje >= vespera(dataEvento));
  const mensagemDoConvite = linkDoEvento ? `Você recebeu um convite para ${nomeDoEvento}! Confirme sua presença por aqui: ${linkDoEvento}` : "";

  // ------------------------------------------------------------ pedaços
  const ficha = selecionado ? fichaDe(selecionado) : null;
  const portaria = chegadas ? <PortariaDoRsvp {...chegadas} /> : null;

  // uma função que devolve JSX, e não um componente: um componente
  // declarado aqui dentro nasceria de novo a cada render
  function fichaDe(c: ConvidadoNaFicha) {
    const a = acaoDe(c);
    return (
      <div className="rp-ficha">
        <div>
          <span className="rp-etq">Convidado</span>
          <h3>{c.nome}</h3>
        </div>
        <dl className="rp-campos">
          <dt>Grupo</dt>
          <dd>{c.grupo || "—"}</dd>
          {c.lado && (
            <>
              <dt>Lado</dt>
              <dd>{c.lado === "noiva" ? "da noiva" : "do noivo"}</dd>
            </>
          )}
          <dt>Acompanhantes</dt>
          <dd>{c.acompanhantes ? `+${c.acompanhantes} ${c.acompanhantes === 1 ? "acompanhante" : "acompanhantes"}` : "Nenhum"}</dd>
          {c.criancas > 0 && (
            <>
              <dt>Crianças</dt>
              <dd>{c.criancas}</dd>
            </>
          )}
          <dt>Restrição</dt>
          <dd>{c.restricao || "Nenhuma"}</dd>
          <dt>Origem</dt>
          <dd>{ORIGEM[c.origem]}</dd>
          <dt>WhatsApp</dt>
          <dd className="rp-mono" style={{ fontSize: 12 }}>{c.telefone ?? "—"}</dd>
          <dt>E-mail</dt>
          <dd>{c.email ?? "—"}</dd>
          {c.confirmacao === "confirmado" ? (
            <>
              <dt>Entrada</dt>
              <dd className={c.entrada.estado === "sem" ? "esp" : c.entrada.estado === "entrou" ? "ok" : undefined}>{entradaEmPalavras(c)}</dd>
            </>
          ) : c.confirmacao === "aguardando" ? (
            <>
              <dt>Pedido</dt>
              <dd>{c.pedido ? `${c.pedido.via === "email" ? "por e-mail" : "WhatsApp aberto"} em ${dia(c.pedido.em)}` : "nenhum ainda"}</dd>
            </>
          ) : null}
        </dl>

        <div>
          <span className="rp-rot" style={{ padding: "0 0 6px" }}>Resposta</span>
          <div className="rp-seg" role="group" aria-label="Resposta do convidado">
            {(["confirmado", "aguardando", "nao_vai"] as Resposta[]).map((r) => (
              <button key={r} type="button" data-r={r} aria-pressed={c.confirmacao === r} disabled={ocupado} onClick={() => responder(c, r)}>
                {r === "confirmado" ? "Confirmado" : r === "aguardando" ? "Aguardando" : "Não vai"}
              </button>
            ))}
          </div>
        </div>

        {a && !a.via && (
          <p className="rp-nota">Sem WhatsApp nem e-mail. {c.confirmacao === "confirmado" ? "Na porta, entra pela busca do nome." : ""}</p>
        )}
        <div className="rp-par">
          {a && a.via && (
            <button type="button" className="rp-btn p g" disabled={ocupado} onClick={() => agir(c)}>
              {a.rotulo}
              {a.via === "email" ? " por e-mail" : ""}
            </button>
          )}
          <button type="button" className="rp-btn g" onClick={() => copiar(c.id, c.link)}>
            {copiado === c.id ? "Copiado" : "Copiar link"}
          </button>
        </div>
      </div>
    );
  }

  function itemFiltro(f: FiltroResposta, n: number) {
    return (
      <button key={f} type="button" className="rp-item" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
        <span className="rp-q" style={{ background: COR[f] }} />
        <span>{ROTULO[f]}</span>
        <span className="rp-n">{n}</span>
      </button>
    );
  }
  function itemFaceta(tipo: "grupo" | "lado" | "outro", valor: string, rotulo: string, n: number) {
    const ativo = faceta?.tipo === tipo && faceta.valor === valor;
    return (
      <button key={`${tipo}-${valor}`} type="button" className="rp-item sub" aria-pressed={ativo} onClick={() => setFaceta(ativo ? null : { tipo, valor })}>
        <span>{rotulo}</span>
        <span className="rp-n">{n}</span>
      </button>
    );
  }

  const respostas: [FiltroResposta, number][] = [
    ["todos", conta.total],
    ["aguardando", conta.por.aguardando],
    ["confirmado", conta.por.confirmado],
    ["nao_vai", conta.por.nao_vai],
    ...(conta.entraram > 0
      ? ([
          ["entrou", conta.entraram],
          ["falta", convidados.filter((c) => c.confirmacao === "confirmado" && c.entrada.estado !== "entrou").length],
        ] as [FiltroResposta, number][])
      : []),
  ];

  return (
    <div className="rp">
      <style dangerouslySetInnerHTML={{ __html: CSS_RSVP }} />
      <div className="rp-frame">
        {/* ---------------- topo ---------------- */}
        <div className="rp-top">
          <h2>RSVP</h2>
          <span style={{ color: "var(--cinza2)" }}>/</span>
          <span className="rp-ev">{nomeDoEvento}</span>
          {dataEvento && (
            <span className="rp-mono" style={{ fontSize: 12, color: "var(--cinza)", whiteSpace: "nowrap" }}>
              {dataCurta(dataEvento)}
              {horaEvento ? ` · ${horaEvento.slice(0, 5)}` : ""}
            </span>
          )}
          <div className="rp-acoes">
            {filaDaRodada(convidados).length > 0 && (
              <button type="button" className="rp-btn p" onClick={() => setRodando(true)}>
                Rodada de confirmação ({filaDaRodada(convidados).length})
              </button>
            )}
            {fechamento && fechamento.linhas.length > 0 && (
              <button type="button" className="rp-btn" onClick={() => setFechando(true)}>
                Fechar a lista
              </button>
            )}
            <button type="button" className="rp-btn" onClick={() => setImportando(true)}>
              Importar lista
            </button>
            {linkDoEvento && (
              <>
                <button type="button" className="rp-btn" onClick={() => copiar("convite", linkDoEvento)}>
                  {copiado === "convite" ? "Copiado" : "Copiar link do convite"}
                </button>
                <a
                  className="rp-btn p"
                  style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                  href={`https://wa.me/?text=${encodeURIComponent(mensagemDoConvite)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Enviar convite no WhatsApp
                </a>
              </>
            )}
          </div>
        </div>

        {/* ---------------- filtros ---------------- */}
        <aside className="rp-left" aria-label="Filtros">
          <input className="rp-in rp-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar convidado pelo nome" />
          <div>
            <span className="rp-rot">Resposta</span>
            {respostas.map(([f, n]) => itemFiltro(f, n))}
          </div>
          {grupos.length > 0 && !(grupos.length === 1 && grupos[0][0] === SEM_GRUPO) && (
            <div>
              <span className="rp-rot">Grupo</span>
              {grupos.map(([g, n]) => itemFaceta("grupo", g, g === SEM_GRUPO ? "Sem grupo" : g, n))}
            </div>
          )}
          {lados.length > 0 && (
            <div>
              <span className="rp-rot">Lado</span>
              {lados.map(([v, r, n]) => itemFaceta("lado", v, r, n))}
            </div>
          )}
          {outros.length > 0 && (
            <div>
              <span className="rp-rot">Outros</span>
              {outros.map(([v, r, n]) => itemFaceta("outro", v, r, n))}
            </div>
          )}
          {linkDoEvento && (
            <div className="rp-convite">
              <span className="rp-rot" style={{ padding: "0 0 2px" }}>Convite</span>
              <span className={`rp-vivo${confirmacoesAbertas ? "" : " off"}`}>
                <i aria-hidden />
                {confirmacoesAbertas ? "Recebendo confirmações" : "Confirmações encerradas"}
              </span>
              <button type="button" className={`rp-link${confirmacoesAbertas ? "" : " a"}`} disabled={ocupado} onClick={alternarConvite}>
                {confirmacoesAbertas ? "Encerrar confirmações" : "Voltar a receber confirmações"}
              </button>
            </div>
          )}
        </aside>

        {/* ---------------- lista ---------------- */}
        <section className="rp-mid" aria-label="Convidados">
          {chegadas && (
            <button type="button" className="rp-portbar" onClick={() => setFolha("portaria")}>
              <span className="rp-rot" style={{ padding: 0 }}>Portaria</span>
              <b>{chegadas.painel.presentes}</b>
              <span style={{ color: "var(--cinza3)" }}>/ {chegadas.painel.esperados} chegaram</span>
              <span className="rp-n">abrir</span>
            </button>
          )}
          <div className="rp-faixa" role="group" aria-label="Resposta">
            {respostas.map(([f, n]) => (
              <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                {ROTULO[f]}
                <span className="rp-n">{n}</span>
              </button>
            ))}
          </div>
          <div className="rp-grupo-m">
            <input className="rp-in" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar convidado pelo nome" />
            {grupos.length > 1 && (
              <select
                className="rp-in"
                value={faceta?.tipo === "grupo" ? faceta.valor : ""}
                onChange={(e) => setFaceta(e.target.value ? { tipo: "grupo", valor: e.target.value } : null)}
                aria-label="Grupo"
              >
                <option value="">Todos os grupos</option>
                {grupos.map(([g, n]) => (
                  <option key={g} value={g}>
                    {g === SEM_GRUPO ? "Sem grupo" : g} ({n})
                  </option>
                ))}
              </select>
            )}
          </div>
          <form
            className="rp-add"
            data-guia="convidados-rsvp"
            onSubmit={(e) => {
              e.preventDefault();
              adicionar();
            }}
          >
            <input className="rp-in" style={{ flex: 1 }} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do convidado" aria-label="Nome do convidado" />
            <input className="rp-in rp-mono" style={{ width: 170 }} value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="WhatsApp (opcional)" inputMode="tel" aria-label="WhatsApp do convidado" />
            <button type="submit" className="rp-btn" disabled={ocupado || !novoNome.trim()}>
              Adicionar
            </button>
          </form>
          {aviso && <p className={`rp-aviso${aviso.ok ? " ok" : ""}`} role="status">{aviso.texto}</p>}

          <div className="rp-lista" role="listbox" aria-label="Lista de convidados">
            {convidados.length === 0 ? (
              <div className="rp-vazio">
                Mande o link do convite pelo WhatsApp — cada pessoa entra sozinha. Ou importe a lista que a noiva mandou.
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="rp-btn" onClick={() => setImportando(true)}>Importar lista</button>
                </div>
              </div>
            ) : secoes.length === 0 ? (
              <div className="rp-vazio">Ninguém com esse filtro.</div>
            ) : (
              secoes.map(({ s, itens }) => {
                const pessoas = itens.reduce((t, c) => t + pessoasDe(c), 0);
                const semEntrada = s === "confirmado" ? itens.filter((c) => !temEntrada(c)) : [];
                const loteEmail =
                  s === "confirmado"
                    ? semEntrada.filter((c) => c.email && !c.whatsEntrada)
                    : s === "aguardando"
                      ? itens.filter((c) => c.email)
                      : [];
                return (
                  <div key={s}>
                    <div className="rp-sec">
                      <span className="rp-q" style={{ background: COR[s] }} />
                      <b>{ROTULO[s]}</b>
                      <span className="rp-mono" style={{ fontSize: 12, color: "var(--cinza)" }}>{itens.length}</span>
                      <span className="rp-dir">
                        {semEntrada.length > 0 && <span className="rp-falta">{semEntrada.length} sem entrada</span>}
                        {loteEmail.length > 0 && (
                          <button type="button" disabled={ocupado} onClick={() => emLote(s === "confirmado" ? "entrada" : "pedido", loteEmail.map((c) => c.id))}>
                            {s === "confirmado" ? `Mandar ${loteEmail.length} por e-mail` : `Lembrar ${loteEmail.length} por e-mail`}
                          </button>
                        )}
                        {s !== "nao_vai" && <span className="rp-pessoas">{pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}</span>}
                      </span>
                    </div>
                    {itens.map((c) => {
                      const a = acaoDe(c);
                      const meta = [c.grupo, c.restricao].filter(Boolean).join(" · ");
                      return (
                        <div
                          key={c.id}
                          id={`rp-l-${c.id}`}
                          role="option"
                          tabIndex={0}
                          aria-selected={sel === c.id}
                          className={`rp-linha${s === "nao_vai" ? " fora" : ""}`}
                          onClick={() => {
                            setSel(c.id);
                            setFolha("ficha");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSel(c.id);
                              setFolha("ficha");
                            }
                          }}
                        >
                          <div className="rp-nome">
                            <span>{c.nome}</span>
                            <span className="rp-meta">
                              {meta}
                              {s === "confirmado" && c.entrada.estado === "entrou" && <span className="ok">{meta ? " · " : ""}entrou {hora(c.entrada.em!)}</span>}
                              {s === "confirmado" && c.entrada.estado === "sem" && <span className="esp">{meta ? " · " : ""}sem entrada</span>}
                            </span>
                          </div>
                          <span className="rp-acomp">{c.acompanhantes + c.criancas > 0 ? `+${c.acompanhantes + c.criancas}` : "—"}</span>
                          {a && s !== "nao_vai" ? (
                            a.via ? (
                              <button
                                type="button"
                                className="rp-acao"
                                disabled={ocupado}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  agir(c);
                                }}
                              >
                                {a.rotulo}
                              </button>
                            ) : (
                              <span className="rp-acao mudo">{s === "confirmado" ? "busca na porta" : "sem contato"}</span>
                            )
                          ) : (
                            <span />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ---------------- ficha + portaria ---------------- */}
        <aside className="rp-right" aria-label="Ficha e portaria">
          {perto ? (
            <>
              {portaria}
              {ficha}
            </>
          ) : (
            <>
              {ficha}
              {portaria}
            </>
          )}
        </aside>

        {/* ---------------- status ---------------- */}
        <div className="rp-status" role="status">
          <span>{conta.total} {conta.total === 1 ? "convite" : "convites"}</span>
          <span>{conta.pessoas} {conta.pessoas === 1 ? "pessoa confirmada" : "pessoas confirmadas"}</span>
          <span>{conta.por.aguardando} aguardando</span>
          <span>{conta.por.nao_vai} não {conta.por.nao_vai === 1 ? "vai" : "vão"}</span>
          {conta.entraram > 0 && <span>{conta.entraram} {conta.entraram === 1 ? "entrou" : "entraram"}</span>}
        </div>
      </div>

      {/* no celular: a ficha e a portaria numa folha por baixo */}
      {folha && (
        <FolhaNoCelular aoFechar={() => setFolha(null)}>
          {folha === "ficha" ? ficha : portaria}
        </FolhaNoCelular>
      )}

      {fechando && fechamento && (
        <FecharLista
          eventId={eventId}
          nomeDoEvento={nomeDoEvento}
          dataEvento={dataEvento}
          hoje={fechamento.hoje}
          linhas={fechamento.linhas}
          ultimoFechamento={fechamento.ultimo}
          prazo={fechamento.prazo}
          aoFechar={() => setFechando(false)}
        />
      )}
      {rodando && (
        <RodadaDeConfirmacao
          convidados={convidados}
          soEmail={convidados.filter((c) => c.confirmacao === "aguardando" && !c.whatsPedido && c.email).length}
          aoAbrir={(c, link) => {
            window.open(link, "_blank", "noopener,noreferrer");
            const agora = new Date().toISOString();
            setConvidados((l) => l.map((x) => (x.id === c.id ? { ...x, pedido: { via: "whatsapp", em: agora } } : x)));
            void registrarWhatsappAberto(eventId, c.id, "pedido");
          }}
          aoResponder={(c, r) => responder(c, r)}
          aoMandarEmails={() => {
            setRodando(false);
            emLote(
              "pedido",
              convidados.filter((c) => c.confirmacao === "aguardando" && !c.whatsPedido && c.email).map((c) => c.id)
            );
          }}
          aoFechar={() => {
            setRodando(false);
            router.refresh();
          }}
        />
      )}
      {importando && (
        <ImportarLista
          eventId={eventId}
          nomesAtuais={convidados.map((c) => c.nome)}
          aoFechar={() => setImportando(false)}
          aoTerminar={(frase) => {
            setImportando(false);
            avisar(frase, true);
          }}
        />
      )}
    </div>
  );
}

/**
 * A folha só existe no celular: no computador a ficha e a portaria já
 * estão no painel direito. Decidido pela largura do próprio container.
 */
function FolhaNoCelular({ children, aoFechar }: { children: React.ReactNode; aoFechar: () => void }) {
  const [estreito, setEstreito] = useState(false);
  useEffect(() => {
    const el = document.querySelector(".rp");
    if (!el) return;
    const medir = () => setEstreito(el.getBoundingClientRect().width <= 1000);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!estreito) return null;
  return (
    <>
      <div className="rp-veu" onClick={aoFechar} aria-hidden />
      <div className="rp-folha" role="dialog" aria-modal="true">
        <div className="rp-fechar">
          <button type="button" className="rp-btn" onClick={aoFechar}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
