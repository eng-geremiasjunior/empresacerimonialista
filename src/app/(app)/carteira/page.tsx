import Link from "next/link";
import { redirect } from "next/navigation";
import { getCarteira } from "@/lib/supabase/carteira";
import { CSS_DO_DASHBOARD, Cartao } from "@/components/dashboard/RadarDoDia";
import { formatCurrency, formatDate } from "@/lib/format";
import { hojeBR } from "@/lib/tempo";

export const dynamic = "force-dynamic";

// A Carteira da cerimonialista (18/10/2026, pedido dele: "essas pessoas só
// migram pra algo que gera valor $$"). O dinheiro dela em destaque, e só
// número que existe no banco: nada estimado, nada prometido.

const CSS = `
.ct-topo{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:0;background:var(--mo-papel,#FFFEFC);border:1px solid var(--mo-linha,#D8D1C7);border-radius:6px}
.ct-bloco{padding:20px 22px;border-left:1px solid var(--mo-linha,#D8D1C7);min-width:0}
.ct-bloco:first-child{border-left:0}
.ct-rotulo{margin:0;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--mo-cinza-1,#68645E)}
.ct-valor{margin:8px 0 0;font-family:var(--font-title),Inter,sans-serif;font-size:30px;font-weight:700;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:var(--mo-tinta,#252525)}
.ct-bloco:first-child .ct-valor{font-size:38px;color:var(--mo-destaque,#A34F3E)}
.ct-nota{margin:6px 0 0;font-size:13.5px;color:var(--mo-cinza-1,#68645E)}
.ct-nota b{font-weight:600;color:var(--mo-tinta,#252525)}
.ct-atraso{color:var(--mo-atraso,#9A3B2E) !important;font-weight:600}
.ct-titulo{margin:0;font-family:var(--font-title),Inter,sans-serif;font-weight:700;font-size:28px;letter-spacing:-0.02em;color:var(--mo-tinta,#252525)}
.ct-sub{margin:4px 0 0;font-size:15px;color:var(--mo-cinza-1,#68645E)}
.ct-lista{list-style:none;margin:0;padding:0}
.ct-lista li{border-bottom:1px solid var(--mo-linha,#D8D1C7)}
.ct-lista li:last-child{border-bottom:0}
.ct-lista a,.ct-lista .ct-linha{display:grid;grid-template-columns:70px 1fr auto;gap:12px;align-items:baseline;padding:10px 0;text-decoration:none;color:var(--mo-tinta,#252525);font-size:14px;line-height:1.4}
.ct-lista a:hover .ct-oque{text-decoration:underline;text-underline-offset:3px}
.ct-lista a:focus-visible{outline:2px solid var(--mo-destaque,#A34F3E);outline-offset:2px}
.ct-quando,.ct-quanto{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12.5px;color:var(--mo-cinza-1,#68645E)}
.ct-quanto{font-size:14px;color:var(--mo-tinta,#252525);font-variant-numeric:tabular-nums}
.ct-evento{display:block;font-size:12.5px;font-weight:600;color:var(--mo-cinza-1,#68645E)}
.ct-grande{margin:14px 0 4px;font-family:var(--font-title),Inter,sans-serif;font-size:26px;font-weight:700;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;color:var(--mo-tinta,#252525)}
.ct-vazio{margin:12px 0;font-size:14px;color:var(--mo-cinza-1,#68645E)}
@media (max-width:860px){.ct-topo{grid-template-columns:1fr}.ct-bloco{border-left:0;border-top:1px solid var(--mo-linha,#D8D1C7)}.ct-bloco:first-child{border-top:0}}
`;

function dataCurta(iso: string | null) {
  return iso ? formatDate(iso).slice(0, 5) : "sem data";
}

export default async function CarteiraPage() {
  const c = await getCarteira();
  if (!c) redirect("/eventos/dashboard");
  const ano = hojeBR().slice(0, 4);
  const atrasadas = c.proximas.filter((p) => p.atrasada).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_DO_DASHBOARD + CSS }} />
      <header>
        <h1 className="ct-titulo">Carteira</h1>
        <p className="ct-sub">O que entra para você, dos seus eventos e do eOrganizei.</p>
      </header>

      <section className="ct-topo" aria-label="Resumo">
        <div className="ct-bloco">
          <p className="ct-rotulo">A receber das clientes</p>
          <p className="ct-valor">{formatCurrency(c.aReceber)}</p>
          <p className="ct-nota">
            {c.aReceber === 0 ? (
              "Nenhuma parcela em aberto."
            ) : (
              <>
                {/* o mês só aparece quando é parte do total; igual, seria repetir o número */}
                {c.aReceberMes < c.aReceber && (
                  <>
                    <b>{formatCurrency(c.aReceberMes)}</b> vencem até o fim do mês
                  </>
                )}
                {c.aReceberMes < c.aReceber && c.atrasado > 0 && " · "}
                {c.atrasado > 0 && <span className="ct-atraso">{formatCurrency(c.atrasado)} atrasados</span>}
              </>
            )}
          </p>
        </div>
        <div className="ct-bloco">
          <p className="ct-rotulo">Recebido este mês</p>
          <p className="ct-valor">{formatCurrency(c.recebidoMes)}</p>
        </div>
        <div className="ct-bloco">
          <p className="ct-rotulo">Recebido em {ano}</p>
          <p className="ct-valor">{formatCurrency(c.recebidoAno)}</p>
        </div>
      </section>

      <div className="db-grade">
        <Cartao
          titulo="Próximas parcelas"
          conta={atrasadas}
          classe="db-largo"
          pe={{ href: "/financeiro", rotulo: "Abrir o Financeiro" }}
        >
          {c.proximas.length === 0 ? (
            <p className="ct-vazio">Nenhuma parcela em aberto.</p>
          ) : (
            <ul className="ct-lista">
              {c.proximas.map((p, i) => {
                const dentro = (
                  <>
                    <span className={`ct-quando ${p.atrasada ? "ct-atraso" : ""}`}>
                      {p.atrasada ? `venceu ${dataCurta(p.vencimento)}` : dataCurta(p.vencimento)}
                    </span>
                    <span>
                      <span className="ct-evento">{p.evento}</span>
                      <span className="ct-oque">{p.descricao}</span>
                    </span>
                    <span className="ct-quanto">{formatCurrency(p.valor)}</span>
                  </>
                );
                return (
                  <li key={`${p.eventId}-${i}`}>
                    {p.eventId ? (
                      <Link href={`/eventos/${p.eventId}/financeiro`}>{dentro}</Link>
                    ) : (
                      <div className="ct-linha">{dentro}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Fechado pela vitrine" pe={{ href: "/orcamentos/relatorio", rotulo: "Abrir o relatório" }}>
          {c.vitrine.contratos === 0 ? (
            <p className="ct-vazio">Nenhuma proposta fechada pela vitrine ainda.</p>
          ) : (
            <>
              <p className="ct-grande">{formatCurrency(c.vitrine.valor)}</p>
              <p className="ct-nota">
                {c.vitrine.contratos} {c.vitrine.contratos === 1 ? "proposta aceita" : "propostas aceitas"} que
                começaram num pedido da sua vitrine
              </p>
            </>
          )}
        </Cartao>

        <Cartao titulo="Sua parte nos presentes" classe="db-inteiro">
          {c.presentes.quantidade === 0 ? (
            <p className="ct-vazio">
              Nenhum presente pago ainda. Metade da taxa de cada presente das listas dos seus casais é sua, por Pix todo mês.
            </p>
          ) : (
            <>
              <p className="ct-grande">{formatCurrency(c.presentes.comissao)}</p>
              <p className="ct-nota">
                de {c.presentes.quantidade} {c.presentes.quantidade === 1 ? "presente pago" : "presentes pagos"} · repasse por
                Pix todo mês
              </p>
              <ul className="ct-lista" style={{ marginTop: 8 }}>
                {c.presentes.porEvento.map((e) => (
                  <li key={e.evento}>
                    <div className="ct-linha" style={{ gridTemplateColumns: "1fr auto" }}>
                      <span>{e.evento}</span>
                      <span className="ct-quanto">{formatCurrency(e.valor)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Cartao>
      </div>
    </div>
  );
}
