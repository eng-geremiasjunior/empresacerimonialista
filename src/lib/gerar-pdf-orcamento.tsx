// Geração do PDF do orçamento (@react-pdf/renderer — puro JS, roda em
// route handler serverless sem Chromium). SERVER-SIDE APENAS.
// Gerado sempre on-demand: edições no orçamento refletem no próximo
// download, e a logo é a atual da empresa no momento da geração.

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import {
  descricaoCalculoItem,
  formatDateBR,
  type Orcamento,
  type OrcamentoItem,
} from "@/lib/orcamentos";

// Formata em BRL sem depender de Intl com locale no runtime serverless.
function brl(v: number): string {
  const [int, dec] = (Math.round(v * 100) / 100).toFixed(2).split(".");
  const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${milhar},${dec}`;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#17162A",
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
  },
  logo: { maxHeight: 64, maxWidth: 180, objectFit: "contain", marginBottom: 18 },
  empresaNome: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 18 },
  titulo: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    marginBottom: 22,
  },
  metaLinha: { flexDirection: "row", marginBottom: 4 },
  metaRotulo: { width: 90, color: "#6B6884" },
  metaValor: { fontFamily: "Helvetica-Bold", flex: 1 },
  divisor: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9E8F1",
    marginVertical: 16,
  },
  secao: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    color: "#6B6884",
    marginBottom: 10,
  },
  itemLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemNome: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  itemDetalhe: { color: "#6B6884", fontSize: 9 },
  itemValor: { fontFamily: "Helvetica-Bold" },
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: "#17162A",
    paddingTop: 12,
    marginTop: 6,
  },
  totalRotulo: { fontSize: 11, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  totalValor: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  validade: { marginTop: 14, color: "#6B6884" },
  rodape: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: "#E9E8F1",
    paddingTop: 10,
    color: "#6B6884",
    fontSize: 9,
  },
});

export type DadosPdfOrcamento = {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  empresa: { nome: string; logo_url: string | null };
  contatoEmpresa: string | null; // e-mail/telefone da cerimonialista p/ rodapé
};

function OrcamentoPdf({ orcamento: o, itens, empresa, contatoEmpresa }: DadosPdfOrcamento) {
  const tipo = EVENT_TYPE_LABELS[o.tipo_evento as EventType] ?? o.tipo_evento;
  const localCidade =
    [o.local_evento, o.cidade_evento].filter(Boolean).join(" — ") || "A definir";

  return (
    <Document
      title={`Orçamento — ${o.contato_nome}`}
      author={empresa.nome}
    >
      <Page size="A4" style={styles.page}>
        {/* Logo (ou nome em texto, sem quebrar o layout) */}
        {empresa.logo_url ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={empresa.logo_url} style={styles.logo} />
        ) : (
          <Text style={styles.empresaNome}>{empresa.nome}</Text>
        )}

        <Text style={styles.titulo}>ORÇAMENTO</Text>

        <View style={styles.metaLinha}>
          <Text style={styles.metaRotulo}>Para:</Text>
          <Text style={styles.metaValor}>{o.contato_nome}</Text>
        </View>
        <View style={styles.metaLinha}>
          <Text style={styles.metaRotulo}>Evento:</Text>
          <Text style={styles.metaValor}>{tipo}</Text>
        </View>
        <View style={styles.metaLinha}>
          <Text style={styles.metaRotulo}>Data prevista:</Text>
          <Text style={styles.metaValor}>
            {o.data_evento ? formatDateBR(o.data_evento) : "A definir"}
          </Text>
        </View>
        <View style={styles.metaLinha}>
          <Text style={styles.metaRotulo}>Local:</Text>
          <Text style={styles.metaValor}>{localCidade}</Text>
        </View>
        {o.numero_convidados != null && (
          <View style={styles.metaLinha}>
            <Text style={styles.metaRotulo}>Convidados:</Text>
            <Text style={styles.metaValor}>{String(o.numero_convidados)}</Text>
          </View>
        )}

        <View style={styles.divisor} />

        <Text style={styles.secao}>ITENS INCLUSOS</Text>
        {itens.length === 0 ? (
          <Text style={styles.itemDetalhe}>Nenhum item.</Text>
        ) : (
          itens.map((item) => (
            <View key={item.id} style={styles.itemLinha}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.itemNome}>{item.nome}</Text>
                <Text style={styles.itemDetalhe}>
                  {descricaoCalculoItem(item)}
                </Text>
                {item.descricao ? (
                  <Text style={styles.itemDetalhe}>{item.descricao}</Text>
                ) : null}
              </View>
              <Text style={styles.itemValor}>
                {brl(Number(item.valor_calculado))}
              </Text>
            </View>
          ))
        )}

        <View style={styles.totalLinha}>
          <Text style={styles.totalRotulo}>TOTAL</Text>
          <Text style={styles.totalValor}>{brl(Number(o.valor_total))}</Text>
        </View>

        <Text style={styles.validade}>
          Válido até: {formatDateBR(o.data_validade)} ({o.validade_dias} dias)
        </Text>

        <View style={styles.rodape} fixed>
          <Text>{empresa.nome}</Text>
          {contatoEmpresa ? <Text>{contatoEmpresa}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

export async function gerarPdfOrcamento(
  dados: DadosPdfOrcamento
): Promise<Buffer> {
  return renderToBuffer(<OrcamentoPdf {...dados} />);
}
