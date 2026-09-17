// A prestação de contas em PDF (@react-pdf/renderer — puro JS, roda em
// route handler serverless sem Chromium). SERVER-SIDE APENAS.
//
// É o relatório que o casal recebe: o que foi contratado, o que já foi
// pago, o que ainda está em aberto e com qual comprovante. Nada do que é
// DELA entra aqui — o payload já passou pelo guarda de prestacao-core,
// que recusa receita de assessoria, custos e lucro.
//
// Helvetica e Courier porque são as fontes de fábrica do PDF; o projeto
// não registra nenhuma. Molde: `src/lib/gerar-pdf-termo-aceite.tsx`.

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PrestacaoPayload } from "@/lib/prestacao-core";

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : "R$ " +
      Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const dataBR = (iso: string | null) => {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const s = StyleSheet.create({
  pagina: {
    paddingTop: 42,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#221E1B",
    backgroundColor: "#FFFFFF",
  },
  eyebrow: { fontSize: 8, letterSpacing: 1, color: "#928A81" },
  titulo: { fontSize: 20, marginTop: 4, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 10, color: "#6B6259", marginTop: 3 },
  secao: { marginTop: 22 },
  secaoTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E0D8",
  },
  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0ECE6",
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E0D8",
    fontSize: 8,
    color: "#928A81",
  },
  col1: { flex: 1, paddingRight: 8 },
  col2: { width: 80, textAlign: "right", fontFamily: "Courier" },
  col3: { width: 80, textAlign: "right", fontFamily: "Courier" },
  col4: { width: 70, textAlign: "right" },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  resumoValor: { fontFamily: "Courier" },
  destaque: { fontFamily: "Helvetica-Bold" },
  nota: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FAF8F5",
    borderRadius: 4,
    fontSize: 9,
    color: "#6B6259",
  },
  aviso: { fontSize: 8.5, color: "#928A81", marginTop: 6 },
  rodape: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#928A81",
  },
});

export type DadosPrestacaoPdf = {
  empresa: string;
  emitidoEm: string;
  payload: PrestacaoPayload;
};

function PrestacaoPdf({ empresa, emitidoEm, payload }: DadosPrestacaoPdf) {
  const r = payload.resumo;
  const pagas = payload.parcelas.filter((p) => p.paga);
  const abertas = payload.parcelas.filter((p) => !p.paga);

  return (
    <Document
      title={`Prestação de contas — ${payload.evento.nome}`}
      author={empresa}
    >
      <Page size="A4" style={s.pagina}>
        <Text style={s.eyebrow}>PRESTAÇÃO DE CONTAS</Text>
        <Text style={s.titulo}>{payload.evento.nome}</Text>
        <Text style={s.sub}>
          {dataBR(payload.evento.data)}
          {payload.evento.local ? ` · ${payload.evento.local}` : ""} · emitido em{" "}
          {emitidoEm} por {empresa}
        </Text>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Resumo da verba</Text>
          <View style={s.resumoLinha}>
            <Text>Verba do evento</Text>
            <Text style={s.resumoValor}>{brl(r.verba)}</Text>
          </View>
          <View style={s.resumoLinha}>
            <Text>Contratado com fornecedores</Text>
            <Text style={s.resumoValor}>{brl(r.contratado)}</Text>
          </View>
          <View style={s.resumoLinha}>
            <Text>Já pago</Text>
            <Text style={s.resumoValor}>{brl(r.pago)}</Text>
          </View>
          <View style={[s.resumoLinha, s.destaque]}>
            <Text>Em aberto</Text>
            <Text style={[s.resumoValor, s.destaque]}>{brl(r.em_aberto)}</Text>
          </View>
          {r.custo_por_pessoa != null && (
            <View style={s.resumoLinha}>
              <Text>Custo por pessoa</Text>
              <Text style={s.resumoValor}>{brl(r.custo_por_pessoa)}</Text>
            </View>
          )}
          {payload.notas.resumo ? (
            <Text style={s.nota}>{payload.notas.resumo}</Text>
          ) : null}
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Fornecedores</Text>
          <View style={s.cabecalho}>
            <Text style={s.col1}>Fornecedor</Text>
            <Text style={s.col2}>Contratado</Text>
            <Text style={s.col3}>Pago</Text>
            <Text style={s.col4}>Em aberto</Text>
          </View>
          {payload.fornecedores.map((f, i) => (
            <View style={s.linha} key={i}>
              <Text style={s.col1}>
                {f.nome}
                {f.conferido ? "" : " *"}
              </Text>
              <Text style={s.col2}>{brl(f.realizado ?? f.contratado)}</Text>
              <Text style={s.col3}>{brl(f.pago)}</Text>
              <Text style={s.col4}>{brl(f.em_aberto)}</Text>
            </View>
          ))}
          {payload.fornecedores.some((f) => !f.conferido) && (
            <Text style={s.aviso}>
              * valor contratado, ainda não conferido após o evento.
            </Text>
          )}
          {payload.notas.fornecedores ? (
            <Text style={s.nota}>{payload.notas.fornecedores}</Text>
          ) : null}
        </View>

        <View style={s.secao}>
          <Text style={s.secaoTitulo}>Pagamentos feitos ({pagas.length})</Text>
          {pagas.length === 0 ? (
            <Text style={s.sub}>Nenhum pagamento registrado até aqui.</Text>
          ) : (
            pagas.map((p, i) => (
              <View style={s.linha} key={i}>
                <Text style={s.col1}>
                  {[p.fornecedor, p.descricao].filter(Boolean).join(" · ")}
                </Text>
                <Text style={s.col2}>{brl(p.valor)}</Text>
                <Text style={s.col4}>pago {dataBR(p.paga_em)}</Text>
              </View>
            ))
          )}
        </View>

        {abertas.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Em aberto ({abertas.length})</Text>
            {abertas.map((p, i) => (
              <View style={s.linha} key={i}>
                <Text style={s.col1}>
                  {[p.fornecedor, p.descricao].filter(Boolean).join(" · ")}
                </Text>
                <Text style={s.col2}>{brl(p.valor)}</Text>
                <Text style={s.col4}>vence {dataBR(p.vencimento)}</Text>
              </View>
            ))}
            {payload.notas.parcelas ? (
              <Text style={s.nota}>{payload.notas.parcelas}</Text>
            ) : null}
          </View>
        )}

        {payload.ocorrencias && payload.ocorrencias.length > 0 && (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Ocorrências</Text>
            {payload.ocorrencias.map((o, i) => (
              <View style={s.linha} key={i}>
                <Text style={s.col1}>
                  {o.descricao}
                  {o.fornecedor ? ` · ${o.fornecedor}` : ""}
                </Text>
                <Text style={s.col2}>{o.valor == null ? "—" : brl(o.valor)}</Text>
                <Text style={s.col4}>
                  {o.resolvida ? "resolvida" : "em aberto"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {payload.notas.geral ? (
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Mensagem final</Text>
            <Text style={s.nota}>{payload.notas.geral}</Text>
          </View>
        ) : null}

        <View style={s.rodape} fixed>
          <Text>
            Prestação de contas · {payload.evento.nome} · {empresa}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function gerarPdfPrestacao(d: DadosPrestacaoPdf): Promise<Buffer> {
  return renderToBuffer(<PrestacaoPdf {...d} />);
}
