import { createClient } from "@/lib/supabase/server";
import { getOrganizacao } from "@/lib/supabase/organizacao-query";
import { OrganizacaoEvento } from "@/components/organizacao/OrganizacaoEvento";
import { getPublico, getRecursos } from "@/lib/supabase/recursos";
import { TarefasDaFamilia } from "@/components/evento/DaFamilia";

export default async function EventoOrganizacaoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tarefa?: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const { data: ev } = await supabase
    .from("events")
    .select("date, type")
    .eq("id", eventId)
    .single();

  // Fornecedores da empresa (RLS já limita) para vincular ao compromisso.
  const { data: sups } = await supabase
    .from("suppliers")
    .select("id, name, whatsapp, phone")
    .order("name");

  const fornecedores = (sups ?? []).map((s) => ({
    id: s.id,
    nome: s.name,
    temWhatsapp: Boolean(s.whatsapp || s.phone),
  }));

  const organizacao = await getOrganizacao(eventId, ev?.date ?? null);

  // As quantidades entram AQUI, não só numa aba: quem coordena precisa
  // saber quantos doces e quantos salgados na mesma tela em que trabalha.
  const [recursos, publico, { data: daFamilia }] = await Promise.all([
    getRecursos(eventId),
    getPublico(eventId),
    // as tarefas que a família incluiu no portal v2 (179); sem a 179, vazio
    supabase
      .from("familia_tarefa")
      .select("id, titulo, quando, quem, feita_em, autor_nome")
      .eq("event_id", eventId)
      .order("quando", { ascending: true, nullsFirst: false }),
  ]);

  // "Hoje" nasce aqui, em Brasília, e desce como dado. A lista agrupa por
  // tempo, então a resposta muda a tela inteira — calcular nos dois lados
  // faria servidor e navegador discordarem depois das 21h.
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
    <OrganizacaoEvento
      inicial={organizacao}
      eventId={eventId}
      fornecedores={fornecedores}
      tarefaInicial={searchParams?.tarefa ?? null}
      hoje={hoje}
      tipoEvento={ev?.type ?? null}
      recursos={recursos}
      publico={publico}
    />
    <TarefasDaFamilia
      itens={((daFamilia ?? []) as { id: string; titulo: string; quando: string | null; quem: string | null; feita_em: string | null; autor_nome: string | null }[]).map((t) => ({
        id: t.id,
        titulo: t.titulo,
        quando: t.quando,
        quem: t.quem,
        feita: !!t.feita_em,
        autor: t.autor_nome,
      }))}
    />
    </>
  );
}
