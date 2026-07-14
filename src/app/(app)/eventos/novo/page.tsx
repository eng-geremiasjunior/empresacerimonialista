import { createClient } from "@/lib/supabase/server";
import { getMembrosSelecionaveis } from "@/lib/supabase/equipe";
import { EventWizard } from "@/components/wizard/EventWizard";
import type { ClientOption } from "@/components/wizard/StepCliente";

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams?: { cliente?: string };
}) {
  const supabase = createClient();

  const [{ data }, equipe] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, phone")
      .order("name", { ascending: true }),
    getMembrosSelecionaveis(),
  ]);

  const clients = (data ?? []) as ClientOption[];

  // Veio de /clientes/[id] → cliente já pré-selecionado.
  const preselectedId = searchParams?.cliente;
  const preselected =
    (preselectedId && clients.find((c) => c.id === preselectedId)) || null;

  return (
    <div className="mx-auto max-w-2xl">
      <EventWizard
        clients={clients}
        preselected={preselected}
        membros={equipe.membros}
        meuMembroId={equipe.meuMembroId}
      />
    </div>
  );
}
