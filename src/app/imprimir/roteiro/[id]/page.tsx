import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import type { CronogramaItem } from "@/lib/cronograma";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A prancha do dia, em papel.
//
// Existe por um motivo de produto, não técnico: hoje a cerimonialista
// leva folhas A4 numa prancha. Se ela larga o papel e se queima uma vez
// — sinal ruim no sítio, celular sem bateria, tela quebrada —, ela volta
// para o papel e o Vela perde a usuária inteira, não o recurso. Imprimir
// na véspera é o mesmo gesto que ela já faz, e custa uma rota.
//
// Rota própria, fora do layout do evento, para o papel sair limpo —
// mesmo padrão das folhas de mesas. Sessão exigida pelo middleware; a
// RLS decide o que esta conta enxerga.

const BLOCOS: { key: string; label: string }[] = [
  { key: "montagem", label: "Montagem" },
  { key: "colacao", label: "Colação" },
  { key: "cerimonia", label: "Cerimônia" },
  { key: "recepcao", label: "Recepção" },
  { key: "desmontagem", label: "Desmontagem" },
];

function hora(t: string | null): string {
  return t ? t.slice(0, 5) : "—";
}

export default async function ImprimirRoteiroPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: eventData }, cronogramaResult, { data: checklistData }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, date, type, name, location, city, clients(name)")
        .eq("id", params.id)
        .single(),
      supabase.rpc("cronograma_evento", { p_event_id: params.id }),
      supabase
        .from("evento_checklist_dia")
        .select("id, bloco, titulo, horario, ordem, ativo")
        .eq("event_id", params.id)
        .eq("ativo", true)
        .order("bloco")
        .order("ordem"),
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

  const itens = (cronogramaResult.data ?? []) as unknown as CronogramaItem[];
  const checklist = (checklistData ?? []) as {
    id: string;
    bloco: string;
    titulo: string;
    horario: string | null;
  }[];

  const titulo =
    ev.name ??
    [EVENT_TYPE_LABELS[ev.type] ?? "Evento", ev.clients?.name]
      .filter(Boolean)
      .join(" — ");
  const local = [ev.location, ev.city].filter(Boolean).join(" · ");

  return (
    <div className="imp-pagina">
      <div className="imp-acoes">
        <BotaoImprimir />
        <span style={{ fontSize: 12, color: "#78716c" }}>
          Leve na prancha: se faltar sinal no local, o papel continua valendo.
        </span>
      </div>

      <div className="imp-cabecalho">
        <div className="imp-titulo">{titulo}</div>
        <div className="imp-sub">
          {formatDate(ev.date)}
          {local ? ` · ${local}` : ""}
        </div>
      </div>

      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "#57534e" }}>
          Nenhum item no roteiro ainda.
        </p>
      ) : (
        <table className="imp-tabela">
          <thead>
            <tr>
              <th style={{ width: 58 }}>Hora</th>
              <th>Item</th>
              <th style={{ width: 150 }}>Fornecedor</th>
              <th style={{ width: 130 }}>Responsável</th>
              {/* A coluna vazia é para ela riscar à caneta, como faz hoje */}
              <th style={{ width: 26 }}>OK</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="imp-mesa-num">{hora(i.time)}</td>
                <td>
                  <strong>{i.title}</strong>
                  {i.description ? (
                    <div style={{ fontSize: 11.5, color: "#57534e", marginTop: 2 }}>
                      {i.description}
                    </div>
                  ) : null}
                </td>
                <td>
                  {i.supplier_name ?? "—"}
                  {i.responsavel_telefone ? (
                    <div style={{ fontSize: 11, color: "#57534e" }}>
                      {i.responsavel_telefone}
                    </div>
                  ) : null}
                </td>
                <td>{i.responsavel_nome ?? "—"}</td>
                <td style={{ borderLeft: "1px solid #e7e5e4" }}> </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {checklist.length > 0 && (
        <>
          <div
            className="imp-cabecalho"
            style={{ marginTop: 24, borderBottomWidth: 1 }}
          >
            <div className="imp-titulo" style={{ fontSize: 15 }}>
              Checklist do dia
            </div>
          </div>
          <div className="imp-duas-colunas">
            {BLOCOS.map((b) => {
              const doBloco = checklist.filter((c) => c.bloco === b.key);
              if (doBloco.length === 0) return null;
              return (
                <table key={b.key} className="imp-tabela" style={{ marginBottom: 14 }}>
                  <thead>
                    <tr>
                      <th colSpan={3}>{b.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doBloco.map((c) => (
                      <tr key={c.id}>
                        <td className="imp-mesa-num" style={{ width: 46 }}>
                          {hora(c.horario)}
                        </td>
                        <td>{c.titulo}</td>
                        <td
                          style={{ width: 22, borderLeft: "1px solid #e7e5e4" }}
                        >
                          {" "}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })}
          </div>
        </>
      )}

      <div className="imp-rodape">
        Impresso do Vela · {formatDate(ev.date)} · confira a versão na tela
        antes do evento, o roteiro pode ter mudado.
      </div>
    </div>
  );
}
