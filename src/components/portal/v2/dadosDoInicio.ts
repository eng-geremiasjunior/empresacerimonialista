// O Início v2 a partir dos dados que o portal já lê (getHomePortal):
// perguntas com prazo e parcelas que vencem viram "Precisa de vocês"; o
// quadro da 173 vira "está cuidando" e "Chegou de novo". Tudo falando em
// tempo. Parte pura: roda no servidor, com o "hoje" de Brasília.

import type { HomeDoPortal } from "@/lib/supabase/portal";
import { brl } from "@/components/planejamento/celebra";
import type { ItemCuidando, ItemNovo, ItemPrecisa } from "./InicioV2";

const DIAS_DA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** dias de `hoje` (AAAA-MM-DD, Brasília) até `iso` */
function diasAte(iso: string, hoje: string): number {
  const a = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  const b = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

function tempoDaPergunta(d: number, iso: string): string {
  if (d < 0) return "passou do prazo";
  if (d === 0) return "responder hoje";
  if (d === 1) return "responder até amanhã";
  if (d <= 7) return `faltam ${d} dias`;
  return `responder até ${ddmm(iso)}`;
}

function tempoDaParcela(d: number): string {
  if (d < 0) return d === -1 ? "venceu ontem" : `venceu há ${-d} dias`;
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  return `vence em ${d} dias`;
}

export function montarPrecisa(home: HomeDoPortal, base: string, hoje: string): ItemPrecisa[] {
  const itens: (ItemPrecisa & { ordem: number })[] = [];

  for (const d of home.faltaDecidir) {
    if (!d.temPergunta) continue;
    const dias = d.prazoPrevisto ? diasAte(d.prazoPrevisto, hoje) : 999;
    itens.push({
      id: `d${d.id}`,
      tipo: d.objetivoNome ? `Pergunta · ${d.objetivoNome}` : "Pergunta",
      titulo: d.titulo,
      sub: null,
      tempo: d.prazoPrevisto ? tempoDaPergunta(dias, d.prazoPrevisto) : "sem prazo",
      urgente: dias <= 7,
      href: `${base}/escolhas/${d.id}`,
      ordem: dias,
    });
  }

  // as parcelas que vencem nos próximos 30 dias (ou já venceram)
  (home.investimento?.parcelas ?? []).forEach((p, i) => {
    if (p.paid) return;
    const dias = diasAte(p.dueDate, hoje);
    if (dias > 30) return;
    itens.push({
      id: `p${i}${p.dueDate}`,
      tipo: "Pagamento",
      // a descrição costuma já trazer o fornecedor ("Buffet Aurora · parcela")
      titulo:
        (p.descricao && p.fornecedor && p.descricao.startsWith(p.fornecedor)
          ? p.descricao
          : [p.fornecedor, p.descricao].filter(Boolean).join(" · ")) || "Parcela",
      sub: brl(p.valor),
      tempo: tempoDaParcela(dias),
      urgente: dias <= 7,
      href: `${base}/investimento`,
      ordem: dias,
    });
  });

  return itens
    .sort((a, b) => a.ordem - b.ordem)
    .slice(0, 8)
    .map(({ ordem: _o, ...resto }) => resto);
}

export function montarCuidando(home: HomeDoPortal, hoje: string): ItemCuidando[] {
  return (home.quadro?.cuidando ?? []).slice(0, 4).map((c) => {
    if (!c.prazo) return { t: c.titulo, q: "" };
    const d = diasAte(c.prazo, hoje);
    return { t: c.titulo, q: d <= 0 ? "esta semana" : d <= 7 ? `até ${DIAS_DA_SEMANA[new Date(`${c.prazo}T12:00:00`).getDay()]}` : `até ${ddmm(c.prazo)}` };
  });
}

export function montarNovo(home: HomeDoPortal, hoje: string, cerimonialista: string): ItemNovo[] {
  return (home.quadro?.fechado ?? []).slice(0, 6).map((f) => {
    const d = -diasAte(f.quando.slice(0, 10), hoje);
    const q = d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
    return { t: `${cerimonialista} fechou: ${f.titulo}`, q, href: null };
  });
}

/** "sábado, 20:00 · Casa Lírio, Itu" */
export function linhaDoLocal(data: string, hora: string | null, local: string | null, cidade: string | null): string {
  const dia = DIAS_DA_SEMANA[new Date(`${data}T12:00:00`).getDay()];
  const quando = [dia, hora ? hora.slice(0, 5) : null].filter(Boolean).join(", ");
  const onde = [local, cidade].filter(Boolean).join(", ");
  return [quando, onde].filter(Boolean).join(" · ");
}
