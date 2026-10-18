import { notFound } from "next/navigation";
import { getDossie, quandoEmPalavras } from "@/lib/supabase/dossie";
import { formatCurrency, formatDate } from "@/lib/format";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import { EscolhaDaFolha } from "./EscolhaDaFolha";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// "Imprimir evento" (18/10/2026, pedido dele: tirar a barreira entre o
// papel e o sistema). Um checklist geral do evento, lido na hora do que
// está gravado — sempre atualizado. Seções vazias não saem; ela escolhe
// as seções e "sem valores" (a folha que circula na mão da equipe ou da
// família não leva preço nem pagamento).

const CSS = `
.ev-secao{margin:18px 0 6px;font-size:14px;font-weight:700;color:#1c1917;border-bottom:1.5px solid #1c1917;padding-bottom:3px;break-after:avoid}
.ev-sub{margin:10px 0 2px;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#57534e;break-after:avoid}
.ev-linha{display:grid;gap:10px;align-items:baseline;padding:4px 0;border-bottom:1px solid #e7e5e4;font-size:12px;break-inside:avoid}
.ev-l2{grid-template-columns:18px 1fr}
.ev-l3{grid-template-columns:18px 1fr 110px}
.ev-lhora{grid-template-columns:48px 1fr 170px}
.ev-ldec{grid-template-columns:190px 1fr}
.ev-mono{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:11px;color:#44403c}
.ev-dir{text-align:right}
.ev-cinza{color:#57534e}
.ev-ficha{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 14px;margin:6px 0 4px;font-size:12px}
.ev-ficha b{display:block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#57534e}
.ev-numeros{display:flex;gap:22px;flex-wrap:wrap;font-size:12px;margin:4px 0}
.ev-numeros b{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:13px}
.ev-vazio{font-size:12px;color:#57534e;padding:4px 0}
`;

function Caixinha() {
  return <span className="imp-caixinha" aria-hidden />;
}

export default async function ImprimirEventoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { fora?: string; semvalores?: string };
}) {
  const d = await getDossie(params.id);
  if (!d) notFound();
  const fora = new Set((searchParams?.fora ?? "").split(",").filter(Boolean));
  const semValores = searchParams?.semvalores === "1";
  const mostra = (s: string) => !fora.has(s);
  const dataCurta = (iso: string | null) => (iso ? formatDate(iso).slice(0, 5) : "sem prazo");

  return (
    <main className="imp-pagina">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="imp-acoes" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
        <BotaoImprimir />
        <EscolhaDaFolha />
      </div>

      {/* capa */}
      <header className="imp-cabecalho">
        <p className="imp-titulo">{d.titulo}</p>
        <p className="imp-sub">
          {d.tipoLabel}
          {d.data ? ` · ${formatDate(d.data)}` : ""}
          {d.hora ? ` · ${d.hora}` : ""}
          {d.local ? ` · ${d.local}` : ""} · {quandoEmPalavras(d.diasAte)}
        </p>
      </header>
      <div className="ev-ficha">
        {d.cliente && (
          <span>
            <b>Cliente</b>
            {d.cliente.nome}
          </span>
        )}
        {d.cliente?.telefone && (
          <span>
            <b>Contato</b>
            {d.cliente.telefone}
          </span>
        )}
        {d.convidados ? (
          <span>
            <b>Convidados</b>
            {d.convidados}
          </span>
        ) : null}
        <span>
          <b>Impresso em</b>
          {formatDate(new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10))}
        </span>
      </div>

      {mostra("fornecedores") && (d.fornecedores.length > 0 || d.faltaContratar.length > 0) && (
        <section>
          <p className="ev-secao">Fornecedores</p>
          {d.fornecedores.map((f) => (
            <div key={`${f.nome}-${f.papel}`} className="ev-linha ev-l3">
              <Caixinha />
              <span>
                <b>{f.nome}</b>
                <span className="ev-cinza"> · {f.papel || f.categoria || "fornecedor"}</span>
              </span>
              <span className="ev-mono ev-dir">{f.contato ?? ""}</span>
            </div>
          ))}
          {d.faltaContratar.length > 0 && (
            <>
              <p className="ev-sub">Falta contratar</p>
              {d.faltaContratar.map((t) => (
                <div key={t} className="ev-linha ev-l2">
                  <Caixinha />
                  <span>{t}</span>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {mostra("planejamento") && (d.totalDecididas > 0 || d.faltam.length > 0) && (
        <section>
          <p className="ev-secao">
            Planejamento · {d.totalDecididas} decididos · {d.faltam.length} faltam
          </p>
          {d.faltam.length > 0 && (
            <>
              <p className="ev-sub">Ainda falta</p>
              {d.faltam.map((f) => (
                <div key={`${f.assunto}-${f.titulo}`} className="ev-linha ev-l3">
                  <Caixinha />
                  <span>
                    {f.titulo}
                    <span className="ev-cinza"> · {f.assunto}</span>
                  </span>
                  <span className="ev-mono ev-dir">{f.prazo ? `até ${dataCurta(f.prazo)}` : "sem prazo"}</span>
                </div>
              ))}
            </>
          )}
          {d.decididas.length > 0 && <p className="ev-sub">Decidido</p>}
          {d.decididas.map((g) => {
            // compacto: o que tem anotação ganha linha; o resto vira uma linha corrida
            const comTexto = g.linhas.filter((l) => l.texto);
            const soNome = g.linhas.filter((l) => !l.texto).map((l) => l.titulo);
            return (
              <div key={g.assunto} style={{ breakInside: "avoid" }}>
                <div className="ev-linha ev-ldec">
                  <b style={{ fontWeight: 700 }}>{g.assunto}</b>
                  <span className="ev-cinza">{soNome.join(" · ")}</span>
                </div>
                {comTexto.map((l) => (
                  <div key={l.titulo} className="ev-linha ev-ldec">
                    <span style={{ paddingLeft: 10 }}>{l.titulo}</span>
                    <span className="ev-cinza">
                      {semValores ? l.texto.replace(/R\$\s?[\d.,]+/g, "—") : l.texto}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      )}

      {mostra("tarefas") && d.tarefas.length > 0 && (
        <section>
          <p className="ev-secao">Tarefas em aberto · {d.tarefas.length}</p>
          {d.tarefas.map((t, i) => (
            <div key={`${t.titulo}-${i}`} className="ev-linha ev-l3">
              <Caixinha />
              <span>{t.titulo}</span>
              <span className="ev-mono ev-dir">{t.atrasada ? `atrasada · ${dataCurta(t.prazo)}` : dataCurta(t.prazo)}</span>
            </div>
          ))}
        </section>
      )}

      {mostra("roteiro") && d.roteiro.length > 0 && (
        <section>
          <p className="ev-secao">Roteiro do dia</p>
          {d.roteiro.map((r, i) => (
            <div key={`${r.hora}-${i}`} className="ev-linha ev-lhora">
              <span className="ev-mono">{r.hora ?? "—"}</span>
              <span>{r.titulo}</span>
              <span className="ev-cinza">{r.responsavel ?? "________"}</span>
            </div>
          ))}
        </section>
      )}

      {mostra("cerimonia") && d.cerimonia.length > 0 && (
        <section>
          <p className="ev-secao">Cerimônia</p>
          {d.cerimonia.map((p, i) => (
            <div key={`${p.nome}-${i}`} className="ev-linha ev-lhora">
              <span className="ev-mono">{i + 1}</span>
              <span>
                {p.nome}
                {p.par ? <span className="ev-cinza"> · com {p.par}</span> : null}
                {p.papel ? <span className="ev-cinza"> · {p.papel}</span> : null}
              </span>
              <span className="ev-cinza">{p.musica ?? ""}</span>
            </div>
          ))}
        </section>
      )}

      {mostra("convidados") && d.convidadosRsvp.total > 0 && (
        <section>
          <p className="ev-secao">Convidados</p>
          <div className="ev-numeros">
            <span>
              <b>{d.convidadosRsvp.total}</b> na lista
            </span>
            <span>
              <b>{d.convidadosRsvp.confirmados}</b> confirmados
            </span>
            <span>
              <b>{d.convidadosRsvp.aguardando}</b> sem resposta
            </span>
            <span>
              <b>{d.convidadosRsvp.naoVao}</b> não vão
            </span>
          </div>
        </section>
      )}

      {!semValores && mostra("pagamentos") && (d.pagamentos.recebido + d.pagamentos.aReceber + d.pagamentos.pago + d.pagamentos.aPagar > 0) && (
        <section>
          <p className="ev-secao">Pagamentos</p>
          <div className="ev-numeros">
            <span>Recebido da cliente <b>{formatCurrency(d.pagamentos.recebido)}</b></span>
            <span>A receber <b>{formatCurrency(d.pagamentos.aReceber)}</b></span>
            <span>Pago a fornecedores <b>{formatCurrency(d.pagamentos.pago)}</b></span>
            <span>A pagar <b>{formatCurrency(d.pagamentos.aPagar)}</b></span>
          </div>
          {d.pagamentos.pendentes.slice(0, 30).map((p, i) => (
            <div key={`${p.descricao}-${i}`} className="ev-linha ev-l3">
              <Caixinha />
              <span>
                {p.descricao}
                <span className="ev-cinza"> · {p.tipo === "receita" ? "a receber" : "a pagar"} · {formatCurrency(p.valor)}</span>
              </span>
              <span className="ev-mono ev-dir">{dataCurta(p.vencimento)}</span>
            </div>
          ))}
        </section>
      )}

      {d.naoSeAplicam > 0 && mostra("planejamento") && (
        <p className="ev-vazio" style={{ marginTop: 14 }}>
          {d.naoSeAplicam} {d.naoSeAplicam === 1 ? "item do planejamento não se aplica" : "itens do planejamento não se aplicam"} a este evento.
        </p>
      )}
    </main>
  );
}
