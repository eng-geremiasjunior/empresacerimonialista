"use client";

// A Operação: o que se conta neste evento.
//
// Antes do sistema saber contar coisa, a única coisa que ele sabia sobre
// bebida era um campo de texto livre. Aqui o item tem quantidade,
// unidade e ciclo: previ, comprei, entrou, sobrou. E o que sobrou vira
// dinheiro perdido, que é o número que faz alguém mudar de comportamento.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import {
  consumido,
  custoComprado,
  numero,
  reais,
  textoDaBase,
  totais,
  veredito,
  type Recurso,
} from "@/lib/recursos-core";
import {
  criarRecurso,
  definirFornecedor,
  marcarRuptura,
  recalcularPrevisto,
  removerRecurso,
  salvarNumero,
  salvarObservacao,
  trazerDoMetodo,
} from "@/app/(app)/eventos/[id]/operacao/actions";

export type FornecedorRef = { id: string; nome: string };

// As ações devolvem `{error}` ou `{success}` — algumas com um número
// junto (quantos itens vieram). Um tipo largo evita repetir união a cada
// callback e ainda deixa o erro tipado.
type Resultado = { error?: string } & Record<string, unknown>;

export function OperacaoEvento({
  eventId,
  recursos,
  fornecedores,
  publico,
  temMapa,
}: {
  eventId: string;
  recursos: Recurso[];
  fornecedores: FornecedorRef[];
  publico: { quantidade: number; origem: string } | null;
  temMapa: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  function rodar(fn: () => Promise<Resultado>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (typeof r.error === "string") setErro(r.error);
      else router.refresh();
    });
  }

  const grupos = useMemo(() => {
    const m = new Map<string, Recurso[]>();
    for (const r of recursos) {
      const g = r.grupo ?? "Outros itens";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(r);
    }
    return [...m.entries()];
  }, [recursos]);

  const t = totais(recursos);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-stone-900">
            O que este evento consome
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {publico && publico.quantidade > 0 ? (
              <>
                Dimensionado por{" "}
                <strong className="font-medium text-stone-700">
                  {publico.quantidade}{" "}
                  {publico.origem === "confirmados" ? "confirmados" : "estimados"}
                </strong>
                .
              </>
            ) : (
              "Sem público informado — os itens por pessoa ficam em zero até o evento ter um número."
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/imprimir/operacao/${eventId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-300"
          >
            <Printer size={14} />
            Folha de contagem
          </Link>
          <button
            onClick={() => {
              // Único caminho do sistema que apaga número digitado à mão.
              // Um clique só seria perder trabalho sem aviso.
              const ok = window.confirm(
                "Refazer o previsto de todos os itens pelo público de hoje? Os números que você ajustou à mão serão substituídos."
              );
              if (ok) rodar(() => recalcularPrevisto(eventId, true));
            }}
            disabled={pendente}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-stone-300 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Recalcular previsto
          </button>
        </div>
      </div>

      {recursos.length > 0 && (
        <p className="mt-3 text-sm text-stone-600">
          {t.itens} {t.itens === 1 ? "item" : "itens"}
          {t.aComprar > 0 && (
            <>
              {" · "}
              <strong className="font-medium text-stone-900">
                {t.aComprar} ainda a comprar
              </strong>
            </>
          )}
          {t.investido != null && <> · {reais(t.investido)} em compras</>}
          {t.perdaTotal != null && t.perdaTotal > 0 && (
            <>
              {" · "}
              <strong className="font-medium text-amber-700">
                {reais(t.perdaTotal)} de sobra
              </strong>
            </>
          )}
          {t.rupturas > 0 && (
            <>
              {" · "}
              <strong className="font-medium text-red-700">
                {t.rupturas} {t.rupturas === 1 ? "item acabou" : "itens acabaram"}
              </strong>
            </>
          )}
        </p>
      )}

      {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

      {recursos.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-stone-200 px-5 py-8 text-center">
          <p className="text-sm text-stone-600">
            Nada a contar ainda neste evento.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {temMapa && (
              <button
                onClick={() => rodar(() => trazerDoMetodo(eventId))}
                disabled={pendente}
                className="rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Trazer os itens do método
              </button>
            )}
            <button
              onClick={() => setNovoAberto(true)}
              className="rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-medium text-stone-700 hover:border-stone-300"
            >
              Criar um item
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs font-medium uppercase tracking-wide text-stone-400">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="w-24 py-2 px-2 text-right font-medium">Previsto</th>
                <th className="w-24 py-2 px-2 text-right font-medium">Comprado</th>
                <th className="w-24 py-2 px-2 text-right font-medium">Entrada</th>
                <th className="w-24 py-2 px-2 text-right font-medium">Sobra</th>
                <th className="w-24 py-2 px-2 text-right font-medium">Consumido</th>
                <th className="w-28 py-2 px-2 text-right font-medium">Custo un.</th>
                <th className="w-44 py-2 pl-3 font-medium">Resultado</th>
              </tr>
            </thead>
            {grupos.map(([grupo, itens]) => (
              <tbody key={grupo}>
                <tr>
                  <td
                    colSpan={8}
                    className="pt-5 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-500"
                  >
                    {grupo}
                  </td>
                </tr>
                {itens.map((r) => (
                  <LinhaRecurso
                    key={r.id}
                    eventId={eventId}
                    r={r}
                    fornecedores={fornecedores}
                    aberto={aberto === r.id}
                    onAbrir={() => setAberto(aberto === r.id ? null : r.id)}
                    pendente={pendente}
                    rodar={rodar}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {recursos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setNovoAberto((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            <Plus size={15} />
            Acrescentar item
          </button>
          {temMapa && (
            <button
              onClick={() => rodar(() => trazerDoMetodo(eventId))}
              disabled={pendente}
              className="text-sm text-stone-400 underline underline-offset-2 hover:text-stone-600 disabled:opacity-50"
            >
              buscar itens novos do método
            </button>
          )}
        </div>
      )}

      {novoAberto && (
        <NovoItem
          eventId={eventId}
          pendente={pendente}
          rodar={rodar}
          onFechar={() => setNovoAberto(false)}
        />
      )}
    </section>
  );
}

// ------------------------------------------------------------------

function LinhaRecurso({
  eventId,
  r,
  fornecedores,
  aberto,
  onAbrir,
  pendente,
  rodar,
}: {
  eventId: string;
  r: Recurso;
  fornecedores: FornecedorRef[];
  aberto: boolean;
  onAbrir: () => void;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
}) {
  const base = textoDaBase(r);
  const c = consumido(r);
  const v = veredito(r);

  return (
    <>
      <tr className="border-b border-stone-100 align-middle">
        <td className="py-2 pr-3">
          <button
            onClick={onAbrir}
            className="flex items-start gap-1.5 text-left"
          >
            <ChevronDown
              size={14}
              className={`mt-1 shrink-0 text-stone-300 transition-transform ${aberto ? "rotate-180" : ""}`}
            />
            <span>
              <span className="font-medium text-stone-800">{r.nome}</span>
              <span className="block text-xs text-stone-400">
                {r.regra === "fixo"
                  ? `${numero(r.indice)} ${r.unidade}`
                  : `${numero(r.indice)} ${r.unidade} × ${base ?? "—"}`}
                {r.fornecedorNome ? ` · ${r.fornecedorNome}` : ""}
              </span>
            </span>
          </button>
        </td>

        <Numero eventId={eventId} r={r} campo="previsto" valor={r.previsto} rodar={rodar} pendente={pendente} />
        <Numero eventId={eventId} r={r} campo="comprado" valor={r.comprado} rodar={rodar} pendente={pendente} />
        <Numero eventId={eventId} r={r} campo="entrada" valor={r.entrada} rodar={rodar} pendente={pendente} />
        <Numero eventId={eventId} r={r} campo="sobra" valor={r.sobra} rodar={rodar} pendente={pendente} />

        <td className="px-2 py-2 text-right tabular-nums text-stone-700">
          {c == null ? <span className="text-stone-300">—</span> : numero(c)}
        </td>

        <Numero
          eventId={eventId}
          r={r}
          campo="custo_unitario"
          valor={r.custoUnitario}
          rodar={rodar}
          pendente={pendente}
          prefixo="R$"
        />

        <td className="py-2 pl-3">
          <Veredito v={v} />
        </td>
      </tr>

      {aberto && (
        <tr className="border-b border-stone-100 bg-stone-50/60">
          <td colSpan={8} className="px-3 py-3">
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-xs text-stone-500">
                Fornecedor
                <select
                  defaultValue={r.supplierId ?? ""}
                  onChange={(e) =>
                    rodar(() => definirFornecedor(eventId, r.id, e.target.value))
                  }
                  disabled={pendente}
                  className="mt-1 block w-56 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800"
                >
                  <option value="">Sem fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-stone-500">
                Acabou às
                <input
                  type="time"
                  defaultValue={r.acabouEm ?? ""}
                  onBlur={(e) =>
                    rodar(() => marcarRuptura(eventId, r.id, e.target.value || null))
                  }
                  disabled={pendente}
                  className="mt-1 block w-28 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm tabular-nums text-stone-800"
                />
              </label>

              <label className="min-w-[240px] flex-1 text-xs text-stone-500">
                Observação
                <input
                  type="text"
                  defaultValue={r.observacao ?? ""}
                  placeholder="o que aconteceu com este item"
                  onBlur={(e) =>
                    rodar(() => salvarObservacao(eventId, r.id, e.target.value))
                  }
                  disabled={pendente}
                  className="mt-1 block w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800"
                />
              </label>

              <div className="flex items-center gap-3 pb-1">
                {custoComprado(r) != null && (
                  <span className="text-xs text-stone-500">
                    compra: {reais(custoComprado(r))}
                  </span>
                )}
                <button
                  onClick={() => rodar(() => removerRecurso(eventId, r.id))}
                  disabled={pendente}
                  className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  remover
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Numero({
  eventId,
  r,
  campo,
  valor,
  rodar,
  pendente,
  prefixo,
}: {
  eventId: string;
  r: Recurso;
  campo: string;
  valor: number | null;
  rodar: (fn: () => Promise<Resultado>) => void;
  pendente: boolean;
  prefixo?: string;
}) {
  return (
    <td className="px-2 py-2 text-right">
      <div className="flex items-center justify-end gap-1">
        {prefixo && <span className="text-xs text-stone-300">{prefixo}</span>}
        <input
          // O input é não controlado: sem esta key, "Recalcular previsto"
          // mudaria o banco e a tela continuaria mostrando o número velho.
          key={`${campo}-${valor ?? ""}`}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          defaultValue={valor ?? ""}
          disabled={pendente}
          onBlur={(e) => {
            const bruto = e.target.value.trim();
            const novo = bruto === "" ? null : Number(bruto.replace(",", "."));
            if (novo === valor) return;
            if (novo != null && !Number.isFinite(novo)) return;
            rodar(() => salvarNumero(eventId, r.id, campo, novo));
          }}
          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right tabular-nums text-stone-800 hover:border-stone-200 focus:border-stone-300 focus:bg-white focus:outline-none disabled:opacity-50"
        />
      </div>
    </td>
  );
}

function Veredito({ v }: { v: ReturnType<typeof veredito> }) {
  if (v.tipo === "aguardando")
    return <span className="text-xs text-stone-300">aguardando contagem</span>;
  if (v.tipo === "faltou")
    return (
      <span className="text-xs font-medium text-red-700">
        acabou{v.hora ? ` às ${v.hora}` : ""}
      </span>
    );
  if (v.tipo === "sobrou")
    return (
      <span className="text-xs text-amber-700">
        sobrou {numero(v.quanto)}
        {v.perda != null ? ` · ${reais(v.perda)}` : ""}
      </span>
    );
  return <span className="text-xs text-emerald-700">na medida</span>;
}

function NovoItem({
  eventId,
  pendente,
  rodar,
  onFechar,
}: {
  eventId: string;
  pendente: boolean;
  rodar: (fn: () => Promise<Resultado>) => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("unidades");
  const [regra, setRegra] = useState("por_pessoa");
  const [indice, setIndice] = useState("1");

  return (
    <div className="mt-4 rounded-xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-stone-500">
          Item
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Gelo em escama"
            className="mt-1 block w-52 rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-stone-500">
          Unidade
          <input
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-stone-500">
          Como se calcula
          <select
            value={regra}
            onChange={(e) => setRegra(e.target.value)}
            className="mt-1 block w-40 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="por_pessoa">por pessoa</option>
            <option value="por_unidade">por mesa</option>
            <option value="fixo">quantidade fixa</option>
          </select>
        </label>
        <label className="text-xs text-stone-500">
          {regra === "fixo" ? "Quantidade" : "Quanto por unidade"}
          <input
            type="number"
            min={0}
            step="any"
            value={indice}
            onChange={(e) => setIndice(e.target.value)}
            className="mt-1 block w-28 rounded-lg border border-stone-200 px-2 py-1.5 text-right text-sm tabular-nums"
          />
        </label>

        <button
          onClick={() =>
            rodar(async () => {
              const r = await criarRecurso(eventId, {
                nome,
                unidade,
                regra,
                indice: Number(indice.replace(",", ".")) || 0,
              });
              if (!("error" in r)) {
                setNome("");
                onFechar();
              }
              return r as Resultado;
            })
          }
          disabled={pendente || !nome.trim()}
          className="rounded-lg bg-stone-900 px-3.5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Acrescentar
        </button>
        <button
          onClick={onFechar}
          className="px-1 text-sm text-stone-400 hover:text-stone-700"
        >
          cancelar
        </button>
      </div>
    </div>
  );
}
