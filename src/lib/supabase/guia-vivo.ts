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
    return {
      dispensadoEm: d.dispensado_em ?? null,
      concluidoEm: d.concluido_em ?? null,
      eventoId: d.evento_id ?? null,
      criouEvento: d.criou_evento === true,
      definiuContexto: d.definiu_contexto === true,
      decidiu: d.decidiu === true,
      tarefaNasceu: d.tarefa_nasceu === true,
      deuAndamento: d.deu_andamento === true,
    };
  } catch {
    return null;
  }
}
