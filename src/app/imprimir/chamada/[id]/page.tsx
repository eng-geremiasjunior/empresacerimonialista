import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import { tem } from "@/lib/capacidades";
import {
  agruparCortejo,
  type PessoaCortejo,
} from "@/lib/portal-pessoas-shared";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A folha do mestre de cerimônias.
//
// Na formatura, a chamada nominal é o momento mais tenso da colação: um
// nome errado na frente da família estraga a noite. Esta folha sai com a
// ordem de entrada e a NOTA DE PRONÚNCIA de cada nome — anotação interna
// que só existe aqui (sessão exigida pelo middleware; nunca em rota
// pública nem no link de fornecedor). No casamento, a mesma folha é a
// ordem de entrada do cortejo.

// Na chamada, os formandos são a lista principal; os demais papéis viram
// seções de apoio na ordem do protocolo.
const APOIO_FORMATURA = [
  "mesa_de_honra",
  "juramentista",
  "orador",
  "paraninfo",
  "patrono",
  "homenageado",
  "docente",
  "madrinha_anel",
];

export default async function ImprimirChamadaPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: eventData } = await supabase
    .from("events")
    .select("id, date, type, name, location, city, evento_pai_id, clients(name)")
    .eq("id", params.id)
    .single();

  if (!eventData) notFound();
  if (!tem((eventData as { type?: string | null }).type, "cortejo")) notFound();

  // Colação em evento próprio: a folha sai com a data e o local DELA,
  // mas a lista é a da turma — que mora no evento principal.
  const alvoCortejo =
    ((eventData as { evento_pai_id?: string | null }).evento_pai_id as
      | string
      | null) ?? (eventData as { id: string }).id;
  const { data: cortejoData } = await supabase
    .from("evento_cortejo_pessoa")
    .select("id, papel, nome, contato, o_que_leva, responsavel, chegada, pronuncia, ordem")
    .eq("event_id", alvoCortejo)
    .order("ordem")
    .order("nome");

  const ev = eventData as unknown as {
    id: string;
    date: string;
    type: keyof typeof EVENT_TYPE_LABELS;
    name: string | null;
    location: string | null;
    city: string | null;
    clients: { name: string } | null;
  };
  const pessoas = ((cortejoData ?? []) as Record<string, unknown>[]).map(
    (p) =>
      ({
        id: p.id,
        papel: p.papel,
        nome: p.nome,
        contato: p.contato,
        oQueLeva: p.o_que_leva,
        responsavel: p.responsavel,
        chegada: p.chegada,
        pronuncia: (p.pronuncia as string | null) ?? null,
        ordem: (p.ordem as number | null) ?? 0,
      }) as PessoaCortejo
  );

  const ehFormatura = ev.type === "formatura";
  const grupos = agruparCortejo(pessoas, ev.type as string);
  const formandos = grupos.find((g) => g.papel === "formando")?.pessoas ?? [];
  const apoio = ehFormatura
    ? APOIO_FORMATURA.map((papel) => grupos.find((g) => g.papel === papel))
        .concat(
          grupos.filter(
            (g) => g.papel !== "formando" && !APOIO_FORMATURA.includes(g.papel)
          )
        )
        .filter(Boolean) as typeof grupos
    : grupos;

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
          A folha do mestre de cerimônias — pronúncia só sai aqui.
        </span>
      </div>

      <div className="imp-cabecalho">
        <div className="imp-titulo">
          {ehFormatura ? "Chamada nominal" : "Ordem de entrada"} — {titulo}
        </div>
        <div className="imp-sub">
          {formatDate(ev.date)}
          {local ? ` · ${local}` : ""}
        </div>
      </div>

      {pessoas.length === 0 && (
        <p style={{ fontSize: 13, color: "#57534e" }}>
          {alvoCortejo !== (eventData as { id: string }).id
            ? "A lista desta turma fica no evento principal (o baile). Se ela já foi montada e não aparece aqui, o evento principal não está na sua escala."
            : "Ninguém cadastrado ainda. Monte as listas em Papéis e chamada."}
        </p>
      )}

      {ehFormatura && formandos.length > 0 && (
        <table className="imp-tabela">
          <thead>
            <tr>
              <th style={{ width: 34 }}>Nº</th>
              <th>Formando</th>
              <th style={{ width: 220 }}>Pronúncia</th>
              {/* para riscar à caneta conforme entrega */}
              <th style={{ width: 26 }}>OK</th>
            </tr>
          </thead>
          <tbody>
            {formandos.map((p, i) => (
              <tr key={p.id}>
                <td className="imp-mesa-num">{i + 1}</td>
                <td>
                  <strong>{p.nome}</strong>
                </td>
                <td style={{ fontStyle: p.pronuncia ? "italic" : undefined }}>
                  {p.pronuncia ?? ""}
                </td>
                <td style={{ borderLeft: "1px solid #e7e5e4" }}> </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {apoio.length > 0 && (
        <div className="imp-duas-colunas" style={{ marginTop: 18 }}>
          {apoio.map((g) => (
            <table key={g.papel} className="imp-tabela" style={{ marginBottom: 14 }}>
              <thead>
                <tr>
                  <th colSpan={2}>{g.rotulo}</th>
                </tr>
              </thead>
              <tbody>
                {g.pessoas.map((p, i) => (
                  <tr key={p.id}>
                    <td className="imp-mesa-num" style={{ width: 30 }}>
                      {i + 1}
                    </td>
                    <td>
                      <strong>{p.nome}</strong>
                      {[
                        p.pronuncia && `pronúncia: ${p.pronuncia}`,
                        p.oQueLeva && `leva: ${p.oQueLeva}`,
                        p.chegada && `chegada: ${p.chegada}`,
                      ]
                        .filter(Boolean)
                        .map((t, j) => (
                          <div
                            key={j}
                            style={{ fontSize: 11.5, color: "#57534e", marginTop: 2 }}
                          >
                            {t}
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}
    </div>
  );
}
