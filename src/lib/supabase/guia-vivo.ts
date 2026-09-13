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

export async function getEstadoDoGuia(): Promise<EstadoDoGuia | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("meu_guia");
    if (error || !data) return null;
    const d = data as Cru;

    // Os três fatos do caminho SEM MÉTODO (ver PASSOS_SEM_METODO). Contados
    // aqui, e não em meu_guia(), para a correção chegar à cliente sem
    // esperar migração: ela criou um aniversário e o guia a mandava para
    // um Planejamento vazio. Contagem pela sessão dela — a RLS já deixa a
    // equipe ler estas três tabelas, que as próprias telas leem.
    let temMetodo = true;
    let temConvidado = false;
    let temTarefa = false;
    if (d.evento_id && !d.dispensado_em && !d.concluido_em) {
      const [obj, conv, tar] = await Promise.all([
        supabase.from("evento_objetivo").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("evento_convidado").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
      ]);
      // Sem saber se há método, não há como escolher o caminho — e errar
      // de caminho é justamente o beco que isto existe para evitar. Sem
      // guia é melhor que guia errado.
      if (obj.error) return null;
      temMetodo = (obj.count ?? 0) > 0;
      temConvidado = (conv.count ?? 0) > 0;
      temTarefa = (tar.count ?? 0) > 0;
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
    };
  } catch {
    return null;
  }
}
