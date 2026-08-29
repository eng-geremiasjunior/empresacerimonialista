import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublico, getRecursos } from "@/lib/supabase/recursos";
import { numero, textoDaBase } from "@/lib/recursos-core";
import { formatDate } from "@/lib/format";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A folha de contagem. No dia, quem confere estoque tem prancheta e
// caneta — não app. Por isso as colunas de ENTRADA e SOBRA saem em
// branco: elas são preenchidas à mão e digitadas depois, na Operação.
//
// Sem preço aqui de propósito: esta folha circula na mão de quem
// descarrega caminhão, e o que a empresa pagou não é assunto dele.
export default async function ImprimirOperacaoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: evento } = await supabase
    .from("events")
    .select("id, name, date, location, clients(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!evento) notFound();

  const ev = evento as unknown as {
    name: string | null;
    date: string;
    location: string | null;
    clients: { name: string } | null;
  };
  const titulo = ev.name || ev.clients?.name || "Evento";

  const [recursos, publico] = await Promise.all([
    getRecursos(params.id),
    getPublico(params.id),
  ]);

  const grupos = new Map<string, typeof recursos>();
  for (const r of recursos) {
    const g = r.grupo ?? "Outros itens";
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g)!.push(r);
  }

  return (
    <main className="imp-pagina">
      <div className="imp-acoes">
        <BotaoImprimir />
        <span className="text-sm text-gray-400">
          Entrada e sobra saem em branco — são preenchidas no dia.
        </span>
      </div>

      <header className="imp-cabecalho">
        <p className="imp-titulo">Folha de contagem</p>
        <p className="imp-sub">
          {titulo} · {formatDate(ev.date)}
          {ev.location ? ` · ${ev.location}` : ""}
          {publico && publico.quantidade > 0
            ? ` · ${publico.quantidade} ${
                publico.origem === "confirmados" ? "confirmados" : "estimados"
              }`
            : ""}
        </p>
      </header>

      {recursos.length === 0 ? (
        <p className="imp-sub">Nenhum item cadastrado na Operação deste evento.</p>
      ) : (
        [...grupos.entries()].map(([grupo, itens]) => (
          <section key={grupo} style={{ marginBottom: 18 }}>
            <p
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
                color: "#57534e",
                marginBottom: 4,
              }}
            >
              {grupo}
            </p>
            <table className="imp-tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: "right", width: "14%" }}>Previsto</th>
                  <th style={{ textAlign: "right", width: "14%" }}>Comprado</th>
                  <th style={{ textAlign: "right", width: "16%" }}>Entrada</th>
                  <th style={{ textAlign: "right", width: "16%" }}>Sobra</th>
                  <th style={{ width: "12%" }}>Acabou às</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.nome}</span>
                      <span style={{ color: "#a8a29e" }}> · {r.unidade}</span>
                      {r.regra !== "fixo" && textoDaBase(r) && (
                        <span
                          style={{ display: "block", fontSize: 11, color: "#a8a29e" }}
                        >
                          {numero(r.indice)} {r.unidade} × {textoDaBase(r)}
                          {r.fornecedorNome ? ` · ${r.fornecedorNome}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="imp-mesa-num" style={{ textAlign: "right" }}>
                      {numero(r.previsto)}
                    </td>
                    <td className="imp-mesa-num" style={{ textAlign: "right" }}>
                      {numero(r.comprado)}
                    </td>
                    <td />
                    <td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}

      <p className="imp-rodape">
        Conferido por ____________________________ · Hora ____ : ____
      </p>
    </main>
  );
}
