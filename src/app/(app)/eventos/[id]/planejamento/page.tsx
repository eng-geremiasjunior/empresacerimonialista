import { createClient } from "@/lib/supabase/server";
import { getPlanejamento } from "@/lib/supabase/planejamento";
import { PlanejamentoEvento } from "@/components/planejamento/PlanejamentoEvento";
import { TemaNeutro } from "@/components/planejamento/TemaNeutro";
import type { Arquetipos } from "@/components/planejamento/celebra";
import type { NotaDoCaderno, ReuniaoDoCaderno } from "./caderno-actions";

export default async function EventoPlanejamentoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { decisao?: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const [{ data: ev }, { data: sups }] = await Promise.all([
    // escala/cenario = arquétipo do evento (chips editáveis da faixa de
    // contexto); a data alimenta os prazos relativos.
    supabase
      .from("events")
      .select("type, date, escala, cenario, location, city, clients(name)")
      .eq("id", eventId)
      .single(),
    // para os campos tipo "fornecedor" das decisões de contratar
    supabase.from("suppliers").select("id, name").order("name"),
  ]);

  const tipoEvento = (ev?.type as string) ?? "casamento";

  const [planejamento, { data: arqs }, { data: cargo }] = await Promise.all([
    getPlanejamento(eventId, ev?.date ?? null),
    // opções dos chips escala/cenário: as do método deste tipo, na ordem
    // do seed — a debutante deixa de ver "Mini wedding"
    supabase
      .from("metodo_arquetipo")
      .select("eixo, codigo, nome, ordem")
      .eq("tipo_evento", tipoEvento)
      .order("ordem"),
    // só a proprietária vê "Salvar como meu modelo" (a função do banco
    // confere de novo)
    supabase.rpc("meu_cargo").maybeSingle(),
  ]);

  const arquetipos: Arquetipos = { escala: [], cenario: [] };
  for (const a of (arqs ?? []) as { eixo: string; codigo: string; nome: string }[]) {
    if (a.eixo === "escala" || a.eixo === "cenario")
      arquetipos[a.eixo].push({ valor: a.codigo, rotulo: a.nome });
  }

  // o Caderno (172): as anotações dela e as reuniões do evento. Sem a
  // 172 aplicada, a nota ainda não sabe mês/decisão/reunião — cai no
  // mês em que foi escrita.
  const colunasNota = "id, content, created_at, mes, evento_decisao_id, compromisso_id";
  let notasRes = await supabase
    .from("event_notes")
    .select(colunasNota)
    .eq("event_id", eventId)
    .order("created_at");
  if (notasRes.error) {
    notasRes = (await supabase
      .from("event_notes")
      .select("id, content, created_at")
      .eq("event_id", eventId)
      .order("created_at")) as unknown as typeof notasRes;
  }
  const notas: NotaDoCaderno[] = ((notasRes.data ?? []) as {
    id: string;
    content: string;
    created_at: string;
    mes?: string | null;
    evento_decisao_id?: string | null;
    compromisso_id?: string | null;
  }[]).map((n) => ({
    id: n.id,
    texto: n.content,
    criadaEm: n.created_at,
    mes: n.mes ?? null,
    decisaoId: n.evento_decisao_id ?? null,
    reuniaoId: n.compromisso_id ?? null,
  }));
  const { data: comp } = await supabase
    .from("compromisso")
    .select("id, titulo, data, hora, local, estado")
    .eq("event_id", eventId)
    .neq("estado", "cancelado")
    .order("data");
  const reunioes: ReuniaoDoCaderno[] = ((comp ?? []) as {
    id: string;
    titulo: string;
    data: string;
    hora: string | null;
    local: string | null;
  }[]).map((r) => ({ id: r.id, titulo: r.titulo, data: r.data, hora: r.hora, local: r.local }));

  const cliente = (
    ev as unknown as { clients: { name: string } | null } | null
  )?.clients;

  return (
    <>
      <TemaNeutro />
      <PlanejamentoEvento
        eventId={eventId}
        inicial={planejamento}
        suppliers={sups ?? []}
        decisaoInicial={searchParams?.decisao ?? null}
        escala={ev?.escala ?? null}
        cenario={ev?.cenario ?? null}
        arquetipos={arquetipos}
        clienteNome={cliente?.name ?? null}
        tipoEvento={tipoEvento}
        localEvento={ev?.location ?? ev?.city ?? null}
        caderno={{ notas, reunioes }}
        podeSalvarModelo={(cargo as { cargo?: string } | null)?.cargo === "proprietaria"}
      />
    </>
  );
}
