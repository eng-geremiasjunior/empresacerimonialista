import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getFinanceiroEvento } from "@/lib/supabase/financeiro";
import { ResumoContrato } from "@/components/financeiro/ResumoContrato";
import { SecaoReceitas } from "@/components/financeiro/SecaoReceitas";
import { ListaDespesas } from "@/components/financeiro/ListaDespesas";

export default async function EventoFinanceiroPage({
  params,
}: {
  params: { id: string };
}) {
  const eventId = params.id;
  const supabase = createClient();
  const todayIso = format(new Date(), "yyyy-MM-dd");

  const [fin, linksRes] = await Promise.all([
    getFinanceiroEvento(eventId),
    supabase
      .from("roteiro_links")
      .select("supplier_id, suppliers(name)")
      .eq("event_id", eventId),
  ]);

  const suppliers = ((linksRes.data ?? []) as unknown as {
    supplier_id: string;
    suppliers: { name: string } | null;
  }[])
    .filter((l) => l.suppliers)
    .map((l) => ({ id: l.supplier_id, name: l.suppliers!.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {fin.migrationPendente && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          O módulo Financeiro precisa da migração{" "}
          <code>supabase/migrations/017_financeiro.sql</code> no SQL Editor do
          Supabase.
        </div>
      )}

      <ResumoContrato
        contrato={fin.contrato}
        recebido={fin.recebido}
        aReceber={fin.aReceber}
        despesas={fin.despesasTotal}
      />

      <SecaoReceitas
        eventId={eventId}
        receitas={fin.receitas}
        contractValue={fin.contrato}
        entradaRegistrada={fin.recebido}
        todayIso={todayIso}
      />

      <ListaDespesas
        eventId={eventId}
        despesas={fin.despesas}
        suppliers={suppliers}
        todayIso={todayIso}
      />
    </div>
  );
}
