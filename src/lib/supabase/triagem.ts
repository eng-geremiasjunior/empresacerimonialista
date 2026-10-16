import "server-only";

// A leitura da triagem (212): as decisões pendentes, ainda não triadas,
// que o método esperava resolvidas antes de o evento ser cadastrado.
// Sem a 212 aplicada (coluna triagem ausente) a triagem simplesmente não
// aparece — nunca derruba o Planejamento.

import { createClient } from "@/lib/supabase/server";
import { FOLGA_DIAS, sugestaoPelaData, type ItemDaTriagem } from "@/lib/triagem";

type Linha = {
  id: string;
  titulo: string;
  offset_ideal_dias: number | null;
  metodo_decisao: { codigo: string; etapa_de: string | null; fora_do_modelo: boolean } | null;
  evento_objetivo: { nome: string; ordem: number } | null;
};

const DIA = 86_400_000;
const dataUTC = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

export async function getTriagem(eventId: string): Promise<ItemDaTriagem[]> {
  const supabase = createClient();
  const { data: ev } = await supabase.from("events").select("date, created_at").eq("id", eventId).maybeSingle();
  const e = ev as { date: string | null; created_at: string } | null;
  if (!e?.date) return [];

  const { data, error } = await supabase
    .from("evento_decisao")
    .select(
      "id, titulo, offset_ideal_dias, metodo_decisao:decisao_template_id(codigo, etapa_de, fora_do_modelo), evento_objetivo(nome, ordem)"
    )
    .eq("event_id", eventId)
    .eq("estado", "pendente")
    .is("triagem", null);
  if (error || !data) return [];
  const linhas = data as unknown as Linha[];

  const festa = dataUTC(e.date);
  const cadastro = dataUTC(e.created_at);
  const hoje = dataUTC(new Date(Date.now() - 3 * 3_600_000).toISOString()); // Brasília

  // as etapas de cada linha principal, pelo código
  const etapasPorCodigo = new Map<string, string[]>();
  for (const l of linhas) {
    const pai = l.metodo_decisao?.etapa_de;
    if (!pai) continue;
    etapasPorCodigo.set(pai, [...(etapasPorCodigo.get(pai) ?? []), l.id]);
  }

  const itens: ItemDaTriagem[] = [];
  for (const l of linhas) {
    if (!l.metodo_decisao || l.metodo_decisao.etapa_de) continue; // etapa segue a linha dela
    if (l.offset_ideal_dias == null) continue;
    const ideal = festa - l.offset_ideal_dias * DIA;
    if (cadastro - ideal < FOLGA_DIAS * DIA) continue;
    const vencidoHaDias = Math.max(0, Math.round((hoje - ideal) / DIA));
    itens.push({
      id: l.id,
      titulo: l.titulo,
      grupo: l.evento_objetivo?.nome ?? "Outros",
      ordemDoGrupo: l.evento_objetivo?.ordem ?? 999,
      vencidoHaDias,
      sugestao: sugestaoPelaData(vencidoHaDias, l.metodo_decisao.fora_do_modelo),
      etapas: etapasPorCodigo.get(l.metodo_decisao.codigo) ?? [],
    });
  }
  return itens;
}
