import { createClient } from "@/lib/supabase/server";
import { getOrganizacao } from "@/lib/supabase/organizacao-query";
import { OrganizacaoEvento } from "@/components/organizacao/OrganizacaoEvento";

export default async function EventoOrganizacaoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  const { data: ev } = await supabase
    .from("events")
    .select("date")
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

  return (
    <OrganizacaoEvento
      inicial={organizacao}
      eventId={eventId}
      fornecedores={fornecedores}
    />
  );
}
