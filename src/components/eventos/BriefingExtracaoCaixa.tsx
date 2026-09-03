"use client";

// A caixa da tela do evento: o que a IA leu da conversa colada e ainda
// não entrou em lugar nenhum.
//
// A moldura é a mesma da caixa de contratos da aba Fornecedores
// (ExtrairContrato); o gate item a item é a ConferenciaProposta. Aqui
// mora só a costura: proposta → linhas, escolhas → actions.
//
// Fornecedor com dinheiro precisa de cadastro escolhido: a verba e a
// parcela moram no fornecedor, não na categoria. Por isso o select — e
// "não vincular" deixa a linha de fora em vez de inventar um cadastro.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareQuote } from "lucide-react";
import { plural } from "@/lib/format";
import { categoriaLabel } from "@/lib/fornecedores-shared";
import type { PropostaBriefingV2 } from "@/lib/briefing-core";
import {
  escolhasIniciais,
  itensDaProposta,
  resumoDoAplicado,
  type EscolhasBriefing,
} from "@/lib/briefing-aplicacao";
import {
  ConferenciaProposta,
  type GrupoProposta,
} from "@/components/eventos/ConferenciaProposta";
import {
  aplicarBriefingExtracao,
  descartarBriefingExtracao,
} from "@/app/(app)/eventos/[id]/briefing-extracao-actions";

/** O cadastro da empresa, para o select — nome e as categorias dele. */
export type FornecedorEscolhivel = {
  id: string;
  nome: string;
  categorias: string[];
};

const SELECT =
  "max-w-full rounded-md border border-gray-200 px-2 py-1 text-[12px] text-gray-900 outline-none focus:border-amber-400 disabled:bg-gray-50 disabled:text-gray-400";

export function BriefingExtracaoCaixa({
  eventId,
  extracaoId,
  proposta,
  fornecedores,
}: {
  eventId: string;
  extracaoId: string;
  proposta: PropostaBriefingV2;
  fornecedores: FornecedorEscolhivel[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [escolhas, setEscolhas] = useState<EscolhasBriefing>(() =>
    porNomeDoCadastro(escolhasIniciais(proposta), fornecedores)
  );

  const linhas = itensDaProposta(proposta);
  const total = linhas.reduce((n, g) => n + g.itens.length, 0);

  // Aplicou, mas algo ficou de fora: a caixa some no refresh e o aviso
  // iria junto — então ele fica no lugar dela.
  if (feito) {
    return (
      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-[13px] text-amber-900">{feito}</p>
      </section>
    );
  }

  if (total === 0) return null;

  const marcados: Record<string, boolean> = {};
  if (escolhas.verba) marcados["verba"] = escolhas.verba.manter;
  if (escolhas.convidadosTeto) marcados["conv_teto"] = escolhas.convidadosTeto.manter;
  if (escolhas.estilo) marcados["estilo"] = escolhas.estilo.manter;
  for (const f of escolhas.fornecedores) marcados[f.id] = f.manter;
  for (const q of escolhas.quantidades) marcados[q.id] = q.manter;

  const grupos: GrupoProposta[] = linhas.map((g) => ({
    chave: g.grupo,
    rotulo: g.rotulo,
    itens: g.itens.map((item) => {
      const forn =
        g.grupo === "fornecedores"
          ? escolhas.fornecedores.find((f) => f.id === item.id) ?? null
          : null;
      return {
        id: item.id,
        rotulo: item.rotulo,
        valor: item.valor,
        trecho: item.trecho,
        // só quem tem dinheiro para lançar precisa de cadastro; "não
        // teremos" resolve uma decisão, não uma verba
        extra:
          forn && forn.valor != null && forn.estado !== "nao_teremos"
            ? selectDeFornecedor(forn, fornecedores, marcados[item.id] ?? false)
            : undefined,
      };
    }),
  }));

  function selectDeFornecedor(
    forn: EscolhasBriefing["fornecedores"][number],
    cadastro: FornecedorEscolhivel[],
    marcado: boolean
  ) {
    if (cadastro.length === 0) {
      return (
        <span className="text-[11.5px] text-gray-500">
          Nenhum fornecedor no cadastro para vincular.
        </span>
      );
    }
    const daCategoria = cadastro.filter((s) => s.categorias.includes(forn.categoria));
    const outros = cadastro.filter((s) => !s.categorias.includes(forn.categoria));
    return (
      <select
        className={SELECT}
        value={forn.supplierId ?? ""}
        disabled={!marcado || pendente}
        aria-label={`Cadastro de ${forn.nome ?? categoriaLabel(forn.categoria)}`}
        onChange={(e) => escolherFornecedor(forn.id, e.target.value || null)}
      >
        <option value="">não vincular</option>
        {daCategoria.length > 0 && (
          <optgroup label={categoriaLabel(forn.categoria)}>
            {daCategoria.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </optgroup>
        )}
        {outros.length > 0 && (
          <optgroup label="Outros">
            {outros.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    );
  }

  function escolherFornecedor(id: string, supplierId: string | null) {
    setEscolhas({
      ...escolhas,
      fornecedores: escolhas.fornecedores.map((f) =>
        f.id === id
          ? // sem cadastro não há onde o valor entrar: a linha sai
            { ...f, supplierId, manter: supplierId != null }
          : f
      ),
    });
  }

  function mudar(id: string, manter: boolean) {
    setEscolhas(comManter(escolhas, id, manter));
  }

  function aplicar() {
    setErro(null);
    iniciar(async () => {
      const r = await aplicarBriefingExtracao(eventId, extracaoId, escolhas);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      if (r.aviso) {
        setFeito(`${maiuscula(resumoDoAplicado(escolhas))}. ${r.aviso}`);
        return;
      }
      router.refresh();
    });
  }

  function descartar() {
    setErro(null);
    iniciar(async () => {
      const r = await descartarBriefingExtracao(eventId, extracaoId);
      if ("error" in r) setErro(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
        <MessageSquareQuote size={15} />
        A conversa que você colou tem{" "}
        {plural(total, "informação", "informações")} para conferir
      </h3>
      <div className="mt-3">
        <ConferenciaProposta
          grupos={grupos}
          escolhas={marcados}
          aoMudar={mudar}
          aoAplicar={aplicar}
          aoDescartar={descartar}
          pendente={pendente}
          aviso={erro}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function comManter(
  e: EscolhasBriefing,
  id: string,
  manter: boolean
): EscolhasBriefing {
  if (id === "verba") return e.verba ? { ...e, verba: { ...e.verba, manter } } : e;
  if (id === "conv_teto") {
    return e.convidadosTeto
      ? { ...e, convidadosTeto: { ...e.convidadosTeto, manter } }
      : e;
  }
  if (id === "estilo") return e.estilo ? { ...e, estilo: { ...e.estilo, manter } } : e;
  if (id.startsWith("forn:")) {
    return {
      ...e,
      fornecedores: e.fornecedores.map((f) => (f.id === id ? { ...f, manter } : f)),
    };
  }
  if (id.startsWith("qtd:")) {
    return {
      ...e,
      quantidades: e.quantidades.map((q) => (q.id === id ? { ...q, manter } : q)),
    };
  }
  return e;
}

const chave = (nome: string) =>
  nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

/**
 * Nome idêntico ao cadastro já vem escolhido no select. Não é escolha em
 * silêncio: ela vê o cadastro na linha e troca por "não vincular" com um
 * clique — só poupa o trabalho de procurar quem ela mesma cadastrou.
 * Ambiguidade (dois cadastros com o mesmo nome) não pré-seleciona nada.
 */
function porNomeDoCadastro(
  e: EscolhasBriefing,
  cadastro: FornecedorEscolhivel[]
): EscolhasBriefing {
  const porNome = new Map<string, string | null>();
  for (const s of cadastro) {
    const k = chave(s.nome);
    porNome.set(k, porNome.has(k) ? null : s.id);
  }
  return {
    ...e,
    fornecedores: e.fornecedores.map((f) =>
      f.nome ? { ...f, supplierId: porNome.get(chave(f.nome)) ?? null } : f
    ),
  };
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
