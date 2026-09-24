// Os meses do Planejamento: cada decisão cai no mês do prazo dela, do
// primeiro prazo (ou de hoje) até o mês do evento, e o mês do evento vira o
// "dia D". Morava no Modo Amplo; o Amplo entrou no Caderno em 24/09/2026 e
// o cálculo ficou aqui, num lugar só — o Caderno não inventa outro.
//
// PREVISTO do mês = "A FECHAR": soma do valor_previsto dos objetivos cuja
// decisão de contratação (*_contratar) vence naquele mês e AINDA não tem
// valor_contratado. Invariante do modelo (três dinheiros): nunca se soma
// com parcelas — depois do contrato o dinheiro vive só nas parcelas, no
// Financeiro.

import type { Decisao, Objetivo } from "@/lib/supabase/planejamento";
import { inicioDoDiaBR } from "@/lib/tempo";
import { estadoVisual } from "./celebra";
export type MesDoPlano = {
  chave: string; // yyyy-mm
  rotulo: string; // "Agosto 2025"
  mesesAteEvento: number | null;
  decisoes: Decisao[];
  decididas: number;
  atrasadas: number;
  /** respostas da cliente esperando conferência (091) */
  daCliente: number;
  previsto: number; // "a fechar" no mês
  passado: boolean;
  atual: boolean;
};

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function chaveMes(iso: string): string {
  return iso.slice(0, 7);
}

function rotuloMes(chave: string): string {
  const [a, m] = chave.split("-").map(Number);
  return `${MESES_PT[m - 1]} ${a}`;
}

function proximoMes(chave: string): string {
  const [a, m] = chave.split("-").map(Number);
  const d = new Date(a, m, 1); // m já é o próximo (Date é 0-based)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function diffMeses(de: string, ate: string): number {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

export function montarMeses(
  objetivos: Objetivo[],
  dataEvento: string | null
): { meses: MesDoPlano[]; diaD: MesDoPlano | null } {
  const ativos = objetivos.filter((o) => o.ativo);
  const todas = ativos.flatMap((o) => o.decisoes);
  const comPrazo = todas.filter(
    (d) => d.prazoPrevisto !== null && d.estado !== "nao_se_aplica"
  );
  if (comPrazo.length === 0) return { meses: [], diaD: null };

  // mês de hoje em Brasília, igual no servidor e no navegador
  const hoje = inicioDoDiaBR();
  const chaveHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const chaves = comPrazo.map((d) => chaveMes(d.prazoPrevisto!)).sort();
  const primeira = chaves[0] < chaveHoje ? chaves[0] : chaveHoje;
  const chaveEvento = dataEvento ? chaveMes(dataEvento) : chaves[chaves.length - 1];

  // objetivo → mês da decisão de contratação (para o "a fechar")
  const aFecharPorMes = new Map<string, number>();
  for (const o of ativos) {
    if (o.valorPrevisto === null) continue;
    const contratar = o.decisoes.find(
      (d) => d.codigo?.endsWith("_contratar") && d.estado !== "nao_se_aplica"
    );
    if (!contratar?.prazoPrevisto) continue;
    // já tem contrato? (valor_contratado preenchido) → saiu do "a fechar"
    const valorContratado = contratar.campos.find(
      (c) => c.codigo === "valor_contratado" && c.valorNumero !== null
    );
    if (valorContratado) continue;
    const chave = chaveMes(contratar.prazoPrevisto);
    aFecharPorMes.set(
      chave,
      (aFecharPorMes.get(chave) ?? 0) + Number(o.valorPrevisto)
    );
  }

  const porMes = new Map<string, Decisao[]>();
  for (const d of comPrazo) {
    const ch = chaveMes(d.prazoPrevisto!);
    const arr = porMes.get(ch) ?? [];
    arr.push(d);
    porMes.set(ch, arr);
  }

  const meses: MesDoPlano[] = [];
  let diaD: MesDoPlano | null = null;
  let cursor = primeira;
  // percorre até o mês do evento (limite duro de 36 para nunca laçar)
  for (let i = 0; i < 36 && cursor <= chaveEvento; i++) {
    const decisoes = (porMes.get(cursor) ?? []).sort((a, b) =>
      (a.prazoPrevisto ?? "").localeCompare(b.prazoPrevisto ?? "")
    );
    const decididas = decisoes.filter((d) => d.estado === "decidida").length;
    const atrasadas = decisoes.filter(
      (d) => estadoVisual(d) === "atrasada"
    ).length;
    const daCliente = decisoes.reduce(
      (s, d) => s + (d.aguardamConferencia ?? 0),
      0
    );
    const m: MesDoPlano = {
      chave: cursor,
      rotulo: rotuloMes(cursor),
      mesesAteEvento: dataEvento ? diffMeses(cursor, chaveEvento) : null,
      decisoes,
      decididas,
      atrasadas,
      daCliente,
      previsto: aFecharPorMes.get(cursor) ?? 0,
      passado: cursor < chaveHoje,
      atual: cursor === chaveHoje,
    };
    if (cursor === chaveEvento && dataEvento) diaD = m;
    else meses.push(m);
    cursor = proximoMes(cursor);
  }
  return { meses, diaD };
}
