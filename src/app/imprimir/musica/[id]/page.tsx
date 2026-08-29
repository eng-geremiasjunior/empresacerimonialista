import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A folha do DJ.
//
// O que o casal aprovou no convite (as sugestões dos convidados) mais o
// que já estava no Planejamento: a playlist, a primeira dança e — o
// mais importante — o que NÃO pode tocar. Esse último dado existe no
// sistema desde o método e nunca tinha saído dele.
//
// Rota interna: sessão exigida pelo middleware, RLS decide o resto.

type Campo = { codigo: string; valor_texto: string | null };

export default async function ImprimirMusicaPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: eventData }, { data: musicas }, { data: campos }] = await Promise.all([
    supabase
      .from("events")
      .select("id, date, type, name, location, city, clients(name)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("evento_musica")
      .select("titulo, artista, sugerida_por")
      .eq("event_id", params.id)
      .eq("estado", "aprovada")
      .order("created_at"),
    supabase
      .from("evento_campo_valor")
      .select("codigo, valor_texto")
      .eq("event_id", params.id)
      .in("codigo", [
        "playlist",
        "lista_veto",
        "musica_primeira_danca",
        "lista_musicas",
        "deb_parabens_musica",
        "deb_valsa_musica",
      ]),
  ]);

  if (!eventData) notFound();

  const ev = eventData as unknown as {
    id: string;
    date: string;
    type: keyof typeof EVENT_TYPE_LABELS;
    name: string | null;
    location: string | null;
    city: string | null;
    clients: { name: string } | null;
  };

  const doMetodo = new Map(
    ((campos ?? []) as Campo[])
      .filter((c) => c.valor_texto?.trim())
      .map((c) => [c.codigo, c.valor_texto as string])
  );
  const aprovadas = (musicas ?? []) as {
    titulo: string;
    artista: string | null;
    sugerida_por: string | null;
  }[];

  const titulo =
    ev.name ??
    [EVENT_TYPE_LABELS[ev.type] ?? "Evento", ev.clients?.name].filter(Boolean).join(" — ");
  const local = [ev.location, ev.city].filter(Boolean).join(" · ");

  const blocos: { rotulo: string; texto: string }[] = [
    { rotulo: "Primeira dança", texto: doMetodo.get("musica_primeira_danca") ?? "" },
    { rotulo: "Valsa", texto: doMetodo.get("deb_valsa_musica") ?? "" },
    { rotulo: "Parabéns", texto: doMetodo.get("deb_parabens_musica") ?? "" },
    { rotulo: "Cerimônia", texto: doMetodo.get("lista_musicas") ?? "" },
    { rotulo: "Playlist da festa", texto: doMetodo.get("playlist") ?? "" },
  ].filter((b) => b.texto.trim());

  const veto = doMetodo.get("lista_veto");

  return (
    <div className="imp-pagina">
      <div className="imp-acoes">
        <BotaoImprimir />
        <span style={{ fontSize: 12, color: "#78716c" }}>
          A folha do som: o que tocar, e o que não tocar.
        </span>
      </div>

      <div className="imp-cabecalho">
        <div className="imp-titulo">Música — {titulo}</div>
        <div className="imp-sub">
          {formatDate(ev.date)}
          {local ? ` · ${local}` : ""}
        </div>
      </div>

      {veto && (
        <table className="imp-tabela" style={{ marginBottom: 18 }}>
          <thead>
            <tr>
              <th>O que NÃO pode tocar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>{veto}</td>
            </tr>
          </tbody>
        </table>
      )}

      {blocos.length > 0 && (
        <table className="imp-tabela" style={{ marginBottom: 18 }}>
          <thead>
            <tr>
              <th style={{ width: 150 }}>Momento</th>
              <th>Música</th>
            </tr>
          </thead>
          <tbody>
            {blocos.map((b) => (
              <tr key={b.rotulo}>
                <td className="imp-mesa-num">{b.rotulo}</td>
                <td>{b.texto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {aprovadas.length > 0 && (
        <table className="imp-tabela">
          <thead>
            <tr>
              <th colSpan={2}>
                Pedidos dos convidados aprovados pelo casal ({aprovadas.length})
              </th>
            </tr>
          </thead>
          <tbody>
            {aprovadas.map((m, i) => (
              <tr key={i}>
                <td className="imp-mesa-num" style={{ width: 34 }}>
                  {i + 1}
                </td>
                <td>
                  <strong>{m.titulo}</strong>
                  {m.artista ? ` · ${m.artista}` : ""}
                  {m.sugerida_por && (
                    <div style={{ fontSize: 11.5, color: "#57534e", marginTop: 2 }}>
                      pedido de {m.sugerida_por}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {blocos.length === 0 && aprovadas.length === 0 && !veto && (
        <p style={{ fontSize: 13, color: "#57534e" }}>
          Nada definido ainda. A playlist e o que não pode tocar vêm do
          Planejamento; os pedidos dos convidados chegam pelo convite.
        </p>
      )}
    </div>
  );
}
