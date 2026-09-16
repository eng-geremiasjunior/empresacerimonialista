"use client";

// A tabela de contas e as duas alavancas: assinatura (editor inline) e
// banimento (com confirmação explícita — é a ação mais dura do sistema).

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { mascararDinheiro } from "@/lib/format";
import { dinheiroParaMascara } from "@/lib/admin-metricas";
import type { ContaAdmin } from "@/lib/supabase/admin-painel";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { descreverEventos3Meses } from "@/lib/cadastro-qualificacao";
import {
  definirBanimento,
  salvarAssinatura,
  type ResultadoAdmin,
} from "../actions";

// O que o <select> de plano recebe do servidor: os três do catálogo com
// preço e tetos já em texto, mais 'cortesia' e 'piloto' (valorMensal
// nulo = o dono digita). Só esses cinco passam no CHECK da 147.
export type OpcaoDePlano = {
  codigo: string;
  rotulo: string;
  valorMensal: number | null;
};

const STATUS_ROTULO: Record<string, string> = {
  trial: "trial",
  ativa: "ativa",
  pausada: "pausada",
  cancelada: "cancelada",
};

function dataBr(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "13/09 às 10:58", no fuso do país — igual no servidor e no navegador. */
function diaEHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${dia} às ${hora}`;
}

/**
 * QUEM É E O QUE FEZ. "Não sei de onde ela é, sei nada" — o dono, no dia
 * da primeira conta de uma desconhecida. Quase tudo já estava no banco;
 * desde 16/09/2026 o cadastro também pergunta WhatsApp, eventos nos
 * próximos três meses e o @ do Instagram (cadastro-qualificacao.ts).
 */
function QuemE({ conta }: { conta: ContaAdmin }) {
  const a = conta.assinatura;
  // null tanto sem número quanto com número incompleto (sem DDD): o botão
  // só aparece quando abre uma conversa de verdade.
  const wa = linkWhatsapp(conta.whatsapp);
  const linhas: { rotulo: string; valor: string }[] = [
    {
      rotulo: "Veio de",
      valor: conta.origem
        ? [conta.origem.canal, conta.origem.aparelho ? `pelo ${conta.origem.aparelho}` : null].filter(Boolean).join(" · ")
        : "Sem origem registrada",
    },
    // o que ela respondeu no cadastro — só existe em conta criada depois
    // de 16/09/2026
    ...(conta.eventos3Meses
      ? [{ rotulo: "Disse que tem", valor: descreverEventos3Meses(conta.eventos3Meses) ?? conta.eventos3Meses }]
      : []),
    { rotulo: "Eventos em", valor: conta.cidades.length ? conta.cidades.join(", ") : "—" },
    { rotulo: "Último acesso", valor: diaEHora(conta.ultimoLogin) },
    {
      rotulo: "Já usou",
      valor: `${conta.eventos} ${conta.eventos === 1 ? "evento" : "eventos"} · ${conta.convidados} ${conta.convidados === 1 ? "nome" : "nomes"} na lista de convidados${conta.convidadosPrevistos ? ` (${conta.convidadosPrevistos} previstos)` : ""} · ${conta.tarefas} ${conta.tarefas === 1 ? "tarefa" : "tarefas"} · ${conta.fornecedores} ${conta.fornecedores === 1 ? "fornecedor" : "fornecedores"}`,
    },
    { rotulo: "Guia", valor: conta.guia },
  ];
  if (a?.status === "trial" && a.testeTerminaEm) {
    linhas.push({ rotulo: "Teste", valor: `termina em ${dataBr(a.testeTerminaEm)}` });
  }

  return (
    <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-stone-100 pt-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {linhas.map((l) => (
          <div key={l.rotulo} className="contents">
            <dt className="text-stone-400">{l.rotulo}</dt>
            <dd className="text-stone-700">{l.valor}</dd>
          </div>
        ))}
        {conta.origem?.campanha && (
          <div className="contents">
            <dt className="text-stone-400">Campanha</dt>
            {/* o número da Meta, para achar no Gerenciador de Anúncios */}
            <dd className="font-mono text-[11px] text-stone-500">{conta.origem.campanha}</dd>
          </div>
        )}
      </dl>
      <div className="flex gap-2">
        {conta.instagram && (
          <a
            href={`https://instagram.com/${encodeURIComponent(conta.instagram)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          >
            @{conta.instagram}
          </a>
        )}
        {conta.donaEmail && (
          <a
            href={`mailto:${conta.donaEmail}`}
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          >
            E-mail
          </a>
        )}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            WhatsApp
          </a>
        ) : (
          <span
            className="rounded-lg px-2 py-1.5 text-xs text-stone-400"
            title={
              conta.whatsapp
                ? `WhatsApp salvo sem DDD: ${conta.whatsapp}`
                : "Ela ainda não preencheu o WhatsApp em Configurações"
            }
          >
            sem WhatsApp
          </span>
        )}
      </div>
    </div>
  );
}

function banida(c: ContaAdmin): boolean {
  return Boolean(c.banidaAte && new Date(c.banidaAte) > new Date());
}

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
    >
      {pending ? "…" : "Salvar assinatura"}
    </button>
  );
}

function EditorAssinatura({
  conta,
  planos,
  onFechar,
}: {
  conta: ContaAdmin;
  planos: OpcaoDePlano[];
  onFechar: () => void;
}) {
  const a = conta.assinatura;
  // Uma conta antiga pode carregar um plano que não está na lista (ex.:
  // 'mensal' antes da 147 rodar). Cai no primeiro do catálogo em vez de
  // mandar um valor que o CHECK do banco recusaria.
  const planoInicial =
    a && planos.some((p) => p.codigo === a.plano)
      ? a.plano
      : (planos[0]?.codigo ?? "piloto");
  const [plano, setPlano] = useState(planoInicial);
  // dinheiroParaMascara, não String(): 150.5 tem PONTO e a máscara só
  // entende vírgula — virava "1.505" e salvar sem tocar gravava 10×.
  const [valor, setValor] = useState(
    a ? dinheiroParaMascara(a.valorMensal) : ""
  );
  const [estado, agir] = useFormState<ResultadoAdmin, FormData>(
    salvarAssinatura,
    {}
  );

  // setState do pai não pode acontecer durante o render deste componente
  useEffect(() => {
    if (estado.ok) onFechar();
  }, [estado.ok, onFechar]);
  if (estado.ok) return null;

  // Escolher um plano do catálogo preenche o preço dele; o dono ainda
  // pode mexer no valor depois (é ele quem decide desconto, cortesia).
  function escolherPlano(codigo: string) {
    setPlano(codigo);
    const p = planos.find((x) => x.codigo === codigo);
    if (p && p.valorMensal !== null) setValor(dinheiroParaMascara(p.valorMensal));
  }

  return (
    <form
      action={agir}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
    >
      <input type="hidden" name="empresa_id" value={conta.empresaId} />
      <label className="text-xs text-stone-500">
        Plano
        <select
          name="plano"
          value={plano}
          onChange={(e) => escolherPlano(e.target.value)}
          className="mt-1 block h-8 rounded-lg border border-stone-300 bg-white px-2 text-sm"
        >
          {planos.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-stone-500">
        Valor mensal (R$)
        <input
          name="valor"
          value={valor}
          onChange={(e) => setValor(mascararDinheiro(e.target.value))}
          inputMode="numeric"
          className="mt-1 block h-8 w-28 rounded-lg border border-stone-300 px-2 font-mono text-sm"
        />
      </label>
      <label className="text-xs text-stone-500">
        Status
        <select
          name="status"
          defaultValue={a?.status ?? "trial"}
          className="mt-1 block h-8 rounded-lg border border-stone-300 bg-white px-2 text-sm"
        >
          <option value="trial">trial</option>
          <option value="ativa">ativa</option>
          <option value="pausada">pausada</option>
          <option value="cancelada">cancelada</option>
        </select>
      </label>
      <label className="min-w-[180px] flex-1 text-xs text-stone-500">
        Observação
        <input
          name="observacao"
          defaultValue={a?.observacao ?? ""}
          className="mt-1 block h-8 w-full rounded-lg border border-stone-300 px-2 text-sm"
        />
      </label>
      <BotaoSalvar />
      <button
        type="button"
        onClick={onFechar}
        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:bg-white"
      >
        Cancelar
      </button>
      {estado.error && (
        <p className="w-full text-xs text-red-600">{estado.error}</p>
      )}
    </form>
  );
}

function Linha({
  conta,
  planos,
}: {
  conta: ContaAdmin;
  planos: OpcaoDePlano[];
}) {
  const [editando, setEditando] = useState(false);
  const [confirmandoBan, setConfirmandoBan] = useState(false);
  const [ocupado, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const estaBanida = banida(conta);
  const a = conta.assinatura;

  function alternarBan() {
    setErro(null);
    comecar(async () => {
      const r = await definirBanimento(conta.empresaId, !estaBanida);
      if (r.error) setErro(r.error);
      setConfirmandoBan(false);
    });
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        estaBanida ? "border-red-200" : "border-stone-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">
            {conta.nome}
            {estaBanida && (
              <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                banida
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {conta.donaEmail ?? "sem e-mail"} · desde {dataBr(conta.criadaEm)}
          </p>
          <p className="mt-1 font-mono text-xs text-stone-400">
            {conta.membros} {conta.membros === 1 ? "pessoa" : "pessoas"} ·{" "}
            {conta.eventos} eventos · última atividade{" "}
            {dataBr(conta.ultimaAtividade)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
              a?.status === "ativa"
                ? "bg-emerald-50 text-emerald-700"
                : a?.status === "cancelada"
                  ? "bg-red-50 text-red-700"
                  : "bg-stone-100 text-stone-600"
            }`}
          >
            {a
              ? `${a.plano} · ${
                  a.valorMensal > 0
                    ? `R$ ${dinheiroParaMascara(a.valorMensal)}/mês`
                    : "R$ 0"
                } · ${STATUS_ROTULO[a.status] ?? a.status}`
              : "sem assinatura"}
          </span>
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
          >
            {a ? "Editar" : "Registrar assinatura"}
          </button>
          {confirmandoBan ? (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={ocupado}
                onClick={alternarBan}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {ocupado ? "…" : estaBanida ? "Confirmar reativação" : "Confirmar banimento"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoBan(false)}
                className="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-500"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoBan(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                estaBanida
                  ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
            >
              {estaBanida ? "Reativar" : "Banir"}
            </button>
          )}
        </div>
      </div>

      <QuemE conta={conta} />

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
      {editando && (
        <EditorAssinatura
          conta={conta}
          planos={planos}
          onFechar={() => setEditando(false)}
        />
      )}
    </div>
  );
}

export function TabelaContas({
  contas,
  planos,
}: {
  contas: ContaAdmin[];
  planos: OpcaoDePlano[];
}) {
  if (contas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
        Nenhuma empresa cadastrada ainda.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {contas.map((c) => (
        <Linha key={c.empresaId} conta={c} planos={planos} />
      ))}
    </div>
  );
}
