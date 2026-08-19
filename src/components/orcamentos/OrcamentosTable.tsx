"use client";

// Listagem de Orçamentos.
//
// Antes era uma tabela de seis colunas ocupando a largura inteira, com um
// resumo que abria no hover de cada linha — cansativo depois do segundo dia
// de uso, e a informação só aparecia se o mouse parasse ali.
//
// Agora são dois blocos lado a lado, que respondem às duas perguntas reais
// de quem abre esta tela:
//
//   "cadê o que acabei de montar?"  → coluna da esquerda, mais novo no topo
//   "o que está para vencer?"       → trilho da direita, mais urgente no topo
//
// A ordenação padrão passou a ser por data de CRIAÇÃO. Antes era por data
// do evento: um orçamento criado hoje para um casamento em 2028 caía no fim
// da lista, e era preciso caçar. Ordenar por evento continua disponível.
//
// Filtros, ordenação e paginação seguem por URL (padrão do sistema):
// ordenar no cliente ordenaria só a página aberta, dando uma ordem errada
// sobre o total.

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  MessageCircle,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  duplicarOrcamento,
  excluirOrcamento,
} from "@/app/(app)/orcamentos/actions";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { type Orcamento } from "@/lib/orcamentos";
import {
  CORES,
  dataPorExtenso,
  estiloStatus,
  infoValidade,
  iniciaisDe,
  paletaAvatar,
  telefoneFormatado,
  valorFormatado,
} from "@/lib/orcamentos-ui";

type Current = {
  busca: string;
  status: string;
  tipo: string;
  page: number;
  ordem: string;
  dir: string;
};

function buildHref(c: Current, patch: Partial<Current>): string {
  const m = { ...c, ...patch };
  const p = new URLSearchParams();
  if (m.busca) p.set("busca", m.busca);
  if (m.status) p.set("status", m.status);
  if (m.tipo) p.set("tipo", m.tipo);
  if (m.page > 1) p.set("page", String(m.page));
  if (m.ordem && m.ordem !== "criacao") p.set("ordem", m.ordem);
  if (m.dir) p.set("dir", m.dir);
  const qs = p.toString();
  return qs ? `/orcamentos?${qs}` : "/orcamentos";
}

function Chip({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-[10px] border px-[15px] py-[9px] text-[13px] transition-colors"
      style={
        ativo
          ? { background: CORES.texto, color: CORES.suave, borderColor: CORES.texto }
          : { background: "#fff", color: CORES.nav, borderColor: CORES.borda }
      }
    >
      {children}
    </Link>
  );
}

function MenuAcoes({ o }: { o: Orcamento }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const rascunho = o.status === "rascunho";
  const whats = (o.contato_telefone ?? "").replace(/\D/g, "");

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
        setErro(null);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const item =
    "flex w-full items-center gap-2 px-3 py-[7px] text-left text-[13px] transition-colors";

  return (
    // O kebab vive dentro do link do cartão: sem parar a propagação, abrir
    // o menu abriria o orçamento junto.
    <div
      className="relative shrink-0"
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={pending}
        aria-label="Ações"
        className="rounded-md p-1.5 transition-colors hover:bg-[#F2F1EE] disabled:opacity-60"
        style={{ color: CORES.terciario }}
      >
        <MoreVertical size={16} />
      </button>
      {aberto && (
        <div
          className="absolute right-0 top-8 z-30 w-[168px] overflow-hidden rounded-[10px] border bg-white py-1"
          style={{
            borderColor: CORES.borda,
            boxShadow: "0 8px 28px rgba(55,53,47,.12)",
          }}
        >
          {rascunho && (
            <Link
              href={`/orcamentos/${o.id}/editar`}
              className={`${item} hover:bg-[#F7F7F5]`}
              style={{ color: CORES.texto }}
            >
              <Pencil size={14} /> Editar orçamento
            </Link>
          )}
          <Link
            href={`/orcamentos/${o.id}`}
            className={`${item} hover:bg-[#F7F7F5]`}
            style={{ color: CORES.texto }}
          >
            <Eye size={14} /> Ver detalhes
          </Link>
          <a
            href={`/orcamento/${o.hash_publico}`}
            target="_blank"
            rel="noreferrer"
            className={`${item} hover:bg-[#F7F7F5]`}
            style={{ color: CORES.texto }}
          >
            <ExternalLink size={14} /> Acessar orçamento
          </a>
          {o.evento_gerado_id && (
            <Link
              href={`/eventos/${o.evento_gerado_id}`}
              className={`${item} hover:bg-[#F7F7F5]`}
              style={{ color: CORES.aprovadoTexto }}
            >
              <CalendarCheck size={14} /> Ver evento gerado
            </Link>
          )}
          <button
            onClick={() =>
              startTransition(async () => {
                const res = await duplicarOrcamento(o.id);
                if ("error" in res) setErro(res.error);
                else router.push(`/orcamentos/${res.id}/editar`);
              })
            }
            className={`${item} hover:bg-[#F7F7F5]`}
            style={{ color: CORES.texto }}
          >
            <Copy size={14} /> Duplicar
          </button>
          {whats && (
            <a
              href={`https://wa.me/55${whats}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${item} hover:bg-[#F7F7F5]`}
              style={{ color: CORES.texto }}
            >
              <MessageCircle size={14} /> Enviar por WhatsApp
            </a>
          )}
          <div className="my-1 border-t" style={{ borderColor: CORES.borda }} />
          <button
            disabled={!rascunho}
            title={!rascunho ? "Só rascunhos podem ser excluídos" : undefined}
            onClick={() => {
              if (!confirm(`Excluir o orçamento de "${o.contato_nome}"?`)) return;
              startTransition(async () => {
                const res = await excluirOrcamento(o.id);
                if ("error" in res) setErro(res.error);
                else setAberto(false);
              });
            }}
            className={`${item} hover:bg-[#F7EEEB] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white`}
            style={{ color: CORES.destrutivo }}
          >
            <Trash2 size={14} /> Excluir
          </button>
          {erro && (
            <p className="px-3 py-1.5 text-[11.5px]" style={{ color: CORES.destrutivo }}>
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Cartão da lista principal. Três linhas, sem nada que abra no hover. */
function Cartao({ o, pacote }: { o: Orcamento; pacote?: string }) {
  const avatar = paletaAvatar(o.tipo_evento);
  const st = estiloStatus(o.status);
  const val = infoValidade(o.data_validade);
  const tel = telefoneFormatado(o.contato_telefone);

  // O pacote só existe depois do aceite — quando existe, é a informação
  // mais concreta da linha e entra na frente do resto.
  const contexto = [
    pacote,
    EVENT_TYPE_LABELS[o.tipo_evento as EventType] ?? o.tipo_evento,
    o.data_evento ? dataPorExtenso(o.data_evento) : null,
    o.numero_convidados ? `${o.numero_convidados} convidados` : null,
  ].filter(Boolean) as string[];

  return (
    <Link
      href={`/orcamentos/${o.id}`}
      className="block rounded-[12px] border p-3.5 transition-colors hover:bg-[#F7F7F5]"
      style={{ borderColor: CORES.borda }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12.5px] font-medium"
          style={{ background: avatar.bg, color: avatar.cor }}
          aria-hidden
        >
          {iniciaisDe(o.contato_nome)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className="truncate text-[15px] font-medium"
                style={{ fontFamily: "var(--font-serif-orcamentos), Georgia, serif" }}
              >
                {o.contato_nome}
              </p>
              {tel && (
                <p className="text-[12px]" style={{ color: CORES.terciario }}>
                  {tel}
                </p>
              )}
            </div>
            <span className="flex items-center gap-1">
              {o.evento_gerado_id && (
                <span
                  className="rounded-[6px] px-1.5 py-0.5 text-[10.5px]"
                  style={{ background: CORES.tag, color: CORES.secundario }}
                >
                  Evento
                </span>
              )}
              <MenuAcoes o={o} />
            </span>
          </div>

          <p className="mt-1 truncate text-[12.5px]" style={{ color: CORES.secundario }}>
            {contexto.join(" · ")}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span
              className="text-[15px] font-medium"
              style={{ fontFamily: "var(--font-serif-orcamentos), Georgia, serif" }}
            >
              {valorFormatado(o.valor_total)}
            </span>
            <span className="flex items-center gap-3">
              {/* prazo só aparece quando há algo a fazer com ele */}
              {val.alerta && (
                <span className="text-[12px]" style={{ color: val.cor }}>
                  {val.rotulo}
                </span>
              )}
              <span
                className="flex items-center gap-1.5 text-[12.5px]"
                style={{ color: st.cor }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: st.ponto }}
                  aria-hidden
                />
                {st.rotulo}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Trilho da direita: proposta enviada com prazo chegando. */
function ItemVencendo({ o }: { o: Orcamento }) {
  const val = infoValidade(o.data_validade);
  return (
    <Link
      href={`/orcamentos/${o.id}`}
      className="-mx-2 block rounded-[9px] px-2 py-2.5 transition-colors hover:bg-[#F7F7F5]"
    >
      <p className="truncate text-[13.5px]" style={{ color: CORES.texto }}>
        {o.contato_nome}
      </p>
      <p className="mt-0.5 text-[12px]">
        <span style={{ color: val.cor }}>{val.rotulo}</span>
        <span style={{ color: CORES.terciario }}>
          {" · "}
          {valorFormatado(o.valor_total)}
        </span>
      </p>
    </Link>
  );
}

export function OrcamentosTable({
  rows,
  total,
  perPage,
  current,
  vencendo = [],
  pacotePorOrcamento = {},
}: {
  rows: Orcamento[];
  total: number;
  perPage: number;
  current: Current;
  /** enviados com prazo mais próximo — vem pronto do servidor */
  vencendo?: Orcamento[];
  /** nome do pacote fechado, por orçamento aceito */
  pacotePorOrcamento?: Record<string, string>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(current.busca);

  const paginas = Math.max(1, Math.ceil(total / perPage));

  // Clicar de novo na mesma ordenação inverte a direção.
  const hrefOrdem = (chave: "criacao" | "data" | "valor") => {
    const mesma = current.ordem === chave;
    // criação começa do mais novo; as outras, crescente
    const padrao = chave === "criacao" ? "desc" : "asc";
    return buildHref(current, {
      ordem: chave,
      dir: mesma ? (current.dir === "asc" ? "desc" : "asc") : padrao,
      page: 1,
    });
  };

  const ORDENS: { chave: "criacao" | "data" | "valor"; rotulo: string }[] = [
    { chave: "criacao", rotulo: "Mais recentes" },
    { chave: "data", rotulo: "Data do evento" },
    { chave: "valor", rotulo: "Valor" },
  ];

  const tiposChip: { valor: string; rotulo: string }[] = [
    { valor: "", rotulo: "Todos os tipos" },
    { valor: "casamento", rotulo: "Casamento" },
    { valor: "debutante", rotulo: "Debutante" },
  ];
  // Um filtro de outro tipo (vindo do link de um evento, por exemplo) ganha
  // o próprio chip: sem isso ele ficaria ativo e sem como ser desligado.
  if (current.tipo && !tiposChip.some((t) => t.valor === current.tipo)) {
    tiposChip.push({
      valor: current.tipo,
      rotulo: EVENT_TYPE_LABELS[current.tipo as EventType] ?? current.tipo,
    });
  }

  const rotuloBloco = {
    fontSize: 10.5,
    letterSpacing: "0.8px",
    color: CORES.terciario,
  } as const;

  return (
    <div className="mt-7">
      {/* Linha 1: busca + status */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(buildHref(current, { busca, page: 1 }));
          }}
          className="relative min-w-[240px] flex-1"
        >
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: CORES.terciario }}
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por contato ou telefone…"
            className="w-full rounded-[10px] border py-[9px] pl-9 pr-3 text-[13.5px] outline-none"
            style={{ background: CORES.suave, borderColor: CORES.borda, color: CORES.texto }}
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Chip href={buildHref(current, { status: "", page: 1 })} ativo={current.status === ""}>
            Todos
          </Chip>
          <Chip
            href={buildHref(current, {
              status: current.status === "aprovado" ? "" : "aprovado",
              page: 1,
            })}
            ativo={current.status === "aprovado"}
          >
            Aprovados
          </Chip>
          <Chip
            href={buildHref(current, {
              status: current.status === "enviado" ? "" : "enviado",
              page: 1,
            })}
            ativo={current.status === "enviado"}
          >
            Enviados
          </Chip>
        </div>
      </div>

      {/* Linha 2: tipo de evento */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="uppercase" style={rotuloBloco}>
          Tipo de evento
        </span>
        {tiposChip.map((t) => (
          <Chip
            key={t.valor || "todos"}
            href={buildHref(current, {
              tipo: current.tipo === t.valor ? "" : t.valor,
              page: 1,
            })}
            ativo={current.tipo === t.valor}
          >
            {t.rotulo}
          </Chip>
        ))}
      </div>

      {/* Dois blocos: a lista e o trilho de prazos */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.55fr_1fr]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <span className="uppercase" style={rotuloBloco}>
              {current.ordem === "criacao" && current.dir === "desc"
                ? "Recentes"
                : "Orçamentos"}
            </span>
            <div className="flex items-center gap-3 text-[12px]">
              {ORDENS.map((op) => {
                const ativo = current.ordem === op.chave;
                return (
                  <Link
                    key={op.chave}
                    href={hrefOrdem(op.chave)}
                    style={{ color: ativo ? CORES.texto : CORES.terciario }}
                    className="transition-colors hover:text-[#37352F]"
                  >
                    {op.rotulo}
                    {ativo ? (current.dir === "asc" ? " ↑" : " ↓") : ""}
                  </Link>
                );
              })}
            </div>
          </div>

          {rows.length === 0 ? (
            <p
              className="rounded-[12px] border border-dashed px-3 py-14 text-center text-[13.5px]"
              style={{ borderColor: CORES.borda, color: CORES.secundario }}
            >
              Nenhum orçamento encontrado com esses filtros.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {rows.map((o) => (
                <Cartao key={o.id} o={o} pacote={pacotePorOrcamento[o.id]} />
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12.5px]" style={{ color: CORES.terciario }}>
              Mostrando {rows.length} de {total} orçamento{total === 1 ? "" : "s"}
            </p>
            {paginas > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={current.page <= 1}
                  onClick={() => router.push(buildHref(current, { page: current.page - 1 }))}
                  className="rounded-[9px] border p-1.5 disabled:opacity-40"
                  style={{ borderColor: CORES.borda, color: CORES.nav }}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-[12.5px]" style={{ color: CORES.secundario }}>
                  {current.page} / {paginas}
                </span>
                <button
                  disabled={current.page >= paginas}
                  onClick={() => router.push(buildHref(current, { page: current.page + 1 }))}
                  className="rounded-[9px] border p-1.5 disabled:opacity-40"
                  style={{ borderColor: CORES.borda, color: CORES.nav }}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Trilho: prazo chegando. Some quando não há nada a cobrar. */}
        <aside
          className="rounded-[12px] border p-4"
          style={{ borderColor: CORES.borda, background: CORES.suave }}
        >
          <span className="uppercase" style={rotuloBloco}>
            Vencendo o prazo
          </span>
          {vencendo.length === 0 ? (
            <p className="mt-3 text-[12.5px]" style={{ color: CORES.secundario }}>
              Nenhuma proposta enviada perto do prazo.
            </p>
          ) : (
            <div className="mt-2 flex flex-col">
              {vencendo.map((o) => (
                <ItemVencendo key={o.id} o={o} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
