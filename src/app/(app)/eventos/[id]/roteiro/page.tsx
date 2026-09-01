import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { RoteiroList } from "@/components/RoteiroList";
import { FilaSugestoes } from "@/components/cronograma/FilaSugestoes";
import { BotaoAlergia } from "@/components/cronograma/BotaoAlergia";
import { getSugestoesDoEvento } from "@/lib/supabase/programa-do-dia";
import {
  ChecklistDoDiaAjuste,
  type ItemChecklistAjuste,
} from "@/components/cronograma/ChecklistDoDiaAjuste";
import { getMembrosSelecionaveis } from "@/lib/supabase/equipe";
import { alergiaCompartilhavel } from "./alergia-actions";
import type { CronogramaItem } from "@/lib/cronograma";
import type { Supplier } from "@/lib/types";

export default async function RoteiroPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // A semeadura é lazy e por item: itens condicionais (igreja) entram
  // quando o objetivo ligar, na próxima abertura desta tela.
  await supabase.rpc("semear_checklist_dia", { p_event_id: params.id });

  const [
    { data: eventData },
    cronogramaResult,
    linksResult,
    sugestoes,
    alergia,
    alergiaCompartilhadaResult,
    liberacaoResult,
    checklistResult,
    membrosResult,
  ] = await Promise.all([
    // espacos(liberacao_montagem): a borda do dia agora mora no LUGAR
    // (129, preenchida pela extração do contrato do espaço) — o campo do
    // Planejamento continua valendo como fallback
    supabase
      .from("events")
      .select("id, date, espacos(liberacao_montagem)")
      .eq("id", params.id)
      .single(),
    // Leitura rica dos itens (status_novo, horários reais, responsável,
    // fornecedor + categoria) — mesma fonte usada no polling do client.
    supabase.rpc("cronograma_evento", { p_event_id: params.id }),
      supabase
        .from("roteiro_links")
        .select("supplier_id, hash, suppliers(id, name)")
        .eq("event_id", params.id),
      getSugestoesDoEvento(params.id),
      alergiaCompartilhavel(params.id),
      supabase
        .from("evento_alergia_compartilhada")
        .select("supplier_id")
        .eq("event_id", params.id),
      // a borda do dia: o horário em que o espaço libera para montagem
      // (campo tipado do Planejamento, 114) — alimenta o aviso de conflito
      supabase
        .from("evento_campo_valor")
        .select("valor_hora")
        .eq("event_id", params.id)
        .eq("codigo", "liberacao_fornecedores")
        .not("valor_hora", "is", null)
        .maybeSingle(),
      supabase
        .from("evento_checklist_dia")
        .select(
          "id, bloco, titulo, ordem, horario, ativo, template_id, responsavel_membro_id"
        )
        .eq("event_id", params.id)
        .order("bloco")
        .order("ordem"),
      getMembrosSelecionaveis(),
    ]);

  if (!eventData) {
    notFound();
  }

  const event = eventData as { id: string; date: string };

  const checklist: ItemChecklistAjuste[] = (
    (checklistResult.data ?? []) as {
      id: string;
      bloco: ItemChecklistAjuste["bloco"];
      titulo: string;
      ordem: number;
      horario: string | null;
      ativo: boolean;
      template_id: string | null;
      responsavel_membro_id: string | null;
    }[]
  ).map((i) => ({
    id: i.id,
    bloco: i.bloco,
    titulo: i.titulo,
    ordem: i.ordem,
    horario: i.horario,
    ativo: i.ativo,
    templateId: i.template_id,
    responsavelMembroId: i.responsavel_membro_id,
  }));
  const items = (cronogramaResult.data ?? []) as unknown as CronogramaItem[];

  const alergiaComSupplier = new Set(
    ((alergiaCompartilhadaResult.data ?? []) as { supplier_id: string }[]).map(
      (a) => a.supplier_id
    )
  );

  const linkRows = (linksResult.data ?? []) as unknown as {
    supplier_id: string;
    hash: string;
    suppliers: { id: string; name: string } | null;
  }[];

  // Só os fornecedores vinculados aparecem no select do item de roteiro.
  const suppliers: Supplier[] = linkRows
    .filter((l) => l.suppliers)
    .map(
      (l) =>
        ({
          id: l.suppliers!.id,
          name: l.suppliers!.name,
          category: null,
          phone: null,
        }) as Supplier
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      {cronogramaResult.error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Não foi possível carregar o cronograma agora. Recarregue a página em
          alguns instantes.
        </div>
      )}

      <FilaSugestoes
        eventId={event.id}
        sugestoes={sugestoes.filter((s) => s.estado === "pendente")}
        titulosPorItem={Object.fromEntries(
          items.map((i) => [i.id, i.title])
        )}
      />

      <RoteiroList
        eventId={event.id}
        eventDate={event.date}
        items={items}
        suppliers={suppliers}
        liberacaoEspaco={
          (() => {
            const esp = (eventData as unknown as {
              espacos?:
                | { liberacao_montagem: string | null }
                | { liberacao_montagem: string | null }[]
                | null;
            } | null)?.espacos;
            const doLugar = Array.isArray(esp)
              ? esp[0]?.liberacao_montagem
              : esp?.liberacao_montagem;
            return (
              doLugar ??
              (liberacaoResult.data as { valor_hora: string | null } | null)
                ?.valor_hora ??
              null
            );
          })()
        }
      />

      <ChecklistDoDiaAjuste
        eventId={event.id}
        itens={checklist}
        membros={membrosResult.membros.map((m) => ({ id: m.id, nome: m.nome }))}
      />

      {suppliers.length > 0 && (
        <section className="mt-10 print:hidden">
          <h2 className="text-base font-semibold">Links para fornecedores</h2>
          <p className="mt-1 text-sm text-stone-500">
            Envie o link para cada fornecedor: ele vê só os itens dele, sem
            precisar de login, atualiza o status em tempo real e a página se
            atualiza sozinha.
          </p>
          <ul className="mt-3 space-y-2">
            {linkRows
              .filter((l) => l.suppliers)
              .map((l) => (
                <li
                  key={l.supplier_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
                >
                  <span className="min-w-0 truncate font-medium">
                    {l.suppliers!.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <BotaoAlergia
                      eventId={event.id}
                      supplierId={l.supplier_id}
                      supplierNome={l.suppliers!.name}
                      compartilhado={alergiaComSupplier.has(l.supplier_id)}
                      texto={alergia.texto}
                      conferida={alergia.conferida}
                    />
                    <Link
                      href={`/eventos/${event.id}/comunicacao?fornecedor=${l.supplier_id}`}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400"
                    >
                      Contatar
                    </Link>
                    <CopyLinkButton
                      path={`/eventos/${event.id}/roteiro/publico/${l.hash}`}
                    />
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
