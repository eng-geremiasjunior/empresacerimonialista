"use client";

// Listagem de Orçamentos — redesign "quiet luxury"
// (design/tela-orcamentos). Lista em estilo documento: cada linha é um
// link para o orçamento, com um resumo que abre no hover.
//
// Filtros, ordenação e paginação continuam por URL (padrão do sistema).
// Ordenar no cliente ordenaria só a página aberta, o que daria uma ordem
// errada sobre o total — por isso o clique no cabeçalho navega.

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
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
import { formatDateBR, type Orcamento } from "@/lib/orcamentos";
import {
  CORES,
  GRID_LISTA,
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
  if (m.ordem && m.ordem !== "data") p.set("ordem", m.ordem);
  if (m.dir === "desc") p.set("dir", m.dir);
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
    // O kebab vive dentro do link da linha: sem parar a propagação, abrir
    // o menu abriria o orçamento junto.
    <div
      className="relative"
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
            <Eye size={14} /> Ver proposta
          </Link>
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

function Linha({
  o,
  pacote,
}: {
  o: Orcamento;
  pacote?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const avatar = paletaAvatar(o.tipo_evento);
  const st = estiloStatus(o.status);
  const val = infoValidade(o.data_validade);
  const tel = telefoneFormatado(o.contato_telefone);
  const email = o.ficha_email || o.contato_email;
  const whats = (o.contato_telefone ?? "").replace(/\D/g, "");

  const resumo = [
    o.local_evento || o.cidade_evento
      ? { r: "Local", v: [o.local_evento, o.cidade_evento].filter(Boolean).join(" — ") }
      : null,
    o.numero_convidados ? { r: "Convidados", v: String(o.numero_convidados) } : null,
    pacote ? { r: "Pacote", v: pacote } : null,
    email ? { r: "E-mail", v: email } : null,
  ].filter(Boolean) as { r: string; v: string }[];

  return (
    <Link
      href={`/orcamentos/${o.id}`}
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      onFocus={() => setAberto(true)}
      onBlur={() => setAberto(false)}
      className="block border-b transition-colors"
      style={{ borderColor: CORES.borda, background: aberto ? CORES.suave : undefined }}
    >
      <div
        className="grid items-center gap-3 px-3 py-3.5 lg:gap-4"
        style={{ gridTemplateColumns: GRID_LISTA }}
      >
        {/* Cliente */}
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12.5px] font-medium"
            style={{ background: avatar.bg, color: avatar.cor }}
            aria-hidden
          >
            {iniciaisDe(o.contato_nome)}
          </span>
          <span className="min-w-0">
            <span
              className="block truncate text-[15px] font-medium sm:text-[16px]"
              style={{ fontFamily: "var(--font-serif-orcamentos), Georgia, serif" }}
            >
              {o.contato_nome}
            </span>
            {tel && (
              <span className="block text-[12px]" style={{ color: CORES.terciario }}>
                {tel}
              </span>
            )}
          </span>
        </div>

        {/* Evento */}
        <div className="min-w-0">
          <span
            className="inline-block truncate rounded-[6px] px-2 py-1 text-[12px]"
            style={{ background: CORES.tag, color: CORES.secundario }}
          >
            {EVENT_TYPE_LABELS[o.tipo_evento as EventType] ?? o.tipo_evento}
          </span>
        </div>

        {/* Data prevista — ano obrigatório */}
        <div className="text-[13.5px]" style={{ color: CORES.texto }}>
          {dataPorExtenso(o.data_evento)}
        </div>

        {/* Valor */}
        <div
          className="text-[15px] font-medium sm:text-[16px]"
          style={{ fontFamily: "var(--font-serif-orcamentos), Georgia, serif" }}
        >
          {valorFormatado(o.valor_total)}
        </div>

        {/* Validade */}
        <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: val.cor }}>
          {val.alerta && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: val.cor }}
              aria-hidden
            />
          )}
          {val.rotulo}
        </div>

        {/* Status + ações */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: st.cor }}>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: st.ponto }}
              aria-hidden
            />
            {st.rotulo}
          </span>
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
      </div>

      {/* Resumo que expande no hover */}
      <div
        className="overflow-hidden px-3"
        style={{
          maxHeight: aberto ? 120 : 0,
          opacity: aberto ? 1 : 0,
          transform: aberto ? "translateY(0)" : "translateY(-4px)",
          transition: "max-height .38s cubic-bezier(.22,.61,.36,1), opacity .32s, transform .32s",
        }}
      >
        <div
          className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3 text-[12.5px]"
          style={{ borderColor: CORES.bordaSutil, color: CORES.secundario }}
        >
          {resumo.length === 0 && (
            <span style={{ color: CORES.terciario }}>Sem detalhes cadastrados</span>
          )}
          {resumo.map((d) => (
            <span key={d.r}>
              <span style={{ color: CORES.terciario }}>{d.r}: </span>
              {d.v}
            </span>
          ))}
          {whats && (
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`https://wa.me/55${whats}`, "_blank", "noopener");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`https://wa.me/55${whats}`, "_blank", "noopener");
                }
              }}
              className="ml-auto cursor-pointer rounded-[8px] border px-2.5 py-1 transition-colors hover:bg-[#EFF3ED]"
              style={{ color: CORES.aprovadoTexto, borderColor: "#DCE4D8" }}
            >
              Falar com cliente
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function OrcamentosTable({
  rows,
  total,
  perPage,
  current,
  pacotePorOrcamento = {},
}: {
  rows: Orcamento[];
  total: number;
  perPage: number;
  current: Current;
  pacotePorOrcamento?: Record<string, string>;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(current.busca);

  const paginas = Math.max(1, Math.ceil(total / perPage));

  // Clicar de novo na mesma coluna inverte a direção; coluna nova começa
  // em asc, como o handoff especifica.
  const hrefOrdem = (chave: "data" | "valor") =>
    buildHref(current, {
      ordem: chave,
      dir: current.ordem === chave && current.dir === "asc" ? "desc" : "asc",
      page: 1,
    });
  const seta = (chave: string) =>
    current.ordem === chave ? (current.dir === "asc" ? " ↑" : " ↓") : "";

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
        <span
          className="text-[10.5px] uppercase"
          style={{ letterSpacing: "0.8px", color: CORES.terciario }}
        >
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

      {/* Cabeçalho de colunas */}
      <div
        className="mt-6 grid items-center gap-3 border-b px-3 pb-2.5 text-[10.5px] uppercase lg:gap-4"
        style={{
          gridTemplateColumns: GRID_LISTA,
          borderColor: CORES.borda,
          letterSpacing: "0.8px",
          color: CORES.terciario,
        }}
      >
        <span>Cliente</span>
        <span>Evento</span>
        <Link href={hrefOrdem("data")} className="hover:text-[#37352F]">
          Data prevista{seta("data")}
        </Link>
        <Link href={hrefOrdem("valor")} className="hover:text-[#37352F]">
          Valor{seta("valor")}
        </Link>
        <span>Validade</span>
        <span>Status</span>
      </div>

      {/* Linhas */}
      {rows.length === 0 ? (
        <p className="px-3 py-14 text-center text-[13.5px]" style={{ color: CORES.secundario }}>
          Nenhum orçamento encontrado com esses filtros.
        </p>
      ) : (
        rows.map((o) => (
          <Linha key={o.id} o={o} pacote={pacotePorOrcamento[o.id]} />
        ))
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
    </div>
  );
}
