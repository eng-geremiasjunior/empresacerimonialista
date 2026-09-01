import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEventoDoPortal,
  getPrestacaoDeContas,
} from "@/lib/supabase/portal";
import { brl } from "@/components/planejamento/celebra";
import { TopoInterno } from "@/components/portal/TopoInterno";
import { Cartao, Divisor, TituloSecao } from "@/components/portal/Nucleo";
import { diaEMes } from "@/components/portal/datas";

export const dynamic = "force-dynamic";

// A prestação de contas — a FOTOGRAFIA entregue, nunca o dado vivo.
// A RPC devolve o conteúdo da versão mais recente; editar um lançamento
// depois da entrega NÃO muda o que aparece aqui. Parcela em aberto é
// dita em aberto, e valor contratado sem conferência é dito assim.
export default async function PortalPrestacaoPage({
  params,
}: {
  params: { eventoId: string };
}) {
  const evento = await getEventoDoPortal(params.eventoId);
  if (!evento) notFound();

  const entrega = await getPrestacaoDeContas(evento.id);
  if (!entrega) notFound(); // sem entrega, a rota nem aparece no menu

  const p = entrega.conteudo;
  const dataEntrega = new Date(entrega.entregueEm).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const linhaResumo = (
    rotulo: string,
    valor: string,
    opts?: { forte?: boolean; atencao?: boolean }
  ) => (
    <div
      key={rotulo}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--esp-4)",
        padding: "10px 0",
        borderBottom: "1px solid var(--cor-borda-linha)",
      }}
    >
      <span style={{ fontSize: "var(--ts-meta)", color: "var(--cor-texto-suave)" }}>
        {rotulo}
      </span>
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "var(--ts-titulo-lateral)",
          color: opts?.atencao
            ? "var(--cor-atencao)"
            : opts?.forte
              ? "var(--cor-texto-forte)"
              : "var(--cor-texto)",
          whiteSpace: "nowrap",
        }}
      >
        {valor}
      </span>
    </div>
  );

  const notaDela = (texto?: string) =>
    texto ? (
      <p
        style={{
          marginTop: "var(--esp-4)",
          fontSize: "var(--ts-desc)",
          color: "var(--cor-texto)",
          fontStyle: "italic",
          whiteSpace: "pre-wrap",
        }}
      >
        {texto}
      </p>
    ) : null;

  return (
    <div className="portal-tela">
      <TopoInterno
        eventoId={evento.id}
        titulo="Prestação de contas"
        apoio={`Entregue em ${dataEntrega} · versão ${entrega.versao}. Este documento não muda: se algo for corrigido, vocês recebem uma nova versão.`}
      />

      {/* ---------------- resumo ---------------- */}
      <Cartao padding="var(--esp-8)">
        <TituloSecao titulo="Resumo do investimento" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {p.resumo.verba != null && linhaResumo("Verba combinada", brl(p.resumo.verba))}
          {linhaResumo("Total contratado", brl(p.resumo.contratado), { forte: true })}
          {linhaResumo("Total pago", brl(p.resumo.pago), { forte: true })}
          {linhaResumo("Em aberto", brl(p.resumo.em_aberto), {
            atencao: p.resumo.em_aberto > 0,
          })}
          {p.resumo.fornecedores_com_estimativa > 0 &&
            linhaResumo("Economia obtida", brl(p.resumo.economia))}
        </div>
        {p.pendencias.valores_nao_conferidos && (
          <p
            style={{
              marginTop: "var(--esp-4)",
              fontSize: "var(--ts-desc)",
              color: "var(--cor-texto-suave)",
            }}
          >
            Valores contratados, conforme os acordos com cada fornecedor.
          </p>
        )}
        {notaDela(p.notas.resumo)}
      </Cartao>

      {/* ---------------- por fornecedor ---------------- */}
      <Cartao padding="var(--esp-8)">
        <TituloSecao titulo="Por fornecedor" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {p.fornecedores.map((f, i) => (
            <div
              key={f.nome}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--esp-4)",
                padding: "var(--esp-4) 0",
                borderBottom:
                  i === p.fornecedores.length - 1
                    ? "none"
                    : "1px solid var(--cor-borda-linha)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: "var(--ts-meta)", color: "var(--cor-texto-forte)" }}>
                  {f.nome}
                </span>
                <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
                  {f.estimado != null && `estimado ${brl(f.estimado)} · `}
                  pago {brl(f.pago)}
                  {f.em_aberto > 0 && (
                    <span style={{ color: "var(--cor-atencao)" }}>
                      {" "}· em aberto {brl(f.em_aberto)}
                    </span>
                  )}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: "var(--fonte-titulo)",
                    fontSize: "var(--ts-titulo-lateral)",
                    color: "var(--cor-texto-forte)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {brl(f.contratado)}
                </div>
                {!f.conferido && (
                  <div style={{ fontSize: 11, color: "var(--cor-texto-suave)" }}>
                    valor contratado
                  </div>
                )}
              </div>
            </div>
          ))}
          {p.fornecedores.length === 0 && (
            <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
              Nenhum fornecedor registrado.
            </p>
          )}
        </div>
        {notaDela(p.notas.fornecedores)}
      </Cartao>

      {/* ---------------- pagamentos ---------------- */}
      <Cartao padding="var(--esp-8)">
        <TituloSecao titulo="Pagamentos" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {p.parcelas.map((par, i) => (
            <div
              key={`${par.vencimento}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--esp-4)",
                padding: "var(--esp-4) 0",
                borderBottom:
                  i === p.parcelas.length - 1
                    ? "none"
                    : "1px solid var(--cor-borda-linha)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span
                  style={{
                    fontSize: "var(--ts-meta)",
                    color: par.paga ? "var(--cor-texto-suave)" : "var(--cor-texto-forte)",
                  }}
                >
                  {par.fornecedor ?? "Fornecedor"}
                  {par.descricao ? ` · ${par.descricao}` : ""}
                </span>
                <span
                  style={{
                    fontSize: "var(--ts-desc)",
                    color: par.paga ? "var(--cor-texto-suave)" : "var(--cor-atencao)",
                  }}
                >
                  {par.paga
                    ? `Paga${par.paga_em ? ` em ${diaEMes(par.paga_em)}` : ""}`
                    : `Em aberto · vencimento ${diaEMes(par.vencimento)}`}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--fonte-titulo)",
                  fontSize: "var(--ts-titulo-lateral)",
                  whiteSpace: "nowrap",
                  color: par.paga ? "var(--cor-texto-suave)" : "var(--cor-texto-forte)",
                }}
              >
                {brl(par.valor)}
              </span>
            </div>
          ))}
          {p.parcelas.length === 0 && (
            <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto-suave)" }}>
              Nenhuma parcela registrada.
            </p>
          )}
        </div>
        {notaDela(p.notas.parcelas)}
      </Cartao>

      {/* ---------------- o dia ---------------- */}
      {(p.dia.total > 0 || p.convidados.confirmados > 0) && (
        <Cartao padding="var(--esp-8)">
          <TituloSecao titulo="O dia" />
          <p style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto)" }}>
            {p.convidados.confirmados > 0 &&
              `${p.convidados.confirmados} convidados ${p.convidados.origem}. `}
            {p.dia.total > 0 &&
              `${p.dia.concluidos} de ${p.dia.total} momentos do roteiro concluídos.`}
          </p>
          {p.dia.itens.length > 0 && (
            <>
              <Divisor margem="var(--esp-4) 0" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                {p.dia.itens.map((item, i) => (
                  <div
                    key={`${item.titulo}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "var(--esp-4)",
                      padding: "8px 0",
                      borderBottom:
                        i === p.dia.itens.length - 1
                          ? "none"
                          : "1px solid var(--cor-borda-linha)",
                    }}
                  >
                    <span style={{ fontSize: "var(--ts-desc)", color: "var(--cor-texto)" }}>
                      {item.titulo}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--ts-desc)",
                        color: "var(--cor-texto-suave)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.previsto ?? "—"}
                      {item.realizado_inicio && item.realizado_inicio !== item.previsto
                        ? ` → ${item.realizado_inicio}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {notaDela(p.notas.dia)}
        </Cartao>
      )}

      {/* ---------------- a palavra dela ---------------- */}
      {p.notas.geral && (
        <Cartao padding="var(--esp-8)">
          <TituloSecao titulo="Da sua cerimonialista" />
          <p
            style={{
              fontSize: "var(--ts-meta)",
              color: "var(--cor-texto)",
              whiteSpace: "pre-wrap",
            }}
          >
            {p.notas.geral}
          </p>
        </Cartao>
      )}

      <Link
        href={`/imprimir/prestacao/${evento.id}`}
        style={{
          alignSelf: "flex-start",
          fontSize: "var(--ts-botao)",
          color: "var(--cor-ouro-texto)",
        }}
      >
        Versão para impressão
      </Link>
    </div>
  );
}
