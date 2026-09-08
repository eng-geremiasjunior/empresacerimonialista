// Métricas do negócio — MRR, ARR, churn, NRR, CAC, LTV.
//
// O princípio da tela: número sem denominador vira "—" com a explicação
// do que falta, nunca zero inventado. No piloto quase tudo começa em "—"
// e isso é CORRETO: churn sem base de clientes não existe.
//
// Vale igual para o desenho novo (handoff "Painel Admin", 09/2026). Boa
// parte do que ele mostra — EBITDA, as três margens, custo/receita,
// payback de CAC, conversão de trial — NÃO existe no banco: o sistema
// não tem onde lançar custo nem histórico de trial. Essas caixas nascem
// em "—" com a razão embaixo, de propósito. É nesta tela que o dono
// decide verba; um número redondo e falso aqui custa dinheiro de verdade.
//
// Estado zero de cliente: mês e período viajam em search param
// (?mes=2026-09&periodo=tri). O único componente cliente da rota
// continua sendo o FormGastoMarketing.

import { Fragment } from "react";
import Link from "next/link";
import { getPortaoDoTeste, getSerieMensal } from "@/lib/supabase/admin-painel";
import {
  agruparEmAnos,
  agruparEmTrimestres,
  contarDatasNoMes,
  contarEventosDoMes,
  deltaEmTexto,
  media,
  mesAnterior,
  metrica,
  rotuloMesAno,
  rotuloMesCurto,
  variacaoEmTexto,
  variacaoPct,
  type PeriodoAgregado,
} from "@/lib/admin-metricas";
import { hojeBR } from "@/lib/tempo";
import { FormGastoMarketing } from "./FormGastoMarketing";
import { FormPortaoDoTeste } from "./FormPortaoDoTeste";

export const dynamic = "force-dynamic";

// A mono do projeto (IBM Plex Mono, carregada na raiz). Números em fonte
// tabular ao lado de texto proporcional é o que faz a tela ser lida como
// painel e não como página — o handoff pede Manrope/JetBrains, mas a
// regra vale mais que a marca da fonte: contraste texto/número.
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

function Kpi({
  rotulo,
  valor,
  legenda,
}: {
  rotulo: string;
  valor: string;
  legenda: string;
}) {
  return (
    <div className="rounded-lg border border-[#dededa] bg-white px-[18px] py-4">
      <p
        className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#84858b]"
        style={{ fontFamily: MONO }}
      >
        {rotulo}
      </p>
      <p
        className="mt-2 text-[26px] font-medium leading-none text-[#1c1d21]"
        style={{ fontFamily: MONO }}
      >
        {valor}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-[#5c5d63]">{legenda}</p>
    </div>
  );
}

/** Tile dos blocos. `nota` explica o que falta quando o valor é "—". */
function Tile({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="rounded-md border border-[#dededa] bg-white p-3">
      <p className="text-[11px] leading-tight text-[#5c5d63]">{rotulo}</p>
      <p
        className="mt-1.5 text-[17px] font-medium text-[#1c1d21]"
        style={{ fontFamily: MONO }}
      >
        {valor}
      </p>
      {nota && (
        <p className="mt-1 text-[11px] leading-snug text-[#84858b]">{nota}</p>
      )}
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-[#1c1d21]">{titulo}</p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function Grafico({
  titulo,
  faixa,
  barras,
}: {
  titulo: string;
  faixa: string;
  barras: Barra[];
}) {
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
        <p
          className="text-right text-[11px] text-[#84858b]"
          style={{ fontFamily: MONO }}
        >
          {faixa}
        </p>
      </div>
      <svg
        viewBox="0 0 600 170"
        width="100%"
        height="190"
        className="mt-3 block"
        role="img"
        aria-label={titulo}
      >
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
              : tons[
                  Math.min(
                    tons.length - 1,
                    Math.floor((i / barras.length) * tons.length)
                  )
                ];
            return (
              <rect
                key={b.chave}
                x={i * passo + (passo - largura) / 2}
                y={BASE - altura}
                width={largura}
                height={altura}
                fill={cor}
                // barra vazada = período que ainda não fechou; a altura
                // dela não é comparável com a das barras cheias
                fillOpacity={b.parcial ? 0.4 : 1}
              />
            );
          })}

        {max === 0 && (
          <text
            x="300"
            y="96"
            textAnchor="middle"
            fontSize="12"
            fill="#84858b"
            style={{ fontFamily: MONO }}
          >
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
  // Só trimestre FECHADO entra na comparação. Em 05/10 o T4 tem um mês
  // somado contra os três do T3: comparar os dois devolveria "−66,7%"
  // com o negócio crescendo, e é nesta tela que o dono decide verba.
  const fechados = tris.filter((t) => t.completo);
  const atual = fechados[fechados.length - 1];
  const passado = fechados[fechados.length - 2];
  const variacao = variacaoPct(passado?.receita ?? null, atual?.receita ?? null);
  const emCurso = tris.some((t) => !t.completo);
  const tons = ["#d0d1ce", "#b0b1b0", "#84858b", "#33343a"];

  return (
    <div className="rounded-lg border border-[#dededa] bg-white px-5 py-[18px]">
      <p className="text-[13px] font-semibold text-[#1c1d21]">
        Comparativo trimestral
      </p>
      <p
        className="mb-3.5 mt-[3px] text-[11px] text-[#84858b]"
        style={{ fontFamily: MONO }}
      >
        receita · EBITDA · margem
      </p>

      <div
        className="grid text-[12px] text-[#3d3e44]"
        style={{
          gridTemplateColumns: "auto 1fr 1fr 1fr",
          gap: "9px 14px",
          fontFamily: MONO,
        }}
      >
        <span className="text-[10.5px] text-[#84858b]">TRI</span>
        <span className="text-right text-[10.5px] text-[#84858b]">RECEITA</span>
        <span className="text-right text-[10.5px] text-[#84858b]">EBITDA</span>
        <span className="text-right text-[10.5px] text-[#84858b]">MARGEM</span>

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
              {/* EBITDA e margem do trimestre dependem de custo, que o
                  sistema não guarda em lugar nenhum. */}
              <span className="text-right text-[#5c5d63]">—</span>
              <span className="text-right text-[#5c5d63]">—</span>
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
                // trimestre em curso sai mais baixo por falta de meses,
                // não por falta de receita
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
      <p className="mt-1 text-[11px] leading-[1.5] text-[#84858b]">
        Receita = soma do MRR dos meses do trimestre. EBITDA e margem
        dependem de custos e despesas, que ainda não têm onde ser lançados.
        {emCurso ? " * trimestre em curso, fora da comparação." : ""}
      </p>
    </div>
  );
}

function LinhaRel({
  rotulo,
  antes,
  agora,
  delta,
  forte,
}: {
  rotulo: string;
  antes: string;
  agora: string;
  delta: string;
  forte?: boolean;
}) {
  const borda = forte ? "border-t border-[#33343a] pt-2" : "";
  return (
    <>
      <span
        className={`text-[12.5px] ${forte ? "font-bold text-[#1c1d21]" : "text-[#3d3e44]"} ${borda}`}
      >
        {rotulo}
      </span>
      <span
        className={`text-right text-[12.5px] text-[#5c5d63] ${borda}`}
        style={{ fontFamily: MONO }}
      >
        {antes}
      </span>
      <span
        className={`text-right text-[12.5px] text-[#1c1d21] ${forte ? "font-semibold" : ""} ${borda}`}
        style={{ fontFamily: MONO }}
      >
        {agora}
      </span>
      <span
        className={`w-[52px] text-right text-[12.5px] text-[#1c1d21] ${borda}`}
        style={{ fontFamily: MONO }}
      >
        {delta}
      </span>
    </>
  );
}

function SecaoRel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="col-span-full pt-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#84858b]"
      style={{ fontFamily: MONO }}
    >
      {children}
    </span>
  );
}

function Periodos({ mes, atual }: { mes: string; atual: Periodo }) {
  // Link, não botão: o período é endereço. O dono manda o link do
  // trimestre para ele mesmo no celular e abre a mesma tela.
  //
  // Sem âncora no href: #financeiro fica ABAIXO deste controle, então
  // trocar de período rolava a página para longe do próprio botão e o
  // clique seguinte exigia subir de novo.
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
          href={`/admin?mes=${mes}&periodo=${i.chave}`}
          aria-current={i.chave === atual ? "true" : undefined}
          className={
            i.chave === atual
              ? "bg-[#33343a] px-3 py-[7px] text-white"
              : "px-3 py-[7px] text-[#5c5d63] hover:bg-white"
          }
        >
          {i.rotulo}
        </Link>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// A tela
// ------------------------------------------------------------------

export default async function AdminMetricasPage({
  searchParams,
}: {
  searchParams?: { mes?: string; periodo?: string };
}) {
  const mesAtual = hojeBR().slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(searchParams?.mes ?? "")
    ? searchParams!.mes!
    : mesAtual;
  const periodo: Periodo = ["mes", "tri", "ano"].includes(
    searchParams?.periodo ?? ""
  )
    ? (searchParams!.periodo! as Periodo)
    : "mes";

  // A janela do gráfico decide quantos meses precisam ser recalculados:
  // 12 barras mensais, 8 trimestrais (24 meses) ou 3 anuais (36). Tudo
  // sai de UMA leitura — getSerieMensal não repete a query por mês.
  const quantosMeses = periodo === "ano" ? 36 : periodo === "tri" ? 24 : 12;
  const [{ meses: serie, eventos, criadasEm }, portao] = await Promise.all([
    getSerieMensal(mes, quantosMeses),
    // null enquanto a 154 não tiver sido aplicada neste banco
    getPortaoDoTeste(),
  ]);

  const m = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  const mesPassado = mesAnterior(mes);
  const [ano, mm] = mes.split("-");

  // ---------- gráfico ----------
  const tris = agruparEmTrimestres(serie);
  const barras: Barra[] =
    periodo === "mes"
      ? serie
          .slice(-12)
          .map((x) => ({
            chave: x.mes,
            rotulo: rotuloMesCurto(x.mes),
            valor: x.mrr,
          }))
      : periodo === "tri"
        ? tris.slice(-8).map((t) => ({
            chave: t.chave,
            rotulo: t.rotulo,
            valor: t.receita,
            parcial: !t.completo,
          }))
        : agruparEmAnos(serie)
            .slice(-3)
            .map((a) => ({
              chave: a.chave,
              rotulo: a.rotulo,
              valor: a.receita,
              parcial: !a.completo,
            }));

  const tituloGrafico =
    periodo === "mes"
      ? "MRR — últimos 12 meses"
      : periodo === "tri"
        ? "Receita — últimos 8 trimestres"
        : "Receita — últimos 3 anos";
  const faixaGrafico =
    periodo === "mes"
      ? `R$ · ${rotuloMesAno(serie[serie.length - 12].mes)} → ${rotuloMesAno(m.mes)}`
      : "R$ · soma do MRR do período";

  // ---------- crescimento ----------
  const mrrMesAMes = variacaoPct(anterior?.mrr ?? null, m.mrr);
  // Trimestre em curso NÃO entra na comparação: nos dois primeiros meses
  // de todo trimestre ele tem menos meses somados que o anterior e a
  // conta devolveria uma queda que não aconteceu.
  const trisFechados = tris.filter((t) => t.completo);
  const ultimoTri = trisFechados[trisFechados.length - 1];
  const penultimoTri = trisFechados[trisFechados.length - 2];
  const triEmCurso = tris[tris.length - 1]?.completo === false
    ? tris[tris.length - 1]
    : null;
  const receitaTriATri = variacaoPct(
    penultimoTri?.receita ?? null,
    ultimoTri?.receita ?? null
  );
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

  return (
    <div data-adm-secao="visao" className="flex flex-col gap-[22px]">
      {/* ---------- cabeçalho ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1c1d21]">
            O negócio em {mm}/{ano}
          </h1>
          {/* Trial não gera evento no log, então `emTrial` é sempre a foto
              de HOJE — os outros três saem do log e são do mês pedido.
              Num mês passado ele seria um número de setembro debaixo do
              título "O negócio em 03/2026": some da linha. */}
          <p className="mt-1 text-[13px] text-[#5c5d63]">
            {m.assinantesAtivos} assinantes ativos
            {mes === mesAtual ? ` · ${m.emTrial} em trial hoje` : ""} ·{" "}
            {m.novasNoMes} novas no mês · {m.canceladasNoMes} canceladas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Periodos mes={mes} atual={periodo} />
          <FormGastoMarketing mes={mes} gastoAtual={m.gastoMarketing} />
        </div>
      </div>

      {/* ---------- o portão do teste grátis (154) ----------
          Fica no alto porque é a única alavanca desta tela que muda o
          funil HOJE: aberta, a página de vendas convida a criar conta
          sem cartão; fechada, ela volta a mandar todo mundo ao
          checkout. */}
      <section className="rounded-lg border border-[#e7e5e4] bg-white p-3.5">
        {portao ? (
          <FormPortaoDoTeste aberto={portao.aberto} dias={portao.dias} />
        ) : (
          <p className="text-[12px] text-[#8a3d3d]">
            O portão do teste grátis ainda não existe neste banco: aplique a migração 154.
          </p>
        )}
      </section>

      {/* ---------- faixa de KPIs ---------- */}
      <section
        id="financeiro"
        className="scroll-mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          rotulo="MRR"
          valor={metrica(m.mrr, "R$ ")}
          legenda={
            mrrMesAMes === null
              ? `sem MRR em ${rotuloMesAno(mesPassado)} para comparar`
              : `${variacaoEmTexto(mrrMesAMes)} vs ${rotuloMesAno(mesPassado)}`
          }
        />
        <Kpi rotulo="ARR" valor={metrica(m.arr, "R$ ")} legenda="MRR × 12" />
        {/* Não há tabela de custos: EBITDA e margem não têm de onde sair. */}
        <Kpi
          rotulo="EBITDA do mês"
          valor="—"
          legenda="sem lançamento de custos e despesas no sistema"
        />
        <Kpi
          rotulo="Churn de receita"
          valor={metrica(m.churnReceitaPct, "", "%")}
          legenda={
            m.churnReceitaPct === null
              ? "sem MRR no início do mês"
              : `NRR ${metrica(m.nrrPct, "", "%")} · churn contas ${metrica(m.churnContasPct, "", "%")}`
          }
        />
      </section>

      {/* ---------- gráfico + trimestre ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-[1.6fr_1fr]">
        <Grafico
          titulo={tituloGrafico}
          faixa={faixaGrafico}
          barras={barras}
        />
        <Trimestral tris={tris.slice(-4)} />
      </section>

      {/* ---------- indicadores + relatório ---------- */}
      <section className="grid gap-2.5 xl:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <Bloco titulo="Eficiência">
            <Tile
              rotulo="Margem Bruta"
              valor="—"
              nota="sem custo de operação lançado"
            />
            <Tile
              rotulo="Margem EBITDA"
              valor="—"
              nota="depende de custos e despesas"
            />
            <Tile
              rotulo="Margem Líquida"
              valor="—"
              nota="depende de despesas e impostos"
            />
            <Tile
              rotulo="Custo / Receita"
              valor="—"
              nota="só existe o gasto de marketing"
            />
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
              rotulo="LTV"
              valor={metrica(m.ltv, "R$ ")}
              nota={
                m.ltv === null
                  ? "precisa de churn de receita > 0"
                  : "receita média ÷ churn de receita"
              }
            />
            <Tile
              rotulo="LTV / CAC"
              valor={metrica(m.ltvSobreCac, "", "×")}
              nota={
                m.ltvSobreCac === null
                  ? "precisa de LTV e CAC"
                  : "saudável a partir de 3×"
              }
            />
            <Tile
              rotulo="Payback CAC"
              valor="—"
              nota="precisa da margem por conta, que não existe"
            />
          </Bloco>

          <Bloco titulo="Crescimento">
            <Tile
              rotulo="MRR mês a mês"
              valor={variacaoEmTexto(mrrMesAMes)}
              nota={
                mrrMesAMes === null
                  ? `${rotuloMesAno(mesPassado)} fechou sem MRR`
                  : `vs ${rotuloMesAno(mesPassado)}`
              }
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
            <Tile
              rotulo="Novas contas / mês"
              valor={metrica(novasPorMes)}
              nota="média dos últimos 12 meses"
            />
            {/* Trial não gera evento no log (só a conversão gera), então
                não há histórico de trials iniciados para dividir. */}
            <Tile
              rotulo="Conversão trial"
              valor="—"
              nota="o log não registra trial iniciado"
            />
          </Bloco>
        </div>

        {/* ---------- relatório ---------- */}
        <div
          id="relatorio"
          className="scroll-mt-6 rounded-lg border border-[#dededa] bg-white px-5 py-[18px]"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-[#1c1d21]">
              Relatório — {rotuloMesAno(mes)}
            </p>
            <p
              className="text-[11px] text-[#84858b]"
              style={{ fontFamily: MONO }}
            >
              movimento de contas · {rotuloMesCurto(mesPassado)} ×{" "}
              {rotuloMesCurto(mes)}
            </p>
          </div>

          <div
            className="mt-3.5 grid"
            style={{
              gridTemplateColumns: "1fr auto auto auto",
              gap: "8px 16px",
            }}
          >
            <span />
            <span
              className="text-right text-[10.5px] text-[#84858b]"
              style={{ fontFamily: MONO }}
            >
              {rotAntes}
            </span>
            <span
              className="text-right text-[10.5px] text-[#84858b]"
              style={{ fontFamily: MONO }}
            >
              {rotAgora}
            </span>
            <span
              className="w-[52px] text-right text-[10.5px] text-[#84858b]"
              style={{ fontFamily: MONO }}
            >
              Δ
            </span>

            <SecaoRel>Contas</SecaoRel>
            <LinhaRel
              rotulo="Contas criadas"
              antes={String(criadasAntes)}
              agora={String(criadasAgora)}
              delta={deltaEmTexto(criadasAntes, criadasAgora)}
            />
            {/* Trial não vira evento: a conversão é que vira "inicio". */}
            <LinhaRel
              rotulo="Trials iniciados"
              antes="—"
              agora="—"
              delta="—"
            />
            <LinhaRel
              rotulo="Trials convertidos (início)"
              antes={String(cAntes.inicio)}
              agora={String(cAgora.inicio)}
              delta={deltaEmTexto(cAntes.inicio, cAgora.inicio)}
            />

            <SecaoRel>Assinaturas</SecaoRel>
            {linhasAssinaturas.map((l) => (
              <LinhaRel
                key={l.tipo}
                rotulo={l.rotulo}
                antes={String(cAntes[l.tipo])}
                agora={String(cAgora[l.tipo])}
                delta={deltaEmTexto(cAntes[l.tipo], cAgora[l.tipo])}
              />
            ))}

            <SecaoRel>Resultado</SecaoRel>
            {/* A seção inteira fica em "—", e a receita não é exceção: o
                que existe é MRR, o estoque do ÚLTIMO DIA do mês, e ele
                não é a receita do período. Num mês em que uma conta de
                149 cancela dia 20 e outra de 97 entra dia 28, o MRR fecha
                em 97 e as duas faturas entraram no caixa. Enquanto não
                houver tabela de faturas, "receita bruta" não tem de onde
                sair — o MRR está lá em cima, com o nome certo. */}
            <LinhaRel rotulo="Receita bruta (R$)" antes="—" agora="—" delta="—" />
            {/* As duas linhas que fecham o resultado dependem de uma tabela
                de custos que não existe. Zero aqui seria mentira grande:
                daria EBITDA igual à receita. */}
            <LinhaRel
              rotulo="Custos e despesas (R$)"
              antes="—"
              agora="—"
              delta="—"
            />
            <LinhaRel
              rotulo="EBITDA (R$)"
              antes="—"
              agora="—"
              delta="—"
              forte
            />
          </div>

          <p className="mt-4 text-[11px] leading-[1.5] text-[#84858b]">
            Contas e assinaturas saem do log de eventos (assinatura_eventos) e
            da tabela de empresas. Não há tabela de faturas nem de custos:
            receita do período, despesas e EBITDA ficam em “—”. Banimento é
            estado de hoje, não movimento do mês: está em Contas.
          </p>
        </div>
      </section>
    </div>
  );
}
