// Reuniões do evento (21/10/2026, fase 3 do plano "IA que trabalha"):
// antes, a pauta (regra, sem IA); depois, a conversa vira ata, decisões,
// tarefas e horários. Só para quem tem a IA nova liberada (contas da
// casa, até o dono ligar "para todos").

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estadoDaIa } from "@/lib/ia-ajustes";
import { hojeBR } from "@/lib/tempo";
import { lembreteDaReuniao, pautaDaReuniao } from "@/lib/ia-reuniao";
import { lerContextoDaReuniao, lerReunioes } from "@/lib/supabase/ia-reuniao-dados";
import { ReunioesDoEvento } from "@/components/eventos/ReunioesDoEvento";

export const dynamic = "force-dynamic";

export default async function ReunioesPage({ params }: { params: { id: string } }) {
  const ia = await estadoDaIa();
  if (!ia.liberada) notFound();

  const supabase = createClient();
  const hoje = hojeBR();
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [contexto, reunioes, cliente, ultimo] = await Promise.all([
    lerContextoDaReuniao(supabase, params.id, hoje),
    lerReunioes(supabase, params.id),
    supabase.from("events").select("clients(phone, whatsapp)").eq("id", params.id).maybeSingle(),
    supabase
      .from("ia_trabalho")
      .select("id")
      .eq("event_id", params.id)
      .eq("tipo", "registrar_reuniao")
      .eq("estado", "confirmado")
      .gte("confirmado_em", desde)
      .order("confirmado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!contexto) notFound();

  const c = (cliente.data as unknown as { clients: { phone: string | null; whatsapp: string | null } | { phone: string | null; whatsapp: string | null }[] | null } | null)
    ?.clients;
  const cli = Array.isArray(c) ? c[0] : c;
  const proxima = reunioes.find((r) => r.data >= hoje) ?? null;
  const pauta = pautaDaReuniao(contexto);

  return (
    <ReunioesDoEvento
      eventId={params.id}
      hoje={hoje}
      reunioes={reunioes}
      proximaId={proxima?.id ?? null}
      pauta={pauta}
      lembrete={proxima ? lembreteDaReuniao(contexto, proxima, pauta) : null}
      telefone={cli?.whatsapp ?? cli?.phone ?? null}
      aviso={ia.aviso}
      desfazivel={(ultimo.data as { id: string } | null)?.id ?? null}
    />
  );
}
