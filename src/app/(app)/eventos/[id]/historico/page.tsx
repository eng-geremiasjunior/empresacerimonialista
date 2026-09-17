// O histórico do evento: o que mudou, quando e quem fez.
//
// Até 16/09/2026 o gatilho da 008 gravava "Evento atualizado" a cada
// update, sem dizer o quê nem quem (450 linhas assim). Desde a 166, cada
// linha traz o que mudou (uma linha por campo), e o autor. As linhas
// antigas vazias não viram cartão: somem da lista, e o rodapé diz quantas
// eram — para ninguém achar que o histórico perdeu registro.

import { createClient } from "@/lib/supabase/server";
import { ActivityIcon } from "@/components/ActivityIcon";
import type { ActivityCategory } from "@/lib/activity";

type Row = {
  id: string;
  category: ActivityCategory;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
  /** da 166; ausente antes dela */
  autor?: string | null;
};

const LEITURA = 300;
const NA_TELA = 100;

/** "16/09/2026 às 09:12", em Brasília — o servidor roda em UTC. */
function quando(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${dia} às ${hora}`;
}

function quem(autor: string | null | undefined): string | null {
  if (!autor) return null;
  return autor === "Sistema" ? "pelo sistema" : `por ${autor}`;
}

/** A atualização antiga, sem dizer o que mudou. */
const vazia = (r: Row) => r.type === "evento_editado" && !r.description?.trim();

export default async function EventoHistoricoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  // todas as colunas: `autor` só existe com a 166 aplicada, e pedi-la pelo
  // nome derrubaria a aba antes disso
  const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("event_id", params.id)
    .order("created_at", { ascending: false })
    .limit(LEITURA);

  const todas = (data ?? []) as Row[];
  const antigas = todas.filter(vazia).length;
  const rows = todas.filter((r) => !vazia(r)).slice(0, NA_TELA);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-stone-700">Histórico do evento</h2>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-10 text-center text-stone-600">
          Nada registrado ainda. As mudanças deste evento aparecerão aqui.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const linhas = (row.description ?? "")
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            const autor = quem(row.autor);
            return (
              <li
                key={row.id}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <ActivityIcon category={row.category} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">{row.title}</p>
                  {linhas.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {linhas.map((l, i) => (
                        <li key={i} className="break-words text-sm text-stone-600">
                          {l}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1 text-xs text-stone-500">
                    {quando(row.created_at)}
                    {autor ? ` · ${autor}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {antigas > 0 && (
        <p className="text-xs text-stone-400">
          {antigas === 1
            ? "Mais 1 atualização antiga, registrada sem dizer o que mudou."
            : `Mais ${antigas} atualizações antigas, registradas sem dizer o que mudou.`}
        </p>
      )}
    </div>
  );
}
