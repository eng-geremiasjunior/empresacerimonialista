import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  contagemPorMesa,
  listaRecepcao,
  NOME_ELEMENTO,
  NOME_RESTRICAO,
} from "@/lib/croqui-core";
import {
  getConvidadosCroqui,
  getElementos,
  getMesas,
  getSalao,
} from "@/lib/supabase/mesas";
import { formatDate } from "@/lib/format";
import { CroquiEstatico } from "@/components/mesas/CroquiEstatico";
import { BotaoImprimir } from "./BotaoImprimir";
import "./impressos.css";

export const dynamic = "force-dynamic";

// As três folhas que circulam no dia. Rota própria, fora do layout do
// evento, para o papel sair limpo. Sessão exigida pelo middleware; a
// RLS decide o que esta conta enxerga.
//
// Régua de segurança da folha do buffet: CONTAGEM por mesa, nunca nome
// com condição — restrição alimentar é dado de saúde de terceiro. A
// função contagemPorMesa nem recebe nomes; o que não entra, não sai.
export default async function ImprimirMesasPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { folha?: string };
}) {
  const folha = ["recepcao", "buffet", "montagem"].includes(searchParams.folha ?? "")
    ? (searchParams.folha as "recepcao" | "buffet" | "montagem")
    : "recepcao";

  const supabase = createClient();
  const { data: evento } = await supabase
    .from("events")
    .select("id, name, date, location, clients(name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!evento) notFound();

  const ev = evento as unknown as {
    name: string | null;
    date: string;
    location: string | null;
    clients: { name: string } | null;
  };
  const titulo = ev.name || ev.clients?.name || "Evento";

  const [salao, mesas, elementos, convidados] = await Promise.all([
    getSalao(params.id),
    getMesas(params.id),
    getElementos(params.id),
    getConvidadosCroqui(params.id),
  ]);

  const NOME_FOLHA = {
    recepcao: "Lista da recepção",
    buffet: "Contagem para o buffet",
    montagem: "Croqui de montagem",
  } as const;

  return (
    <main className={`imp-pagina ${folha === "montagem" ? "imp-paisagem-page" : ""}`}>
      <div className="imp-acoes">
        <BotaoImprimir />
        <span className="text-sm text-gray-400">
          Confira na tela antes — o papel sai exatamente assim.
        </span>
      </div>

      <header className="imp-cabecalho">
        <p className="imp-titulo">{NOME_FOLHA[folha]}</p>
        <p className="imp-sub">
          {titulo} · {formatDate(ev.date)}
          {ev.location ? ` · ${ev.location}` : ""}
          {salao?.nome ? ` · ${salao.nome}` : ""}
        </p>
      </header>

      {folha === "recepcao" && <FolhaRecepcao mesas={mesas} convidados={convidados} />}
      {folha === "buffet" && <FolhaBuffet mesas={mesas} convidados={convidados} />}
      {folha === "montagem" && (
        <FolhaMontagem salao={salao} mesas={mesas} elementos={elementos} />
      )}
    </main>
  );
}

/* ---------- 1) Recepção: nome → mesa, alfabética ---------- */

function FolhaRecepcao({
  mesas,
  convidados,
}: {
  mesas: Awaited<ReturnType<typeof getMesas>>;
  convidados: Awaited<ReturnType<typeof getConvidadosCroqui>>;
}) {
  const linhas = listaRecepcao(mesas, convidados);
  const semMesa = convidados.filter((c) => c.confirmacao !== "nao_vai" && !c.mesaId).length;
  if (linhas.length === 0) {
    return <p className="imp-sub">Ninguém alocado ainda.</p>;
  }
  const metade = Math.ceil(linhas.length / 2);
  const colunas = [linhas.slice(0, metade), linhas.slice(metade)];
  return (
    <>
      <div className="imp-duas-colunas">
        {colunas.map(
          (col, i) =>
            col.length > 0 && (
              <table key={i} className="imp-tabela">
                <thead>
                  <tr>
                    <th>Convidado</th>
                    <th style={{ textAlign: "right" }}>Mesa</th>
                  </tr>
                </thead>
                <tbody>
                  {col.map((l) => (
                    <tr key={`${l.nome}-${l.mesa}`}>
                      <td>{l.nome}</td>
                      <td className="imp-mesa-num" style={{ textAlign: "right" }}>
                        {l.mesa}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}
      </div>
      <p className="imp-rodape">
        {linhas.length} convidados com mesa
        {semMesa > 0 ? ` · ${semMesa} ainda sem mesa (não estão nesta folha)` : ""}.
      </p>
    </>
  );
}

/* ---------- 2) Buffet: contagens por mesa, SEM nomes ---------- */

function FolhaBuffet({
  mesas,
  convidados,
}: {
  mesas: Awaited<ReturnType<typeof getMesas>>;
  convidados: Awaited<ReturnType<typeof getConvidadosCroqui>>;
}) {
  const linhas = contagemPorMesa(mesas, convidados).filter((l) => l.pessoas > 0);
  if (linhas.length === 0) {
    return <p className="imp-sub">Nenhuma mesa com gente ainda.</p>;
  }
  const totais = linhas.reduce(
    (s, l) => ({ pessoas: s.pessoas + l.pessoas, criancas: s.criancas + l.criancas }),
    { pessoas: 0, criancas: 0 }
  );
  return (
    <>
      <table className="imp-tabela">
        <thead>
          <tr>
            <th>Mesa</th>
            <th style={{ textAlign: "right" }}>Pessoas</th>
            <th style={{ textAlign: "right" }}>Crianças</th>
            <th>Restrições (contagem)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.mesaId}>
              <td className="imp-mesa-num">{l.rotulo}</td>
              <td className="imp-mesa-num" style={{ textAlign: "right" }}>
                {l.pessoas}
              </td>
              <td className="imp-mesa-num" style={{ textAlign: "right" }}>
                {l.criancas || "—"}
              </td>
              <td>
                {[
                  ...l.restricoes.map(
                    (r) => `${r.quantidade} ${NOME_RESTRICAO[r.tipo]}`
                  ),
                  l.acessibilidade > 0 ? `${l.acessibilidade} acessibilidade` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="imp-rodape">
        {totais.pessoas} pessoas nas mesas · {totais.criancas} crianças. As
        restrições são contagens por mesa — a equipe do salão sabe quem é cada
        uma na hora do serviço.
      </p>
    </>
  );
}

/* ---------- 3) Montagem: o croqui em escala ---------- */

function FolhaMontagem({
  salao,
  mesas,
  elementos,
}: {
  salao: Awaited<ReturnType<typeof getSalao>>;
  mesas: Awaited<ReturnType<typeof getMesas>>;
  elementos: Awaited<ReturnType<typeof getElementos>>;
}) {
  if (!salao) return <p className="imp-sub">O salão ainda não tem medidas.</p>;
  const tiposPresentes = [...new Set(elementos.map((e) => e.tipo))];
  return (
    <>
      <CroquiEstatico
        larguraCm={salao.larguraCm}
        alturaCm={salao.alturaCm}
        mesas={mesas}
        elementos={elementos}
        rotuloOcupacao={mesas.map((m) => [m.id, `${m.lugares} lug.`])}
        planta={
          // no papel a planta vem mais forte: é contra ela que a equipe
          // vai medir o salão na hora da montagem
          salao.planta?.url &&
          salao.planta.larguraCm != null &&
          salao.planta.alturaCm != null
            ? {
                url: salao.planta.url,
                xCm: salao.planta.xCm,
                yCm: salao.planta.yCm,
                larguraCm: salao.planta.larguraCm,
                alturaCm: salao.planta.alturaCm,
                opacidade: Math.max(salao.planta.opacidade, 70),
              }
            : null
        }
      />
      <div className="imp-legenda">
        <span>
          Salão: {salao.larguraCm / 100} × {salao.alturaCm / 100} m · grade fina
          de 0,5 m, grossa de 1 m
        </span>
        {tiposPresentes.map((t) => (
          <span key={t}>{NOME_ELEMENTO[t]}</span>
        ))}
      </div>
      <p className="imp-rodape">
        Medidas em escala real — o rótulo de cada mesa diz o total de lugares.
      </p>
    </>
  );
}
