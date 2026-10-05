import "server-only";

// A Agenda da noiva que abriu a conta sozinha (04/10/2026), lida pela
// sessão dela: os compromissos (a tabela da cerimonialista, compromisso —
// a mesma que já vai para a Agenda do Google pela fila da 168), as
// parcelas que ainda vão vencer (o Financeiro) e o dia do casamento. A
// conexão com o Google é a dela, pela função que devolve só o que a tela
// mostra (minha_conexao_google).

import { createClient } from "@/lib/supabase/server";
import { donaDaFesta } from "@/lib/supabase/portal-planejamento";
import { googleConfigurado } from "@/lib/google/oauth";
import type { ConexaoGoogleNaTela } from "@/lib/google/na-tela";
import { brl } from "@/components/planejamento/celebra";
import { hojeBR } from "@/lib/tempo";

export type ItemDaAgenda = {
  /** compromisso: o id dele; parcela: o id do lançamento; o dia: "casamento" */
  id: string;
  tipo: "compromisso" | "parcela" | "casamento";
  /** AAAA-MM-DD */
  data: string;
  /** "16:00"; null = dia inteiro */
  hora: string | null;
  titulo: string;
  /** a linha de baixo: o local, ou o valor e de quem */
  sub: string | null;
  /** só do compromisso: o local como ela escreveu (o formulário reabre com ele) */
  local: string | null;
};

export type AgendaDaNoiva = {
  itens: ItemDaAgenda[];
  /** AAAA-MM-DD */
  diaDoCasamento: string | null;
  /** a conexão dela com o Google; null = não ligou */
  google: ConexaoGoogleNaTela | null;
  /** o servidor tem as chaves do Google (e a 168 rodou) */
  googleDisponivel: boolean;
  hoje: string;
};

type CompromissoBruto = { id: string; titulo: string; data: string; hora: string | null; local: string | null };
type ParcelaBruta = {
  id: string;
  description: string | null;
  value: number;
  due_date: string;
  suppliers: { name: string } | { name: string }[] | null;
};

/** null = não é a dona da conta de família (ou a sessão não vê o evento). */
export async function getAgendaDaNoiva(eventoId: string): Promise<AgendaDaNoiva | null> {
  if (!(await donaDaFesta(eventoId))) return null;
  const supabase = createClient();
  const [{ data: ev }, { data: comps }, { data: parcelas }, conexao] = await Promise.all([
    supabase.from("events").select("date").eq("id", eventoId).maybeSingle(),
    supabase
      .from("compromisso")
      .select("id, titulo, data, hora, local")
      .eq("event_id", eventoId)
      .neq("estado", "cancelado")
      .order("data")
      .order("hora", { nullsFirst: true }),
    supabase
      .from("transactions")
      .select("id, description, value, due_date, suppliers(name)")
      .eq("event_id", eventoId)
      .eq("conta", "fornecedor")
      .eq("type", "despesa")
      .eq("paid", false)
      .order("due_date"),
    supabase.rpc("minha_conexao_google"),
  ]);

  const dia = (ev as { date: string | null } | null)?.date?.slice(0, 10) ?? null;
  const itens: ItemDaAgenda[] = [
    ...((comps ?? []) as CompromissoBruto[]).map((c) => ({
      id: c.id,
      tipo: "compromisso" as const,
      data: c.data.slice(0, 10),
      hora: c.hora ? String(c.hora).slice(0, 5) : null,
      titulo: c.titulo,
      sub: c.local?.trim() || null,
      local: c.local?.trim() || null,
    })),
    ...((parcelas ?? []) as ParcelaBruta[]).map((p) => {
      const forn = Array.isArray(p.suppliers) ? p.suppliers[0]?.name : p.suppliers?.name;
      return {
        id: p.id,
        tipo: "parcela" as const,
        data: p.due_date.slice(0, 10),
        hora: null,
        titulo: p.description?.trim() || "Pagamento",
        sub: [brl(Number(p.value)), forn].filter(Boolean).join(" · "),
        local: null,
      };
    }),
    ...(dia ? [{ id: "casamento", tipo: "casamento" as const, data: dia, hora: null, titulo: "O casamento", sub: null, local: null }] : []),
  ].sort((a, b) => a.data.localeCompare(b.data) || (a.hora ?? "").localeCompare(b.hora ?? ""));

  return {
    itens,
    diaDoCasamento: dia,
    google: ((conexao.data as ConexaoGoogleNaTela[] | null) ?? [])[0] ?? null,
    googleDisponivel: googleConfigurado() && !conexao.error,
    hoje: hojeBR(),
  };
}
