// Contas: quem são, em que situação estão, e o caminho para a ficha.
//
// Dois grupos que nunca se misturam (regra dele, 17/09/2026): Clientes e
// Contas da casa. Os filtros valem dentro do grupo escolhido. Sem a 123
// reaplicada, a tela volta para a tabela de antes, com o aviso.

import Link from "next/link";
import { Building2, FlaskConical } from "lucide-react";
import { getAgoraDasContas, getContas } from "@/lib/supabase/admin-painel";
import { getResumoDasContas } from "@/lib/supabase/admin-contas";
import { getCatalogoDePlanos, reais as reaisDoCatalogo, tetoEmTexto } from "@/lib/planos";
import {
  GRUPOS_DE_ATENCAO,
  PASSOS,
  FAIXAS_SEM_USO,
  type ResumoDaConta,
} from "@/lib/admin/saude-da-conta";
import {
  canalDaConta,
  filtrarContas,
  hrefDaLista,
  lerFiltros,
  linhaDaConta,
  ordenarContas,
  passouNaSituacao,
  type FiltrosDeContas,
  type Situacoes,
} from "@/lib/admin/lista-de-contas";
import { mesPorExtenso } from "@/lib/admin/formatos";
import { Abas, Aviso, Cabecalho, Filtros, Vazio } from "@/components/admin/pecas";
import { TabelaContas } from "./TabelaContas";
import type { OpcaoDePlano } from "./EditorAssinatura";
import { ListaDeContas } from "./ListaDeContas";

export const dynamic = "force-dynamic";

const SITUACOES: { chave: Situacoes; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "atencao", rotulo: "Precisam de atenção" },
  { chave: "teste", rotulo: "Em teste" },
  { chave: "pagantes", rotulo: "Pagantes" },
  { chave: "canceladas", rotulo: "Canceladas" },
  { chave: "suspensas", rotulo: "Suspensas" },
  { chave: "sem_evento", rotulo: "Sem evento" },
  { chave: "evento_proximo", rotulo: "Evento nos próximos 30 dias" },
  { chave: "suporte", rotulo: "Suporte sem resposta" },
];

function opcoesUnicas(valores: (string | null | undefined)[]): string[] {
  return [...new Set(valores.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

function Seletor({
  nome,
  rotulo,
  valor,
  opcoes,
}: {
  nome: string;
  rotulo: string;
  valor: string | null;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
      {rotulo}
      <select
        name={nome}
        defaultValue={valor ?? ""}
        className="h-8 max-w-[220px] rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
      >
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function BarraDeFiltros({
  f,
  doGrupo,
  agora,
}: {
  f: FiltrosDeContas;
  doGrupo: ResumoDaConta[];
  agora: Date;
}) {
  const planos = opcoesUnicas(doGrupo.map((c) => c.assinatura?.plano ?? "sem_assinatura"));
  const origens = opcoesUnicas(doGrupo.map((c) => canalDaConta(c)));
  const campanhas = opcoesUnicas(doGrupo.map((c) => c.origem?.utm_campaign));
  const meses = opcoesUnicas(
    doGrupo.map((c) =>
      new Date(c.criada_em).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7)
    )
  ).reverse();

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#dededa] bg-white px-4 py-3">
      <Filtros
        rotulo="Situação"
        atual={f.situacao}
        opcoes={SITUACOES.map((s) => ({
          chave: s.chave,
          rotulo: s.rotulo,
          href: hrefDaLista(f, { situacao: s.chave, atencao: null, passo: null }),
          contagem: doGrupo.filter((c) => passouNaSituacao(c, s.chave, agora)).length,
        }))}
      />
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#5c5d63]">
        <span>Sem abrir o sistema há</span>
        <Filtros
          rotulo="Sem abrir o sistema há"
          atual={f.semUso ? String(f.semUso) : "qualquer"}
          opcoes={[
            { chave: "qualquer", rotulo: "qualquer tempo", href: hrefDaLista(f, { semUso: null }) },
            ...FAIXAS_SEM_USO.map((d) => ({
              chave: String(d),
              rotulo: `${d} dias ou mais`,
              href: hrefDaLista(f, { semUso: d }),
            })),
          ]}
        />
      </div>

      {(f.atencao || f.passo) && (
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#3d3e44]">
          {f.atencao && (
            <span>
              Motivo: <strong>{GRUPOS_DE_ATENCAO.find((g) => g.chave === f.atencao)?.titulo ?? f.atencao}</strong>
            </span>
          )}
          {f.passo && (
            <span>
              Parou antes de: <strong>{PASSOS.find((p) => p.chave === f.passo)?.rotulo ?? f.passo}</strong>
            </span>
          )}
          <Link href={hrefDaLista(f, { atencao: null, passo: null })} className="text-[#6e3f5f] underline underline-offset-2">
            tirar
          </Link>
        </p>
      )}

      {/* os filtros de valor viajam num formulário simples (GET): nada de
          JavaScript para filtrar uma lista que o servidor já sabe filtrar */}
      <form action="/admin/contas" method="get" className="flex flex-wrap items-end gap-3">
        {f.grupo === "casa" && <input type="hidden" name="grupo" value="casa" />}
        {f.situacao !== "todas" && <input type="hidden" name="situacao" value={f.situacao} />}
        {f.semUso && <input type="hidden" name="sem_uso" value={String(f.semUso)} />}
        {f.atencao && <input type="hidden" name="atencao" value={f.atencao} />}
        {f.passo && <input type="hidden" name="passo" value={f.passo} />}
        <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
          Buscar
          <input
            name="q"
            defaultValue={f.busca}
            placeholder="nome, responsável ou e-mail"
            className="h-8 w-[220px] rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
          />
        </label>
        <Seletor
          nome="plano"
          rotulo="Plano"
          valor={f.plano}
          opcoes={planos.map((p) => ({ valor: p, rotulo: p === "sem_assinatura" ? "sem assinatura" : p }))}
        />
        <Seletor nome="origem" rotulo="Origem" valor={f.origem} opcoes={origens.map((o) => ({ valor: o, rotulo: o }))} />
        {campanhas.length > 0 && (
          <Seletor nome="campanha" rotulo="Campanha" valor={f.campanha} opcoes={campanhas.map((c) => ({ valor: c, rotulo: c }))} />
        )}
        <Seletor nome="criada" rotulo="Criada em" valor={f.criada} opcoes={meses.map((m) => ({ valor: m, rotulo: mesPorExtenso(m) }))} />
        <label className="flex flex-col gap-1 text-[11.5px] text-[#84858b]">
          Ordem
          <select
            name="ordem"
            defaultValue={f.ordem}
            className="h-8 rounded-md border border-[#d3d3cf] bg-white px-2 text-[13px] text-[#1c1d21]"
          >
            <option value="atencao">quem precisa de atenção primeiro</option>
            <option value="acao">última ação útil</option>
            <option value="acesso">último acesso</option>
            <option value="criacao">mais novas</option>
          </select>
        </label>
        <button
          type="submit"
          className="h-8 rounded-md bg-[#33343a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#4d4e55]"
        >
          Filtrar
        </button>
        <Link
          href={hrefDaLista(
            { ...f, situacao: "todas", semUso: null, atencao: null, passo: null, plano: null, origem: null, campanha: null, criada: null, busca: "", ordem: "atencao" },
            {}
          )}
          className="h-8 px-1 text-[12.5px] leading-8 text-[#5c5d63] underline underline-offset-2"
        >
          limpar
        </Link>
      </form>
    </div>
  );
}

export default async function AdminContasPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const agora = new Date();
  const f = lerFiltros(searchParams ?? {});
  const [leitura, catalogo] = await Promise.all([getResumoDasContas(), getCatalogoDePlanos()]);

  // O rótulo é montado AQUI, no servidor: o editor é client e não pode
  // puxar @/lib/planos (ele lê cookies via next/headers).
  const planos: OpcaoDePlano[] = [
    ...catalogo.map((p) => ({
      codigo: p.codigo,
      rotulo: `${p.nome} — ${reaisDoCatalogo(p.valorMensal)} · ${tetoEmTexto(p.eventosEmAndamento)} eventos · ${tetoEmTexto(p.logins)} ${p.logins === 1 ? "login" : "logins"}`,
      valorMensal: p.valorMensal,
    })),
    { codigo: "cortesia", rotulo: "Cortesia — sem limite", valorMensal: null },
    { codigo: "piloto", rotulo: "Piloto — sem limite", valorMensal: null },
  ];

  if (!leitura.ok) {
    // Reserva: a tabela de antes, que não depende da 123 nova.
    const contas = leitura.motivo === "migracao" ? await getContas() : [];
    return (
      <div data-adm-secao="contas" className="flex flex-col gap-4">
        <Cabecalho titulo="Contas" />
        <Aviso>{leitura.mensagem}</Aviso>
        {contas.length > 0 && <TabelaContas contas={contas} planos={planos} />}
      </div>
    );
  }

  const todas = leitura.dados;
  const clientes = todas.filter((c) => !c.da_casa);
  const casa = todas.filter((c) => c.da_casa);
  const doGrupo = f.grupo === "casa" ? casa : clientes;
  const filtradas = ordenarContas(filtrarContas(todas, f, agora), f.ordem, agora);
  const agoraPor = await getAgoraDasContas();

  return (
    <div data-adm-secao="contas" className="flex flex-col gap-4">
      <Cabecalho
        titulo="Contas"
        linha={
          f.grupo === "casa"
            ? "As suas contas: administrador, testes e vídeo. Ficam fora de todos os números do painel."
            : "Só contas de clientes. As contas da casa ficam na outra aba e fora de todos os números."
        }
      />

      <Abas
        rotulo="Grupo de contas"
        atual={f.grupo}
        abas={[
          {
            chave: "clientes",
            rotulo: "Clientes",
            href: hrefDaLista(f, { grupo: "clientes", plano: null, origem: null, campanha: null, criada: null }),
            Icone: Building2,
            contagem: clientes.length,
          },
          {
            chave: "casa",
            rotulo: "Contas da casa",
            href: hrefDaLista(f, { grupo: "casa", plano: null, origem: null, campanha: null, criada: null }),
            Icone: FlaskConical,
            contagem: casa.length,
          },
        ]}
      />

      <BarraDeFiltros f={f} doGrupo={doGrupo} agora={agora} />

      <p className="text-[12.5px] text-[#5c5d63]">
        {filtradas.length === doGrupo.length
          ? `${doGrupo.length} ${doGrupo.length === 1 ? "conta" : "contas"}`
          : `${filtradas.length} de ${doGrupo.length} ${doGrupo.length === 1 ? "conta" : "contas"}`}
        {f.grupo === "clientes" && clientes.length > 0 && (
          <>
            {" · MRR dos clientes: "}
            {reaisDoCatalogo(
              clientes
                .filter((c) => c.assinatura?.status === "ativa" || c.assinatura?.status === "inadimplente")
                .reduce((s, c) => s + (Number(c.assinatura?.valor_mensal) || 0), 0)
            )}
          </>
        )}
      </p>

      {filtradas.length === 0 ? (
        <Vazio>
          {doGrupo.length === 0
            ? f.grupo === "casa"
              ? "Nenhuma conta marcada como da casa."
              : "Nenhuma conta de cliente ainda."
            : "Nenhuma conta com esses filtros."}
        </Vazio>
      ) : (
        <ListaDeContas
          linhas={filtradas.map((c) => linhaDaConta(c, agora))}
          agoraInicial={Object.fromEntries(filtradas.map((c) => [c.empresa_id, agoraPor[c.empresa_id] ?? null]))}
          // o resumo "N no sistema agora" só quando a lista mostra todos os
          // clientes: com filtro, ele esconderia quem está fora dele
          resumoAoVivo={f.grupo === "clientes" && filtradas.length === clientes.length}
        />
      )}
    </div>
  );
}
