// Receita — quanto entra, por que o MRR mudou, a cobrança, os custos, o
// resultado, o caixa e a retenção.
//
// O princípio da tela: número sem denominador vira "—" com a explicação
// do que falta, nunca zero inventado. No começo quase tudo fica em "—" e
// isso é CORRETO: churn sem base de clientes não existe.
//
// De onde vem cada coisa (17/09/2026):
//   · MRR, churn, NRR, CAC, LTV e o movimento do MRR: o histórico de
//     assinaturas (assinatura_eventos), já sem repetições;
//   · recebido: o que a operadora CONFIRMOU como pago (avisos guardados);
//   · custos, gasto de marketing, saldo de caixa e alíquota: o que o dono
//     lança em Ajustes. Resultado de gestão, não contábil.
//
// Estado zero de cliente: mês e período viajam em search param
// (?mes=2026-09&periodo=tri).

import { Fragment } from "react";
import Link from "next/link";
import { getSerieMensal } from "@/lib/supabase/admin-painel";
import { getResumoDasContas } from "@/lib/supabase/admin-contas";
import {
  CATEGORIAS_DE_CUSTO,
  CATEGORIAS_DE_OPERACAO,
  getAjustes,
  getCustos,
  getPagamentosEAvisos,
  getSaldosDeCaixa,
} from "@/lib/supabase/admin-receita";
import {
  agruparEmAnos,
  agruparEmTrimestres,
  contarDatasNoMes,
  contarEventosDoMes,
  coortesMensais,
  deltaEmTexto,
  media,
  mesAnterior,
  mesesAte,
  metrica,
  movimentoDoMrr,
  rotuloMesAno,
  rotuloMesCurto,
  tempoMedioComoCliente,
  variacaoEmTexto,
  variacaoPct,
  type PeriodoAgregado,
} from "@/lib/admin-metricas";
import {
  canalDaOrigem,
  cobrancaPendente,
  motivosDeAtencao,
  veioDeAnuncio,
  type ResumoDaConta,
} from "@/lib/admin/saude-da-conta";
import { dataBR, mesPorExtenso, plural, reais } from "@/lib/admin/formatos";
import { hojeBR } from "@/lib/tempo";
import { Aviso, Cabecalho, Secao, Vazio } from "@/components/admin/pecas";

export const dynamic = "force-dynamic";

// A mono do projeto (IBM Plex Mono, carregada na raiz). Números em fonte
// tabular ao lado de texto proporcional é o que faz a tela ser lida como
// painel e não como página.
const MONO = "var(--font-mono), ui-monospace, monospace";

type Periodo = "mes" | "tri" | "ano";
/**
 * `parcial` = o grupo não tem todos os meses dentro da janela (trimestre
 * ou ano em curso, ou o grupo mais antigo cortado pela ponta). A barra
 * sai naturalmente mais baixa, e sem marcação o dono lê queda de receita
 * onde só faltam meses de soma.
 */
type Barra = {
  chave: string;
  rotulo: string;
  valor: number;
  parcial?: boolean;
};

// ------------------------------------------------------------------
// Peças
// ------------------------------------------------------------------

function Kpi({ rotulo, valor, legenda }: { rotulo: string; valor: string; legenda: string }) {
  return (
    <div className="rounded-lg border border-[#dededa] bg-white px-[18px] py-4">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#84858b]" style={{ fontFamily: MONO }}>
        {rotulo}
      </p>
      <p className="mt-2 text-[26px] font-medium leading-none text-[#1c1d21]" style={{ fontFamily: MONO }}>
        {valor}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-[#5c5d63]">{legenda}</p>
    </div>
  );
}

/** Tile dos blocos. `nota` explica o que falta quando o valor é "—". */
function Tile({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-md border border-[#dededa] bg-white p-3">
      <p className="text-[11px] leading-tight text-[#5c5d63]">{rotulo}</p>
      <p className="mt-1.5 text-[17px] font-medium text-[#1c1d21]" style={{ fontFamily: MONO }}>
        {valor}
      </p>
      {nota && <p className="mt-1 text-[11px] leading-snug text-[#84858b]">{nota}</p>}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-[#1c1d21]">{titulo}</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function Grafico({ titulo, faixa, barras }: { titulo: string; faixa: string; barras: Barra[] }) {
  const temParcial = barras.some((b) => b.parcial);
  // Sem biblioteca de gráfico: um <svg> montado do array. Doze retângulos
  // não justificam 40 kB de JavaScript no navegador do dono.
  const BASE = 150;
  const TOPO = 4;
  const max = barras.reduce((x, b) => Math.max(x, b.valor), 0);
  const passo = 600 / Math.max(barras.length, 1);
  const largura = Math.max(6, Math.min(34, passo * 0.68));
  // Cinza que escurece com o tempo: o olho segue a barra mais escura sem
  // precisar de legenda, e o mês corrente fecha em chumbo.
  const tons = ["#d0d1ce", "#b0b1b0", "#84858b", "#55565c"];

  return (
    <div className="rounded-lg border border-[#dededa] bg-white px-5 py-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-[#1c1d21]">{titulo}</p>
        <p className="text-right text-[11px] text-[#84858b]" style={{ fontFamily: MONO }}>
          {faixa}
        </p>
      </div>
      <svg viewBox="0 0 600 170" width="100%" height="190" className="mt-3 block" role="img" aria-label={titulo}>
        <line x1="0" y1={BASE} x2="600" y2={BASE} stroke="#b8b9b6" />
        <line x1="0" y1="100" x2="600" y2="100" stroke="#e2e2de" />
        <line x1="0" y1="50" x2="600" y2="50" stroke="#e2e2de" />
        {max > 0 &&
          barras.map((b, i) => {
            if (b.valor <= 0) return null; // mês sem receita não vira tarja
            const altura = Math.max(2, (b.valor / max) * (BASE - TOPO));
            const ultimo = i === barras.length - 1;
            const cor = ultimo
              ? "#33343a"
              : tons[Math.min(tons.length - 1, Math.floor((i / barras.length) * tons.length))];
            return (
              <rect
                key={b.chave}
                x={i * passo + (passo - largura) / 2}
                y={BASE - altura}
                width={largura}
                height={altura}
                fill={cor}
                // barra vazada = período que ainda não fechou
                fillOpacity={b.parcial ? 0.4 : 1}
              />
            );
          })}
        {max === 0 && (
          <text x="300" y="96" textAnchor="middle" fontSize="12" fill="#84858b" style={{ fontFamily: MONO }}>
            sem receita registrada nesta janela
          </text>
        )}
        {barras.map((b, i) => (
          <text
            key={`rotulo-${b.chave}`}
            x={i * passo + passo / 2}
            y="165"
            textAnchor="middle"
            fontSize="10"
            fill={i === barras.length - 1 ? "#1c1d21" : "#84858b"}
            style={{ fontFamily: MONO }}
          >
            {b.rotulo}
            {b.parcial ? "*" : ""}
          </text>
        ))}
      </svg>
      {temParcial && (
        <p className="mt-1 text-[11px] leading-snug text-[#84858b]">
          * período incompleto — soma só dos meses que existem nesta janela.
        </p>
      )}
    </div>
  );
}

function Trimestral({ tris }: { tris: PeriodoAgregado[] }) {
  const max = tris.reduce((x, t) => Math.max(x, t.receita), 0);
  // Só trimestre FECHADO entra na comparação.
  const fechados = tris.filter((t) => t.completo);
  const atual = fechados[fechados.length - 1];
  const passado = fechados[fechados.length - 2];
  const variacao = variacaoPct(passado?.receita ?? null, atual?.receita ?? null);
  const emCurso = tris.some((t) => !t.completo);
  const tons = ["#d0d1ce", "#b0b1b0", "#84858b", "#33343a"];

  return (
    <div className="rounded-lg border border-[#dededa] bg-white px-5 py-[18px]">
      <p className="text-[13px] font-semibold text-[#1c1d21]">Comparativo trimestral</p>
      <p className="mb-3.5 mt-[3px] text-[11px] text-[#84858b]" style={{ fontFamily: MONO }}>
        soma do MRR dos meses
      </p>
      <div className="grid text-[12px] text-[#3d3e44]" style={{ gridTemplateColumns: "auto 1fr", gap: "9px 14px", fontFamily: MONO }}>
        <span className="text-[10.5px] text-[#84858b]">TRI</span>
        <span className="text-right text-[10.5px] text-[#84858b]">RECEITA</span>
        {tris.map((t, i) => {
          const corrente = i === tris.length - 1;
          const cor = corrente ? "text-[#1c1d21]" : "";
          return (
            <Fragment key={t.chave}>
              <span className={cor}>
                {t.rotulo}
                {t.completo ? "" : "*"}
              </span>
              <span className={`text-right ${cor}`}>{metrica(t.receita)}</span>
            </Fragment>
          );
        })}
      </div>
      {max > 0 && (
        <div className="mt-4 grid h-[70px] grid-cols-4 items-end gap-2">
          {tris.map((t, i) => (
            <div
              key={`barra-${t.chave}`}
              className="rounded-t-sm"
              style={{
                height: `${Math.max(2, (t.receita / max) * 100)}%`,
                background: tons[Math.min(tons.length - 1, i)],
                opacity: t.completo ? 1 : 0.4,
              }}
            />
          ))}
        </div>
      )}
      <p className="mt-2.5 text-[12px] leading-snug text-[#5c5d63]">
        {!atual || !passado
          ? "faltam dois trimestres fechados para comparar"
          : variacao === null
            ? `${passado.rotulo} sem receita — não há de onde comparar ${atual.rotulo}`
            : `${atual.rotulo} vs ${passado.rotulo}: receita ${variacaoEmTexto(variacao)}`}
      </p>
      {emCurso && <p className="mt-1 text-[11px] leading-[1.5] text-[#84858b]">* trimestre em curso, fora da comparação.</p>}
    </div>
  );
}

function LinhaRel({ rotulo, antes, agora, delta, forte }: { rotulo: string; antes: string; agora: string; delta: string; forte?: boolean }) {
  const borda = forte ? "border-t border-[#33343a] pt-2" : "";
  return (
    <>
      <span className={`text-[12.5px] ${forte ? "font-bold text-[#1c1d21]" : "text-[#3d3e44]"} ${borda}`}>{rotulo}</span>
      <span className={`text-right text-[12.5px] text-[#5c5d63] ${borda}`} style={{ fontFamily: MONO }}>
        {antes}
      </span>
      <span className={`text-right text-[12.5px] text-[#1c1d21] ${forte ? "font-semibold" : ""} ${borda}`} style={{ fontFamily: MONO }}>
        {agora}
      </span>
      <span className={`w-[52px] text-right text-[12.5px] text-[#1c1d21] ${borda}`} style={{ fontFamily: MONO }}>
        {delta}
      </span>
    </>
  );
}

function SecaoRel({ children }: { children: React.ReactNode }) {
  return (
    <span className="col-span-full pt-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#84858b]" style={{ fontFamily: MONO }}>
      {children}
    </span>
  );
}

/** Uma linha "rótulo ........ valor" das contas do mês. */
function Conta({ rotulo, valor, forte, sinal }: { rotulo: string; valor: string; forte?: boolean; sinal?: "+" | "−" }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 text-[13px] ${forte ? "border-t border-[#33343a] font-semibold text-[#1c1d21]" : "text-[#3d3e44]"}`}>
      <span>{rotulo}</span>
      <span style={{ fontFamily: MONO }}>
        {sinal ? `${sinal} ` : ""}
        {valor}
      </span>
    </div>
  );
}

function Periodos({ mes, atual }: { mes: string; atual: Periodo }) {
  // Link, não botão: o período é endereço.
  const itens: { chave: Periodo; rotulo: string }[] = [
    { chave: "mes", rotulo: "Mês" },
    { chave: "tri", rotulo: "Trimestre" },
    { chave: "ano", rotulo: "Ano" },
  ];
  return (
    <div className="flex overflow-hidden rounded-md border border-[#d3d3cf] text-[12px] font-semibold">
      {itens.map((i) => (
        <Link
          key={i.chave}
          href={`/admin/receita?mes=${mes}&periodo=${i.chave}`}
          aria-current={i.chave === atual ? "true" : undefined}
          className={i.chave === atual ? "bg-[#33343a] px-3 py-[7px] text-white" : "px-3 py-[7px] text-[#5c5d63] hover:bg-white"}
        >
          {i.rotulo}
        </Link>
      ))}
    </div>
  );
}

function pct(v: number | null): string {
  return v === null ? "—" : `${(Math.round(v * 10) / 10).toLocaleString("pt-BR")}%`;
}

// ------------------------------------------------------------------
// A tela
// ------------------------------------------------------------------

export default async function AdminReceitaPage({
  searchParams,
}: {
  searchParams?: { mes?: string; periodo?: string };
}) {
  const hoje = hojeBR();
  const mesAtual = hoje.slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(searchParams?.mes ?? "") ? searchParams!.mes! : mesAtual;
  const periodo: Periodo = ["mes", "tri", "ano"].includes(searchParams?.periodo ?? "")
    ? (searchParams!.periodo! as Periodo)
    : "mes";

  const quantosMeses = periodo === "ano" ? 36 : periodo === "tri" ? 24 : 12;
  const janela = mesesAte(mes, 13);
  const [serieLida, resumo, custosLidos, caixa, ajustes, operadora] = await Promise.all([
    getSerieMensal(mes, quantosMeses),
    getResumoDasContas(),
    getCustos(janela[0], mes),
    getSaldosDeCaixa(),
    getAjustes(),
    getPagamentosEAvisos(`${janela[0]}-01T03:00:00Z`),
  ]);
  const { meses: serie, eventos, criadasEm, contasDaCasa } = serieLida;
  const contas: ResumoDaConta[] = resumo.ok ? resumo.dados.filter((c) => !c.da_casa) : [];
  const contaPor = new Map(contas.map((c) => [c.empresa_id, c]));

  const m = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  const mesPassado = mesAnterior(mes);

  // ---------- gráfico ----------
  const tris = agruparEmTrimestres(serie);
  const barras: Barra[] =
    periodo === "mes"
      ? serie.slice(-12).map((x) => ({ chave: x.mes, rotulo: rotuloMesCurto(x.mes), valor: x.mrr }))
      : periodo === "tri"
        ? tris.slice(-8).map((t) => ({ chave: t.chave, rotulo: t.rotulo, valor: t.receita, parcial: !t.completo }))
        : agruparEmAnos(serie)
            .slice(-3)
            .map((a) => ({ chave: a.chave, rotulo: a.rotulo, valor: a.receita, parcial: !a.completo }));
  const tituloGrafico =
    periodo === "mes" ? "MRR — últimos 12 meses" : periodo === "tri" ? "Receita — últimos 8 trimestres" : "Receita — últimos 3 anos";
  const faixaGrafico =
    periodo === "mes"
      ? `R$ · ${rotuloMesAno(serie[serie.length - 12].mes)} → ${rotuloMesAno(m.mes)}`
      : "R$ · soma do MRR do período";

  // ---------- crescimento ----------
  const mrrMesAMes = variacaoPct(anterior?.mrr ?? null, m.mrr);
  const trisFechados = tris.filter((t) => t.completo);
  const ultimoTri = trisFechados[trisFechados.length - 1];
  const penultimoTri = trisFechados[trisFechados.length - 2];
  const triEmCurso = tris[tris.length - 1]?.completo === false ? tris[tris.length - 1] : null;
  const receitaTriATri = variacaoPct(penultimoTri?.receita ?? null, ultimoTri?.receita ?? null);
  const novasPorMes = media(serie.slice(-12).map((x) => x.novasNoMes));

  // ---------- relatório: movimento de contas ----------
  const cAntes = contarEventosDoMes(eventos, mesPassado);
  const cAgora = contarEventosDoMes(eventos, mes);
  const criadasAntes = contarDatasNoMes(criadasEm, mesPassado);
  const criadasAgora = contarDatasNoMes(criadasEm, mes);
  const rotAntes = rotuloMesCurto(mesPassado).toUpperCase();
  const rotAgora = rotuloMesCurto(mes).toUpperCase();
  const linhasAssinaturas: { rotulo: string; tipo: keyof typeof cAgora }[] = [
    { rotulo: "Upgrades", tipo: "upgrade" },
    { rotulo: "Downgrades", tipo: "downgrade" },
    { rotulo: "Pausas", tipo: "pausa" },
    { rotulo: "Retomadas", tipo: "retomada" },
    { rotulo: "Cancelamentos", tipo: "cancelamento" },
    { rotulo: "Reativações", tipo: "reativacao" },
  ];

  // ---------- movimento do MRR ----------
  const mov = movimentoDoMrr(eventos, mes);

  // ---------- recebido, custos e resultado ----------
  const recebidoDo = (x: string) =>
    operadora.pagamentos.filter((p) => p.dia.slice(0, 7) === x).reduce((s, p) => s + p.valor, 0);
  const custosDo = (x: string) => custosLidos.custos.filter((c) => c.mes === x);
  const marketingDo = (x: string) => serie.find((s) => s.mes === x)?.gastoMarketing ?? null;
  const recebido = recebidoDo(mes);
  const custosMes = custosDo(mes);
  const temCustos = custosMes.length > 0;
  const custoOperacao = custosMes.filter((c) => CATEGORIAS_DE_OPERACAO.includes(c.categoria)).reduce((s, c) => s + c.valor, 0);
  const impostosLancados = custosMes.filter((c) => c.categoria === "impostos").reduce((s, c) => s + c.valor, 0);
  const custosSemImpostos = custosMes.filter((c) => c.categoria !== "impostos").reduce((s, c) => s + c.valor, 0);
  const aPagar = custosMes.filter((c) => !c.pago).reduce((s, c) => s + c.valor, 0);
  const marketing = marketingDo(mes) ?? 0;
  const impostoEstimado =
    impostosLancados === 0 && ajustes.aliquotaImposto !== null ? (recebido * ajustes.aliquotaImposto) / 100 : null;
  const impostos = impostosLancados > 0 ? impostosLancados : impostoEstimado ?? 0;
  const ebitda = temCustos ? recebido - custosSemImpostos - marketing : null;
  const resultado = ebitda !== null ? ebitda - impostos : null;
  const margemBruta = temCustos && recebido > 0 ? ((recebido - custoOperacao) / recebido) * 100 : null;
  const margemEbitda = ebitda !== null && recebido > 0 ? (ebitda / recebido) * 100 : null;
  const margemLiquida = resultado !== null && recebido > 0 ? (resultado / recebido) * 100 : null;
  const custoSobreReceita = temCustos && recebido > 0 ? ((custosSemImpostos + marketing) / recebido) * 100 : null;
  const arpu = m.assinantesAtivos > 0 ? m.mrr / m.assinantesAtivos : null;
  const paybackCac =
    m.cac !== null && arpu !== null && margemBruta !== null && margemBruta > 0 ? m.cac / (arpu * (margemBruta / 100)) : null;

  // ---------- caixa ----------
  const saldo = caixa.saldos[0] ?? null;
  const ultimos3 = janela.filter((x) => x < mesAtual).slice(-3);
  const queimas = ultimos3.map((x) => {
    const saida = custosDo(x).reduce((s, c) => s + c.valor, 0) + (marketingDo(x) ?? 0);
    return saida - recebidoDo(x);
  });
  const temHistoricoDeCaixa = ultimos3.some((x) => custosDo(x).length > 0 || recebidoDo(x) > 0);
  const queimaMedia = temHistoricoDeCaixa ? media(queimas) : null;
  const mesesDeCaixa = saldo && queimaMedia !== null && queimaMedia > 0 ? saldo.valor / queimaMedia : null;
  const recorrentes = custosDo(mesAtual).filter((c) => c.recorrente).reduce((s, c) => s + c.valor, 0);
  const marketingMedio = media(ultimos3.map((x) => marketingDo(x) ?? 0)) ?? 0;
  const impostoSobreMrr = ajustes.aliquotaImposto !== null ? (m.mrr * ajustes.aliquotaImposto) / 100 : 0;
  const saldoMensalProjetado = m.mrr - recorrentes - marketingMedio - impostoSobreMrr;

  // ---------- cobrança ----------
  const avisosDoMes = operadora.avisos.filter((a) => a.dia.slice(0, 7) === mes);
  const aprovados = operadora.pagamentos.filter((p) => p.dia.slice(0, 7) === mes).length;
  const recusados = avisosDoMes.filter((a) => a.tipo.endsWith("payment_failed")).length;
  const canceladasPelaOperadora = avisosDoMes.filter((a) => a.tipo === "subscription.canceled").length;
  const comCobrancaPendente = contas.filter((c) => cobrancaPendente(c));
  const cartoesVencendo = contas.filter((c) => motivosDeAtencao(c, new Date()).some((x) => x.chave === "cartao_vencendo"));
  const emCortesia = contas.filter(
    (c) => c.assinatura?.status === "cancelada" && !c.congelada && c.congela_em && c.congela_em >= hoje && c.assinatura.tem_gateway
  );
  // recuperada: pagamento que veio depois de uma recusa da mesma conta
  const recuperacoes: number[] = [];
  let receitaRecuperada = 0;
  for (const p of operadora.pagamentos.filter((x) => x.dia.slice(0, 7) === mes)) {
    const recusa = operadora.avisos
      .filter((a) => a.empresaId === p.empresaId && a.tipo.endsWith("payment_failed") && a.dia <= p.dia)
      .sort((a, b) => b.dia.localeCompare(a.dia))[0];
    const pagoAntes = operadora.pagamentos.some(
      (q) => q.empresaId === p.empresaId && recusa && q.dia >= recusa.dia && q.dia < p.dia
    );
    if (recusa && !pagoAntes) {
      receitaRecuperada += p.valor;
      recuperacoes.push(
        (Date.UTC(+p.dia.slice(0, 4), +p.dia.slice(5, 7) - 1, +p.dia.slice(8, 10)) -
          Date.UTC(+recusa.dia.slice(0, 4), +recusa.dia.slice(5, 7) - 1, +recusa.dia.slice(8, 10))) /
          86_400_000
      );
    }
  }
  const receitaPerdida = mov.cancelamentos;

  // ---------- retenção ----------
  const tempoMedio = tempoMedioComoCliente(eventos, hoje);
  const coortes = coortesMensais(eventos, mesAtual);
  const motivosDeSaida = contas
    .filter((c) => c.assinatura?.status === "cancelada" && c.assinatura.motivo_cancelamento)
    .sort((a, b) => String(b.assinatura?.cancelada_em).localeCompare(String(a.assinatura?.cancelada_em)))
    .slice(0, 10);

  // ---------- receita por plano e por origem; CAC pago × orgânico ----------
  const pagantesHoje = contas.filter((c) => c.assinatura?.status === "ativa" || c.assinatura?.status === "inadimplente");
  const somaPor = (chave: (c: ResumoDaConta) => string) => {
    const mapa = new Map<string, { contas: number; valor: number }>();
    for (const c of pagantesHoje) {
      const k = chave(c);
      const atual = mapa.get(k) ?? { contas: 0, valor: 0 };
      mapa.set(k, { contas: atual.contas + 1, valor: atual.valor + (Number(c.assinatura?.valor_mensal) || 0) });
    }
    return [...mapa.entries()].sort((a, b) => b[1].valor - a[1].valor);
  };
  const porPlano = somaPor((c) => c.assinatura?.plano ?? "—");
  const porOrigem = somaPor((c) =>
    c.origem ? canalDaOrigem(c.origem.utm_source, c.origem.utm_medium, c.origem.gclid) : "Sem origem registrada"
  );
  const novasDoMes = eventos.filter((e) => e.tipo === "inicio" && e.em.slice(0, 7) === mes).map((e) => e.empresaId);
  const novasPagas = novasDoMes.filter((id) => {
    const c = contaPor.get(id);
    return c ? veioDeAnuncio(c) : false;
  }).length;
  const cacPago = m.gastoMarketing !== null && novasPagas > 0 ? m.gastoMarketing / novasPagas : null;

  return (
    <div data-adm-secao="receita" className="flex flex-col gap-[22px]">
      <Cabecalho
        titulo={`Receita · ${mesPorExtenso(mes)}`}
        linha={
          <>
            {m.assinantesAtivos} assinantes ativos · {m.novasNoMes} novas no mês · {m.canceladasNoMes} canceladas
            {contasDaCasa > 0 && (
              <span className="block text-[12px] text-[#8b8c91]">
                {contasDaCasa} {contasDaCasa === 1 ? "conta da casa fica" : "contas da casa ficam"} fora de todos os números
              </span>
            )}
          </>
        }
        lado={
          <>
            <Periodos mes={mes} atual={periodo} />
            <Link
              href="/admin/ajustes"
              className="rounded-md bg-[#33343a] px-3.5 py-[7px] text-[12px] font-semibold text-white hover:bg-[#4d4e55]"
            >
              Lançar custos e gastos
            </Link>
          </>
        }
      />

      {!resumo.ok && <Aviso>{resumo.mensagem}</Aviso>}

      {/* ---------- faixa de KPIs ---------- */}
      <section id="financeiro" className="grid scroll-mt-6 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="MRR"
          valor={metrica(m.mrr, "R$ ")}
          legenda={
            mrrMesAMes === null
              ? `sem MRR em ${rotuloMesAno(mesPassado)} para comparar`
              : `${variacaoEmTexto(mrrMesAMes)} vs ${rotuloMesAno(mesPassado)} · ARR ${metrica(m.arr, "R$ ")}`
          }
        />
        <Kpi
          rotulo="Recebido no mês"
          valor={reais(recebido)}
          legenda="pagamentos que a operadora confirmou"
        />
        <Kpi
          rotulo="Resultado do mês"
          valor={resultado === null ? "—" : reais(Math.round(resultado * 100) / 100)}
          legenda={
            resultado === null
              ? "lance os custos do mês em Ajustes"
              : `recebido − custos − marketing − impostos${impostoEstimado !== null ? " (estimados)" : ""} · gestão, não contábil`
          }
        />
        <Kpi
          rotulo="Churn de receita"
          valor={metrica(m.churnReceitaPct, "", "%")}
          legenda={
            m.churnReceitaPct === null
              ? "sem MRR no início do mês"
              : `NRR ${metrica(m.nrrPct, "", "%")} · churn de contas ${metrica(m.churnContasPct, "", "%")}`
          }
        />
      </section>

      {/* ---------- gráfico + trimestre ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-[1.6fr_1fr]">
        <Grafico titulo={tituloGrafico} faixa={faixaGrafico} barras={barras} />
        <Trimestral tris={tris.slice(-4)} />
      </section>

      {/* ---------- movimento do MRR + contas do mês ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-2">
        <Secao titulo="Por que o MRR mudou" nota="Do histórico de assinaturas: começo do mês, o que entrou, o que saiu.">
          <Conta rotulo="MRR no começo do mês" valor={reais(mov.inicio)} />
          <Conta rotulo="Novas assinaturas" valor={reais(mov.novas)} sinal="+" />
          <Conta rotulo="Subidas de plano" valor={reais(mov.upgrades)} sinal="+" />
          <Conta rotulo="Voltaram a pagar" valor={reais(mov.reativacoes + mov.retomadas)} sinal="+" />
          <Conta rotulo="Descidas de plano" valor={reais(mov.downgrades)} sinal="−" />
          <Conta rotulo="Pausas" valor={reais(mov.pausas)} sinal="−" />
          <Conta rotulo="Cancelamentos" valor={reais(mov.cancelamentos)} sinal="−" />
          <Conta rotulo={mes === mesAtual ? "MRR hoje" : "MRR no fim do mês"} valor={reais(mov.fim)} forte />
        </Secao>

        <Secao
          titulo="Contas do mês"
          nota={temCustos ? "Resultado de gestão: o recebido menos o que você lançou." : "Sem custos lançados neste mês: o resultado fica em “—”."}
        >
          <Conta rotulo="Recebido (operadora)" valor={reais(recebido)} />
          {CATEGORIAS_DE_CUSTO.filter((cat) => cat.chave !== "impostos").map((cat) => {
            const v = custosMes.filter((c) => c.categoria === cat.chave).reduce((s, c) => s + c.valor, 0);
            return v > 0 ? <Conta key={cat.chave} rotulo={cat.rotulo} valor={reais(v)} sinal="−" /> : null;
          })}
          <Conta rotulo="Marketing" valor={m.gastoMarketing === null ? "não informado" : reais(marketing)} sinal={m.gastoMarketing === null ? undefined : "−"} />
          <Conta
            rotulo={impostosLancados > 0 ? "Impostos" : impostoEstimado !== null ? `Impostos (estimativa, ${ajustes.aliquotaImposto}%)` : "Impostos"}
            valor={impostosLancados > 0 || impostoEstimado !== null ? reais(Math.round(impostos * 100) / 100) : "não informado"}
            sinal={impostosLancados > 0 || impostoEstimado !== null ? "−" : undefined}
          />
          <Conta rotulo="Resultado" valor={resultado === null ? "—" : reais(Math.round(resultado * 100) / 100)} forte />
          {aPagar > 0 && <p className="mt-1 text-[12px] text-[#6e3f5f]">{reais(aPagar)} destes custos ainda estão a pagar.</p>}
        </Secao>
      </section>

      {/* ---------- cobrança + caixa ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-2">
        <Secao titulo="Cobrança" nota="Dos avisos da operadora e das assinaturas de clientes.">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <Tile rotulo="Pagamentos aprovados no mês" valor={String(aprovados)} />
            <Tile rotulo="Cobranças recusadas no mês" valor={String(recusados)} />
            <Tile rotulo="Canceladas pela operadora no mês" valor={String(canceladasPelaOperadora)} />
            <Tile rotulo="Receita recuperada" valor={reais(receitaRecuperada)} nota={recuperacoes.length ? `média de ${Math.round(media(recuperacoes) ?? 0)} dias até pagar` : "paga depois de uma recusa"} />
            <Tile rotulo="Receita perdida" valor={reais(receitaPerdida)} nota="MRR que saiu com os cancelamentos do mês" />
            <Tile rotulo="Na cortesia depois de cancelar" valor={String(emCortesia.length)} nota="30 dias para usar o que pagou" />
          </div>
          <div className="mt-3 flex flex-col gap-1 text-[13px]">
            {comCobrancaPendente.length === 0 && cartoesVencendo.length === 0 ? (
              <Vazio>Nenhuma cobrança pendente e nenhum cartão perto de vencer.</Vazio>
            ) : (
              <>
                {comCobrancaPendente.map((c) => (
                  <Link key={c.empresa_id} href={`/admin/contas/${c.empresa_id}?aba=assinatura`} className="text-[#3d3e44] hover:underline">
                    {c.nome} · cobrança pendente · {reais(Number(c.assinatura?.valor_mensal) || 0)}
                    {c.assinatura?.proximo_vencimento ? ` · venceu em ${dataBR(c.assinatura.proximo_vencimento)}` : ""}
                  </Link>
                ))}
                {cartoesVencendo.map((c) => (
                  <Link key={`k${c.empresa_id}`} href={`/admin/contas/${c.empresa_id}?aba=assinatura`} className="text-[#3d3e44] hover:underline">
                    {c.nome} · cartão vale até {String(c.assinatura?.cartao_mes).padStart(2, "0")}/{c.assinatura?.cartao_ano}
                  </Link>
                ))}
              </>
            )}
          </div>
        </Secao>

        <Secao titulo="Caixa" nota="O saldo que você informa em Ajustes. A projeção é estimativa, não resultado.">
          {!saldo ? (
            <Vazio>Nenhum saldo informado. Informe o saldo do banco em Ajustes para ver quantos meses o caixa aguenta.</Vazio>
          ) : (
            <>
              <Conta rotulo={`Saldo em ${dataBR(saldo.dia)}`} valor={reais(saldo.valor)} forte />
              <Conta
                rotulo="Queima média (3 meses fechados)"
                valor={queimaMedia === null ? "—" : queimaMedia <= 0 ? "sem queima: entrou mais do que saiu" : reais(Math.round(queimaMedia * 100) / 100)}
              />
              <Conta rotulo="Meses de caixa" valor={mesesDeCaixa === null ? "—" : `${Math.floor(mesesDeCaixa)} meses`} />
              <p className="mt-2 text-[12px] leading-snug text-[#84858b]">
                Projeção por mês (estimativa): MRR {reais(m.mrr)} − custos recorrentes {reais(recorrentes)} − marketing médio {reais(Math.round(marketingMedio))}
                {impostoSobreMrr ? ` − impostos estimados ${reais(Math.round(impostoSobreMrr))}` : ""} = {reais(Math.round(saldoMensalProjetado))}.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]" style={{ fontFamily: MONO }}>
                {[1, 3, 6].map((n) => (
                  <div key={n} className="rounded-md border border-[#ecece8] px-2 py-1.5">
                    <p className="text-[#84858b]">em {n} {n === 1 ? "mês" : "meses"}</p>
                    <p className="text-[#1c1d21]">{reais(Math.round(saldo.valor + n * saldoMensalProjetado))}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Secao>
      </section>

      {/* ---------- indicadores + relatório ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <Bloco titulo="Eficiência">
            <Tile rotulo="Margem bruta" valor={pct(margemBruta)} nota={margemBruta === null ? (temCustos ? "sem recebido no mês" : "lance os custos do mês") : "recebido menos custos de operação"} />
            <Tile rotulo="EBITDA do mês" valor={ebitda === null ? "—" : reais(Math.round(ebitda))} nota={ebitda === null ? "lance os custos do mês" : `margem ${pct(margemEbitda)}`} />
            <Tile rotulo="Margem líquida" valor={pct(margemLiquida)} nota={margemLiquida === null ? "depende de custos e recebido" : "depois dos impostos"} />
            <Tile rotulo="Custo / Receita" valor={pct(custoSobreReceita)} nota={custoSobreReceita === null ? "depende de custos e recebido" : "custos + marketing ÷ recebido"} />
          </Bloco>

          <Bloco titulo="Rentabilidade">
            <Tile
              rotulo="CAC"
              valor={metrica(m.cac, "R$ ")}
              nota={
                m.cac === null
                  ? m.gastoMarketing === null
                    ? "informe o gasto de marketing do mês"
                    : "nenhuma assinatura nova no mês"
                  : `${metrica(m.gastoMarketing, "R$ ")} ÷ ${m.novasNoMes} novas`
              }
            />
            <Tile
              rotulo="CAC pago"
              valor={metrica(cacPago, "R$ ")}
              nota={`${plural(novasPagas, "nova veio", "novas vieram")} de anúncio · ${plural(novasDoMes.length - novasPagas, "orgânica", "orgânicas")}`}
            />
            <Tile rotulo="LTV" valor={metrica(m.ltv, "R$ ")} nota={m.ltv === null ? "dados insuficientes: precisa de cancelamento na base" : "receita média ÷ churn de receita"} />
            <Tile
              rotulo="Payback do CAC"
              valor={paybackCac === null ? "—" : `${(Math.round(paybackCac * 10) / 10).toLocaleString("pt-BR")} meses`}
              nota={paybackCac === null ? "precisa de CAC, receita por conta e margem bruta" : "CAC ÷ (receita por conta × margem bruta)"}
            />
          </Bloco>

          <Bloco titulo="Crescimento">
            <Tile
              rotulo="MRR mês a mês"
              valor={variacaoEmTexto(mrrMesAMes)}
              nota={mrrMesAMes === null ? `${rotuloMesAno(mesPassado)} fechou sem MRR` : `vs ${rotuloMesAno(mesPassado)}`}
            />
            <Tile
              rotulo="Receita tri a tri"
              valor={variacaoEmTexto(receitaTriATri)}
              nota={
                receitaTriATri === null
                  ? !penultimoTri
                    ? "faltam dois trimestres fechados"
                    : `${penultimoTri.rotulo} sem receita`
                  : `${ultimoTri.rotulo} vs ${penultimoTri.rotulo}${triEmCurso ? ` · ${triEmCurso.rotulo} em curso` : ""}`
              }
            />
            <Tile rotulo="Novas assinaturas / mês" valor={metrica(novasPorMes)} nota="média dos últimos 12 meses" />
            <Tile rotulo="LTV / CAC" valor={metrica(m.ltvSobreCac, "", "×")} nota={m.ltvSobreCac === null ? "precisa de LTV e CAC" : "saudável a partir de 3×"} />
          </Bloco>
        </div>

        {/* ---------- relatório ---------- */}
        <div id="relatorio" className="scroll-mt-6 rounded-lg border border-[#dededa] bg-white px-5 py-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-[#1c1d21]">Relatório — {rotuloMesAno(mes)}</p>
            <p className="text-[11px] text-[#84858b]" style={{ fontFamily: MONO }}>
              movimento de contas · {rotuloMesCurto(mesPassado)} × {rotuloMesCurto(mes)}
            </p>
          </div>
          <div className="mt-3.5 grid" style={{ gridTemplateColumns: "1fr auto auto auto", gap: "8px 16px" }}>
            <span />
            <span className="text-right text-[10.5px] text-[#84858b]" style={{ fontFamily: MONO }}>{rotAntes}</span>
            <span className="text-right text-[10.5px] text-[#84858b]" style={{ fontFamily: MONO }}>{rotAgora}</span>
            <span className="w-[52px] text-right text-[10.5px] text-[#84858b]" style={{ fontFamily: MONO }}>Δ</span>

            <SecaoRel>Contas</SecaoRel>
            <LinhaRel rotulo="Contas criadas" antes={String(criadasAntes)} agora={String(criadasAgora)} delta={deltaEmTexto(criadasAntes, criadasAgora)} />
            <LinhaRel rotulo="Novas assinaturas" antes={String(cAntes.inicio)} agora={String(cAgora.inicio)} delta={deltaEmTexto(cAntes.inicio, cAgora.inicio)} />

            <SecaoRel>Assinaturas</SecaoRel>
            {linhasAssinaturas.map((l) => (
              <LinhaRel key={l.tipo} rotulo={l.rotulo} antes={String(cAntes[l.tipo])} agora={String(cAgora[l.tipo])} delta={deltaEmTexto(cAntes[l.tipo], cAgora[l.tipo])} />
            ))}

            <SecaoRel>Resultado</SecaoRel>
            <LinhaRel
              rotulo="Recebido (R$)"
              antes={metrica(recebidoDo(mesPassado))}
              agora={metrica(recebido)}
              delta={variacaoEmTexto(variacaoPct(recebidoDo(mesPassado) || null, recebido))}
            />
            <LinhaRel
              rotulo="Custos e marketing (R$)"
              antes={custosDo(mesPassado).length || marketingDo(mesPassado) !== null ? metrica(custosDo(mesPassado).reduce((s, c) => s + c.valor, 0) + (marketingDo(mesPassado) ?? 0)) : "—"}
              agora={temCustos || m.gastoMarketing !== null ? metrica(custosMes.reduce((s, c) => s + c.valor, 0) + marketing) : "—"}
              delta="—"
            />
            <LinhaRel rotulo="Resultado (R$)" antes="—" agora={resultado === null ? "—" : metrica(resultado)} delta="—" forte />
          </div>
          <p className="mt-4 text-[11px] leading-[1.5] text-[#84858b]">
            Contas e assinaturas saem do histórico de assinaturas e da tabela de empresas. O recebido sai dos avisos de
            pagamento da operadora. Custos e marketing são os que você lança em Ajustes.
          </p>
          <p className="mt-3">
            <a
              href={`/admin/receita/planilha?mes=${mes}`}
              className="text-[12.5px] font-medium text-[#6e3f5f] underline underline-offset-2"
            >
              Baixar a planilha do mês (para o contador)
            </a>
          </p>
        </div>
      </section>

      {/* ---------- retenção ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-2">
        <Secao titulo="Retenção">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <Tile rotulo="Churn de contas" valor={metrica(m.churnContasPct, "", "%")} nota={m.churnContasPct === null ? "sem base no início do mês" : "da base do começo do mês"} />
            <Tile rotulo="NRR" valor={metrica(m.nrrPct, "", "%")} nota={m.nrrPct === null ? "sem MRR no início do mês" : "receita que ficou da base"} />
            <Tile
              rotulo="Tempo médio como cliente"
              valor={tempoMedio === null ? "—" : `${(Math.round(tempoMedio * 10) / 10).toLocaleString("pt-BR")} meses`}
              nota={tempoMedio === null ? "dados insuficientes: ninguém pagou ainda" : "somando os períodos pagos"}
            />
          </div>
          <p className="mt-3 text-[12.5px] font-semibold text-[#1c1d21]">Coortes (mês em que começaram a pagar)</p>
          {coortes.length < 3 ? (
            <Vazio>Dados insuficientes: as coortes aparecem quando houver 3 meses com assinaturas novas.</Vazio>
          ) : (
            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-[360px] text-[12.5px]" style={{ fontFamily: MONO }}>
                <thead>
                  <tr className="text-left text-[10.5px] text-[#84858b]">
                    <th className="py-1 font-medium">MÊS</th>
                    <th className="py-1 text-right font-medium">CONTAS</th>
                    <th className="py-1 text-right font-medium">+1 MÊS</th>
                    <th className="py-1 text-right font-medium">+2</th>
                    <th className="py-1 text-right font-medium">+3</th>
                  </tr>
                </thead>
                <tbody>
                  {coortes.slice(-12).map((co) => (
                    <tr key={co.mes} className="border-t border-[#ecece8] text-[#3d3e44]">
                      <td className="py-1">{rotuloMesAno(co.mes)}</td>
                      <td className="py-1 text-right">{co.contas}</td>
                      {co.depois.map((d, i) => (
                        <td key={i} className="py-1 text-right">
                          {d === null ? "·" : `${d} (${Math.round((d / co.contas) * 100)}%)`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>

        <Secao titulo="Por que saíram" nota="O motivo que a cliente escreveu ao cancelar.">
          {motivosDeSaida.length === 0 ? (
            <Vazio>Nenhum cancelamento com motivo escrito.</Vazio>
          ) : (
            <ul className="flex flex-col gap-1.5 text-[13px]">
              {motivosDeSaida.map((c) => (
                <li key={c.empresa_id} className="text-[#3d3e44]">
                  <Link href={`/admin/contas/${c.empresa_id}?aba=assinatura`} className="font-medium hover:underline">
                    {c.nome}
                  </Link>{" "}
                  <span className="text-[#84858b]">· {dataBR(c.assinatura?.cancelada_em ?? null)}</span>
                  <span className="block text-[#5c5d63]">{c.assinatura?.motivo_cancelamento}</span>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </section>

      {/* ---------- receita por plano e por origem ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-2">
        <Secao titulo="MRR por plano" nota="Assinaturas ativas e com cobrança pendente, hoje.">
          {porPlano.length === 0 ? (
            <Vazio>Nenhuma conta pagando hoje.</Vazio>
          ) : (
            porPlano.map(([plano, v]) => (
              <Conta key={plano} rotulo={`${plano} · ${plural(v.contas, "conta", "contas")}`} valor={reais(v.valor)} />
            ))
          )}
        </Secao>
        <Secao titulo="MRR por origem" nota="De onde veio o clique que criou a conta.">
          {porOrigem.length === 0 ? (
            <Vazio>Nenhuma conta pagando hoje.</Vazio>
          ) : (
            porOrigem.map(([origem, v]) => (
              <Conta key={origem} rotulo={`${origem} · ${plural(v.contas, "conta", "contas")}`} valor={reais(v.valor)} />
            ))
          )}
        </Secao>
      </section>
    </div>
  );
}
