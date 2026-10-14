"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, DoorOpen, Link2, MessageCircle, Plus, Search, Users } from "lucide-react";
import type { ResumoConvidados } from "@/lib/portal-pessoas-shared";
import { ChegadasAoVivo, type ChegadasProps } from "@/components/operacao/ChegadasAoVivo";
import { MODO_LIGHT } from "@/lib/modo-tema";
import {
  abrirOuFecharConfirmacoes,
  adicionarConvidadoPelaEquipe,
} from "@/app/(app)/eventos/[id]/rsvp/actions";

/**
 * A aba RSVP do evento.
 *
 * A TELA CONTA A HISTÓRIA NA ORDEM EM QUE ELA ACONTECE — três blocos, e
 * cada um responde a uma pergunta da cerimonialista:
 *
 *   1. Convite   — "como as pessoas confirmam?"   (o link do evento)
 *   2. Convidados — "quem vai?"                    (a lista, a mesma do portal)
 *   3. Recepção  — "quem fica na porta, e quem já entrou?"
 *
 * Por que foi redesenhada (13/09/2026): numa simulação completa — convidado
 * se cadastrando, QR lido pela câmera, entrada sem internet — tudo
 * FUNCIONOU, e ainda assim o dono disse "fiquei confuso; se eu estou,
 * imagina o cliente". A versão anterior falava a língua do banco (posto,
 * aberturas, marcações, revogar, encerrar contagem) e empilhava tudo em
 * texto corrido. E ele foi claro: "não somos um Excel, as coisas devem ser
 * bonitas". A página do convidado já era bonita; esta não podia ser a
 * planilha por trás dela.
 */

export type ConvidadoNaAba = {
  id: string;
  nome: string;
  grupo: string | null;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  acompanhantes: number;
  criancas: number;
  restricaoAlimentar: string | null;
  origem: "cliente" | "equipe" | "autocadastro";
  /** quando passou pela porta; null = ainda não entrou */
  entrouEm: string | null;
  /** o link pessoal — formulário para quem aguarda, QR para quem confirmou */
  link: string;
  /** wa.me com a mensagem pronta, montado no servidor; null sem telefone */
  whatsapp: string | null;
};

type Filtro = "todos" | "aguardando" | "confirmado" | "nao_vai" | "entrou";

const ORIGEM: Record<ConvidadoNaAba["origem"], string> = {
  cliente: "adicionado pela cliente",
  equipe: "adicionado pela equipe",
  autocadastro: "se cadastrou pelo link",
};

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/** O selo de cada pessoa. Quem entrou ganha do resto: é o fato do dia. */
function Selo({ c }: { c: ConvidadoNaAba }) {
  if (c.entrouEm) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
        <Check size={11} strokeWidth={3} />
        Entrou {hora(c.entrouEm)}
      </span>
    );
  }
  const estilo = {
    confirmado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    aguardando: "bg-amber-50 text-amber-800 ring-amber-200",
    nao_vai: "bg-stone-100 text-stone-500 ring-stone-200",
  }[c.confirmacao];
  const texto = { confirmado: "Confirmado", aguardando: "Aguardando", nao_vai: "Não vai" }[c.confirmacao];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${estilo}`}>
      {texto}
    </span>
  );
}

/** O cabeçalho de cada bloco: ícone, título e uma linha — nada mais. */
function Bloco({
  icone,
  titulo,
  linha,
  children,
  acao,
}: {
  icone: React.ReactNode;
  titulo: string;
  linha: string;
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
            {icone}
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-stone-900">{titulo}</h2>
            <p className="mt-0.5 text-sm text-stone-500">{linha}</p>
          </div>
        </div>
        {acao}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function RsvpDoEvento({
  eventId,
  publico,
  nomeDoEvento,
  resumo,
  linkDoEvento,
  confirmacoesAbertas,
  convidados,
  chegadas,
}: {
  eventId: string;
  tipo: string | null;
  /** "convidados", "participantes"… — o nome que o tipo dá às pessoas */
  publico: string;
  nomeDoEvento: string;
  dataEvento: string | null;
  resumo: ResumoConvidados;
  linkDoEvento: string | null;
  confirmacoesAbertas: boolean;
  convidados: ConvidadoNaAba[];
  chegadas: ChegadasProps | null;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const entraram = convidados.filter((c) => c.entrouEm).length;

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return convidados.filter((c) => {
      const passaFiltro =
        filtro === "todos" ||
        (filtro === "entrou" ? !!c.entrouEm : c.confirmacao === filtro);
      return passaFiltro && (!t || c.nome.toLowerCase().includes(t));
    });
  }, [convidados, filtro, busca]);

  function copiar(chave: string, texto: string) {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  function adicionar() {
    setErro(null);
    comecar(async () => {
      const r = await adicionarConvidadoPelaEquipe(eventId, { nome: novoNome, telefone: novoTelefone });
      if (r.error) {
        setErro(r.error);
        return;
      }
      setNovoNome("");
      setNovoTelefone("");
      router.refresh();
    });
  }

  function alternarConfirmacoes() {
    comecar(async () => {
      await abrirOuFecharConfirmacoes(eventId, !confirmacoesAbertas);
      router.refresh();
    });
  }

  // A barra do topo: a proporção de quem respondeu, em três cores.
  const total = Math.max(1, resumo.total);
  const partes = [
    { chave: "confirmado", valor: resumo.confirmados, cor: "bg-emerald-500", rotulo: "confirmados" },
    { chave: "aguardando", valor: resumo.aguardando, cor: "bg-amber-400", rotulo: "aguardando" },
    { chave: "nao_vai", valor: resumo.naoVao, cor: "bg-stone-300", rotulo: "não vão" },
  ];

  const filtros: { chave: Filtro; rotulo: string; n: number }[] = [
    { chave: "todos", rotulo: "Todos", n: resumo.total },
    { chave: "aguardando", rotulo: "Aguardando", n: resumo.aguardando },
    { chave: "confirmado", rotulo: "Confirmados", n: resumo.confirmados },
    { chave: "nao_vai", rotulo: "Não vão", n: resumo.naoVao },
    ...(entraram > 0 ? [{ chave: "entrou" as Filtro, rotulo: "Entraram", n: entraram }] : []),
  ];

  const mensagemDoLink = linkDoEvento
    ? `Você recebeu um convite para ${nomeDoEvento}! Confirme sua presença por aqui: ${linkDoEvento}`
    : "";

  return (
    <div className="space-y-5">
      {/* ================= o número que importa ================= */}
      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {/* "Confirmados", e não "Vão ao evento": no dia, quem não
                confirmou também entra, e "vão 3 · já entraram 4" lia como
                conta errada — o mesmo "4 de 3" da porta com outra roupa. */}
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Confirmados</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-semibold tabular-nums tracking-tight text-stone-900">
                {resumo.pessoasNaFesta}
              </span>
              <span className="text-base text-stone-500">
                {resumo.pessoasNaFesta === 1 ? "pessoa" : "pessoas"}
              </span>
            </p>
            <p className="mt-1 text-sm text-stone-500">
              contando acompanhantes e crianças de quem confirmou
              {resumo.comRestricao > 0 &&
                ` · ${resumo.comRestricao} com restrição alimentar`}
            </p>
          </div>
          {entraram > 0 && (
            <div className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white">
              <p className="text-xs opacity-90">Já entraram</p>
              <p className="text-2xl font-semibold tabular-nums">{chegadas?.painel.presentes ?? entraram}</p>
            </div>
          )}
        </div>

        {resumo.total > 0 && (
          <>
            <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-stone-100">
              {partes.map((p) =>
                p.valor > 0 ? (
                  <div key={p.chave} className={p.cor} style={{ width: `${(p.valor / total) * 100}%` }} />
                ) : null
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {partes.map((p) => (
                <span key={p.chave} className="inline-flex items-center gap-1.5 text-stone-600">
                  <span className={`h-2 w-2 rounded-full ${p.cor}`} />
                  <span className="font-semibold tabular-nums text-stone-900">{p.valor}</span> {p.rotulo}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ================= 1. convite ================= */}
      {linkDoEvento && (
        <Bloco
          icone={<Link2 size={17} />}
          titulo="Convite"
          linha="Um link só para o evento todo. Cada pessoa abre, confirma e já recebe a entrada dela."
          acao={
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                confirmacoesAbertas ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"
              }`}
            >
              {confirmacoesAbertas ? "recebendo confirmações" : "confirmações encerradas"}
            </span>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensagemDoLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle size={15} />
              Enviar no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => copiar("evento", linkDoEvento)}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              {copiado === "evento" ? <Check size={15} /> : <Copy size={15} />}
              {copiado === "evento" ? "Copiado" : "Copiar link"}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={alternarConfirmacoes}
              className="ml-auto text-sm text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline disabled:opacity-50"
            >
              {confirmacoesAbertas ? "Encerrar confirmações" : "Voltar a receber confirmações"}
            </button>
          </div>
        </Bloco>
      )}

      {/* ================= 2. convidados ================= */}
      <Bloco
        icone={<Users size={17} />}
        titulo={publico.charAt(0).toUpperCase() + publico.slice(1)}
        linha="A mesma lista que a cliente vê no portal dela — o que um lado muda, o outro vê."
      >
        {/* adicionar à mão: nome e WhatsApp, e só. O resto a pessoa
            preenche quando confirmar pelo link dela. */}
        <form
          // alvo do guia em evento sem método: o passo "monte a lista"
          data-guia="convidados-rsvp"
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (novoNome.trim()) adicionar();
          }}
        >
          <input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome"
            className="min-w-[180px] flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none"
          />
          <input
            value={novoTelefone}
            onChange={(e) => setNovoTelefone(e.target.value)}
            placeholder="WhatsApp (opcional)"
            inputMode="tel"
            className="min-w-[160px] flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none sm:max-w-[220px]"
          />
          <button
            type="submit"
            disabled={salvando || !novoNome.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-30"
          >
            <Plus size={15} />
            Adicionar
          </button>
        </form>
        {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

        {convidados.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {filtros.map((f) => (
              <button
                key={f.chave}
                type="button"
                onClick={() => setFiltro(f.chave)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filtro === f.chave
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f.rotulo}
                <span className={`tabular-nums ${filtro === f.chave ? "text-white/70" : "text-stone-400"}`}>{f.n}</span>
              </button>
            ))}
            <label className="relative ml-auto">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar pelo nome"
                className="w-48 rounded-full border border-stone-200 py-1.5 pl-8 pr-3 text-xs focus:border-stone-400 focus:outline-none"
              />
            </label>
          </div>
        )}

        {convidados.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-stone-200 px-6 py-10 text-center">
            <p className="text-sm font-medium text-stone-700">Ninguém na lista ainda</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
              Mande o convite acima — cada pessoa entra sozinha. Ou adicione à mão quem você já sabe.
            </p>
          </div>
        ) : visiveis.length === 0 ? (
          <p className="mt-6 text-center text-sm text-stone-500">Ninguém aqui.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {visiveis.map((c) => {
              const extras = c.acompanhantes + c.criancas;
              const detalhe = [
                c.confirmacao === "confirmado" && extras > 0
                  ? `+${extras} ${extras === 1 ? "acompanhante" : "acompanhantes"}`
                  : null,
                c.restricaoAlimentar ? `restrição: ${c.restricaoAlimentar}` : null,
                c.grupo,
                ORIGEM[c.origem],
              ].filter(Boolean);
              // Depois que a pessoa entrou, não há o que pedir nem mandar.
              const mandar = !c.entrouEm && c.whatsapp && c.confirmacao !== "nao_vai";
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <span
                    aria-hidden
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      c.entrouEm
                        ? "bg-emerald-600 text-white"
                        : c.confirmacao === "confirmado"
                          ? "bg-emerald-50 text-emerald-700"
                          : c.confirmacao === "aguardando"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {iniciais(c.nome)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{c.nome}</p>
                    <p className="truncate text-xs text-stone-500">{detalhe.join(" · ")}</p>
                  </div>

                  <Selo c={c} />

                  <div className="flex shrink-0 items-center gap-1">
                    {mandar && (
                      <a
                        href={c.whatsapp!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <MessageCircle size={14} />
                        {c.confirmacao === "confirmado" ? "Enviar entrada" : "Pedir confirmação"}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => copiar(c.id, c.link)}
                      title="Copiar o link pessoal"
                      aria-label={`Copiar o link pessoal de ${c.nome}`}
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    >
                      {copiado === c.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Bloco>

      {/* ================= 3. recepção ================= */}
      <Bloco
        icone={<DoorOpen size={17} />}
        titulo="Recepção"
        linha="Crie o link e mande para quem vai ficar na porta. Os QR dos convidados são lidos com a câmera do celular, sem login — e funciona mesmo se a internet cair."
      >
        {chegadas ? (
          <ChegadasAoVivo {...chegadas} t={MODO_LIGHT} />
        ) : (
          <p className="text-sm text-stone-500">A recepção não está disponível agora.</p>
        )}
      </Bloco>
    </div>
  );
}
