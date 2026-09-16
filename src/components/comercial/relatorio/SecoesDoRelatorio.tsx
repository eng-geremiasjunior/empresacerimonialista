// As seções de baixo do Relatório: por mês, origem dos pedidos, tempo,
// perdas e vitrine.
//
// Seção sem dado é uma frase, nunca uma fileira de zeros. Tudo em cinza,
// sem caixa em volta: a divisória de cima basta para separar uma da outra.
// No celular as tabelas cabem na largura: a barra do mês some e a vitrine
// vira uma linha por origem.

import {
  MINIMO_DE_CASOS,
  duracaoEmPalavras,
  emReais,
  type LinhaDoMes,
  type Origens,
  type Perdas,
  type Relatorio,
  type Tempos,
  type Vitrine,
} from "@/lib/comercial/relatorio";
import { CORES } from "@/lib/orcamentos-ui";

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 border-t pt-5" style={{ borderColor: CORES.borda }}>
      <h2 id={id} className="text-[15px] font-semibold">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13.5px]" style={{ color: CORES.nav }}>
      {children}
    </p>
  );
}

const TH = "pb-2 text-[10.5px] font-normal uppercase";
const estiloTh = { letterSpacing: "1px", color: CORES.secundario };
const LINHA = "border-t";
const estiloLinha = { borderColor: CORES.borda };

/* ------------------------------------------------------------------ */

function PorMes({ meses }: { meses: LinhaDoMes[] }) {
  if (meses.every((m) => m.enviadas === 0 && m.aceitas === 0)) {
    return <Vazio>Nenhuma proposta enviada ou aceita nos últimos {meses.length} meses.</Vazio>;
  }
  const maior = Math.max(...meses.map((m) => m.valor), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr>
            <th scope="col" className={`${TH} text-left`} style={estiloTh}>Mês</th>
            <th scope="col" className={`${TH} w-[18%] text-right sm:w-[12%]`} style={estiloTh}>Enviadas</th>
            <th scope="col" className={`${TH} w-[18%] text-right sm:w-[12%]`} style={estiloTh}>Aceitas</th>
            <th scope="col" className={`${TH} w-[32%] text-right sm:w-[16%]`} style={estiloTh}>Valor fechado</th>
            <td className="hidden sm:table-cell sm:w-[36%]" />
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes} className={LINHA} style={estiloLinha}>
              <th scope="row" className="whitespace-nowrap py-2 pr-2 text-left font-normal">
                {m.rotulo}
                {m.parcial && (
                  <span className="ml-1.5 text-[12px]" style={{ color: CORES.secundario }}>
                    até hoje
                  </span>
                )}
              </th>
              <td className="py-2 text-right tabular-nums">{m.enviadas}</td>
              <td className="py-2 text-right tabular-nums">{m.aceitas}</td>
              <td className="whitespace-nowrap py-2 text-right tabular-nums">
                {m.valor > 0 ? emReais(m.valor) : "—"}
              </td>
              {/* barra só de apoio: o número ao lado é a informação */}
              <td className="hidden py-2 pl-5 sm:table-cell" aria-hidden>
                {maior > 0 && m.valor > 0 && (
                  <span
                    className="block h-[6px] rounded-full"
                    style={{
                      width: `${Math.max(2, Math.round((m.valor / maior) * 100))}%`,
                      background: CORES.terciario,
                    }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DeOndeVem({ origens }: { origens: Origens }) {
  const { linhas, diretas } = origens;
  const direta =
    diretas.enviadas > 0 ? (
      <p className="mt-3 text-[13px]" style={{ color: CORES.nav }}>
        Propostas sem pedido da vitrine: {diretas.enviadas}{" "}
        {plural(diretas.enviadas, "enviada", "enviadas")} · {diretas.aceitas}{" "}
        {plural(diretas.aceitas, "aceita", "aceitas")}
      </p>
    ) : null;

  if (linhas.length === 0) {
    return (
      <>
        <Vazio>Nenhum pedido pela vitrine no período.</Vazio>
        {direta}
      </>
    );
  }
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr>
              <th scope="col" className={`${TH} text-left`} style={estiloTh}>Origem</th>
              <th scope="col" className={`${TH} pl-2 text-right`} style={estiloTh}>Pedidos</th>
              <th scope="col" className={`${TH} pl-2 text-right`} style={estiloTh}>Com proposta</th>
              <th scope="col" className={`${TH} pl-2 text-right`} style={estiloTh}>Aceitos</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} className={LINHA} style={estiloLinha}>
                <th scope="row" className="break-words py-2 pr-2 text-left font-normal">{l.rotulo}</th>
                <td className="py-2 text-right tabular-nums">{l.pedidos}</td>
                <td className="py-2 text-right tabular-nums">{l.comProposta}</td>
                <td className="py-2 text-right tabular-nums">{l.aceitos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {direta}
    </>
  );
}

/* ------------------------------------------------------------------ */

function Item({ termo, valor, nota }: { termo: string; valor: string; nota?: string | null }) {
  return (
    <div className="py-2.5">
      <dt className="text-[13px]" style={{ color: CORES.nav }}>
        {termo}
      </dt>
      <dd className="mt-0.5 text-[14.5px] font-medium">{valor}</dd>
      {nota && (
        <dd className="mt-0.5 text-[12.5px]" style={{ color: CORES.secundario }}>
          {nota}
        </dd>
      )}
    </div>
  );
}

function semDados(casos: number, unidade: [string, string]): string {
  return casos === 0
    ? "ainda sem dados suficientes"
    : `ainda sem dados suficientes (${casos} ${plural(casos, unidade[0], unidade[1])})`;
}

function Tempo({ tempos }: { tempos: Tempos }) {
  const { resposta, aceite } = tempos;
  return (
    <dl className="divide-y divide-[#E9E9E7]">
      <Item
        termo="Do pedido à proposta"
        valor={
          resposta.pedidos === 0
            ? "nenhum pedido no período"
            : resposta.medianaHoras !== null
              ? `mediana de ${duracaoEmPalavras(resposta.medianaHoras)}`
              : semDados(resposta.casos, ["pedido respondido", "pedidos respondidos"])
        }
        nota={
          resposta.elegiveis > 0
            ? `${resposta.em24h} de ${resposta.elegiveis} ${plural(
                resposta.elegiveis,
                "recebeu",
                "receberam"
              )} proposta em até 24 horas`
            : null
        }
      />
      <Item
        termo="Do envio ao aceite"
        valor={
          aceite.medianaDias !== null
            ? `mediana de ${duracaoEmPalavras(aceite.medianaDias * 24)}`
            : semDados(aceite.casos, ["aceite", "aceites"])
        }
        nota={aceite.casos >= MINIMO_DE_CASOS ? `${aceite.casos} aceites no período` : null}
      />
    </dl>
  );
}

/* ------------------------------------------------------------------ */

function Perdidas({ perdas }: { perdas: Perdas }) {
  const { recusadas, vencidas, pedidosEncerrados, motivos } = perdas;
  if (recusadas.total + vencidas.total + pedidosEncerrados === 0) {
    return <Vazio>Nenhuma perda no período.</Vazio>;
  }
  const comValor = (n: number, valor: number) => (valor > 0 ? `${n} · ${emReais(valor)}` : String(n));
  return (
    <>
      <dl className="divide-y divide-[#E9E9E7]">
        {recusadas.total > 0 && (
          <Item termo="Recusadas pela cliente" valor={comValor(recusadas.total, recusadas.valor)} />
        )}
        {vencidas.total > 0 && (
          <Item termo="Vencidas sem resposta" valor={comValor(vencidas.total, vencidas.valor)} />
        )}
        {pedidosEncerrados > 0 && (
          <Item termo="Pedidos encerrados sem proposta" valor={String(pedidosEncerrados)} />
        )}
      </dl>
      {motivos.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[13px] font-semibold">Motivos mais recentes</h3>
          <ul className="mt-2 space-y-2.5">
            {motivos.map((m) => (
              <li key={`${m.tipo}-${m.dia}-${m.nome}-${m.texto}`} className="text-[13.5px] leading-snug">
                <p className="break-words">“{m.texto}”</p>
                <p className="mt-0.5 text-[12px]" style={{ color: CORES.secundario }}>
                  {m.tipo === "recusada" ? "recusa" : "pedido encerrado"} · {m.nome} · {m.quando}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function NaVitrine({ vitrine }: { vitrine: Vitrine }) {
  const t = vitrine.total;
  if (t.aberturas + t.whatsapp + t.instagram + t.pedidos === 0) {
    return <Vazio>Nenhuma abertura da vitrine no período.</Vazio>;
  }
  const numeros: [string, number][] = [
    ["Aberturas da vitrine", t.aberturas],
    ["Toques no WhatsApp", t.whatsapp],
    ["Toques no Instagram", t.instagram],
    ["Formulários enviados", t.pedidos],
  ];
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {numeros.map(([termo, n]) => (
          <div key={termo}>
            <dt className="text-[12.5px]" style={{ color: CORES.nav }}>
              {termo}
            </dt>
            <dd className="text-[18px] font-medium tabular-nums">{n.toLocaleString("pt-BR")}</dd>
          </div>
        ))}
      </dl>

      {/* no celular, uma linha por origem: a tabela de cinco colunas não cabe */}
      <ul className="mt-4 sm:hidden">
        {vitrine.porOrigem.map((o) => (
          <li key={o.chave} className={`${LINHA} py-2`} style={estiloLinha}>
            <p className="break-words text-[13.5px]">{o.rotulo}</p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: CORES.nav }}>
              {o.aberturas} {plural(o.aberturas, "abertura", "aberturas")} · {o.whatsapp} no WhatsApp ·{" "}
              {o.instagram} no Instagram · {o.pedidos} {plural(o.pedidos, "formulário", "formulários")}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th scope="col" className={`${TH} text-left`} style={estiloTh}>Origem</th>
              <th scope="col" className={`${TH} pl-3 text-right`} style={estiloTh}>Aberturas</th>
              <th scope="col" className={`${TH} pl-3 text-right`} style={estiloTh}>WhatsApp</th>
              <th scope="col" className={`${TH} pl-3 text-right`} style={estiloTh}>Instagram</th>
              <th scope="col" className={`${TH} pl-3 text-right`} style={estiloTh}>Formulários</th>
            </tr>
          </thead>
          <tbody>
            {vitrine.porOrigem.map((o) => (
              <tr key={o.chave} className={LINHA} style={estiloLinha}>
                <th scope="row" className="break-words py-2 pr-3 text-left font-normal">{o.rotulo}</th>
                <td className="py-2 text-right tabular-nums">{o.aberturas}</td>
                <td className="py-2 text-right tabular-nums">{o.whatsapp}</td>
                <td className="py-2 text-right tabular-nums">{o.instagram}</td>
                <td className="py-2 text-right tabular-nums">{o.pedidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function SecoesDoRelatorio({ relatorio: r }: { relatorio: Relatorio }) {
  return (
    <div className="mt-10 space-y-10">
      <Secao id="relatorio-meses" titulo={`Últimos ${r.meses.length} meses`}>
        <PorMes meses={r.meses} />
      </Secao>
      <div className="grid gap-10 xl:grid-cols-2">
        <Secao id="relatorio-origem" titulo="De onde vêm os pedidos">
          <DeOndeVem origens={r.origens} />
        </Secao>
        <Secao id="relatorio-tempo" titulo="Tempo">
          <Tempo tempos={r.tempos} />
        </Secao>
      </div>
      <div className="grid gap-10 xl:grid-cols-2">
        <Secao id="relatorio-perdas" titulo="Perdidas">
          <Perdidas perdas={r.perdas} />
        </Secao>
        <Secao id="relatorio-vitrine" titulo="Vitrine profissional">
          <NaVitrine vitrine={r.vitrine} />
        </Secao>
      </div>
    </div>
  );
}
