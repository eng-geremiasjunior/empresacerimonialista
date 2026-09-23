import { createClient } from "@/lib/supabase/server";
import { getMembrosSelecionaveis } from "@/lib/supabase/equipe";
import { EventWizard } from "@/components/wizard/EventWizard";
import type { ClientOption } from "@/components/wizard/StepCliente";
import { BannerNoLimite } from "@/components/planos/BannerNoLimite";
import { dadosDoBanner } from "@/lib/planos-banner";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { situacaoDoPlano } from "@/app/(app)/planos-actions";

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams?: { cliente?: string };
}) {
  const supabase = createClient();

  // O limite do plano (23/09/2026): no teto, a porta do "Novo evento" é a
  // tela de planos — antes de ela preencher o assistente inteiro para
  // ouvir o "não" no último clique. A régua é a do banco (154).
  const { cargo, empresaId } = await getMeuCargo();
  if (empresaId) {
    const { data: pode } = await supabase.rpc("pode_criar_evento", { p_empresa_id: empresaId });
    if (pode === false) {
      const [dados, s] = await Promise.all([dadosDoBanner(), situacaoDoPlano()]);
      const planoAtual = s?.planoAtual ?? "gratuito";
      const mensagem =
        planoAtual === "gratuito"
          ? "O plano Gratuito é para 1 evento."
          : `Seu plano chegou a ${s?.eventos ?? ""} eventos.`;
      return (
        <BannerNoLimite dados={dados} planoAtual={planoAtual} mensagem={mensagem} ehDona={cargo === "proprietaria"} />
      );
    }
  }

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
