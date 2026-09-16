// O quadro por etapa do Relatório: cinco colunas, só leitura.
//
// A etapa é do sistema, não da mão dela: nenhum cartão se arrasta. As
// três primeiras colunas são o retrato de agora; Aceitas e Perdidas
// seguem o período escolhido. No celular as colunas se empilham, todas à
// vista — nada escondido à direita esperando a pessoa arrastar a tela.
//
// Cor só no pontinho ao lado do nome da coluna, o mesmo que a lista de
// Propostas usa para o status. O resto é cinza.

import Link from "next/link";
import { emReais, type ChaveDaColuna, type Coluna } from "@/lib/comercial/relatorio";
import { CORES } from "@/lib/orcamentos-ui";

const PONTO: Record<ChaveDaColuna, string> = {
  pedidos: CORES.terciario,
  enviadas: CORES.enviadoPonto,
  conversa: CORES.enviadoPonto,
  aceitas: CORES.aprovadoPonto,
  perdidas: CORES.destrutivo,
};

function ColunaDoQuadro({ coluna: c }: { coluna: Coluna }) {
  const titulo = `coluna-${c.chave}`;
  const faltam = c.total - c.cartoes.length;
  return (
    <section
      aria-labelledby={titulo}
      className="flex min-w-0 flex-col rounded-[14px] p-2.5"
      style={{ background: CORES.suave }}
    >
      <header className="px-1.5 pb-2.5 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <h3 id={titulo} className="flex items-center gap-2 text-[14px] font-semibold">
            <span
              aria-hidden
              className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: PONTO[c.chave] }}
            />
            {c.titulo}
            <span className="font-normal tabular-nums" style={{ color: CORES.secundario }}>
              {c.total}
            </span>
          </h3>
          {c.valor !== null && c.valor > 0 && (
            <span className="whitespace-nowrap text-[12.5px] tabular-nums" style={{ color: CORES.nav }}>
              {emReais(c.valor)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px]" style={{ color: CORES.secundario }}>
          {c.criterio ? `${c.criterio} · ${c.recorte}` : c.recorte}
        </p>
      </header>

      {c.cartoes.length === 0 ? (
        <p className="px-1.5 pb-2 text-[13px] leading-snug" style={{ color: CORES.nav }}>
          {c.vazio}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {c.cartoes.map((k) => (
            <li key={k.id}>
              <Link
                href={k.href}
                className="block rounded-[10px] border bg-white px-3 py-2.5 transition-colors hover:border-[#D3D0C9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500"
                style={{ borderColor: CORES.borda }}
              >
                <p className="line-clamp-2 break-words text-[13.5px] font-medium leading-snug">{k.nome}</p>
                <p className="mt-0.5 text-[12px] leading-snug" style={{ color: CORES.nav }}>
                  {k.evento}
                </p>
                {/* proposta sem valor não ganha "R$ 0": o silêncio já diz */}
                {k.valor !== null && k.valor > 0 && (
                  <p className="mt-1.5 whitespace-nowrap text-[13px] tabular-nums">{emReais(k.valor)}</p>
                )}
                <p className="mt-1 text-[12px] leading-snug" style={{ color: CORES.nav }}>
                  {k.linha}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {faltam > 0 &&
        (c.verTodas ? (
          <Link
            href={c.verTodas}
            className="mt-2 self-start px-1.5 pb-1 text-[12.5px] underline underline-offset-2 hover:opacity-80"
            style={{ color: CORES.nav }}
          >
            {c.chave === "pedidos" ? `Ver todos (${c.total})` : `Ver todas (${c.total})`}
          </Link>
        ) : (
          <p className="mt-2 px-1.5 pb-1 text-[12.5px]" style={{ color: CORES.secundario }}>
            e mais {faltam} no período
          </p>
        ))}
    </section>
  );
}

export function QuadroPorEtapa({ colunas }: { colunas: Coluna[] }) {
  return (
    <section aria-labelledby="relatorio-etapas" className="mt-8">
      <h2 id="relatorio-etapas" className="mb-3 text-[15px] font-semibold">
        Por etapa
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {colunas.map((c) => (
          <ColunaDoQuadro key={c.chave} coluna={c} />
        ))}
      </div>
    </section>
  );
}
