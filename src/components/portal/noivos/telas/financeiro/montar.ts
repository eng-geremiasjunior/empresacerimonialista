// Financeiro do portal dos noivos (desenho v4, README §15; protótipo,
// lógica 1101–1103). Parte pura: do que o portal_investimento devolve
// (só o dinheiro dos fornecedores — os honorários da assessoria nunca
// entram) ao que a tela desenha. Datas como AAAA-MM-DD; "hoje" vem de
// quem chama (hojeBR no servidor).

import type { InvestimentoDoPortal } from "@/lib/supabase/portal";
import { brl } from "@/components/planejamento/celebra";

/**
 * pago · prox (a primeira em aberto, fundo pêssego) · atrasada (em
 * aberto, venceu, depois da primeira) · fut (agendada)
 */
export type EstadoDaParcela = "pago" | "prox" | "atrasada" | "fut";

export type LinhaDaParcela = {
  chave: string;
  /** "11/07" */
  data: string;
  /** "Sinal · Flor de Lis" */
  texto: string;
  /** "R$ 4.800" */
  valor: string;
  estado: EstadoDaParcela;
  /** "Pago" · "vence em 4 dias" · "venceu há 2 dias" · "Agendada" */
  rotulo: string;
};

export type ResumoFinanceiro = {
  contratado: string;
  pago: string;
  falta: string;
  /** já pago sobre o contratado, 0–100 */
  pct: number;
  parcelas: LinhaDaParcela[];
  pagas: number;
};

const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

function diasEntre(de: string, ate: string): number | null {
  const a = ISO.exec(de);
  const b = ISO.exec(ate);
  if (!a || !b) return null;
  const t = (m: RegExpExecArray) => Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Math.round((t(b) - t(a)) / 86_400_000);
}

function ddmm(iso: string): string {
  const m = ISO.exec(iso);
  return m ? `${m[3]}/${m[2]}` : "—";
}

/** O prazo da parcela em tempo, não em status. */
function tempoDaParcela(d: number | null): string {
  if (d === null) return "Em aberto";
  if (d < 0) return d === -1 ? "venceu ontem" : `venceu há ${-d} dias`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  return `vence em ${d} dias`;
}

/** "Sinal · Flor de Lis"; sem repetir o fornecedor quando a descrição já diz. */
function textoDaParcela(descricao: string | null, fornecedor: string | null): string {
  const d = (descricao ?? "").trim();
  const f = (fornecedor ?? "").trim();
  if (d && f) return d.toLowerCase().includes(f.toLowerCase()) ? d : `${d} · ${f}`;
  return d || f || "Parcela";
}

export function montarFinanceiro(inv: InvestimentoDoPortal, hoje: string): ResumoFinanceiro {
  const contratado = Math.max(0, inv.contratado);
  const pago = Math.max(0, inv.pago);
  const falta = Math.max(0, contratado - pago);
  const pct = contratado > 0 ? Math.min(100, Math.round((pago / contratado) * 100)) : pago > 0 ? 100 : 0;

  // a RPC já ordena por vencimento; a primeira em aberto é a próxima
  const proxima = inv.parcelas.findIndex((p) => !p.paid);

  const parcelas = inv.parcelas.map((p, i): LinhaDaParcela => {
    const d = p.dueDate ? diasEntre(hoje, p.dueDate) : null;
    const estado: EstadoDaParcela = p.paid
      ? "pago"
      : i === proxima
        ? "prox"
        : d !== null && d < 0
          ? "atrasada"
          : "fut";
    const rotulo =
      estado === "pago" ? "Pago" : estado === "fut" ? "Agendada" : tempoDaParcela(d);
    return {
      chave: `${p.dueDate ?? "sem-data"}-${i}`,
      data: p.dueDate ? ddmm(p.dueDate) : "—",
      texto: textoDaParcela(p.descricao, p.fornecedor),
      valor: brl(p.valor),
      estado,
      rotulo,
    };
  });

  return {
    contratado: brl(contratado),
    pago: brl(pago),
    falta: brl(falta),
    pct,
    parcelas,
    pagas: inv.parcelas.filter((p) => p.paid).length,
  };
}
