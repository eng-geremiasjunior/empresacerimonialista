import { TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  FornecedorRow,
  type ConfirmacaoInfo,
} from "@/components/fornecedores/FornecedorRow";
import { ConfigAntecedencia } from "@/components/fornecedores/ConfigAntecedencia";
import { AdicionarFornecedorButton } from "@/components/fornecedores/AdicionarFornecedorButton";

type LinkRow = {
  supplier_id: string;
  confirmed: boolean;
  suppliers: {
    name: string;
    category: string | null;
    email?: string | null;
  } | null;
};

export default async function EventoFornecedoresPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const eventId = params.id;

  // Tenta o formato pós-migração 019 (com e-mail e confirmações); se as
  // colunas/tabela não existirem, degrada para o formato antigo com aviso.
  let migrationPendente = false;

  const res = await supabase
    .from("roteiro_links")
    .select("supplier_id, confirmed, suppliers(name, category, email)")
    .eq("event_id", eventId);

  let data: unknown = res.data;
  if (res.error && (res.error.code === "42703" || res.error.code === "PGRST200")) {
    migrationPendente = true;
    const fallback = await supabase
      .from("roteiro_links")
      .select("supplier_id, confirmed, suppliers(name, category)")
      .eq("event_id", eventId);
    data = fallback.data;
  }

  const links = ((data ?? []) as unknown as LinkRow[]).sort((a, b) =>
    (a.suppliers?.name ?? "").localeCompare(b.suppliers?.name ?? "")
  );

  // Confirmações por fornecedor + configuração de antecedência
  const confirmacoes = new Map<string, ConfirmacaoInfo>();
  let diasAntes = 7;

  if (!migrationPendente) {
    const [confRes, evRes] = await Promise.all([
      supabase
        .from("supplier_confirmations")
        .select("supplier_id, status, sent_at, responded_at")
        .eq("event_id", eventId),
      supabase
        .from("events")
        .select("confirmation_days_before")
        .eq("id", eventId)
        .single(),
    ]);

    if (
      confRes.error &&
      (confRes.error.code === "42P01" || confRes.error.code === "42703")
    ) {
      migrationPendente = true;
    } else {
      for (const c of confRes.data ?? []) {
        confirmacoes.set(c.supplier_id, {
          status: c.status,
          sent_at: c.sent_at,
          responded_at: c.responded_at,
        });
      }
      diasAntes = evRes.data?.confirmation_days_before ?? 7;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">
            Fornecedores do evento
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Vincule fornecedores do seu cadastro global. O e-mail habilita o
            convite de confirmação — a resposta alimenta a Saúde do Evento.
          </p>
        </div>
        {links.length > 0 && <AdicionarFornecedorButton eventId={eventId} />}
      </div>

      {migrationPendente && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          <p>
            A confirmação por e-mail precisa da migração{" "}
            <code className="font-mono text-xs">
              019_confirmacao_fornecedores.sql
            </code>{" "}
            — execute-a no SQL Editor do Supabase para ativar o recurso.
          </p>
        </div>
      )}

      {!migrationPendente && links.length > 0 && (
        <ConfigAntecedencia eventId={eventId} diasAtual={diasAntes} />
      )}

      {links.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center text-gray-600">
          <p>Nenhum fornecedor vinculado ainda.</p>
          <p className="mt-1 text-sm text-gray-500">
            Busque no seu cadastro global e vincule ao evento.
          </p>
          <div className="mt-4 flex justify-center">
            <AdicionarFornecedorButton
              eventId={eventId}
              label="Adicionar primeiro fornecedor"
            />
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <FornecedorRow
              key={link.supplier_id}
              eventId={eventId}
              supplierId={link.supplier_id}
              name={link.suppliers?.name ?? "Fornecedor"}
              category={link.suppliers?.category ?? null}
              email={link.suppliers?.email ?? null}
              confirmed={link.confirmed}
              confirmacao={confirmacoes.get(link.supplier_id) ?? null}
              emailDisponivel={!migrationPendente}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
