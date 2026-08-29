import { createClient } from "@/lib/supabase/server";
import { getOrganizacao } from "@/lib/supabase/organizacao-query";
import { OrganizacaoEvento } from "@/components/organizacao/OrganizacaoEvento";
import { getPublico, getRecursos } from "@/lib/supabase/recursos";

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
  const [recursos, publico] = await Promise.all([
    getRecursos(eventId),
    getPublico(eventId),
  ]);

  // "Hoje" nasce aqui, em Brasília, e desce como dado. A lista agrupa por
  // tempo, então a resposta muda a tela inteira — calcular nos dois lados
  // faria servidor e navegador discordarem depois das 21h.
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  return (
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
  );
}
