// Preparar a semana do evento (21/10/2026, T2 do plano "IA que trabalha").
// Só para quem tem a IA nova liberada (contas da casa, até o dono ligar
// "para todos"). Mostra o último pacote dos últimos 3 dias, ou o botão.

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { estadoDaIa } from "@/lib/ia-ajustes";
import { hojeBR } from "@/lib/tempo";
import { PrepararSemana } from "@/components/eventos/PrepararSemana";
import type { PacoteDaSemana } from "@/lib/ia-semana";

export const dynamic = "force-dynamic";

export default async function SemanaPage({ params }: { params: { id: string } }) {
  const ia = await estadoDaIa();
  if (!ia.liberada) notFound();

  const supabase = createClient();
  const { data: ev } = await supabase.from("events").select("id, date").eq("id", params.id).maybeSingle();
  if (!ev) notFound();
  const evento = ev as { id: string; date: string };

  const desde = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: ultimo } = await supabase
    .from("ia_trabalho")
    .select("id, estado, pacote, created_at, confirmado_em, resultado")
    .eq("event_id", params.id)
    .eq("tipo", "preparar_semana")
    .in("estado", ["pronto", "confirmado"])
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const u = ultimo as {
    id: string;
    estado: "pronto" | "confirmado";
    pacote: PacoteDaSemana;
    created_at: string;
    confirmado_em: string | null;
    resultado: { criadas?: string[] } | null;
  } | null;

  const dias = Math.round((Date.parse(`${evento.date}T00:00:00Z`) - Date.parse(`${hojeBR()}T00:00:00Z`)) / 86_400_000);

  return (
    <PrepararSemana
      eventId={evento.id}
      dias={dias}
      aviso={ia.aviso}
      inicial={
        u
          ? {
              trabalhoId: u.id,
              pacote: u.pacote,
              criadas: u.estado === "confirmado" ? (u.resultado?.criadas?.length ?? 0) : null,
              desfazivel: u.estado === "confirmado" && !!u.confirmado_em && Date.now() - Date.parse(u.confirmado_em) < 24 * 3600 * 1000,
            }
          : null
      }
    />
  );
}
