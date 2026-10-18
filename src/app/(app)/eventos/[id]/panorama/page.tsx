import Link from "next/link";
import { notFound } from "next/navigation";
import { getDossie, quandoEmPalavras } from "@/lib/supabase/dossie";
import { CSS_DO_DASHBOARD, Cartao } from "@/components/dashboard/RadarDoDia";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// O Panorama do evento (18/10/2026, pedido dele): o evento inteiro numa
// tela só, para ela se situar sem vagar de tela em tela. Cada cartão diz
// o essencial em uma ou duas linhas e leva à tela de detalhe. A mesma
// leitura da folha "Imprimir evento" (lib/supabase/dossie.ts).

const CSS = `
.pn-lista{list-style:none;margin:0;padding:0}
.pn-lista li{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--mo-linha,#E6E0D8);font-size:14px;color:#221E1B}
.pn-lista li:last-child{border-bottom:0}
.pn-lista .pn-dir{flex:none;font-family:var(--font-mono),"IBM Plex Mono",monospace;font-size:12.5px;color:#6B6259}
.pn-resumo{margin:10px 0 4px;font-size:14px;color:#3a3532}
.pn-resumo b{font-family:var(--font-mono),"IBM Plex Mono",monospace;font-weight:500;color:#221E1B}
.pn-vazio{margin:10px 0;font-size:14px;color:#6B6259}
.pn-atraso{color:#8a2f2f}
`;

function dataCurta(iso: string | null) {
  return iso ? formatDate(iso).slice(0, 5) : "sem prazo";
}

export default async function PanoramaPage({ params }: { params: { id: string } }) {
  const d = await getDossie(params.id);
  if (!d) notFound();
  const base = `/eventos/${params.id}`;
  const atrasadas = d.tarefas.filter((t) => t.atrasada);
  const proximo =
    atrasadas[0]?.titulo ??
    d.faltam[0]?.titulo ??
    d.tarefas[0]?.titulo ??
    null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_DO_DASHBOARD + CSS }} />
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-title), Inter, sans-serif", fontWeight: 600, fontSize: 26, color: "#221E1B" }}>
            Panorama
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 15, color: "#6B6259" }}>
            {quandoEmPalavras(d.diasAte)}
            {proximo ? ` · próximo passo: ${proximo}` : ""}
          </p>
        </div>
        <Link
          href={`/imprimir/evento/${params.id}`}
          target="_blank"
          style={{
            borderRadius: 6,
            padding: "8px 14px",
            fontSize: 14,
            fontWeight: 600,
            background: "#221E1B",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Imprimir evento
        </Link>
      </header>

      <div className="db-grade">
        <Cartao titulo="Planejamento" conta={d.faltam.length} pe={{ href: `${base}/planejamento`, rotulo: "Abrir o planejamento" }}>
          <p className="pn-resumo">
            <b>{d.totalDecididas}</b> decididos · <b>{d.faltam.length}</b> faltam
          </p>
          {d.faltam.length === 0 ? (
            <p className="pn-vazio">Tudo decidido.</p>
          ) : (
            <ul className="pn-lista">
              {d.faltam.slice(0, 5).map((f) => (
                <li key={`${f.assunto}-${f.titulo}`}>
                  <span>{f.titulo}</span>
                  <span className="pn-dir">até {dataCurta(f.prazo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Fornecedores" conta={d.faltaContratar.length} pe={{ href: `${base}/fornecedores`, rotulo: "Abrir os fornecedores" }}>
          <p className="pn-resumo">
            <b>{d.fornecedores.length}</b> no evento · <b>{d.faltaContratar.length}</b> falta contratar
          </p>
          {d.faltaContratar.length > 0 ? (
            <ul className="pn-lista">
              {d.faltaContratar.slice(0, 5).map((t) => (
                <li key={t}>
                  <span>{t}</span>
                  <span className="pn-dir">falta contratar</span>
                </li>
              ))}
            </ul>
          ) : d.fornecedores.length > 0 ? (
            <ul className="pn-lista">
              {d.fornecedores.slice(0, 5).map((f) => (
                <li key={`${f.nome}-${f.papel}`}>
                  <span>{f.nome}</span>
                  <span className="pn-dir">{f.papel || f.categoria || ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pn-vazio">Nenhum fornecedor no evento ainda.</p>
          )}
        </Cartao>

        <Cartao titulo="Tarefas" conta={d.tarefas.length} pe={{ href: `${base}/organizacao`, rotulo: "Abrir as tarefas" }}>
          <p className="pn-resumo">
            <b>{d.tarefas.length}</b> em aberto
            {atrasadas.length > 0 && (
              <>
                {" · "}
                <b className="pn-atraso">{atrasadas.length}</b> atrasadas
              </>
            )}
          </p>
          {d.tarefas.length === 0 ? (
            <p className="pn-vazio">Nenhuma tarefa em aberto.</p>
          ) : (
            <ul className="pn-lista">
              {d.tarefas.slice(0, 5).map((t, i) => (
                <li key={`${t.titulo}-${i}`}>
                  <span>{t.titulo}</span>
                  <span className={`pn-dir ${t.atrasada ? "pn-atraso" : ""}`}>{t.atrasada ? "atrasada" : dataCurta(t.prazo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao titulo="Roteiro do dia" conta={d.roteiro.length} pe={{ href: `${base}/roteiro`, rotulo: "Abrir o roteiro" }}>
          <p className="pn-resumo">
            <b>{d.roteiro.length}</b> horários
            {d.semResponsavel > 0 && (
              <>
                {" · "}
                <b>{d.semResponsavel}</b> sem responsável
              </>
            )}
          </p>
          {d.roteiro.length === 0 ? (
            <p className="pn-vazio">O roteiro ainda não começou.</p>
          ) : (
            <ul className="pn-lista">
              {d.roteiro.slice(0, 6).map((r, i) => (
                <li key={`${r.hora}-${i}`}>
                  <span>
                    <span className="pn-dir" style={{ marginRight: 10 }}>{r.hora ?? "—"}</span>
                    {r.titulo}
                  </span>
                  <span className="pn-dir">{r.responsavel ?? "sem responsável"}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {d.cerimonia.length > 0 && (
          <Cartao titulo="Cerimônia" conta={d.cerimonia.length} pe={{ href: `${base}/cortejo`, rotulo: "Abrir a cerimônia" }}>
            <ul className="pn-lista">
              {d.cerimonia.slice(0, 6).map((p, i) => (
                <li key={`${p.nome}-${i}`}>
                  <span>
                    {p.nome}
                    {p.par ? ` · com ${p.par}` : ""}
                  </span>
                  <span className="pn-dir">{p.papel}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        <Cartao titulo="Convidados" pe={{ href: `${base}/rsvp`, rotulo: "Abrir os convidados" }}>
          {d.convidadosRsvp.total === 0 ? (
            <p className="pn-vazio">{d.convidados ? `Previstos ${d.convidados}; a lista ainda não entrou.` : "A lista ainda não entrou."}</p>
          ) : (
            <p className="pn-resumo">
              <b>{d.convidadosRsvp.confirmados}</b> confirmados de <b>{d.convidadosRsvp.total}</b> · <b>{d.convidadosRsvp.aguardando}</b> sem resposta
            </p>
          )}
        </Cartao>

        <Cartao titulo="Pagamentos" pe={{ href: `${base}/financeiro`, rotulo: "Abrir os pagamentos" }}>
          <ul className="pn-lista">
            <li>
              <span>Recebido da cliente</span>
              <span className="pn-dir">{formatCurrency(d.pagamentos.recebido)}</span>
            </li>
            <li>
              <span>A receber</span>
              <span className="pn-dir">{formatCurrency(d.pagamentos.aReceber)}</span>
            </li>
            <li>
              <span>A pagar a fornecedores</span>
              <span className="pn-dir">{formatCurrency(d.pagamentos.aPagar)}</span>
            </li>
          </ul>
        </Cartao>

        <Cartao titulo="Portal da cliente" pe={{ href: `${base}/area-do-cliente`, rotulo: d.portal.pessoas ? "Abrir o portal" : "Enviar o acesso" }}>
          <p className="pn-resumo">
            {d.portal.pessoas === 0 ? (
              "A família ainda não tem acesso."
            ) : (
              <>
                <b>{d.portal.pessoas}</b> {d.portal.pessoas === 1 ? "pessoa entra" : "pessoas entram"} no portal
              </>
            )}
          </p>
        </Cartao>
      </div>
    </div>
  );
}
