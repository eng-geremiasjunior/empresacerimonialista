import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReservasDoEvento } from "@/lib/supabase/estoque";
import { numero } from "@/lib/estoque-core";
import { formatDate } from "@/lib/format";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A lista de separação (184). Sai na ORDEM DAS CATEGORIAS — a ordem em
// que a equipe anda pelo depósito — com a marca da empresa no alto e um
// quadradinho por item. Sem preço: circula na mão de quem carrega
// caminhão, como a folha de contagem.
export default async function ImprimirSeparacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: evento } = await supabase
    .from("events")
    .select("id, name, date, time, location, empresa_id, clients ( name ), empresas ( nome, logo_url )")
    .eq("id", params.id)
    .maybeSingle();
  if (!evento) notFound();

  const ev = evento as unknown as {
    name: string | null;
    date: string;
    time: string | null;
    location: string | null;
    clients: { name: string } | { name: string }[] | null;
    empresas: { nome: string | null; logo_url: string | null } | { nome: string | null; logo_url: string | null }[] | null;
  };
  const cliente = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;
  const empresa = Array.isArray(ev.empresas) ? ev.empresas[0] : ev.empresas;
  const titulo = ev.name || cliente?.name || "Evento";

  const reservas = await getReservasDoEvento(params.id);
  const grupos = new Map<string, typeof reservas>();
  for (const r of reservas) {
    const g = r.categoriaNome ?? "Sem categoria";
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g)!.push(r);
  }

  return (
    <main className="imp-pagina">
      <div className="imp-acoes">
        <BotaoImprimir />
        <span className="text-sm text-gray-400">Marque cada item ao separar; a coluna “voltou” é para depois da festa.</span>
      </div>

      <header className="imp-cabecalho" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {empresa?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logo_url} alt="" style={{ height: 44, width: "auto", objectFit: "contain" }} />
        )}
        <div>
          <p className="imp-titulo">Lista de separação</p>
          <p className="imp-sub">
            {empresa?.nome ? `${empresa.nome} · ` : ""}
            {titulo} · {formatDate(ev.date)}
            {ev.time ? ` · ${String(ev.time).slice(0, 5)}` : ""}
            {ev.location ? ` · ${ev.location}` : ""}
          </p>
        </div>
      </header>

      {reservas.length === 0 ? (
        <p className="imp-sub">Nada reservado do estoque para este evento.</p>
      ) : (
        [...grupos.entries()].map(([grupo, itens]) => (
          <section key={grupo} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, color: "#57534e", marginBottom: 4 }}>
              {grupo}
            </p>
            <table className="imp-tabela">
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>Sep.</th>
                  <th>Item</th>
                  <th style={{ textAlign: "right", width: "16%" }}>Quantidade</th>
                  <th style={{ textAlign: "right", width: "16%" }}>Voltou</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span
                        aria-hidden
                        style={{ display: "inline-block", width: 14, height: 14, border: "1.5px solid #57534e", borderRadius: 3, verticalAlign: "middle" }}
                      />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.itemNome}</span>
                      {!r.reutilizavel && <span style={{ color: "#a8a29e" }}> · consumível</span>}
                    </td>
                    <td className="imp-mesa-num" style={{ textAlign: "right" }}>
                      {numero(r.quantidade)} {r.unidade}
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <p className="imp-rodape">Separado por ____________________________ · Conferido por ____________________________ · Hora ____ : ____</p>
    </main>
  );
}
