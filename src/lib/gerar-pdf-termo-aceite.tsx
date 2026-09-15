// O termo de aceite em PDF (@react-pdf/renderer — puro JS, roda em route
// handler serverless sem Chromium). SERVER-SIDE APENAS.
//
// É o documento que prova o aceite: o que foi aceito, por quem, a
// assinatura desenhada, quando, de onde (IP e navegador), qual texto foi
// marcado e o hash que amarra tudo isso à linha imutável do banco. Quem
// recebe pode conferir pelo QR — a página pública de verificação diz se o
// recibo e o hash casam.
//
// Fundo branco de propósito: o PNG da assinatura é transparente com traço
// escuro, e o documento vai ser impresso. Helvetica e Courier porque são
// as fontes de fábrica do PDF — o projeto não registra nenhuma.
//
// Quem chama entrega tudo já resolvido (logo e QR em data URI, hash
// calculado pelo banco): este arquivo só desenha. Molde:
// `src/lib/gerar-pdf-orcamento.tsx`.

import type { ReactNode } from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

export type DadosTermoAceite = {
  empresa: { nome: string; logoDataUri: string | null };
  recibo: string;
  tipoEventoLabel: string;
  dataEvento: string | null;
  localEvento: string | null;
  snapshot: {
    pacoteNome: string;
    pacotePreco: number;
    convidados: number;
    convidadosInclusos: number;
    valorPorConvidadoExtra: number;
    valorConvidadosExtra: number;
    extras: { nome: string; preco: number }[];
    valorExtras: number;
    formaPagamento: string;
    parcelas: number | null;
    descontoPercentual: number | null;
    valorDesconto: number | null;
    valorTotal: number;
    valorEntrada: number | null;
    valorParcela: number | null;
  };
  assinante1: {
    nome: string;
    cpf: string | null;
    email: string | null;
    telefone: string | null;
    assinaturaDataUri: string | null;
  };
  assinante2: { nome: string; assinaturaDataUri: string | null } | null;
  /** ISO */
  aceitoEm: string;
  ip: string | null;
  userAgent: string | null;
  termosTexto: string;
  termosVersao: string;
  sha256: string;
  contrato: { nome: string; sha256: string } | null;
  qrDataUri: string;
  urlVerificacao: string;
};

const FUSO = "America/Sao_Paulo";

// O Intl do pt-BR separa "R$" do número com espaço duro (U+00A0). As fontes
// de fábrica do PDF não têm esse glifo — sairia um quadrado — então vira
// espaço comum.
function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(v)
    .replace(/ /g, " ");
}

function percentual(v: number): string {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** `123.456.789-00` (CPF) ou `12.345.678/0001-90` (CNPJ); senão o que veio. */
function cpfFormatado(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Empresa assina com CNPJ (14 dígitos); pessoa, com CPF. */
function rotuloDocumento(cpf: string | null): string {
  return (cpf ?? "").replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF";
}

// A data do evento chega como `yyyy-MM-dd` (sem hora). Montar um Date a
// partir dela passaria pelo fuso do processo e poderia recuar um dia; os
// três pedaços vão direto para o papel.
function dataDoEvento(iso: string | null): string {
  if (!iso) return "a definir";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-BR", { timeZone: FUSO });
}

/** "14 de setembro de 2026, às 15:32:07 (horário de Brasília)". */
function momentoPorExtenso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dia = d.toLocaleDateString("pt-BR", {
    timeZone: FUSO,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return `${dia}, às ${hora} (horário de Brasília)`;
}

function rotuloFormaPagamento(forma: string, parcelas: number | null): string {
  if (forma === "vista") return "À vista";
  if (forma === "parcelado") return parcelas ? `Parcelado em ${parcelas}x` : "Parcelado";
  return forma;
}

const CINZA_TEXTO = "#1F1F1F";
const CINZA_ROTULO = "#6B6B6B";
const CINZA_LINHA = "#DADADA";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: CINZA_TEXTO,
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
  },
  // cabeçalho
  topo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  topoEmpresa: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logo: { maxHeight: 40, maxWidth: 120, objectFit: "contain" },
  empresaNome: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  topoRecibo: { alignItems: "flex-end" },
  reciboRotulo: { fontSize: 7.5, letterSpacing: 1.4, color: CINZA_ROTULO },
  reciboCodigo: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginTop: 2 },
  titulo: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  subtitulo: { fontSize: 10, color: CINZA_ROTULO, marginBottom: 18 },
  // seções
  secaoTitulo: {
    fontSize: 8,
    letterSpacing: 1.4,
    fontFamily: "Helvetica-Bold",
    color: CINZA_ROTULO,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: CINZA_TEXTO,
  },
  linha: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: CINZA_LINHA,
  },
  rotulo: { width: 130, fontSize: 9, color: CINZA_ROTULO, paddingRight: 8 },
  // Sem `flex` aqui de propósito: num Text empilhado em coluna, `flex: 1`
  // zera a altura medida e os textos da mesma célula se sobrepõem.
  valor: { fontSize: 10, lineHeight: 1.4 },
  valorDetalhe: { fontSize: 8.5, color: CINZA_ROTULO, marginTop: 1, lineHeight: 1.4 },
  mono: { fontFamily: "Courier", fontSize: 8 },
  // total
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: CINZA_TEXTO,
  },
  totalRotulo: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totalValor: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  // assinaturas
  // as duas assinaturas lado a lado, num bloco que não se parte: antes cada
  // uma era um bloco próprio e a segunda caía sozinha na página seguinte
  assinaturas: { flexDirection: "row", flexWrap: "wrap", gap: 24, marginTop: 10, marginBottom: 4 },
  assinaturaBloco: {},
  assinaturaImagem: { width: 200, height: 60, objectFit: "contain" },
  assinaturaAusente: {
    width: 200,
    height: 60,
    justifyContent: "flex-end",
    fontSize: 9,
    color: CINZA_ROTULO,
  },
  assinaturaTraco: {
    width: 200,
    borderTopWidth: 0.8,
    borderTopColor: CINZA_TEXTO,
    marginTop: 4,
    paddingTop: 3,
  },
  assinaturaNome: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  assinaturaLegenda: { fontSize: 8, color: CINZA_ROTULO },
  // termos
  termos: { fontSize: 9.5, lineHeight: 1.5, marginTop: 2 },
  // verificação
  verificacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: CINZA_LINHA,
  },
  qr: { width: 90, height: 90 },
  verificacaoTexto: { flex: 1 },
  verificacaoTitulo: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  verificacaoInstrucao: { fontSize: 8.5, color: CINZA_ROTULO, lineHeight: 1.4, marginBottom: 5 },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: CINZA_ROTULO,
  },
});

// Uma linha rótulo + valor. `wrap={false}` porque a linha é pequena e,
// partida entre páginas, o rótulo ficaria numa página e o valor na outra.
function Linha({
  rotulo,
  children,
  detalhe,
}: {
  rotulo: string;
  children: ReactNode;
  detalhe?: string | null;
}) {
  return (
    <View style={s.linha} wrap={false}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.valor}>{children}</Text>
        {detalhe ? <Text style={s.valorDetalhe}>{detalhe}</Text> : null}
      </View>
    </View>
  );
}

function Assinatura({
  nome,
  legenda,
  dataUri,
}: {
  nome: string;
  legenda: string;
  dataUri: string | null;
}) {
  return (
    <View style={s.assinaturaBloco}>
      {dataUri ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={dataUri} style={s.assinaturaImagem} />
      ) : (
        <View style={s.assinaturaAusente}>
          <Text>assinatura não registrada</Text>
        </View>
      )}
      <View style={s.assinaturaTraco}>
        <Text style={s.assinaturaNome}>{nome}</Text>
        <Text style={s.assinaturaLegenda}>{legenda}</Text>
      </View>
    </View>
  );
}

function TermoAceitePdf(d: DadosTermoAceite) {
  const sn = d.snapshot;
  const excedentes = Math.max(0, sn.convidados - sn.convidadosInclusos);
  const temDesconto = (sn.descontoPercentual ?? 0) > 0;
  const navegador = d.userAgent ? d.userAgent.slice(0, 120) : null;

  return (
    <Document title={`Termo de aceite — ${d.recibo}`} author={d.empresa.nome}>
      <Page size="A4" style={s.page}>
        {/* ---------- CABEÇALHO ---------- */}
        <View style={s.topo}>
          <View style={s.topoEmpresa}>
            {d.empresa.logoDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={d.empresa.logoDataUri} style={s.logo} />
            ) : null}
            <Text style={s.empresaNome}>{d.empresa.nome}</Text>
          </View>
          <View style={s.topoRecibo}>
            <Text style={s.reciboRotulo}>RECIBO</Text>
            <Text style={s.reciboCodigo}>{d.recibo}</Text>
          </View>
        </View>

        <Text style={s.titulo}>TERMO DE ACEITE DE PROPOSTA</Text>
        <Text style={s.subtitulo}>
          Proposta de {d.tipoEventoLabel} — {d.empresa.nome}
        </Text>

        {/* ---------- O QUE FOI ACEITO ---------- */}
        <Text style={s.secaoTitulo}>O QUE FOI ACEITO</Text>
        <Linha rotulo="Tipo de evento">{d.tipoEventoLabel}</Linha>
        <Linha rotulo="Data do evento">{dataDoEvento(d.dataEvento)}</Linha>
        {d.localEvento ? <Linha rotulo="Local">{d.localEvento}</Linha> : null}
        <Linha rotulo="Pacote" detalhe={brl(sn.pacotePreco)}>
          {sn.pacoteNome}
        </Linha>
        <Linha
          rotulo="Convidados"
          detalhe={
            `${sn.convidadosInclusos} inclusos no pacote; ${brl(sn.valorPorConvidadoExtra)} por convidado a mais` +
            (excedentes > 0
              ? `. ${excedentes} a mais: ${brl(sn.valorConvidadosExtra)}`
              : "")
          }
        >
          {sn.convidados} convidados
        </Linha>
        <View style={s.linha} wrap={false}>
          <Text style={s.rotulo}>Extras</Text>
          <View style={{ flex: 1 }}>
            {sn.extras.length === 0 ? (
              <Text style={s.valor}>nenhum</Text>
            ) : (
              sn.extras.map((e, i) => (
                <Text key={`${e.nome}-${i}`} style={s.valor}>
                  {e.nome} — {brl(e.preco)}
                </Text>
              ))
            )}
            {sn.extras.length > 1 ? (
              <Text style={s.valorDetalhe}>Total dos extras: {brl(sn.valorExtras)}</Text>
            ) : null}
          </View>
        </View>
        <Linha rotulo="Forma de pagamento">
          {rotuloFormaPagamento(sn.formaPagamento, sn.parcelas)}
        </Linha>
        {sn.valorEntrada != null ? (
          <Linha rotulo="Entrada">{brl(sn.valorEntrada)}</Linha>
        ) : null}
        {sn.parcelas && sn.valorParcela != null ? (
          <Linha rotulo="Parcelas">
            {sn.parcelas}x de {brl(sn.valorParcela)}
          </Linha>
        ) : null}
        {temDesconto ? (
          <Linha rotulo="Desconto">
            {percentual(sn.descontoPercentual ?? 0)}
            {sn.valorDesconto != null ? ` (${brl(sn.valorDesconto)})` : ""}
          </Linha>
        ) : null}
        <View style={s.totalLinha} wrap={false}>
          <Text style={s.totalRotulo}>VALOR TOTAL ACEITO</Text>
          <Text style={s.totalValor}>{brl(sn.valorTotal)}</Text>
        </View>

        {/* ---------- QUEM ACEITOU ---------- */}
        <Text style={s.secaoTitulo}>QUEM ACEITOU</Text>
        <Linha rotulo="Nome">{d.assinante1.nome}</Linha>
        <Linha rotulo={rotuloDocumento(d.assinante1.cpf)}>
          {d.assinante1.cpf ? cpfFormatado(d.assinante1.cpf) : "não informado"}
        </Linha>
        <Linha rotulo="E-mail">{d.assinante1.email ?? "não informado"}</Linha>
        <Linha rotulo="Telefone">{d.assinante1.telefone ?? "não informado"}</Linha>
        {d.assinante2 ? (
          <Linha rotulo="Segundo assinante">{d.assinante2.nome}</Linha>
        ) : null}

        <View style={s.assinaturas} wrap={false}>
          <Assinatura
            nome={d.assinante1.nome}
            legenda="Assinatura eletrônica"
            dataUri={d.assinante1.assinaturaDataUri}
          />
          {d.assinante2 ? (
            <Assinatura
              nome={d.assinante2.nome}
              legenda="Assinatura do segundo assinante"
              dataUri={d.assinante2.assinaturaDataUri}
            />
          ) : null}
        </View>

        {/* ---------- REGISTRO ---------- */}
        <Text style={s.secaoTitulo}>REGISTRO</Text>
        <Linha rotulo="Aceito em">{momentoPorExtenso(d.aceitoEm)}</Linha>
        <Linha rotulo="Endereço IP">{d.ip ?? "não registrado"}</Linha>
        <Linha rotulo="Navegador">{navegador ?? "não registrado"}</Linha>
        <View style={s.linha} wrap={false}>
          <Text style={s.rotulo}>Termos aceitos (versão {d.termosVersao})</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.termos}>{d.termosTexto}</Text>
          </View>
        </View>
        <View style={s.linha} wrap={false}>
          <Text style={s.rotulo}>SHA-256 do conteúdo</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.mono}>{d.sha256}</Text>
          </View>
        </View>

        {/* ---------- CONTRATO ANEXO ---------- */}
        {d.contrato ? (
          <View>
            <Text style={s.secaoTitulo}>CONTRATO ANEXO</Text>
            <Linha rotulo="Arquivo">{d.contrato.nome}</Linha>
            <View style={s.linha} wrap={false}>
              <Text style={s.rotulo}>SHA-256 do arquivo</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.mono}>{d.contrato.sha256}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ---------- VERIFICAÇÃO ---------- */}
        <View style={s.verificacao} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={d.qrDataUri} style={s.qr} />
          <View style={s.verificacaoTexto}>
            <Text style={s.verificacaoTitulo}>Verificação deste termo</Text>
            <Text style={s.verificacaoInstrucao}>
              Aponte a câmera para o código ou abra o endereço abaixo. A página
              confirma o recibo, a data e o hash deste documento.
            </Text>
            <Text style={s.mono}>{d.urlVerificacao}</Text>
          </View>
        </View>

        <View style={s.rodape} fixed>
          <Text>
            Termo de aceite · Recibo {d.recibo} · {d.empresa.nome}
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

export async function gerarPdfTermoAceite(d: DadosTermoAceite): Promise<Buffer> {
  return renderToBuffer(<TermoAceitePdf {...d} />);
}
