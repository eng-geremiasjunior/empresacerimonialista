import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  TIPOS_CATALOGO,
  TIPO_DESCRICAO,
  TIPO_EMOJI,
  rotuloTipo,
} from "@/lib/catalogo";
import type { EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

// Índice do Catálogo: um cartão por tipo de evento. O conteúdo da proposta
// (pacotes, textos, fotos, imagens) é separado por tipo desde a migração
// 057 — antes era um só, e editar casamento mudava a proposta de batizado.
export default async function CatalogoPage() {
  const supabase = createClient();
  const { data: cargoData } = await supabase.rpc("meu_cargo");
  const cargo = (cargoData as { empresa_id: string; cargo: string }[] | null)?.[0];

  if (cargo?.cargo !== "proprietaria") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-gray-900">Catálogo</h1>
        <p className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Só a proprietária edita o conteúdo das propostas.
        </p>
      </div>
    );
  }

  // Quantos pacotes cada tipo já tem: é o sinal de "isto aqui está pronto
  // para enviar" na hora de bater o olho na lista.
  const { data: pacotes, error } = await supabase
    .from("empresa_pacotes")
    .select("tipo_evento")
    .eq("empresa_id", cargo.empresa_id);

  const faltaMigracao = Boolean(error);
  const contagem = new Map<string, number>();
  for (const p of (pacotes ?? []) as { tipo_evento: EventType }[]) {
    contagem.set(p.tipo_evento, (contagem.get(p.tipo_evento) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Catálogo</h1>
        <p className="text-sm text-gray-500">
          O conteúdo das propostas, separado por tipo de evento
        </p>
      </div>

      {faltaMigracao && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Catálogo por tipo de evento ainda não disponível. Execute{" "}
          <code>supabase/migrations/057_catalogo_por_tipo_evento.sql</code> no
          SQL Editor do Supabase.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {TIPOS_CATALOGO.map((tipo) => {
          const qtd = contagem.get(tipo) ?? 0;
          return (
            <Link
              key={tipo}
              href={`/catalogo/${tipo}`}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden>
                  {TIPO_EMOJI[tipo]}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-gray-900">
                    {rotuloTipo(tipo)}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {TIPO_DESCRICAO[tipo]}
                  </p>
                  <p className="mt-2 text-xs font-medium text-gray-400">
                    {qtd === 0
                      ? "Nenhum pacote ainda"
                      : `${qtd} ${qtd === 1 ? "pacote" : "pacotes"}`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
