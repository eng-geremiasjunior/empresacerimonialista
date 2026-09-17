// Ativação e uso — se as contas chegam ao momento de valor, se voltam, e
// o que usam de verdade.
//
// O funil segue o guia do primeiro acesso, que é a definição de valor do
// produto: criar evento, definir o contexto, decidir, ver a tarefa nascer
// da decisão, dar andamento. Depois vêm fornecedor, compartilhar e
// assinar. "Cadastrou cliente" e "criou tarefa" não são passos: a cliente
// nasce junto com o evento e a tarefa nasce da decisão.
//
// Só contas de clientes. As da casa ficam de fora.

import Link from "next/link";
import { getResumoDasContas, getDiasAtivos, getUsoPorModulo } from "@/lib/supabase/admin-contas";
import {
  MODULOS,
  PASSOS,
  diaBR,
  diasDesde,
  moduloDaAcao,
  moduloDaArea,
  passosDaConta,
  type Modulo,
  type ResumoDaConta,
} from "@/lib/admin/saude-da-conta";
import { hrefDaLista, lerFiltros, paradaAntesDe } from "@/lib/admin/lista-de-contas";
import { mediana, minutosEmTexto, plural, porcento } from "@/lib/admin/formatos";
import { hojeBR, somarDias } from "@/lib/tempo";
import { Aviso, Barra, Cabecalho, Secao, Vazio } from "@/components/admin/pecas";

export const dynamic = "force-dynamic";

const MONO = "var(--font-mono), ui-monospace, monospace";

/** A segunda-feira da semana de uma data (yyyy-mm-dd). */
function segundaDaSemana(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  const semana = data.getUTCDay(); // 0 = domingo
  const recuo = semana === 0 ? 6 : semana - 1;
  return somarDias(dia, -recuo);
}

export default async function AdminAtivacaoPage({
  searchParams,
}: {
  searchParams?: { dias?: string };
}) {
  const agora = new Date();
  const hoje = hojeBR(agora);
  const janela = Number(searchParams?.dias);
  const diasDaJanela = [30, 90, 365].includes(janela) ? janela : null;

  const [leitura, diasAtivos, usoLido] = await Promise.all([
    getResumoDasContas(),
    getDiasAtivos(),
    getUsoPorModulo(30),
  ]);

  if (!leitura.ok) {
    return (
      <div data-adm-secao="ativacao" className="flex flex-col gap-4">
        <Cabecalho titulo="Ativação e uso" />
        <Aviso>{leitura.mensagem}</Aviso>
      </div>
    );
  }

  const corte = diasDaJanela ? somarDias(hoje, -diasDaJanela) : null;
  const clientes = leitura.dados.filter(
    (c) => !c.da_casa && (!corte || diaBR(c.criada_em) >= corte)
  );
  const idsDeClientes = new Set(clientes.map((c) => c.empresa_id));
  const dias = (diasAtivos.ok ? diasAtivos.dados : []).filter((d) => idsDeClientes.has(d.empresa_id));
  const diasPor = new Map(dias.map((d) => [d.empresa_id, d]));
  const uso = usoLido.ok ? usoLido.dados : null;

  // ---------- funil ----------
  const passosPorConta = new Map(clientes.map((c) => [c.empresa_id, passosDaConta(c)]));
  const funil = PASSOS.map((p, i) => {
    const chegaram = clientes.filter((c) => passosPorConta.get(c.empresa_id)?.[i]?.feito);
    const anteriores = i === 0 ? clientes : clientes.filter((c) => passosPorConta.get(c.empresa_id)?.[i - 1]?.feito);
    const tempos = chegaram
      .map((c) => {
        const em = passosPorConta.get(c.empresa_id)?.[i]?.em;
        return em ? diasDesde(c.criada_em, new Date(em)) : null;
      })
      .filter((d): d is number => d !== null && d >= 0);
    return {
      ...p,
      quantas: chegaram.length,
      deAnteriores: anteriores.length,
      medianaDeDias: tempos.length >= 3 ? mediana(tempos) : null,
      paradas: clientes.filter((c) => paradaAntesDe(c, p.chave)).length,
    };
  });

  // ---------- retorno ----------
  function voltouEm(c: ResumoDaConta, ate: number): boolean | null {
    const idade = diasDesde(c.criada_em, agora) ?? 0;
    if (idade < ate + 1) return null; // ainda não deu tempo
    const nascimento = diaBR(c.criada_em);
    const limite = somarDias(nascimento, ate);
    const d = diasPor.get(c.empresa_id);
    const todos = [...(d?.acao ?? []), ...(d?.acesso ?? [])];
    return todos.some((dia) => dia > nascimento && dia <= limite);
  }
  const retornos = [1, 7, 30].map((ate) => {
    const respostas = clientes.map((c) => voltouEm(c, ate));
    const podia = respostas.filter((r) => r !== null).length;
    const voltaram = respostas.filter((r) => r === true).length;
    return { ate, podia, voltaram };
  });

  // ---------- semanas de cadastro ----------
  const semanas = new Map<string, ResumoDaConta[]>();
  for (const c of clientes) {
    const s = segundaDaSemana(diaBR(c.criada_em));
    semanas.set(s, [...(semanas.get(s) ?? []), c]);
  }
  const linhasDeSemana = [...semanas.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([semana, contas]) => ({
      semana,
      contas: contas.length,
      criaramEvento: contas.filter((c) => c.eventos.total > 0).length,
      ativaram: contas.filter((c) => c.tarefas.de_decisao > 0).length,
      voltaram7: contas.filter((c) => voltouEm(c, 7) === true).length,
      assinaram: contas.filter((c) => c.historico.convertida_em).length,
    }));

  // ---------- uso por módulo ----------
  type LinhaDeModulo = { modulo: Modulo | "Outras"; contas: Set<string>; acoes: number; minutos: number; abriram: Set<string> };
  const porModulo = new Map<string, LinhaDeModulo>();
  const pegar = (m: Modulo | "Outras") => {
    const atual = porModulo.get(m) ?? { modulo: m, contas: new Set<string>(), acoes: 0, minutos: 0, abriram: new Set<string>() };
    porModulo.set(m, atual);
    return atual;
  };
  for (const a of uso?.acoes ?? []) {
    if (!idsDeClientes.has(a.empresa_id)) continue;
    const m = moduloDaAcao(a.tipo);
    if (!m) continue;
    const linha = pegar(m);
    linha.contas.add(a.empresa_id);
    linha.acoes += a.n;
  }
  for (const u of uso?.uso ?? []) {
    if (!idsDeClientes.has(u.empresa_id)) continue;
    const linha = pegar(moduloDaArea(u.area));
    linha.minutos += u.minutos;
    linha.abriram.add(u.empresa_id);
  }
  for (const s of uso?.suporte ?? []) {
    if (!idsDeClientes.has(s.empresa_id)) continue;
    const linha = pegar("Suporte");
    linha.contas.add(s.empresa_id);
    linha.acoes += s.n;
  }
  const modulos = [...MODULOS, "Outras" as const]
    .map((m) => porModulo.get(m) ?? { modulo: m, contas: new Set<string>(), acoes: 0, minutos: 0, abriram: new Set<string>() })
    .filter((l) => l.modulo !== "Outras" || l.minutos > 0 || l.acoes > 0)
    .sort((a, b) => b.contas.size - a.contas.size || b.acoes - a.acoes);
  const poucoUsados = modulos.filter((l) => l.contas.size <= 1 && l.abriram.size <= 1);

  const f = lerFiltros({});
  const janelas: { rotulo: string; dias: number | null }[] = [
    { rotulo: "todas as contas", dias: null },
    { rotulo: "criadas em 30 dias", dias: 30 },
    { rotulo: "em 90 dias", dias: 90 },
    { rotulo: "em 1 ano", dias: 365 },
  ];

  return (
    <div data-adm-secao="ativacao" className="flex flex-col gap-[22px]">
      <Cabecalho
        titulo="Ativação e uso"
        linha={`${plural(clientes.length, "conta de cliente", "contas de clientes")}${diasDaJanela ? ` criadas nos últimos ${diasDaJanela} dias` : ""}. As contas da casa ficam de fora.`}
        lado={
          <div className="flex flex-wrap gap-1.5">
            {janelas.map((j) => (
              <Link
                key={j.rotulo}
                href={j.dias ? `/admin/ativacao?dias=${j.dias}` : "/admin/ativacao"}
                aria-current={j.dias === diasDaJanela ? "true" : undefined}
                className={`rounded-full border px-3 py-1 text-[12.5px] ${
                  j.dias === diasDaJanela
                    ? "border-[#33343a] bg-[#33343a] text-white"
                    : "border-[#d3d3cf] bg-white text-[#3d3e44] hover:border-[#9a9ba1]"
                }`}
              >
                {j.rotulo}
              </Link>
            ))}
          </div>
        }
      />

      <Secao titulo="Funil" nota="Cada passo conta as contas que chegaram nele. O tempo é a mediana desde a criação da conta, e só aparece com pelo menos 3 casos.">
        {clientes.length === 0 ? (
          <Vazio>Nenhuma conta de cliente nesta janela.</Vazio>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-[#1c1d21]">Contas criadas</span>
                <span style={{ fontFamily: MONO }}>{clientes.length}</span>
              </div>
              <Barra fracao={1} forte />
            </div>
            {funil.map((p) => (
              <div key={p.chave}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                  <span className="text-[#1c1d21]">{p.rotulo}</span>
                  <span className="flex items-baseline gap-2" style={{ fontFamily: MONO }}>
                    {p.quantas}
                    <span className="text-[11.5px] text-[#84858b]">
                      {porcento(p.quantas, clientes.length)} do total · {porcento(p.quantas, p.deAnteriores)} de quem fez o passo anterior
                      {p.medianaDeDias !== null && ` · mediana ${plural(Math.round(p.medianaDeDias), "dia", "dias")}`}
                    </span>
                  </span>
                </div>
                <Barra fracao={clientes.length ? p.quantas / clientes.length : 0} />
                {p.paradas > 0 && (
                  <p className="mt-0.5 text-[12px] text-[#84858b]">
                    {plural(p.paradas, "conta parou", "contas pararam")} antes deste passo ·{" "}
                    <Link href={hrefDaLista(f, { passo: p.chave })} className="text-[#6e3f5f] underline underline-offset-2">
                      ver quem
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Secao>

      <section className="grid gap-2.5 xl:grid-cols-2">
        <Secao
          titulo="Voltou?"
          nota="Voltar é fazer alguma coisa ou abrir o sistema num dia depois do cadastro. Só entram as contas que já tiveram tempo."
        >
          <ul className="flex flex-col gap-2">
            {retornos.map((r) => (
              <li key={r.ate}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-[#1c1d21]">
                    {r.ate === 1 ? "Voltou no dia seguinte" : `Voltou em até ${r.ate} dias`}
                  </span>
                  <span style={{ fontFamily: MONO }}>
                    {r.podia === 0 ? "—" : `${r.voltaram} de ${r.podia}`}
                    {r.podia > 0 && <span className="ml-1.5 text-[11.5px] text-[#84858b]">{porcento(r.voltaram, r.podia)}</span>}
                  </span>
                </div>
                <Barra fracao={r.podia ? r.voltaram / r.podia : 0} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] leading-snug text-[#84858b]">
            Antes de 16/09/2026 só contam os dias em que a conta fez alguma coisa: o registro de uso por tela começou
            naquele dia.
          </p>
        </Secao>

        <Secao titulo="Semanas de cadastro" nota="Cada semana, o que aconteceu com quem entrou nela.">
          {linhasDeSemana.length === 0 ? (
            <Vazio>Nenhuma conta nesta janela.</Vazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[12.5px]" style={{ fontFamily: MONO }}>
                <thead>
                  <tr className="text-left text-[10.5px] text-[#84858b]">
                    <th className="py-1 font-medium">SEMANA</th>
                    <th className="py-1 text-right font-medium">CONTAS</th>
                    <th className="py-1 text-right font-medium">EVENTO</th>
                    <th className="py-1 text-right font-medium">ATIVARAM</th>
                    <th className="py-1 text-right font-medium">VOLTARAM 7D</th>
                    <th className="py-1 text-right font-medium">ASSINARAM</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasDeSemana.map((l) => (
                    <tr key={l.semana} className="border-t border-[#ecece8] text-[#3d3e44]">
                      <td className="py-1">{l.semana.slice(8)}/{l.semana.slice(5, 7)}</td>
                      <td className="py-1 text-right">{l.contas}</td>
                      <td className="py-1 text-right">{l.criaramEvento}</td>
                      <td className="py-1 text-right">{l.ativaram}</td>
                      <td className="py-1 text-right">{l.voltaram7}</td>
                      <td className="py-1 text-right">{l.assinaram}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Secao>
      </section>

      <Secao
        titulo="Uso por módulo, nos últimos 30 dias"
        nota="Contas que fizeram alguma coisa no módulo, e o tempo de tela (este só desde 16/09/2026)."
      >
        {!uso ? (
          <Aviso>{usoLido.ok ? "" : usoLido.mensagem}</Aviso>
        ) : modulos.every((l) => l.contas.size === 0 && l.minutos === 0) ? (
          <Vazio>Nenhum uso registrado nos últimos 30 dias.</Vazio>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="text-left text-[10.5px] text-[#84858b]" style={{ fontFamily: MONO }}>
                    <th className="py-1 font-medium">MÓDULO</th>
                    <th className="py-1 text-right font-medium">CONTAS QUE FIZERAM</th>
                    <th className="py-1 text-right font-medium">AÇÕES</th>
                    <th className="py-1 text-right font-medium">CONTAS QUE ABRIRAM</th>
                    <th className="py-1 text-right font-medium">TEMPO</th>
                  </tr>
                </thead>
                <tbody>
                  {modulos.map((l) => (
                    <tr key={l.modulo} className="border-t border-[#ecece8] text-[#3d3e44]">
                      <td className="py-1.5">{l.modulo}</td>
                      <td className="py-1.5 text-right" style={{ fontFamily: MONO }}>{l.contas.size}</td>
                      <td className="py-1.5 text-right" style={{ fontFamily: MONO }}>{l.acoes}</td>
                      <td className="py-1.5 text-right" style={{ fontFamily: MONO }}>{l.abriram.size}</td>
                      <td className="py-1.5 text-right" style={{ fontFamily: MONO }}>
                        {l.minutos ? minutosEmTexto(l.minutos) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {poucoUsados.length > 0 && (
              <p className="mt-3 text-[12.5px] leading-snug text-[#5c5d63]">
                Quase ninguém usou nos últimos 30 dias: {poucoUsados.map((l) => l.modulo).join(", ")}.
              </p>
            )}
          </>
        )}
      </Secao>
    </div>
  );
}
