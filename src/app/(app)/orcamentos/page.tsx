import Link from "next/link";
import { Newsreader } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { OrcamentosTable } from "@/components/orcamentos/OrcamentosTable";
import { type Orcamento, validadeVencida } from "@/lib/orcamentos";
import { CORES } from "@/lib/orcamentos-ui";

// Serif do redesign. Carregada só nesta rota (não no layout) para não
// pesar no resto do painel, que segue com a tipografia atual.
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-orcamentos",
  display: "swap",
  // O next/font não tem métricas de fallback para esta família e avisa no
  // build; declarar a fonte de reserva resolve e evita o salto de layout.
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const dynamic = "force-dynamic";
export const metadata = { title: "Orçamentos — Vela" };

const PER_PAGE = 20;

// Ordenação vem por URL, não do cliente: a lista é paginada no servidor, e
// ordenar só a página aberta daria uma ordem errada sobre o total.
const COLUNA_ORDEM: Record<string, string> = {
  criacao: "data_criacao",
  data: "data_evento",
  valor: "valor_total",
};

// Quantos "vencendo o prazo" cabem no trilho sem virar uma segunda lista.
const VENCENDO_LIMITE = 6;

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: {
    busca?: string;
    status?: string;
    tipo?: string;
    page?: string;
    ordem?: string;
    dir?: string;
  };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Padrão: o que foi criado por último aparece primeiro. Antes a lista
  // vinha por data do evento, e um orçamento montado hoje para um casamento
  // de 2028 caía no fim — era preciso caçar o que se acabou de criar.
  const ordem = COLUNA_ORDEM[searchParams.ordem ?? ""] ? searchParams.ordem! : "criacao";
  const asc = searchParams.dir
    ? searchParams.dir !== "desc"
    : ordem !== "criacao";

  let query = supabase
    .from("orcamentos")
    .select("*", { count: "exact" })
    .order(COLUNA_ORDEM[ordem], { ascending: asc, nullsFirst: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  if (searchParams.busca) {
    // Busca por nome OU telefone: só dígitos no telefone, para casar com o
    // que a cerimonialista digita com ou sem máscara.
    const termo = searchParams.busca.trim();
    const digitos = termo.replace(/\D/g, "");
    query = digitos
      ? query.or(
          `contato_nome.ilike.%${termo}%,contato_telefone.ilike.%${digitos}%`
        )
      : query.ilike("contato_nome", `%${termo}%`);
  }
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.tipo) query = query.eq("tipo_evento", searchParams.tipo);

  // Trilho "vencendo o prazo": só proposta enviada e ainda dentro da
  // validade, da mais urgente para a menos. Consulta própria porque não
  // pode depender do filtro nem da página em que ela está.
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [{ data, count, error }, { data: todos }, { data: aVencer }] =
    await Promise.all([
      query,
      supabase.from("orcamentos").select("status, data_validade"),
      supabase
        .from("orcamentos")
        .select("*")
        .eq("status", "enviado")
        .gte("data_validade", hojeIso)
        .order("data_validade", { ascending: true })
        .limit(VENCENDO_LIMITE),
    ]);

  const rows = (data ?? []) as unknown as Orcamento[];
  const resumoBase = (todos ?? []) as Pick<
    Orcamento,
    "status" | "data_validade"
  >[];

  // O pacote fechado só existe depois do aceite; buscamos numa consulta só
  // para o resumo da linha mostrar dado real em vez de rótulo genérico.
  const ids = rows.map((o) => o.id);
  const { data: aceites } = ids.length
    ? await supabase
        .from("orcamento_aceites")
        .select("orcamento_id, pacote_nome")
        .in("orcamento_id", ids)
    : { data: [] };
  const pacotePorOrcamento = Object.fromEntries(
    ((aceites ?? []) as { orcamento_id: string; pacote_nome: string }[]).map(
      (a) => [a.orcamento_id, a.pacote_nome]
    )
  );

  // Enviado com validade vencida conta como expirado no resumo.
  const efetivo = (o: Pick<Orcamento, "status" | "data_validade">) =>
    o.status === "enviado" && validadeVencida(o) ? "expirado" : o.status;

  const total = resumoBase.length;
  const emAberto = resumoBase.filter((o) => efetivo(o) === "enviado").length;
  const aprovados = resumoBase.filter((o) => o.status === "aprovado").length;
  const decididos = resumoBase.filter((o) =>
    ["aprovado", "recusado", "expirado"].includes(efetivo(o))
  ).length;
  const conversao =
    decididos === 0 ? null : Math.round((aprovados / decididos) * 100);

  const hoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const statusAtual = searchParams.status ?? "";

  const metricas: {
    chave: string | null;
    rotulo: string;
    valor: string;
    sufixo: string | null;
  }[] = [
    { chave: "", rotulo: "Total de orçamentos", valor: String(total), sufixo: null },
    { chave: "enviado", rotulo: "Em aberto", valor: String(emAberto), sufixo: null },
    { chave: "aprovado", rotulo: "Aprovados", valor: String(aprovados), sufixo: null },
    {
      chave: null,
      rotulo: "Taxa de conversão",
      valor: conversao === null ? "—" : String(conversao),
      sufixo: conversao === null ? null : "%",
    },
  ];

  const hrefComStatus = (chave: string) => {
    const p = new URLSearchParams();
    if (searchParams.busca) p.set("busca", searchParams.busca);
    if (searchParams.tipo) p.set("tipo", searchParams.tipo);
    if (searchParams.ordem) p.set("ordem", searchParams.ordem);
    if (searchParams.dir) p.set("dir", searchParams.dir);
    // clicar no filtro ativo volta para "todos"
    const alvo = statusAtual === chave ? "" : chave;
    if (alvo) p.set("status", alvo);
    const qs = p.toString();
    return qs ? `/orcamentos?${qs}` : "/orcamentos";
  };

  return (
    <div
      className={`${serif.variable} mx-auto max-w-[1080px]`}
      style={{ color: CORES.texto }}
    >
      {/* topbar: data por extenso */}
      <p className="text-[12.5px] capitalize" style={{ color: CORES.terciario }}>
        {hoje}
      </p>

      {/* cabeçalho */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-[28px] font-medium leading-tight sm:text-[34px]"
            style={{
              fontFamily: "var(--font-serif-orcamentos), Georgia, serif",
              letterSpacing: "-0.3px",
            }}
          >
            Orçamentos
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: CORES.secundario }}>
            Monte propostas e acompanhe aprovações
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/orcamentos/modelos"
            className="rounded-[9px] border bg-white px-3.5 py-2 text-[13.5px] transition-colors hover:bg-[#F7F7F5]"
            style={{ borderColor: CORES.borda, color: CORES.texto }}
          >
            Modelos de precificação
          </Link>
          <Link
            href="/orcamentos/novo"
            className="rounded-[9px] px-4 py-2 text-[13.5px] transition-colors hover:bg-black"
            style={{ background: CORES.texto, color: CORES.suave }}
          >
            + Novo orçamento
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Não foi possível carregar os orçamentos agora. Recarregue a página em
          alguns instantes.
        </div>
      )}

      {/* métricas: contêiner único com divisórias. "Em aberto" e
          "Aprovados" filtram a lista; "Total" limpa o filtro. */}
      <div
        className="mt-6 grid grid-cols-2 overflow-hidden rounded-[14px] border lg:grid-cols-4"
        style={{ borderColor: CORES.borda }}
      >
        {metricas.map((m, i) => {
          const clicavel = m.chave !== null;
          const ativo = clicavel && m.chave !== "" && m.chave === statusAtual;
          const estilo = {
            borderColor: CORES.borda,
            borderLeftWidth: i === 0 ? 0 : 1,
            background: ativo ? CORES.tag : undefined,
          };
          const conteudo = (
            <>
              <p
                className="text-[10.5px] uppercase"
                style={{ letterSpacing: "1px", color: CORES.terciario }}
              >
                {m.rotulo}
              </p>
              <p
                className="mt-1.5 text-[26px] font-medium leading-none sm:text-[30px]"
                style={{ fontFamily: "var(--font-serif-orcamentos), Georgia, serif" }}
              >
                {m.valor}
                {m.sufixo && (
                  <span className="text-[18px]" style={{ color: CORES.enviadoPonto }}>
                    {m.sufixo}
                  </span>
                )}
              </p>
            </>
          );
          return clicavel ? (
            <Link
              key={m.rotulo}
              href={hrefComStatus(m.chave as string)}
              className="border-l px-5 py-4 transition-colors hover:bg-[#F7F7F5]"
              style={estilo}
            >
              {conteudo}
            </Link>
          ) : (
            <div key={m.rotulo} className="border-l px-5 py-4" style={estilo}>
              {conteudo}
            </div>
          );
        })}
      </div>

      <OrcamentosTable
        rows={rows}
        total={count ?? 0}
        perPage={PER_PAGE}
        vencendo={(aVencer ?? []) as unknown as Orcamento[]}
        pacotePorOrcamento={pacotePorOrcamento}
        current={{
          busca: searchParams.busca ?? "",
          status: statusAtual,
          tipo: searchParams.tipo ?? "",
          page,
          ordem,
          dir: asc ? "asc" : "desc",
        }}
      />
    </div>
  );
}
