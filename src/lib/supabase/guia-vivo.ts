// A leitura do guia (migração 160).
//
// Uma viagem só: `meu_guia()` devolve as duas datas e os cinco fatos
// juntos. Chamada no layout, ou seja, em TODA navegação do app — por isso
// não pode virar cinco consultas.
//
// Falhar aqui é o mesmo que não ter guia: `null`. É o certo. Se o deploy
// chegar antes da migração, ou se a função sumir, a pessoa fica sem
// condução — nunca com uma tela quebrada por causa de um tutorial.

import { createClient } from "@/lib/supabase/server";
import type { EstadoDoGuia } from "@/lib/guia-vivo";
import { hojeBR } from "@/lib/tempo";

type Cru = {
  dispensado_em: string | null;
  concluido_em: string | null;
  evento_id: string | null;
  criou_evento: boolean;
  definiu_contexto: boolean;
  decidiu: boolean;
  tarefa_nasceu: boolean;
  deu_andamento: boolean;
};

/** Dias de `de` até `ate`, as duas em AAAA-MM-DD (fuso não entra). */
function diasEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

export async function getEstadoDoGuia(): Promise<EstadoDoGuia | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("meu_guia");
    if (error || !data) return null;
    const d = data as Cru;

    // Os fatos dos caminhos SEM MÉTODO e da RETA FINAL (ver guia-vivo.ts).
    // Contados aqui, e não em meu_guia(), para a correção chegar à cliente
    // sem esperar migração. Contagem pela sessão dela — a RLS já deixa a
    // equipe ler estas tabelas, que as próprias telas leem.
    //
    // Só quando o guia está vivo: guia pulado ou concluído não gasta
    // consulta nenhuma em toda navegação.
    let temMetodo = true;
    let temConvidado = false;
    let temTarefa = false;
    let diasAteOEvento: number | null = null;
    let temFornecedor = false;
    let temResponsavel = false;
    if (d.evento_id && !d.dispensado_em && !d.concluido_em) {
      const [obj, conv, tar, ev, forn, resp] = await Promise.all([
        supabase.from("evento_objetivo").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("evento_convidado").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("events").select("date").eq("id", d.evento_id).maybeSingle(),
        supabase.from("roteiro_links").select("supplier_id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        // O roteiro nasce semeado pelo modelo da empresa, sem responsável:
        // item existir não prova nada. O que só ela faz é dizer QUEM faz.
        supabase
          .from("roteiro_items")
          .select("id", { count: "exact", head: true })
          .eq("event_id", d.evento_id)
          .not("supplier_id", "is", null),
      ]);
      // Sem saber se há método, não há como escolher o caminho — e errar
      // de caminho é justamente o beco que isto existe para evitar. Sem
      // guia é melhor que guia errado.
      if (obj.error) return null;
      temMetodo = (obj.count ?? 0) > 0;
      temConvidado = (conv.count ?? 0) > 0;
      temTarefa = (tar.count ?? 0) > 0;
      // As três leituras da reta final falhando só tiram ESTE caminho:
      // sem a data, o guia segue o caminho de antes.
      const dataDoEvento = (ev.data as { date?: string | null } | null)?.date ?? null;
      diasAteOEvento = dataDoEvento ? diasEntre(hojeBR(), dataDoEvento.slice(0, 10)) : null;
      temFornecedor = !forn.error && (forn.count ?? 0) > 0;
      temResponsavel = !resp.error && (resp.count ?? 0) > 0;
    }

    return {
      dispensadoEm: d.dispensado_em ?? null,
      concluidoEm: d.concluido_em ?? null,
      eventoId: d.evento_id ?? null,
      criouEvento: d.criou_evento === true,
      definiuContexto: d.definiu_contexto === true,
      decidiu: d.decidiu === true,
      tarefaNasceu: d.tarefa_nasceu === true,
      deuAndamento: d.deu_andamento === true,
      temMetodo,
      temConvidado,
      temTarefa,
      diasAteOEvento,
      temFornecedor,
      temResponsavel,
    };
  } catch {
    return null;
  }
}
