import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanejamento } from "@/lib/supabase/planejamento";
import { linhaDoFechado } from "@/lib/fechado";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A folha do planejamento (16/10/2026, pedido dele: "estou sentindo falta
// disso"). Sai dos dados gravados — a IA da triagem só ajuda a preencher.
// Duas partes, por assunto, na ordem do método:
//   - o que está decidido, com o que foi anotado (fornecedor, valor…);
//   - o que ainda falta, com o prazo.
// O que não se aplica fica fora; só a contagem, no pé.

const CSS = `
.pl-assunto{margin:0 0 14px;break-inside:avoid}
.pl-assunto h3{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#78716c;font-weight:600}
.pl-linha{display:grid;grid-template-columns:200px 1fr;gap:12px;padding:5px 0;border-bottom:1px solid #e7e5e4;font-size:12.5px}
.pl-linha b{font-weight:600;color:#1c1917}
.pl-linha span{color:#44403c}
.pl-falta{display:grid;grid-template-columns:1fr 110px;gap:12px;padding:5px 0;border-bottom:1px solid #e7e5e4;font-size:12.5px}
.pl-prazo{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:11.5px;color:#44403c;text-align:right}
.pl-secao{margin:18px 0 8px;font-size:14px;font-weight:600;color:#1c1917;border-bottom:1px solid #1c1917;padding-bottom:4px}
.pl-pe{margin-top:16px;font-size:11px;color:#78716c}
`;

export default async function ImprimirPlanejamentoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: evento } = await supabase
    .from("events")
    .select("id, name, type, date, location, city, clients(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!evento) notFound();
  const ev = evento as unknown as {
    name: string | null;
    type: EventType;
    date: string | null;
    location: string | null;
    city: string | null;
    clients: { name: string } | null;
  };
  const titulo = ev.name || ev.clients?.name || "Evento";

  const [planejamento, { data: sups }, { data: etapasDoMetodo }] = await Promise.all([
    getPlanejamento(params.id, ev.date ?? null),
    supabase.from("suppliers").select("id, name"),
    // as etapas (211): cotações, visitas, degustação entram na linha do fornecedor
    supabase.from("metodo_decisao").select("codigo, etapa_de").not("etapa_de", "is", null),
  ]);
  const paiDaEtapa = new Map(((etapasDoMetodo ?? []) as { codigo: string; etapa_de: string }[]).map((e) => [e.codigo, e.etapa_de]));
  const fornecedores = new Map(((sups ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

  const decididas: { assunto: string; linhas: { titulo: string; texto: string }[] }[] = [];
  const faltam: { titulo: string; assunto: string; prazo: string | null }[] = [];
  let naoSeAplicam = 0;
  // o que foi anotado nas etapas vai junto da linha principal
  const anotadoNasEtapas = new Map<string, string[]>();
  for (const o of planejamento.objetivos)
    for (const d of o.decisoes) {
      const pai = d.codigo ? paiDaEtapa.get(d.codigo) : undefined;
      if (!pai || d.estado !== "decidida") continue;
      const partes = linhaDoFechado(d, o.nome, fornecedores).partes;
      if (partes.length) anotadoNasEtapas.set(pai, [...(anotadoNasEtapas.get(pai) ?? []), ...partes]);
    }
  for (const o of [...planejamento.objetivos].sort((a, b) => a.ordem - b.ordem)) {
    const linhas: { titulo: string; texto: string }[] = [];
    for (const d of [...o.decisoes].sort((a, b) => a.ordem - b.ordem)) {
      if (d.codigo && paiDaEtapa.has(d.codigo)) continue; // etapa: já vai na linha do fornecedor
      if (d.estado === "nao_se_aplica") {
        naoSeAplicam++;
        continue;
      }
      if (d.estado === "decidida") {
        const l = linhaDoFechado(d, o.nome, fornecedores);
        const extras = d.codigo ? anotadoNasEtapas.get(d.codigo) ?? [] : [];
        linhas.push({ titulo: d.titulo, texto: [...l.partes, ...extras].join(" · ") });
      } else {
        faltam.push({ titulo: d.titulo, assunto: o.nome, prazo: d.prazoPrevisto });
      }
    }
    if (linhas.length) decididas.push({ assunto: o.nome, linhas });
  }
  faltam.sort((a, b) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  const totalDecididas = decididas.reduce((s, g) => s + g.linhas.length, 0);
  const local = ev.location || ev.city;

  return (
    <main className="imp-pagina">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="imp-acoes">
        <BotaoImprimir />
      </div>

      <header className="imp-cabecalho">
        <p className="imp-titulo">Planejamento · {titulo}</p>
        <p className="imp-sub">
          {EVENT_TYPE_LABELS[ev.type] ?? "Evento"}
          {ev.date ? ` · ${formatDate(ev.date)}` : ""}
          {local ? ` · ${local}` : ""}
          {` · ${totalDecididas} decididos · ${faltam.length} ainda faltam`}
        </p>
      </header>

      <p className="pl-secao">Decidido</p>
      {decididas.length === 0 ? (
        <p className="imp-sub">Nada decidido ainda.</p>
      ) : (
        decididas.map((g) => (
          <section key={g.assunto} className="pl-assunto">
            <h3>{g.assunto}</h3>
            {g.linhas.map((l) => (
              <div key={l.titulo} className="pl-linha">
                <b>{l.titulo}</b>
                <span>{l.texto}</span>
              </div>
            ))}
          </section>
        ))
      )}

      <p className="pl-secao">Ainda falta</p>
      {faltam.length === 0 ? (
        <p className="imp-sub">Nada em aberto.</p>
      ) : (
        faltam.map((f) => (
          <div key={`${f.assunto}-${f.titulo}`} className="pl-falta">
            <span>
              <b style={{ fontWeight: 600 }}>{f.titulo}</b>
              <span style={{ color: "#78716c" }}> · {f.assunto}</span>
            </span>
            <span className="pl-prazo">{f.prazo ? `até ${formatDate(f.prazo).slice(0, 5)}` : "sem prazo"}</span>
          </div>
        ))
      )}

      {naoSeAplicam > 0 && (
        <p className="pl-pe">
          {naoSeAplicam} {naoSeAplicam === 1 ? "item não se aplica" : "itens não se aplicam"} a este evento e ficaram fora da folha.
        </p>
      )}
    </main>
  );
}
