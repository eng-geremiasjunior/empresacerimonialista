// A lista de contas do painel do dono: filtros, ordem e a linha pronta
// para a tela. Puro: recebe o resumo do banco e "agora".
//
// As contas da casa formam um grupo à parte e NUNCA aparecem na lista de
// clientes (regra dele, 17/09/2026: "ela não pode aparecer na tela dos
// clientes reais"). O filtro de grupo vem antes de qualquer outro.

import {
  aparelhoDoAgente,
  banida,
  canalDaOrigem,
  cobrancaPendente,
  diasAte,
  diasDesde,
  diasEmPalavras,
  diasSemAcesso,
  emTeste,
  motivosDeAtencao,
  pagante,
  passosDaConta,
  prazoEmPalavras,
  situacaoDaConta,
  ultimaAcaoEmPalavras,
  ultimoAcesso,
  valorMensal,
  type ChaveDoMotivo,
  type ChaveDoPasso,
  type ResumoDaConta,
} from "@/lib/admin/saude-da-conta";
import { dataBR, diaMesBR, minutosEmTexto, plural, reais } from "@/lib/admin/formatos";

export type Grupo = "clientes" | "casa";

export type Situacoes =
  | "todas"
  | "teste"
  | "pagantes"
  | "canceladas"
  | "suspensas"
  | "atencao"
  | "sem_evento"
  | "evento_proximo"
  | "suporte";

export type Ordem = "atencao" | "criacao" | "acao" | "acesso";

export type FiltrosDeContas = {
  grupo: Grupo;
  situacao: Situacoes;
  semUso: number | null;
  atencao: ChaveDoMotivo | null;
  passo: ChaveDoPasso | null;
  plano: string | null;
  origem: string | null;
  campanha: string | null;
  criada: string | null; // yyyy-mm
  busca: string;
  ordem: Ordem;
};

const SITUACOES: Situacoes[] = ["todas", "teste", "pagantes", "canceladas", "suspensas", "atencao", "sem_evento", "evento_proximo", "suporte"];
const ORDENS: Ordem[] = ["atencao", "criacao", "acao", "acesso"];

type Params = Record<string, string | string[] | undefined>;

function um(p: Params, chave: string): string | null {
  const v = p[chave];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 120) : null;
}

export function lerFiltros(p: Params): FiltrosDeContas {
  const situacao = um(p, "situacao");
  const ordem = um(p, "ordem");
  const semUso = Number(um(p, "sem_uso"));
  const criada = um(p, "criada");
  return {
    grupo: um(p, "grupo") === "casa" ? "casa" : "clientes",
    situacao: SITUACOES.includes(situacao as Situacoes) ? (situacao as Situacoes) : "todas",
    semUso: Number.isFinite(semUso) && semUso > 0 ? semUso : null,
    atencao: (um(p, "atencao") as ChaveDoMotivo | null) ?? null,
    passo: (um(p, "passo") as ChaveDoPasso | null) ?? null,
    plano: um(p, "plano"),
    origem: um(p, "origem"),
    campanha: um(p, "campanha"),
    criada: criada && /^\d{4}-\d{2}$/.test(criada) ? criada : null,
    busca: um(p, "q") ?? "",
    ordem: ORDENS.includes(ordem as Ordem) ? (ordem as Ordem) : "atencao",
  };
}

/** O endereço da lista com alguns filtros trocados (os vazios somem). */
export function hrefDaLista(f: FiltrosDeContas, mudar: Partial<FiltrosDeContas>): string {
  const g = { ...f, ...mudar };
  const q = new URLSearchParams();
  if (g.grupo !== "clientes") q.set("grupo", g.grupo);
  if (g.situacao !== "todas") q.set("situacao", g.situacao);
  if (g.semUso) q.set("sem_uso", String(g.semUso));
  if (g.atencao) q.set("atencao", g.atencao);
  if (g.passo) q.set("passo", g.passo);
  if (g.plano) q.set("plano", g.plano);
  if (g.origem) q.set("origem", g.origem);
  if (g.campanha) q.set("campanha", g.campanha);
  if (g.criada) q.set("criada", g.criada);
  if (g.busca) q.set("q", g.busca);
  if (g.ordem !== "atencao") q.set("ordem", g.ordem);
  const s = q.toString();
  return s ? `/admin/contas?${s}` : "/admin/contas";
}

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function canalDaConta(c: ResumoDaConta): string {
  return c.origem
    ? canalDaOrigem(c.origem.utm_source, c.origem.utm_medium, c.origem.gclid)
    : "Sem origem registrada";
}

export function passouNaSituacao(c: ResumoDaConta, s: Situacoes, agora: Date): boolean {
  switch (s) {
    case "todas":
      return true;
    case "teste":
      return emTeste(c) && !banida(c, agora);
    case "pagantes":
      return pagante(c) && !banida(c, agora);
    case "canceladas":
      return c.assinatura?.status === "cancelada";
    case "suspensas":
      return banida(c, agora);
    case "atencao":
      return motivosDeAtencao(c, agora).length > 0;
    case "sem_evento":
      return c.eventos.total === 0;
    case "evento_proximo":
      return (c.eventos.proximos_30 ?? 0) > 0;
    case "suporte":
      return (c.suporte.sem_resposta ?? 0) > 0;
  }
}

/**
 * Parou antes do passo: fez o passo anterior do funil e não fez este
 * (no primeiro passo, é quem não fez nada).
 */
export function paradaAntesDe(c: ResumoDaConta, passo: ChaveDoPasso): boolean {
  const passos = passosDaConta(c);
  const i = passos.findIndex((p) => p.chave === passo);
  if (i < 0) return false;
  const anteriorFeito = i === 0 ? true : passos[i - 1].feito;
  return anteriorFeito && !passos[i].feito;
}

export function filtrarContas(
  contas: ResumoDaConta[],
  f: FiltrosDeContas,
  agora: Date
): ResumoDaConta[] {
  const busca = semAcento(f.busca);
  return contas.filter((c) => {
    // o grupo primeiro: conta da casa nunca entra na lista de clientes
    if (f.grupo === "casa" ? !c.da_casa : c.da_casa) return false;
    if (!passouNaSituacao(c, f.situacao, agora)) return false;
    if (f.semUso && diasSemAcesso(c, agora) < f.semUso) return false;
    if (f.atencao && !motivosDeAtencao(c, agora).some((m) => m.chave === f.atencao)) return false;
    if (f.passo && !paradaAntesDe(c, f.passo)) return false;
    if (f.plano && (c.assinatura?.plano ?? "sem_assinatura") !== f.plano) return false;
    if (f.origem && canalDaConta(c) !== f.origem) return false;
    if (f.campanha && (c.origem?.utm_campaign ?? "") !== f.campanha) return false;
    if (f.criada && diaMesAno(c.criada_em) !== f.criada) return false;
    if (busca) {
      const alvo = semAcento([c.nome, c.dona.nome ?? "", c.dona.email ?? ""].join(" "));
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });
}

function diaMesAno(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
}

export function ordenarContas(contas: ResumoDaConta[], ordem: Ordem, agora: Date): ResumoDaConta[] {
  const tempo = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
  const lista = [...contas];
  switch (ordem) {
    case "criacao":
      return lista.sort((a, b) => tempo(b.criada_em) - tempo(a.criada_em));
    case "acao":
      return lista.sort((a, b) => tempo(b.acoes.ultima_em) - tempo(a.acoes.ultima_em));
    case "acesso":
      return lista.sort((a, b) => tempo(ultimoAcesso(b)) - tempo(ultimoAcesso(a)));
    case "atencao":
    default:
      return lista.sort((a, b) => {
        const ua = motivosDeAtencao(a, agora)[0]?.urgencia ?? 99;
        const ub = motivosDeAtencao(b, agora)[0]?.urgencia ?? 99;
        return ua - ub || tempo(b.acoes.ultima_em ?? b.criada_em) - tempo(a.acoes.ultima_em ?? a.criada_em);
      });
  }
}

// ------------------------------------------------------------------
// A linha pronta para a tela (texto já montado no servidor)
// ------------------------------------------------------------------

export type LinhaDeConta = {
  id: string;
  nome: string;
  responsavel: string | null;
  email: string | null;
  situacao: string;
  grupo: string;
  motivo: string | null;
  planoOuTeste: string;
  ultimoAcesso: string;
  ultimaAcao: string;
  eventos: string;
  uso7: string;
  origem: string;
  criada: string;
  whatsapp: string | null;
  instagram: string | null;
};

export function planoOuTeste(c: ResumoDaConta, agora: Date): string {
  const a = c.assinatura;
  if (!a) return "sem assinatura";
  if (a.status === "trial") {
    const faltam = diasAte(a.teste_termina_em, agora);
    // "· cartão": o teste com cartão (21/09/2026), que vira assinante sozinho
    const cartao = a.tem_gateway ? " · cartão" : "";
    return faltam === null ? `teste sem prazo${cartao}` : `teste · ${prazoEmPalavras(faltam)}${cartao}`;
  }
  if (a.status === "cancelada") {
    return a.cancelada_em ? `cancelada em ${dataBR(a.cancelada_em)}` : "cancelada";
  }
  const valor = valorMensal(c);
  const partes = [a.plano, valor > 0 ? `${reais(valor)}/mês` : "R$ 0"];
  if (a.status === "pausada") partes.push("pausada");
  if (cobrancaPendente(c)) partes.push("cobrança pendente");
  return partes.join(" · ");
}

export function ultimaAcaoEmTexto(c: ResumoDaConta, agora: Date): string {
  if (!c.acoes.ultima_em) return "nenhuma ainda";
  const dias = diasDesde(c.acoes.ultima_em, agora) ?? 0;
  const oque = ultimaAcaoEmPalavras(c.acoes.ultima_tipo);
  return oque ? `${diasEmPalavras(dias)} · ${oque}` : diasEmPalavras(dias);
}

export function ultimoAcessoEmTexto(c: ResumoDaConta, agora: Date): string {
  const u = ultimoAcesso(c);
  if (!u) return "nunca registrado";
  return diasEmPalavras(diasDesde(u, agora) ?? 0);
}

export function eventosEmTexto(c: ResumoDaConta): string {
  const e = c.eventos;
  if (!e.total) return "nenhum";
  const partes: string[] = [];
  if (e.em_andamento) partes.push(`${e.em_andamento} em andamento`);
  if (e.concluidos) partes.push(`${e.concluidos} ${e.concluidos === 1 ? "concluído" : "concluídos"}`);
  return partes.length ? partes.join(" · ") : plural(e.total, "evento", "eventos");
}

export function uso7EmTexto(c: ResumoDaConta): string {
  const a = c.acesso;
  if (!a.dias_total) return "sem registro";
  if (!a.dias_7) return "nada em 7 dias";
  return `${plural(a.dias_7, "dia", "dias")} · ${minutosEmTexto(a.minutos_7)}`;
}

export function linhaDaConta(c: ResumoDaConta, agora: Date): LinhaDeConta {
  const sit = situacaoDaConta(c, agora);
  const motivo = motivosDeAtencao(c, agora)[0]?.texto ?? null;
  const aparelho = aparelhoDoAgente(c.origem?.user_agent ?? null);
  return {
    id: c.empresa_id,
    nome: c.nome,
    responsavel: c.dona.nome,
    email: c.dona.email,
    situacao: sit.rotulo,
    grupo: sit.grupo,
    motivo,
    planoOuTeste: planoOuTeste(c, agora),
    ultimoAcesso: ultimoAcessoEmTexto(c, agora),
    ultimaAcao: ultimaAcaoEmTexto(c, agora),
    eventos: eventosEmTexto(c),
    uso7: uso7EmTexto(c),
    origem: [canalDaConta(c), aparelho].filter(Boolean).join(" · "),
    criada: diaMesBR(c.criada_em),
    whatsapp: c.dona.whatsapp,
    instagram: c.dona.instagram,
  };
}

