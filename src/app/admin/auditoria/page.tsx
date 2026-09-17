// Auditoria — o que foi feito no painel, por quem, quando e por quê.
//
// A tabela não aceita alteração nem exclusão (gatilho no banco): o que
// entrou aqui fica. É o registro que uma due diligence pede, e também o
// que protege o dono quando alguém perguntar "quem mexeu nisso?".

import Link from "next/link";
import { getAuditoria, getNomesDasContas } from "@/lib/supabase/admin-sistema";
import { ACOES_DA_AUDITORIA, acaoEmPalavras, mudancaEmTexto } from "@/lib/admin/auditoria";
import { diaEHoraBR, plural } from "@/lib/admin/formatos";
import { Aviso, Cabecalho, Secao, Vazio } from "@/components/admin/pecas";

export const dynamic = "force-dynamic";

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams?: { acao?: string; conta?: string };
}) {
  const acao = searchParams?.acao && ACOES_DA_AUDITORIA[searchParams.acao] ? searchParams.acao : null;
  const conta = searchParams?.conta?.match(/^[0-9a-f-]{36}$/i) ? searchParams.conta : null;
  const [registro, nomes] = await Promise.all([getAuditoria({ acao, empresaId: conta }), getNomesDasContas()]);

  return (
    <div data-adm-secao="auditoria" className="flex flex-col gap-4">
      <Cabecalho
        titulo="Auditoria"
        linha="Cada ação do painel, com o antes e o depois. Não se altera e não se apaga."
      />

      {!registro.tabela && <Aviso>Reaplique a migração 123 no Supabase para ter a auditoria.</Aviso>}

      <form action="/admin/auditoria" method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-[#dededa] bg-white px-4 py-3">
        <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
          Ação
          <select
            name="acao"
            defaultValue={acao ?? ""}
            className="h-8 max-w-[280px] rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
          >
            <option value="">Todas</option>
            {Object.entries(ACOES_DA_AUDITORIA).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
          Conta
          <select
            name="conta"
            defaultValue={conta ?? ""}
            className="h-8 max-w-[240px] rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
          >
            <option value="">Todas</option>
            {[...nomes.entries()]
              .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
              .map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-8 rounded-md bg-[#33343a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#4d4e55]"
        >
          Filtrar
        </button>
        {(acao || conta) && (
          <Link href="/admin/auditoria" className="h-8 px-1 text-[12.5px] leading-8 text-[#5c5d63] underline underline-offset-2">
            limpar
          </Link>
        )}
      </form>

      <Secao titulo="Registro" lado={registro.linhas.length ? plural(registro.linhas.length, "linha", "linhas") : undefined}>
        {registro.linhas.length === 0 ? (
          <Vazio>Nada registrado com esses filtros.</Vazio>
        ) : (
          <ul className="flex flex-col gap-2">
            {registro.linhas.map((r, i) => {
              const mudanca = mudancaEmTexto(r.antes, r.depois);
              return (
                <li key={i} className="border-b border-[#f0f0ec] pb-2 text-[13px] last:border-0">
                  <p className="text-[#1c1d21]">
                    <span className="text-[#84858b]">{diaEHoraBR(r.em)}</span> · {r.quem} · {acaoEmPalavras(r.acao)}
                    {r.empresaId && (
                      <>
                        {" · "}
                        <Link href={`/admin/contas/${r.empresaId}`} className="font-medium underline underline-offset-2">
                          {nomes.get(r.empresaId) ?? r.empresaNome ?? "conta"}
                        </Link>
                        {r.daCasa && <span className="text-[#84858b]"> (conta da casa)</span>}
                      </>
                    )}
                  </p>
                  {mudanca && <p className="mt-0.5 text-[12.5px] text-[#5c5d63]">{mudanca}</p>}
                  {r.motivo && <p className="mt-0.5 text-[12.5px] text-[#3d3e44]">motivo: {r.motivo}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
    </div>
  );
}
