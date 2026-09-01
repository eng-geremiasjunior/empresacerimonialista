import { notFound } from "next/navigation";
import { getPrestacaoDeContas } from "@/lib/supabase/portal";
import { dataLonga, diaEMes } from "@/components/portal/datas";
import { brl } from "@/components/planejamento/celebra";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";

export const dynamic = "force-dynamic";

// A prestação de contas no papel. Lê a MESMA fotografia do portal (a RPC
// da 136, com o guard duplo: equipe ou cliente do evento) — nunca o dado
// vivo. O que o casal segura na mão é idêntico ao que vê na tela.
export default async function ImprimirPrestacaoPage({
  params,
}: {
  params: { id: string };
}) {
  const entrega = await getPrestacaoDeContas(params.id);
  if (!entrega) notFound();

  const p = entrega.conteudo;
  const dataEntrega = new Date(entrega.entregueEm).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const nota = (texto?: string) =>
    texto ? (
      <p style={{ fontSize: 12, fontStyle: "italic", margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
        {texto}
      </p>
    ) : null;

  return (
    <main className="imp-pagina">
      <div className="imp-acoes">
        <BotaoImprimir />
      </div>

      <header className="imp-cabecalho">
        <p className="imp-titulo">Prestação de contas</p>
        <p className="imp-sub">
          {p.evento.nome} · {dataLonga(p.evento.data)}
          {p.evento.local ? ` · ${p.evento.local}` : ""}
        </p>
        <p className="imp-sub">
          Entregue em {dataEntrega} · versão {entrega.versao}
        </p>
      </header>

      {/* resumo */}
      <table className="imp-tabela" style={{ marginBottom: 18 }}>
        <tbody>
          {p.resumo.verba != null && (
            <tr>
              <td>Verba combinada</td>
              <td style={{ textAlign: "right" }}>{brl(p.resumo.verba)}</td>
            </tr>
          )}
          <tr>
            <td>Total contratado</td>
            <td style={{ textAlign: "right" }}>{brl(p.resumo.contratado)}</td>
          </tr>
          <tr>
            <td>Total pago</td>
            <td style={{ textAlign: "right" }}>{brl(p.resumo.pago)}</td>
          </tr>
          <tr>
            <td>Em aberto</td>
            <td style={{ textAlign: "right" }}>{brl(p.resumo.em_aberto)}</td>
          </tr>
          {p.resumo.fornecedores_com_estimativa > 0 && (
            <tr>
              <td>Economia obtida</td>
              <td style={{ textAlign: "right" }}>{brl(p.resumo.economia)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {p.pendencias.valores_nao_conferidos && (
        <p className="imp-sub" style={{ marginTop: -12, marginBottom: 18 }}>
          Valores contratados, conforme os acordos com cada fornecedor.
        </p>
      )}
      {nota(p.notas.resumo)}

      {/* por fornecedor */}
      {p.fornecedores.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p className="imp-titulo" style={{ fontSize: 14 }}>Por fornecedor</p>
          <table className="imp-tabela">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th style={{ textAlign: "right" }}>Estimado</th>
                <th style={{ textAlign: "right" }}>Contratado</th>
                <th style={{ textAlign: "right" }}>Pago</th>
                <th style={{ textAlign: "right" }}>Em aberto</th>
              </tr>
            </thead>
            <tbody>
              {p.fornecedores.map((f) => (
                <tr key={f.nome}>
                  <td>{f.nome}</td>
                  <td style={{ textAlign: "right" }}>
                    {f.estimado == null ? "—" : brl(f.estimado)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {brl(f.contratado)}
                    {f.conferido && f.realizado != null && f.realizado !== f.contratado && (
                      <span style={{ display: "block", fontSize: 10 }}>
                        valor final {brl(f.realizado)}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>{brl(f.pago)}</td>
                  <td style={{ textAlign: "right" }}>{brl(f.em_aberto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {nota(p.notas.fornecedores)}
        </section>
      )}

      {/* pagamentos */}
      {p.parcelas.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p className="imp-titulo" style={{ fontSize: 14 }}>Pagamentos</p>
          <table className="imp-tabela">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Parcela</th>
                <th>Situação</th>
                <th style={{ textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {p.parcelas.map((par, i) => (
                <tr key={`${par.vencimento}-${i}`}>
                  <td>{par.fornecedor ?? "Fornecedor"}</td>
                  <td>{par.descricao ?? "—"}</td>
                  <td>
                    {par.paga
                      ? `Paga${par.paga_em ? ` em ${diaEMes(par.paga_em)}` : ""}`
                      : `Em aberto · ${diaEMes(par.vencimento)}`}
                  </td>
                  <td style={{ textAlign: "right" }}>{brl(par.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {nota(p.notas.parcelas)}
        </section>
      )}

      {/* o dia */}
      {(p.dia.total > 0 || p.convidados.confirmados > 0) && (
        <section style={{ marginBottom: 18 }}>
          <p className="imp-titulo" style={{ fontSize: 14 }}>O dia</p>
          <p className="imp-sub">
            {p.convidados.confirmados > 0 &&
              `${p.convidados.confirmados} convidados ${p.convidados.origem}. `}
            {p.dia.total > 0 &&
              `${p.dia.concluidos} de ${p.dia.total} momentos do roteiro concluídos.`}
          </p>
          {p.dia.itens.length > 0 && (
            <table className="imp-tabela">
              <thead>
                <tr>
                  <th>Momento</th>
                  <th>Previsto</th>
                  <th>Aconteceu</th>
                </tr>
              </thead>
              <tbody>
                {p.dia.itens.map((item, i) => (
                  <tr key={`${item.titulo}-${i}`}>
                    <td>{item.titulo}</td>
                    <td>{item.previsto ?? "—"}</td>
                    <td>{item.realizado_inicio ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {nota(p.notas.dia)}
        </section>
      )}

      {/* ocorrências (v2) */}
      {(p.ocorrencias ?? []).length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p className="imp-titulo" style={{ fontSize: 14 }}>Ocorrências</p>
          <table className="imp-tabela">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>O que aconteceu</th>
                <th>Situação</th>
                <th style={{ textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {(p.ocorrencias ?? []).map((o, i) => (
                <tr key={`${o.descricao}-${i}`}>
                  <td>
                    {o.tipo === "avaria"
                      ? "Avaria"
                      : o.tipo === "perda"
                        ? "Perda"
                        : o.tipo === "pertence"
                          ? "Pertence"
                          : "Outro"}
                  </td>
                  <td>
                    {o.descricao}
                    {o.fornecedor ? ` (${o.fornecedor})` : ""}
                  </td>
                  <td>{o.resolvida ? "Resolvida" : "Em tratamento"}</td>
                  <td style={{ textAlign: "right" }}>
                    {o.valor == null ? "—" : brl(o.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {p.notas.geral && (
        <section style={{ marginBottom: 18 }}>
          <p className="imp-titulo" style={{ fontSize: 14 }}>Da sua cerimonialista</p>
          <p style={{ fontSize: 12, whiteSpace: "pre-wrap", margin: 0 }}>{p.notas.geral}</p>
        </section>
      )}

      <footer className="imp-rodape">
        Documento entregue em {dataEntrega} — versão {entrega.versao}. Correções
        geram uma nova versão; esta permanece como registro.
      </footer>
    </main>
  );
}
