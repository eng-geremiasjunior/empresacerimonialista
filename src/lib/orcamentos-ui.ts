// Tokens e regras da tela de Orçamentos (redesign "quiet luxury"),
// transcritos de design/tela-orcamentos/README.md e orcamentos.logic.js.
//
// Ficam num módulo à parte porque a página (server) e a lista (client)
// usam os mesmos valores. Escopo é só esta tela: o AppShell e o resto do
// painel seguem com o visual atual.

export const CORES = {
  fundo: "#FFFFFF",
  suave: "#F7F7F5",
  tag: "#F2F1EE",
  texto: "#37352F",
  secundario: "#8A867C",
  terciario: "#B4B1A9",
  nav: "#6B6862",
  borda: "#E9E9E7",
  bordaSutil: "#E4E2DD",
  selecao: "#EDE9E2",
  aprovadoTexto: "#5A7A55",
  aprovadoPonto: "#7A9B6E",
  enviadoTexto: "#9A7B3E",
  enviadoPonto: "#C08A4E",
  destrutivo: "#B0553F",
  destrutivoHover: "#F7EEEB",
} as const;

// Grid compartilhado pelo cabeçalho de colunas e pelas linhas.
export const GRID_LISTA = "2.4fr 1.1fr 1.1fr 1fr 1.3fr 1.1fr";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "2026-08-08" -> "08 ago 2026". O ano é obrigatório: a lista mistura
// eventos de anos diferentes, e sem ele duas datas viram a mesma coisa.
export function dataPorExtenso(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia} ${MESES[Number(mes) - 1]} ${ano}`;
}

export function telefoneFormatado(bruto: string | null): string | null {
  const d = (bruto ?? "").replace(/\D/g, "");
  if (d.length < 10) return bruto || null;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

export function iniciaisDe(nome: string): string {
  const partes = nome.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

// Paleta do avatar por tipo de evento. Tipos fora do handoff caem no tom
// neutro em vez de ficarem sem cor.
export function paletaAvatar(tipo: string): { bg: string; cor: string } {
  if (tipo === "casamento") return { bg: "#EDE9E2", cor: "#8A6E4B" };
  if (tipo === "debutante") return { bg: "#EAEAE6", cor: "#6E7A6A" };
  return { bg: CORES.tag, cor: CORES.secundario };
}

export function estiloStatus(status: string): { cor: string; ponto: string; rotulo: string } {
  if (status === "aprovado")
    return { cor: CORES.aprovadoTexto, ponto: CORES.aprovadoPonto, rotulo: "Aprovado" };
  if (status === "enviado")
    return { cor: CORES.enviadoTexto, ponto: CORES.enviadoPonto, rotulo: "Enviado" };
  if (status === "recusado")
    return { cor: CORES.destrutivo, ponto: CORES.destrutivo, rotulo: "Recusado" };
  if (status === "expirado")
    return { cor: CORES.terciario, ponto: CORES.terciario, rotulo: "Expirado" };
  return { cor: CORES.secundario, ponto: CORES.terciario, rotulo: "Rascunho" };
}

// Alerta de validade: âmbar nos últimos 30 dias, vermelho depois de
// vencido. O ponto colorido só aparece quando há algo a fazer.
export function infoValidade(
  dataValidade: string | null,
  hoje = new Date()
): { rotulo: string; cor: string; alerta: boolean } {
  if (!dataValidade) return { rotulo: "—", cor: CORES.terciario, alerta: false };

  const [a, m, d] = dataValidade.slice(0, 10).split("-").map(Number);
  const fim = new Date(a, m - 1, d);
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((fim.getTime() - base.getTime()) / 86_400_000);
  const br = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;

  if (dias < 0) return { rotulo: `Vencido em ${br}`, cor: CORES.destrutivo, alerta: true };
  if (dias <= 30)
    return {
      rotulo: dias === 0 ? "Vence hoje" : `Vence em ${dias} dia${dias > 1 ? "s" : ""}`,
      cor: CORES.enviadoTexto,
      alerta: true,
    };
  return { rotulo: `Válido até ${br}`, cor: CORES.terciario, alerta: false };
}

export const valorFormatado = (v: number) =>
  `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
