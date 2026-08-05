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

  const organizacao = await getOrganizacao(eventId, ev?.date ?? null);

  return <OrganizacaoEvento inicial={organizacao} />;
}
