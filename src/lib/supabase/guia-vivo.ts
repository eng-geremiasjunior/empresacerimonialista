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
import { contextoNaTela, type EstadoDoGuia } from "@/lib/guia-vivo";
import { hojeBR } from "@/lib/tempo";
import { rotuloDoCampo } from "@/lib/planejamento-shared";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";

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
    let definiuContexto = d.definiu_contexto === true;
    let evento: EstadoDoGuia["evento"] = null;
    let faltaNoContexto: string[] = [];
    let sugestoes: EstadoDoGuia["sugestoes"] = [];
    let semDecisaoComTarefa = false;
    if (d.evento_id && !d.dispensado_em && !d.concluido_em) {
      const [obj, conv, tar, ev, forn, resp] = await Promise.all([
        supabase.from("evento_objetivo").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("evento_convidado").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("event_id", d.evento_id),
        supabase.from("events").select("date, name, type, escala, cenario, clients(name)").eq("id", d.evento_id).maybeSingle(),
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
      const linha = ev.data as {
        date?: string | null;
        name?: string | null;
        type?: string | null;
        escala?: string | null;
        cenario?: string | null;
        clients?: { name?: string | null } | null;
      } | null;
      const dataDoEvento = linha?.date ?? null;
      diasAteOEvento = dataDoEvento ? diasEntre(hojeBR(), dataDoEvento.slice(0, 10)) : null;
      temFornecedor = !forn.error && (forn.count ?? 0) > 0;
      temResponsavel = !resp.error && (resp.count ?? 0) > 0;
      if (linha) {
        // o título do cabeçalho do evento (eventos/[id]/layout.tsx)
        const tipo = linha.type
          ? (EVENT_TYPE_LABELS[linha.type as EventType] ?? linha.type)
          : null;
        const titulo =
          linha.name?.trim() ||
          [tipo, linha.clients?.name?.trim()].filter(Boolean).join(" — ") ||
          null;
        evento = { titulo, tipo };
      }

      // PASSO 2 pelo que a tela oferece (contextoNaTela). Leitura com
      // erro: vale o fato da 160.
      if (!definiuContexto && temMetodo && linha?.type) {
        const [campos, opcoes] = await Promise.all([
          supabase
            .from("evento_campo_valor")
            .select("codigo, label")
            .eq("event_id", d.evento_id)
            .in("codigo", ["escala", "cenario"]),
          supabase.from("metodo_arquetipo").select("eixo").eq("tipo_evento", linha.type),
        ]);
        if (!campos.error && !opcoes.error) {
          const r = contextoNaTela({
            rotulos: new Map(
              (campos.data ?? []).map((c) => [c.codigo as string, rotuloDoCampo(c.codigo, c.label)])
            ),
            eixosComOpcoes: new Set((opcoes.data ?? []).map((o) => o.eixo as string)),
            escala: linha.escala ?? null,
            cenario: linha.cenario ?? null,
          });
          definiuContexto = r.definiu;
          faltaNoContexto = r.falta;
        }
      }

      // PASSO DA DECISÃO: as pendentes que criam tarefa (molde com tarefa em
      // metodo_tarefa), dos objetivos ligados, pelo prazo mais próximo. Só
      // quando o passo é esse. Leitura com erro = sem lista (o cartão usa o
      // texto sem lista), nunca o atalho que termina o guia.
      if (temMetodo && definiuContexto && !d.tarefa_nasceu) {
        const [objs, decs] = await Promise.all([
          supabase.from("evento_objetivo").select("id").eq("event_id", d.evento_id).eq("ativo", true),
          supabase
            .from("evento_decisao")
            .select("id, titulo, decisao_template_id, evento_objetivo_id")
            .eq("event_id", d.evento_id)
            .eq("estado", "pendente")
            .not("decisao_template_id", "is", null)
            .order("prazo_previsto", { ascending: true, nullsFirst: false })
            .order("ordem", { ascending: true })
            .limit(300),
        ]);
        if (!objs.error && !decs.error) {
          const ligados = new Set((objs.data ?? []).map((o) => o.id as string));
          const candidatas = (decs.data ?? []).filter((x) =>
            ligados.has(x.evento_objetivo_id as string)
          );
          const modelos = [...new Set(candidatas.map((x) => x.decisao_template_id as string))];
          let comTarefa = new Set<string>();
          let leu = true;
          if (modelos.length > 0) {
            const mt = await supabase
              .from("metodo_tarefa")
              .select("decisao_id")
              .in("decisao_id", modelos);
            if (mt.error) leu = false;
            else comTarefa = new Set((mt.data ?? []).map((x) => x.decisao_id as string));
          }
          if (leu) {
            const criam = candidatas.filter((x) =>
              comTarefa.has(x.decisao_template_id as string)
            );
            sugestoes = criam
              .slice(0, 3)
              .map((x) => ({ id: x.id as string, titulo: x.titulo as string }));
            semDecisaoComTarefa = criam.length === 0;
          }
        }
      }
    }

    // O EVENTO DE EXEMPLO (174) abre o caminho antes de ela criar o dela
    // (guia-vivo.ts, PASSO_EXEMPLO). Só com o guia vivo e só antes do
    // evento dela: depois disso, nenhuma consulta a mais por navegação.
    // Leitura pela sessão (a RLS mostra os eventos da empresa); falhar
    // aqui é o mesmo que não ter exemplo — o guia começa como antes.
    let exemplo: EstadoDoGuia["exemplo"] = null;
    if (!d.criou_evento && !d.dispensado_em && !d.concluido_em) {
      const ex = await supabase
        .from("events")
        .select("id, exemplo_visto")
        .eq("exemplo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ex.error && ex.data) {
        const linha = ex.data as { id: string; exemplo_visto?: string[] | null };
        exemplo = { id: linha.id, viuRoteiro: (linha.exemplo_visto ?? []).includes("roteiro") };
      }
    }

    return {
      exemplo,
      dispensadoEm: d.dispensado_em ?? null,
      concluidoEm: d.concluido_em ?? null,
      eventoId: d.evento_id ?? null,
      criouEvento: d.criou_evento === true,
      definiuContexto,
      decidiu: d.decidiu === true,
      tarefaNasceu: d.tarefa_nasceu === true,
      deuAndamento: d.deu_andamento === true,
      temMetodo,
      temConvidado,
      temTarefa,
      diasAteOEvento,
      temFornecedor,
      temResponsavel,
      evento,
      faltaNoContexto,
      sugestoes,
      semDecisaoComTarefa,
    };
  } catch {
    return null;
  }
}
