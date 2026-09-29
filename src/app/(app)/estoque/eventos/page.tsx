import Link from "next/link";
import { getEventosComReserva } from "@/lib/supabase/estoque";
import { getMeuCargo } from "@/lib/supabase/equipe";
import { SubNav } from "@/components/SubNav";
import { VISOES_ESTOQUE } from "@/lib/visoes";
import { fraseDoConflito } from "@/lib/estoque-core";
import { formatDate } from "@/lib/format";
import { diasAte } from "@/lib/estoque-core";
import { hojeBR } from "@/lib/tempo";

export const metadata = { title: "Estoque por evento" };
export const dynamic = "force-dynamic";

// O que vai para cada evento (a aba "Eventos" do estoque): os eventos
// com reserva aberta, o que já foi separado, e onde falta. Sem cartão
// colorido: a data e a frase do conflito fazem o trabalho.
export default async function EstoquePorEventoPage() {
  const [eventos, { cargo }] = await Promise.all([getEventosComReserva(), getMeuCargo()]);
  const hoje = hojeBR();

  return (
    <div className="space-y-4">
      <SubNav itens={VISOES_ESTOQUE} cargo={cargo} />
      <div className="px-4 pt-5 sm:px-6">
        <h1 style={{ margin: 0, font: "600 22px/1.2 Inter, system-ui, sans-serif", letterSpacing: "-0.02em", color: "var(--tinta)" }}>
          Por evento
        </h1>
        <p className="mt-1" style={{ fontSize: 14, color: "var(--cinza)" }}>
          {eventos.length === 0
            ? "Nenhum evento com reserva do estoque. A reserva é feita na Operação de cada evento, ou pelo “Usar” de um item."
            : `${eventos.length} ${eventos.length === 1 ? "evento com reserva aberta" : "eventos com reserva aberta"}`}
        </p>
      </div>

      {eventos.length > 0 && (
        <ul className="mx-4 sm:mx-6" style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--linha)" }}>
          {eventos.map((e) => {
            const d = diasAte(e.data, hoje);
            const quando = d < 0 ? `há ${-d} ${-d === 1 ? "dia" : "dias"} · separação em aberto` : d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`;
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3" style={{ borderBottom: "1px solid var(--linha)" }}>
                <div className="min-w-[220px] flex-1">
                  <div style={{ fontSize: 15, fontWeight: 500, color: "var(--tinta)" }}>{e.nome}</div>
                  <div style={{ fontSize: 12.5, color: "var(--cinza)", marginTop: 2 }}>
                    {formatDate(e.data)} · {quando} · {e.itens} {e.itens === 1 ? "item" : "itens"} · {e.separados} {e.separados === 1 ? "separado" : "separados"}
                  </div>
                  {e.conflitos.map((c) => (
                    <div key={c.itemId} style={{ fontSize: 12.5, color: "#A5544B", marginTop: 2 }}>
                      {fraseDoConflito(c)}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/imprimir/separacao/${e.id}`}
                    target="_blank"
                    className="vela-btn-secundario vela-foco h-9 inline-flex items-center px-3"
                    style={{ border: "1px solid var(--cinza-2)", borderRadius: 8, background: "var(--papel)", color: "var(--tinta)", fontSize: 12.5, fontWeight: 500 }}
                  >
                    Lista de separação
                  </Link>
                  <Link
                    href={`/eventos/${e.id}/operacao`}
                    className="h-9 inline-flex items-center px-3"
                    style={{ border: 0, borderRadius: 8, background: "var(--tinta)", color: "var(--marfim)", fontSize: 13, fontWeight: 600 }}
                  >
                    Abrir a Operação
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
