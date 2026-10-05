import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { EVENT_TYPE_LABELS } from "@/lib/types";
import type { CronogramaItem } from "@/lib/cronograma";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import { BotaoImprimir } from "@/app/imprimir/mesas/[id]/BotaoImprimir";
import "@/app/imprimir/mesas/[id]/impressos.css";
import "./prancheta.css";

export const dynamic = "force-dynamic";

// A prancha do dia, em papel.
//
// Existe por um motivo de produto, não técnico: hoje a cerimonialista
// leva folhas A4 numa prancha. Se ela larga o papel e se queima uma vez
// — sinal ruim no sítio, celular sem bateria, tela quebrada —, ela volta
// para o papel e o eorganizei perde a usuária inteira, não o recurso. Imprimir
// na véspera é o mesmo gesto que ela já faz, e custa uma rota.
//
// Dois modelos (04/10/2026, pedido do dono: "não é tirar o que temos, mas
// ter outras opções"):
// - Prancheta: pensada para a prancheta do dia — o prendedor cobre o topo
//   da folha, a leitura é de pé, a um braço, com caneta na mão. Horário
//   grande, quem faz e a deixa na mesma linha, caixa de marcar de verdade,
//   os telefones do dia e a hora em que a folha foi impressa.
// - Tabela: a folha de sempre.
// Na tela, ela escolhe o modelo, o que entra e o tamanho da letra; a
// escolha vai no endereço, e o papel sai sem a barra.
//
// Rota própria, fora do layout do evento, para o papel sair limpo —
// mesmo padrão das folhas de mesas. Sessão exigida pelo middleware; a
// RLS decide o que esta conta enxerga.

const BLOCOS: { key: string; label: string }[] = [
  { key: "montagem", label: "Montagem" },
  { key: "colacao", label: "Colação" },
  { key: "cerimonia", label: "Cerimônia" },
  { key: "recepcao", label: "Recepção" },
  { key: "desmontagem", label: "Desmontagem" },
];

type Busca = {
  /** ?pessoa=<id da equipe do dia>: o roteiro de bolso dela (171) */
  pessoa?: string;
  modelo?: string;
  checklist?: string;
  contatos?: string;
  notas?: string;
  letra?: string;
};

type Opcoes = {
  modelo: "prancheta" | "tabela";
  checklist: boolean;
  contatos: boolean;
  notas: boolean;
  grande: boolean;
};

function lerOpcoes(b: Busca | undefined): Opcoes {
  return {
    modelo: b?.modelo === "tabela" ? "tabela" : "prancheta",
    checklist: b?.checklist !== "0",
    contatos: b?.contatos !== "0",
    notas: b?.notas === "1",
    grande: b?.letra === "grande",
  };
}

function hora(t: string | null): string {
  return t ? t.slice(0, 5) : "—";
}

/** "84999990000" / "5584999990000" → "(84) 99999-0000"; o resto, como veio */
function telefone(t: string | null | undefined): string | null {
  const bruto = (t ?? "").trim();
  if (!bruto) return null;
  let d = bruto.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return bruto;
}

function diaDaSemana(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "long" });
}

type Contato = { nome: string; papel: string | null; telefone: string | null };

export default async function ImprimirRoteiroPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Busca;
}) {
  const supabase = createClient();
  const op = lerOpcoes(searchParams);

  const pessoaId = searchParams?.pessoa ?? null;
  const [
    { data: eventData },
    cronogramaResult,
    { data: checklistData },
    { data: pessoa },
    { data: linksData },
    { data: equipeData },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, date, time, guests, type, name, location, city, clients(name, phone)")
      .eq("id", params.id)
      .single(),
    supabase.rpc("cronograma_evento", { p_event_id: params.id }),
    supabase
      .from("evento_checklist_dia")
      .select("id, bloco, titulo, horario, ordem, ativo")
      .eq("event_id", params.id)
      .eq("ativo", true)
      .order("bloco")
      .order("ordem"),
    pessoaId
      ? supabase
          .from("equipe_do_dia")
          .select("id, nome, posto")
          .eq("id", pessoaId)
          .eq("event_id", params.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("roteiro_links")
      .select("role, suppliers(name, category, phone, whatsapp)")
      .eq("event_id", params.id),
    supabase
      .from("equipe_do_dia")
      .select("nome, posto, telefone")
      .eq("event_id", params.id)
      .eq("ativo", true)
      .order("ordem"),
  ]);

  if (!eventData) notFound();

  const ev = eventData as unknown as {
    id: string;
    date: string;
    time: string | null;
    guests: number | null;
    type: keyof typeof EVENT_TYPE_LABELS;
    name: string | null;
    location: string | null;
    city: string | null;
    clients: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
  };
  const cliente = Array.isArray(ev.clients) ? ev.clients[0] : ev.clients;

  const todos = (cronogramaResult.data ?? []) as unknown as CronogramaItem[];
  const dela = pessoa as { id: string; nome: string; posto: string | null } | null;
  // roteiro de bolso: só os itens dela; o checklist do dia fica de fora
  const itens = dela ? todos.filter((i) => i.equipe_do_dia_id === dela.id) : todos;
  const checklist = (checklistData ?? []) as {
    id: string;
    bloco: string;
    titulo: string;
    horario: string | null;
  }[];

  const titulo =
    ev.name ??
    [EVENT_TYPE_LABELS[ev.type] ?? "Evento", cliente?.name].filter(Boolean).join(" — ");
  const local = [ev.location, ev.city].filter(Boolean).join(" · ");

  const caminho = `/imprimir/roteiro/${params.id}`;

  return (
    <div className="imp-pagina">
      <BarraDeOpcoes caminho={caminho} busca={searchParams ?? {}} op={op} temChecklist={!dela && checklist.length > 0} />

      {op.modelo === "tabela" ? (
        <FolhaTabela
          titulo={titulo}
          data={ev.date}
          local={local}
          dela={dela}
          itens={itens}
          checklist={op.checklist && !dela ? checklist : []}
        />
      ) : (
        <FolhaPrancheta
          titulo={titulo}
          data={ev.date}
          inicio={ev.time}
          convidados={ev.guests}
          local={local}
          dela={dela}
          itens={itens}
          checklist={op.checklist && !dela ? checklist : []}
          contatos={
            op.contatos
              ? contatosDoDia(
                  cliente ?? null,
                  (linksData ?? []) as unknown as LinkCru[],
                  (equipeData ?? []) as { nome: string; posto: string | null; telefone: string | null }[]
                )
              : null
          }
          notas={op.notas}
          grande={op.grande}
        />
      )}
    </div>
  );
}

type LinkCru = {
  role: string | null;
  suppliers:
    | { name: string; category: string | null; phone: string | null; whatsapp: string | null }
    | null;
};

function contatosDoDia(
  cliente: { name: string; phone: string | null } | null,
  links: LinkCru[],
  equipe: { nome: string; posto: string | null; telefone: string | null }[]
): { fornecedores: Contato[]; equipe: Contato[] } {
  const fornecedores = links
    .filter((l) => l.suppliers?.name)
    .map((l) => ({
      nome: l.suppliers!.name,
      papel: l.role?.trim() || (l.suppliers!.category ? categoriaLabel(l.suppliers!.category) : null),
      telefone: telefone(l.suppliers!.whatsapp ?? l.suppliers!.phone),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  const daEquipe: Contato[] = [
    ...(cliente?.name ? [{ nome: cliente.name, papel: "cliente", telefone: telefone(cliente.phone) }] : []),
    ...equipe.map((p) => ({ nome: p.nome, papel: p.posto, telefone: telefone(p.telefone) })),
  ];
  return { fornecedores, equipe: daEquipe };
}

// ------------------------------------------------------------------
// A barra da tela: o modelo, o que entra, a letra. Some no papel.
// ------------------------------------------------------------------
function BarraDeOpcoes({
  caminho,
  busca,
  op,
  temChecklist,
}: {
  caminho: string;
  busca: Busca;
  op: Opcoes;
  temChecklist: boolean;
}) {
  const com = (mudar: Partial<Record<keyof Busca, string | undefined>>) => {
    const q = new URLSearchParams();
    const junto = { ...busca, ...mudar };
    for (const [k, v] of Object.entries(junto)) if (v !== undefined && v !== "") q.set(k, v);
    const s = q.toString();
    return s ? `${caminho}?${s}` : caminho;
  };
  const prancheta = op.modelo === "prancheta";

  return (
    <div className="imp-acoes rp-barra">
      <BotaoImprimir />
      <span className="rp-grupo" role="group" aria-label="Modelo">
        <Link href={com({ modelo: undefined })} className={prancheta ? "rp-op rp-op-on" : "rp-op"} aria-pressed={prancheta}>
          Prancheta
        </Link>
        <Link href={com({ modelo: "tabela" })} className={!prancheta ? "rp-op rp-op-on" : "rp-op"} aria-pressed={!prancheta}>
          Tabela
        </Link>
      </span>
      {temChecklist && (
        <Marcar href={com({ checklist: op.checklist ? "0" : undefined })} ligado={op.checklist}>
          Checklist do dia
        </Marcar>
      )}
      {prancheta && (
        <>
          <Marcar href={com({ contatos: op.contatos ? "0" : undefined })} ligado={op.contatos}>
            Telefones
          </Marcar>
          <Marcar href={com({ notas: op.notas ? undefined : "1" })} ligado={op.notas}>
            Linhas para anotar
          </Marcar>
          <Marcar href={com({ letra: op.grande ? undefined : "grande" })} ligado={op.grande}>
            Letra grande
          </Marcar>
        </>
      )}
    </div>
  );
}

function Marcar({ href, ligado, children }: { href: string; ligado: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={ligado ? "rp-marcar rp-marcar-on" : "rp-marcar"} aria-pressed={ligado}>
      <span className="rp-marcar-caixa" aria-hidden>
        {ligado ? "✓" : ""}
      </span>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------
// Modelo Prancheta
// ------------------------------------------------------------------
function FolhaPrancheta({
  titulo,
  data,
  inicio,
  convidados,
  local,
  dela,
  itens,
  checklist,
  contatos,
  notas,
  grande,
}: {
  titulo: string;
  data: string;
  inicio: string | null;
  convidados: number | null;
  local: string;
  dela: { nome: string; posto: string | null } | null;
  itens: CronogramaItem[];
  checklist: { id: string; bloco: string; titulo: string; horario: string | null }[];
  contatos: { fornecedores: Contato[]; equipe: Contato[] } | null;
  notas: boolean;
  grande: boolean;
}) {
  const impressoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const fatos = [
    `${diaDaSemana(data)}, ${formatDate(data)}`,
    inicio ? `início ${inicio.slice(0, 5)}` : null,
    convidados ? `${convidados} convidados` : null,
  ].filter(Boolean);

  return (
    <table className={grande ? "rp rp-grande rp-folha" : "rp rp-folha"} role="presentation">
      {/* a faixa do prendedor: repete no alto de cada folha impressa */}
      <thead aria-hidden>
        <tr>
          <td className="rp-prendedor" />
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
      <header className="rp-cabeca">
        <div className="rp-cabeca-esq">
          <h1 className="rp-titulo">{titulo}</h1>
          <p className="rp-fatos">{fatos.join(" · ")}</p>
          {local && <p className="rp-local">{local}</p>}
          {dela && (
            <p className="rp-dela">
              Roteiro de {dela.nome}
              {dela.posto ? ` · ${dela.posto}` : ""}
            </p>
          )}
        </div>
        <p className="rp-versao">
          impresso em
          <br />
          <b>{impressoEm}</b>
        </p>
      </header>

      {itens.length === 0 ? (
        <p className="rp-vazio">Nenhum item no roteiro ainda.</p>
      ) : (
        <table className="rp-roteiro">
          {/* repete no alto de cada folha: é a faixa que o prendedor cobre */}
          <thead>
            <tr>
              <th className="rp-col-hora">hora</th>
              <th>o quê · quem</th>
              <th className="rp-col-ok">ok</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => {
              const quem = [
                i.supplier_name,
                i.supplier_categoria ? categoriaLabel(i.supplier_categoria) : null,
              ].filter(Boolean);
              const resp = [i.responsavel_nome, telefone(i.responsavel_telefone)].filter(Boolean);
              return (
                <tr key={i.id}>
                  <td className="rp-hora">{hora(i.time)}</td>
                  <td>
                    <p className="rp-item">{i.title}</p>
                    {(quem.length > 0 || resp.length > 0) && (
                      <p className="rp-quem">
                        {quem.join(" · ")}
                        {quem.length > 0 && resp.length > 0 ? "  ·  " : ""}
                        {resp.length > 0 && <>resp. {resp.join(" · ")}</>}
                      </p>
                    )}
                    {i.deixa && (
                      <p className="rp-deixa">
                        <b>deixa</b> {i.deixa}
                      </p>
                    )}
                    {i.description && <p className="rp-obs">{i.description}</p>}
                  </td>
                  <td className="rp-ok">
                    <span className="rp-caixa" aria-hidden />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {contatos && (contatos.fornecedores.length > 0 || contatos.equipe.length > 0) && (
        <section className="rp-secao rp-contatos">
          <h2 className="rp-secao-titulo">Telefones do dia</h2>
          <div className="rp-duas">
            {contatos.fornecedores.length > 0 && (
              <ListaDeContatos titulo="Fornecedores" lista={contatos.fornecedores} />
            )}
            {contatos.equipe.length > 0 && <ListaDeContatos titulo="Cliente e equipe" lista={contatos.equipe} />}
          </div>
        </section>
      )}

      {checklist.length > 0 && (
        <section className="rp-secao">
          <h2 className="rp-secao-titulo">Checklist do dia</h2>
          <div className="rp-duas">
            {BLOCOS.map((b) => {
              const doBloco = checklist.filter((c) => c.bloco === b.key);
              if (doBloco.length === 0) return null;
              return (
                <div key={b.key} className="rp-bloco">
                  <h3 className="rp-bloco-titulo">{b.label}</h3>
                  <ul className="rp-check">
                    {doBloco.map((c) => (
                      <li key={c.id}>
                        <span className="rp-caixa rp-caixa-p" aria-hidden />
                        <span>
                          {c.horario ? <b className="rp-check-hora">{hora(c.horario)}</b> : null}
                          {c.titulo}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {notas && (
        <section className="rp-secao rp-notas">
          <h2 className="rp-secao-titulo">Anotações</h2>
          {Array.from({ length: 10 }, (_, n) => (
            <div key={n} className="rp-linha" />
          ))}
        </section>
      )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ListaDeContatos({ titulo, lista }: { titulo: string; lista: Contato[] }) {
  return (
    <div className="rp-bloco">
      <h3 className="rp-bloco-titulo">{titulo}</h3>
      <ul className="rp-tel">
        {lista.map((c, n) => (
          <li key={`${c.nome}-${n}`}>
            <span className="rp-tel-nome">
              {c.nome}
              {c.papel ? <span className="rp-tel-papel"> · {c.papel}</span> : null}
            </span>
            <span className="rp-tel-num">{c.telefone ?? "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------
// Modelo Tabela — a folha de sempre
// ------------------------------------------------------------------
function FolhaTabela({
  titulo,
  data,
  local,
  dela,
  itens,
  checklist,
}: {
  titulo: string;
  data: string;
  local: string;
  dela: { nome: string; posto: string | null } | null;
  itens: CronogramaItem[];
  checklist: { id: string; bloco: string; titulo: string; horario: string | null }[];
}) {
  return (
    <>
      <div className="imp-cabecalho">
        <div className="imp-titulo">{titulo}</div>
        <div className="imp-sub">
          {formatDate(data)}
          {local ? ` · ${local}` : ""}
        </div>
        {dela && (
          <div className="imp-sub" style={{ marginTop: 4, color: "#1c1917", fontWeight: 600 }}>
            Roteiro de {dela.nome}
            {dela.posto ? ` · ${dela.posto}` : ""}
          </div>
        )}
      </div>

      {itens.length === 0 ? (
        <p style={{ fontSize: 13, color: "#57534e" }}>Nenhum item no roteiro ainda.</p>
      ) : (
        <table className="imp-tabela">
          <thead>
            <tr>
              <th style={{ width: 58 }}>Hora</th>
              <th>Item</th>
              <th style={{ width: 150 }}>Fornecedor</th>
              <th style={{ width: 130 }}>Responsável</th>
              {/* A coluna vazia é para ela riscar à caneta, como faz hoje */}
              <th style={{ width: 26 }}>OK</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="imp-mesa-num">{hora(i.time)}</td>
                <td>
                  <strong>{i.title}</strong>
                  {i.deixa ? <div style={{ fontSize: 12, marginTop: 2 }}>Deixa: {i.deixa}</div> : null}
                  {i.description ? (
                    <div style={{ fontSize: 11.5, color: "#57534e", marginTop: 2 }}>{i.description}</div>
                  ) : null}
                </td>
                <td>
                  {i.supplier_name ?? "—"}
                  {i.responsavel_telefone ? (
                    <div style={{ fontSize: 11, color: "#57534e" }}>{i.responsavel_telefone}</div>
                  ) : null}
                </td>
                <td>{i.responsavel_nome ?? "—"}</td>
                <td style={{ borderLeft: "1px solid #e7e5e4" }}> </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {checklist.length > 0 && (
        <>
          <div className="imp-cabecalho" style={{ marginTop: 24, borderBottomWidth: 1 }}>
            <div className="imp-titulo" style={{ fontSize: 15 }}>
              Checklist do dia
            </div>
          </div>
          <div className="imp-duas-colunas">
            {BLOCOS.map((b) => {
              const doBloco = checklist.filter((c) => c.bloco === b.key);
              if (doBloco.length === 0) return null;
              return (
                <table key={b.key} className="imp-tabela" style={{ marginBottom: 14 }}>
                  <thead>
                    <tr>
                      <th colSpan={3}>{b.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doBloco.map((c) => (
                      <tr key={c.id}>
                        <td className="imp-mesa-num" style={{ width: 46 }}>
                          {hora(c.horario)}
                        </td>
                        <td>{c.titulo}</td>
                        <td style={{ width: 22, borderLeft: "1px solid #e7e5e4" }}> </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })}
          </div>
        </>
      )}

      <div className="imp-rodape">
        Impresso do eorganizei · {formatDate(data)} · confira a versão na tela antes do evento, o roteiro pode
        ter mudado.
      </div>
    </>
  );
}
