// QUEM ESTÁ USANDO O SISTEMA, E ONDE — sem ver nada do que está na tela.
//
// Pedido do dono (16/09/2026): saber no painel quem está "ao vivo" e em
// que área, e se as contas estão usando o sistema. O que sai do navegador
// é só o NOME DA ÁREA, montado aqui a partir da rota e sem os ids:
// /eventos/<id>/planejamento vira "Evento › Planejamento". O banco recusa
// o que parecer endereço ou id (registrar_presenca, 123, seção 5).
//
// Parte pura: roda no navegador (o sinal) e no servidor (o painel).

/** De quanto em quanto tempo a tela aberta dá sinal. */
export const SINAL_A_CADA_MS = 60_000;

/** Sem sinal há mais que isto, a pessoa está offline (dois sinais e meio). */
export const AO_VIVO_ATE_MS = 150_000;

const ABA_DO_EVENTO: Record<string, string> = {
  planejamento: "Planejamento",
  organizacao: "Organização",
  tarefas: "Tarefas",
  roteiro: "Roteiro do dia",
  comunicacao: "Comunicação",
  financeiro: "Financeiro",
  operacao: "Operação",
  rsvp: "RSVP",
  mesas: "Mesas",
  cortejo: "Cortejo",
  fornecedores: "Fornecedores",
  contratos: "Contratos",
  "area-do-cliente": "Área do cliente",
  historico: "Histórico",
  editar: "Editar evento",
};

const VISAO_COMERCIAL: Record<string, string> = {
  pedidos: "Pedidos",
  relatorio: "Relatório",
  pagina: "Vitrine profissional",
  novo: "Nova proposta",
  modelos: "Modelos de proposta",
};

const RAIZ: Record<string, string> = {
  agenda: "Agenda",
  ajuda: "Ajuda",
  assinatura: "Assinatura",
  calendario: "Calendário",
  cerimonialistas: "Cerimonialistas",
  configuracoes: "Configurações",
  contratos: "Contratos",
  equipe: "Equipe",
  financeiro: "Financeiro",
  solicitacoes: "Solicitações",
  tarefas: "Tarefas",
};

/** O nome da área de uma rota do app, sem nenhum id. */
export function areaDaRota(pathname: string): string {
  const [a, b, c] = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  if (!a) return "Início";
  if (a === "eventos") {
    if (!b) return "Eventos";
    if (b === "dashboard") return "Dashboard";
    if (b === "novo") return "Novo evento";
    return `Evento › ${c ? (ABA_DO_EVENTO[c] ?? "Outra aba") : "Visão geral"}`;
  }
  if (a === "orcamentos") {
    if (!b) return "Gestão comercial › Propostas";
    if (VISAO_COMERCIAL[b]) return `Gestão comercial › ${VISAO_COMERCIAL[b]}`;
    return c === "editar"
      ? "Gestão comercial › Editar proposta"
      : "Gestão comercial › Proposta";
  }
  if (a === "catalogo") {
    if (!b) return "Gestão comercial › Catálogo";
    if (b === "paletas") return "Catálogo › Paletas";
    if (b === "precificacao") return "Catálogo › Precificação";
    return "Catálogo › Tipo de evento";
  }
  if (a === "clientes") {
    if (!b) return "Clientes";
    return b === "novo" ? "Clientes › Novo cadastro" : "Clientes › Ficha";
  }
  if (a === "fornecedores") return b ? "Fornecedores › Ficha" : "Fornecedores";
  return RAIZ[a] ?? "Outra tela";
}

/** "agora" / "há 5 min" / "há 3 h" / "há 2 dias" — `agora` vem de quem chama. */
export function haQuantoTempo(iso: string, agora: number): string {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/** 200 → "3 h 20 min"; 45 → "45 min"; 0 → "menos de 1 min". */
export function minutosEmPalavras(min: number): string {
  if (min < 1) return "menos de 1 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
