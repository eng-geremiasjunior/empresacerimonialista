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

  const [{ data }, equipe, { data: arqs }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, phone")
      .order("name", { ascending: true }),
    getMembrosSelecionaveis(),
    // subtipo por tipo (eixo cenario do método) — o wizard só pergunta a
    // quem tem
    supabase
      .from("metodo_arquetipo")
      .select("tipo_evento, codigo, nome, ordem")
      .eq("eixo", "cenario")
      .order("ordem"),
  ]);

  const clients = (data ?? []) as ClientOption[];

  const cenarios: Record<string, { valor: string; rotulo: string }[]> = {};
  for (const a of (arqs ?? []) as {
    tipo_evento: string;
    codigo: string;
    nome: string;
  }[]) {
    (cenarios[a.tipo_evento] ??= []).push({ valor: a.codigo, rotulo: a.nome });
  }

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
        cenarios={cenarios}
      />
    </div>
  );
}
