"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tem, type Capacidade } from "@/lib/capacidades";
import { ExplicacaoDoMenu } from "@/components/ajuda/ExplicacaoDoMenu";
import { explicacaoDoEvento } from "@/lib/explicacoes-do-menu";

export type TabCounters = {
  fornecedores: number;
  comunicacao: number;
  financeiro: number;
  /** blocos com resposta da cliente esperando conferência */
  planejamento: number;
  /** contratos recebidos sem leitura fechada (138/140) */
  contratos: number;
};

type Grupo = "organizar" | "executar" | "mais";

// As três fases da jornada saíram daqui: viraram os cartões de
// FasesDoEvento, logo acima. O que sobra nesta barra é consulta — e desde
// 15/09/2026 ela segue a mesma ordem da jornada: o que se ORGANIZA
// (fornecedores, contratos, conversas, dinheiro), o que se EXECUTA
// (recursos do dia, convidados, mesas) e, por último e em tom menor, o
// que se consulta de vez em quando (área da cliente, histórico). Dez
// nomes soltos viraram três blocos com rótulo.
const TABS: {
  label: string;
  seg: string;
  counter?: keyof TabCounters;
  /** aba que só existe em tipo de evento que declara a capacidade */
  requer?: Capacidade;
  grupo?: Grupo;
}[] = [
  { label: "Resumo", seg: "" },
  { label: "Fornecedores", seg: "fornecedores", counter: "fornecedores", grupo: "organizar" },
  { label: "Contratos", seg: "contratos", counter: "contratos", grupo: "organizar" },
  { label: "Comunicação", seg: "comunicacao", counter: "comunicacao", grupo: "organizar" },
  { label: "Financeiro", seg: "financeiro", counter: "financeiro", grupo: "organizar" },
  // A Operação vale para todo tipo: buffet de casamento tem a mesma
  // pergunta do bar de um show, em outra escala.
  { label: "Operação", seg: "operacao", grupo: "executar" },
  // RSVP: a jornada do convidado inteira — lista, link, porta da recepção
  // e chegadas. Vizinha de Mesas porque as duas vivem da mesma lista. Só
  // existe para quem tem lista nominal: um show de 5.000 pessoas não tem.
  { label: "RSVP", seg: "rsvp", requer: "listaNominal", grupo: "executar" },
  { label: "Mesas", seg: "mesas", requer: "mesas", grupo: "executar" },
  // O que a cliente enxerga do evento. Por ora: quem tem acesso e o
  // caminho para abrir. O espaço fica reservado para crescer.
  { label: "Área do cliente", seg: "area-do-cliente", grupo: "mais" },
  { label: "Histórico", seg: "historico", grupo: "mais" },
];

const ROTULO_GRUPO: Record<Exclude<Grupo, "mais">, string> = {
  organizar: "Organizar",
  executar: "Executar",
};

export function EventTabs({
  eventId,
  tipoEvento,
  counters,
}: {
  eventId: string;
  tipoEvento?: string | null;
  counters?: TabCounters;
}) {
  const pathname = usePathname();
  const base = `/eventos/${eventId}`;
  const visiveis = TABS.filter((t) => !t.requer || tem(tipoEvento, t.requer));

  let grupoAnterior: Grupo | undefined;

  return (
    <nav className="-mb-px flex items-stretch gap-0.5 overflow-x-auto border-b border-[color:var(--ev-card-border-soft)]">
      {visiveis.map((tab) => {
        const href = tab.seg ? `${base}/${tab.seg}` : base;
        const active = tab.seg ? pathname.startsWith(href) : pathname === base;
        const n = tab.counter ? counters?.[tab.counter] ?? 0 : 0;
        const explicacao = explicacaoDoEvento(tab.seg);
        const secundaria = tab.grupo === "mais";
        // O rótulo do grupo entra uma vez, antes da primeira aba dele; o
        // bloco "mais" não tem rótulo: vai para a direita, em tom menor.
        const abreGrupo = tab.grupo !== grupoAnterior ? tab.grupo : undefined;
        grupoAnterior = tab.grupo;
        return (
          <span key={tab.label} className="contents">
            {abreGrupo && abreGrupo !== "mais" && (
              <span
                aria-hidden
                className="ml-2 self-center whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--ev-text-faint)]"
              >
                {ROTULO_GRUPO[abreGrupo]}
              </span>
            )}
            {abreGrupo === "mais" && <span aria-hidden className="ml-auto" />}
            {/* Mesmo arranjo das fases: a aba vira um invólucro com o link
                dentro, porque o "?" não pode morar dentro de uma âncora. O
                `after:inset-0` devolve ao link a área de clique inteira. */}
            <span
              className={`group relative flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 font-medium transition-colors ${
                secundaria ? "px-2 text-[12px]" : "px-2.5 text-[13.5px]"
              } ${
                active
                  ? "border-[color:var(--ev-text-strong)] text-[color:var(--ev-text-strong)]"
                  : secundaria
                    ? "border-transparent text-[color:var(--ev-text-faint)] hover:text-[color:var(--ev-text-strong)]"
                    : "border-transparent text-[color:var(--ev-text-muted)] hover:text-[color:var(--ev-text-strong)]"
              }`}
            >
              <Link href={href} className="after:absolute after:inset-0">
                {tab.label}
              </Link>
              {n > 0 && (
                <span className="rounded-full bg-[color:var(--ev-text-strong)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {n}
                </span>
              )}
              {/* O "?" é SOBRESCRITO, fora do fluxo da aba. Dentro do fluxo
                  ele somava ~17px por aba; com a aba RSVP a barra passou a
                  pedir 1.127px num espaço de 1.024 e o "Histórico" sumia na
                  borda em TODA largura de computador (medido de 1280 a 1920).
                  No canto, a aba volta ao tamanho que tinha antes do "?". */}
              {explicacao && (
                <span className="absolute right-0.5 top-1.5 z-10 flex items-center">
                  <ExplicacaoDoMenu
                    rotulo={tab.label}
                    explicacao={explicacao}
                    tom="claro"
                    ancora="solto"
                  />
                </span>
              )}
            </span>
          </span>
        );
      })}
    </nav>
  );
}
