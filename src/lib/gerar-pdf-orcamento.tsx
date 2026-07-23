// Geração do PDF do orçamento (@react-pdf/renderer — puro JS, roda em
// route handler serverless sem Chromium). SERVER-SIDE APENAS.
//
// O PDF é a versão ESTÁTICA da proposta: mesma sequência de seções, mesma
// paleta do template escolhido pela empresa. O que não cabe em papel
// (accordion, animações, botões) vira conteúdo aberto.
//
// Gerado sempre on-demand: edições refletem no próximo download, e a logo
// é a atual da empresa no momento da geração.

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
import { TEMAS, TEMA_PADRAO, type TemaOrcamento } from "@/lib/orcamento-temas";

// Formata em BRL sem depender de Intl com locale no runtime serverless.
function brl(v: number): string {
  const [int, dec] = (Math.round(v * 100) / 100).toFixed(2).split(".");
  const milhar = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${milhar},${dec}`;
}

export type ConteudoPdf = {
  sobreNos: string | null;
  anosExperiencia: number | null;
  eventosRealizados: number | null;
  dedicacao: number;
  equipeTexto: string;
  entradaPercentual: number;
  parcelasMaximo: number;
  descontoAVista: number;
  prazoParcelas: string;
  responsabilidades: string[];
  posEvento: { titulo: string; descricao: string }[];
  etapas: { titulo: string; descricao: string | null }[];
  faq: { pergunta: string; resposta: string }[];
};

export type DadosPdfOrcamento = {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  empresa: { nome: string; logo_url: string | null };
  contatoEmpresa: string | null;
  // --- opcionais: quando ausentes, o PDF cai no formato enxuto ---
  tema?: TemaOrcamento;
  conteudo?: ConteudoPdf | null;
  // Já resolvidas em data URI pelo route handler: uma imagem que falha ao
  // baixar quebraria a renderização inteira, então quem busca decide.
  heroImagem?: string | null;
  fotos?: string[];
};

// A paleta entra por parâmetro: react-pdf não tem CSS variables.
function criarEstilos(t: (typeof TEMAS)[TemaOrcamento]) {
  return StyleSheet.create({
    page: {
      fontFamily: "Helvetica",
      fontSize: 10,
      color: t.corTextoPrincipal,
      backgroundColor: t.corFundo,
      paddingTop: 36,
      paddingBottom: 54,
      paddingHorizontal: 40,
    },
    // cabeçalho
    topo: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    logo: { maxHeight: 42, maxWidth: 140, objectFit: "contain" },
    empresaNome: {
      fontSize: 13,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 1,
      color: t.corTextoPrincipal,
    },
    sobretitulo: {
      fontSize: 8,
      letterSpacing: 1.6,
      color: t.corTextoTerciario,
      fontFamily: "Helvetica-Bold",
    },
    // hero
    heroImagem: {
      width: "100%",
      height: 168,
      objectFit: "cover",
      borderRadius: 12,
      marginBottom: 16,
    },
    titulo: {
      fontFamily: "Times-Roman",
      fontSize: 30,
      color: t.corTextoPrincipal,
      marginBottom: 6,
    },
    subtitulo: { fontSize: 11, color: t.corTextoSecundario, marginBottom: 14 },
    metaLinha: { flexDirection: "row", gap: 24, marginBottom: 16 },
    metaValor: { fontSize: 10, fontFamily: "Helvetica-Bold" },
    metaRotulo: { fontSize: 8, color: t.corTextoTerciario, marginTop: 1 },
    saudacao: {
      backgroundColor: t.corFundoDestaque,
      borderRadius: 10,
      padding: 12,
      fontSize: 9.5,
      color: t.corTextoSecundario,
      marginBottom: 20,
    },
    // seções
    secaoTitulo: {
      fontFamily: "Times-Roman",
      fontSize: 15,
      color: t.corTextoPrincipal,
      marginBottom: 10,
      marginTop: 4,
    },
    cartao: {
      backgroundColor: t.corCard,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
    },
    texto: { fontSize: 9.5, color: t.corTextoSecundario, lineHeight: 1.5 },
    // estatísticas
    stats: { flexDirection: "row", gap: 12, marginTop: 10 },
    statBloco: { flex: 1, alignItems: "center" },
    statValor: { fontFamily: "Times-Roman", fontSize: 16, color: t.corAcento },
    statRotulo: { fontSize: 7.5, color: t.corTextoTerciario, marginTop: 2 },
    // listas em duas colunas
    duasColunas: { flexDirection: "row", flexWrap: "wrap" },
    colunaMetade: { width: "50%", paddingRight: 10, marginBottom: 7 },
    itemNome: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
    itemDetalhe: { fontSize: 8.5, color: t.corTextoTerciario, lineHeight: 1.4 },
    // etapas
    etapaLinha: { flexDirection: "row", marginBottom: 8, alignItems: "flex-start" },
    etapaNum: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: t.corAcento,
      color: "#FFFFFF",
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      paddingTop: 5.5,
      marginRight: 8,
    },
    // investimento — o bloco mais destacado do documento
    investimento: {
      backgroundColor: t.corFundoDestaque,
      borderRadius: 14,
      padding: 20,
      marginBottom: 14,
    },
    investRotulo: {
      fontSize: 8,
      letterSpacing: 1.4,
      fontFamily: "Helvetica-Bold",
      color: t.corAcento,
      marginBottom: 6,
    },
    investValor: {
      fontFamily: "Helvetica-Bold",
      fontSize: 34,
      color: t.corAcento,
      marginBottom: 2,
    },
    investConvidados: { fontSize: 9, color: t.corTextoTerciario, marginBottom: 14 },
    condicoes: {
      flexDirection: "row",
      gap: 14,
      borderTopWidth: 1,
      borderTopColor: t.corBordaDestaque,
      paddingTop: 12,
    },
    condicaoNum: { fontFamily: "Times-Roman", fontSize: 15 },
    condicaoRotulo: { fontSize: 7.5, color: t.corTextoTerciario, marginTop: 2 },
    // itens com valor (detalhamento)
    itemLinha: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    itemValor: { fontFamily: "Helvetica-Bold", fontSize: 10 },
    totalLinha: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderTopWidth: 1.5,
      borderTopColor: t.corAcento,
      paddingTop: 10,
      marginTop: 4,
    },
    totalValor: { fontFamily: "Helvetica-Bold", fontSize: 14, color: t.corAcento },
    // fotos
    galeria: { flexDirection: "row", gap: 8, marginBottom: 4 },
    foto: { width: 118, height: 78, objectFit: "cover", borderRadius: 8 },
    // faq
    faqPergunta: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
    faqResposta: { fontSize: 9, color: t.corTextoTerciario, marginBottom: 9, lineHeight: 1.4 },
    validade: { marginTop: 10, fontSize: 9, color: t.corTextoTerciario },
    rodape: {
      position: "absolute",
      bottom: 26,
      left: 40,
      right: 40,
      borderTopWidth: 1,
      borderTopColor: t.corBorda,
      paddingTop: 8,
      color: t.corTextoTerciario,
      fontSize: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
  });
}

function OrcamentoPdf({
  orcamento: o,
  itens,
  empresa,
  contatoEmpresa,
  tema = TEMA_PADRAO,
  conteudo = null,
  heroImagem = null,
  fotos = [],
}: DadosPdfOrcamento) {
  const t = TEMAS[tema];
  const s = criarEstilos(t);
  const tipo = EVENT_TYPE_LABELS[o.tipo_evento as EventType] ?? o.tipo_evento;
  const local = [o.local_evento, o.cidade_evento].filter(Boolean).join(" — ");

  const stats = [
    conteudo?.anosExperiencia
      ? { v: `${conteudo.anosExperiencia}+`, r: "Anos de experiência" }
      : null,
    conteudo?.eventosRealizados
      ? { v: `${conteudo.eventosRealizados}+`, r: "Eventos realizados" }
      : null,
    conteudo ? { v: `${conteudo.dedicacao}%`, r: "Dedicação" } : null,
    conteudo ? { v: "Equipe", r: conteudo.equipeTexto } : null,
  ].filter(Boolean) as { v: string; r: string }[];

  return (
    <Document title={`Proposta — ${o.contato_nome}`} author={empresa.nome}>
      <Page size="A4" style={s.page}>
        <View style={s.topo} fixed>
          {empresa.logo_url ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={empresa.logo_url} style={s.logo} />
          ) : (
            <Text style={s.empresaNome}>{empresa.nome.toUpperCase()}</Text>
          )}
          <Text style={s.sobretitulo}>
            PROPOSTA DE ASSESSORIA — {tipo.toUpperCase()}
          </Text>
        </View>

        {heroImagem ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={heroImagem} style={s.heroImagem} />
        ) : null}

        <Text style={s.titulo}>{o.contato_nome}</Text>
        <Text style={s.subtitulo}>
          Transformamos sonhos em experiências inesquecíveis.
        </Text>

        <View style={s.metaLinha}>
          <View>
            <Text style={s.metaValor}>
              {o.data_evento ? formatDateBR(o.data_evento) : "A definir"}
            </Text>
            <Text style={s.metaRotulo}>Data do evento</Text>
          </View>
          {o.numero_convidados != null ? (
            <View>
              <Text style={s.metaValor}>{o.numero_convidados} convidados</Text>
              <Text style={s.metaRotulo}>Estimativa</Text>
            </View>
          ) : null}
          {local ? (
            <View>
              <Text style={s.metaValor}>{o.local_evento || o.cidade_evento}</Text>
              <Text style={s.metaRotulo}>
                {o.local_evento && o.cidade_evento ? o.cidade_evento : "Local"}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={s.saudacao}>
          Olá, {o.contato_nome}! Preparamos uma proposta personalizada com muito
          carinho para o seu grande dia.
        </Text>

        {/* ---------- INVESTIMENTO: primeiro, é o que converte ---------- */}
        <View style={s.investimento} wrap={false}>
          <Text style={s.investRotulo}>INVESTIMENTO TOTAL</Text>
          <Text style={s.investValor}>{brl(Number(o.valor_total))}</Text>
          <Text style={s.investConvidados}>
            {o.numero_convidados != null
              ? `Até ${o.numero_convidados} convidados`
              : "Valor total da proposta"}
          </Text>
          {conteudo ? (
            <View style={s.condicoes}>
              <View style={{ flex: 1 }}>
                <Text style={s.condicaoNum}>{conteudo.entradaPercentual}%</Text>
                <Text style={s.condicaoRotulo}>Entrada no fechamento</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.condicaoNum}>{conteudo.parcelasMaximo}x</Text>
                <Text style={s.condicaoRotulo}>
                  Sem juros, {conteudo.prazoParcelas}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.condicaoNum}>{conteudo.descontoAVista}%</Text>
                <Text style={s.condicaoRotulo}>Desconto à vista</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ---------- O QUE ESTÁ INCLUSO ---------- */}
        {itens.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>O que está incluso</Text>
            <View style={s.cartao}>
              <View style={s.duasColunas}>
                {itens.map((item) => (
                  <View key={item.id} style={s.colunaMetade}>
                    <Text style={s.itemNome}>{item.nome}</Text>
                    {item.descricao ? (
                      <Text style={s.itemDetalhe}>{item.descricao}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* ---------- SOBRE NÓS ---------- */}
        {conteudo?.sobreNos || stats.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>Sobre nós</Text>
            <View style={s.cartao}>
              {conteudo?.sobreNos ? (
                <Text style={s.texto}>{conteudo.sobreNos}</Text>
              ) : null}
              {stats.length > 0 ? (
                <View style={s.stats}>
                  {stats.map((st) => (
                    <View key={st.r} style={s.statBloco}>
                      <Text style={s.statValor}>{st.v}</Text>
                      <Text style={s.statRotulo}>{st.r}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ---------- COMO FUNCIONA ---------- */}
        {conteudo && conteudo.etapas.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>Como funciona</Text>
            <View style={s.cartao}>
              {conteudo.etapas.map((e, i) => (
                <View key={`${e.titulo}-${i}`} style={s.etapaLinha}>
                  <Text style={s.etapaNum}>
                    {String(i + 1).padStart(2, "0")}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemNome}>{e.titulo}</Text>
                    {e.descricao ? (
                      <Text style={s.itemDetalhe}>{e.descricao}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------- NO DIA DO EVENTO ---------- */}
        {conteudo && conteudo.responsabilidades.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>
              {o.tipo_evento === "casamento"
                ? "No dia do casamento"
                : "No dia do evento"}
            </Text>
            <View style={s.cartao}>
              <View style={s.duasColunas}>
                {conteudo.responsabilidades.map((r, i) => (
                  <View key={`${r}-${i}`} style={s.colunaMetade}>
                    <Text style={s.texto}>• {r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* ---------- PÓS-EVENTO ---------- */}
        {conteudo && conteudo.posEvento.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>Pós-evento</Text>
            <View style={s.cartao}>
              <View style={s.duasColunas}>
                {conteudo.posEvento.map((c, i) => (
                  <View key={`${c.titulo}-${i}`} style={s.colunaMetade}>
                    <Text style={s.itemNome}>{c.titulo}</Text>
                    <Text style={s.itemDetalhe}>{c.descricao}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* ---------- EVENTOS REALIZADOS ---------- */}
        {fotos.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>Eventos realizados</Text>
            <View style={s.galeria}>
              {fotos.slice(0, 4).map((f, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={i} src={f} style={s.foto} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------- PERGUNTAS FREQUENTES ---------- */}
        {conteudo && conteudo.faq.length > 0 ? (
          <View>
            <Text style={s.secaoTitulo}>Perguntas frequentes</Text>
            <View style={s.cartao}>
              {conteudo.faq.map((f, i) => (
                <View key={`${f.pergunta}-${i}`} wrap={false}>
                  <Text style={s.faqPergunta}>{f.pergunta}</Text>
                  <Text style={s.faqResposta}>{f.resposta}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------- DETALHAMENTO DE VALORES ---------- */}
        {itens.length > 0 ? (
          <View wrap={false}>
            <Text style={s.secaoTitulo}>Detalhamento</Text>
            {itens.map((item) => (
              <View key={`v-${item.id}`} style={s.itemLinha}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={s.itemNome}>{item.nome}</Text>
                  {item.tipo_calculo === "por_convidado" ? (
                    <Text style={s.itemDetalhe}>
                      {descricaoCalculoItem(item)}
                    </Text>
                  ) : null}
                </View>
                <Text style={s.itemValor}>
                  {brl(Number(item.valor_calculado))}
                </Text>
              </View>
            ))}
            <View style={s.totalLinha}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>
                TOTAL
              </Text>
              <Text style={s.totalValor}>{brl(Number(o.valor_total))}</Text>
            </View>
          </View>
        ) : null}

        <Text style={s.validade}>
          Proposta válida até {formatDateBR(o.data_validade)} (
          {o.validade_dias} dias). Reserva de data somente com assinatura do
          contrato e pagamento da entrada.
        </Text>

        <View style={s.rodape} fixed>
          <Text>{empresa.nome}</Text>
          {contatoEmpresa ? <Text>{contatoEmpresa}</Text> : <Text> </Text>}
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
