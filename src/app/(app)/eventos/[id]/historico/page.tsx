import { createClient } from "@/lib/supabase/server";
import { ActivityIcon } from "@/components/ActivityIcon";
import { relativeTime, type ActivityCategory } from "@/lib/activity";

type Row = {
  id: string;
  category: ActivityCategory;
  title: string;
  description: string | null;
  created_at: string;
};

export default async function EventoHistoricoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const now = new Date();

  const { data } = await supabase
    .from("activities")
    .select("id, category, title, description, created_at")
    .eq("event_id", params.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-stone-700">
        Histórico do evento
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-white p-10 text-center text-stone-600">
          Nada registrado ainda. As ações deste evento aparecerão aqui.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            return (
              <li
                key={row.id}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <ActivityIcon category={row.category} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    {row.title}
                  </p>
                  {row.description && (
                    <p className="text-sm text-stone-500">{row.description}</p>
                  )}
                  <p className="mt-0.5 text-xs text-stone-400">
                    {relativeTime(row.created_at, now)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
