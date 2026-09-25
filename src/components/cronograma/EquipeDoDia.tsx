"use client";

// Equipe do dia (171): quem trabalha neste evento, e o link de cada um.
// No dia, a cerimonialista está no rádio — cada pessoa precisa chegar
// sabendo a própria parte. O link abre no celular, sem login, com as
// deixas dela em cima e o dia inteiro embaixo.
//
// 25/09/2026: a seção vinha DEPOIS do checklist e dizia só "nenhum item"
// — o dono não achou onde dar a cada pessoa a parte dela (o "— quem?"
// do checklist e o campo do horário ficam em outro lugar da página).
// Agora a linha da pessoa tem "Designar itens": a lista do dia inteiro,
// para marcar o que é dela ali mesmo.

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarPessoa,
  designarItens,
  removerPessoa,
  salvarPessoa,
  type AcaoEquipe,
} from "@/app/(app)/eventos/[id]/roteiro/equipe-actions";
import { linkCompartilharWhatsapp, linkWhatsapp, primeiroNome } from "@/lib/whatsapp-link";

export type PessoaDaEquipe = {
  id: string;
  nome: string;
  telefone: string | null;
  posto: string | null;
  hash: string;
  /** quantos itens do roteiro e do checklist são dela */
  itens: number;
};

/** Um horário do roteiro, para marcar de quem é */
export type HorarioParaDesignar = {
  id: string;
  time: string | null;
  title: string;
  equipeId: string | null;
  /** quem cuida hoje, quando é alguém de fora da equipe (texto livre) */
  responsavel: string | null;
};

/** Um item do checklist do dia (só os que se aplicam) */
export type ItemParaDesignar = {
  id: string;
  bloco: string;
  titulo: string;
  horario: string | null;
  equipeId: string | null;
};

const BLOCOS: { key: string; label: string }[] = [
  { key: "montagem", label: "Montagem" },
  { key: "colacao", label: "Colação" },
  { key: "cerimonia", label: "Cerimônia" },
  { key: "recepcao", label: "Recepção" },
  { key: "desmontagem", label: "Desmontagem" },
];

const campo =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none";
const botao =
  "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400 disabled:opacity-50";
const botaoForte =
  "rounded-lg border border-stone-900 bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50";

const hora = (t: string | null) => (t ? t.slice(0, 5) : "");

export function EquipeDoDia({
  eventId,
  pessoas,
  base,
  eventoNome,
  horarios = [],
  checklist = [],
}: {
  eventId: string;
  pessoas: PessoaDaEquipe[];
  /** endereço público do sistema, para o link que sai no WhatsApp */
  base: string;
  eventoNome: string;
  horarios?: HorarioParaDesignar[];
  checklist?: ItemParaDesignar[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nova, setNova] = useState({ nome: "", telefone: "", posto: "" });
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState({ nome: "", telefone: "", posto: "" });
  const [copiado, setCopiado] = useState<string | null>(null);
  const [designando, setDesignando] = useState<string | null>(null);

  const nomePorId = useMemo(
    () => new Map(pessoas.map((p) => [p.id, primeiroNome(p.nome) || p.nome])),
    [pessoas]
  );
  const temItens = horarios.length > 0 || checklist.length > 0;

  function rodar(
    f: () => Promise<AcaoEquipe>,
    depois?: (r: { success: true; id?: string }) => void
  ) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      depois?.(r);
      router.refresh();
    });
  }

  function linkDe(p: PessoaDaEquipe) {
    return `${base}/escala/${p.hash}`;
  }

  function whatsapp(p: PessoaDaEquipe) {
    const nome = primeiroNome(p.nome);
    const texto =
      `Oi${nome ? `, ${nome}` : ""}! Este é o seu roteiro do ${eventoNome}` +
      `${p.posto ? ` (${p.posto})` : ""}: ${linkDe(p)}`;
    return linkWhatsapp(p.telefone, texto) ?? linkCompartilharWhatsapp(texto);
  }

  async function copiar(p: PessoaDaEquipe) {
    await navigator.clipboard.writeText(linkDe(p));
    setCopiado(p.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <section className="mt-10 print:hidden" data-secao="equipe-do-dia">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Equipe do dia</h2>
        {pessoas.length > 0 && (
          <a
            href={`/imprimir/roteiro/${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-900"
          >
            imprimir o roteiro
          </a>
        )}
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Quem trabalha com você no dia. Cada pessoa recebe no celular um link
        com os itens dela, sem login.
      </p>

      {pessoas.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pessoas.map((p) =>
            editando === p.id ? (
              <li key={p.id} className="rounded-xl border border-stone-300 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className={campo}
                    value={edicao.nome}
                    onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })}
                    placeholder="Nome"
                    aria-label="Nome"
                  />
                  <input
                    className={campo}
                    value={edicao.posto}
                    onChange={(e) => setEdicao({ ...edicao, posto: e.target.value })}
                    placeholder="Função (portaria, noiva…)"
                    aria-label="Função"
                  />
                  <input
                    className={campo}
                    value={edicao.telefone}
                    onChange={(e) => setEdicao({ ...edicao, telefone: e.target.value })}
                    placeholder="WhatsApp"
                    aria-label="WhatsApp"
                    inputMode="tel"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    disabled={pendente}
                    onClick={() => rodar(() => salvarPessoa(eventId, p.id, edicao), () => setEditando(null))}
                  >
                    Salvar
                  </button>
                  <button type="button" className="px-2 text-sm text-stone-500" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="ml-auto px-2 text-sm text-stone-500 hover:text-red-700"
                    disabled={pendente}
                    onClick={() => {
                      if (window.confirm(`Tirar ${p.nome} da equipe deste evento?`)) {
                        rodar(() => removerPessoa(eventId, p.id), () => setEditando(null));
                      }
                    }}
                  >
                    Tirar da equipe
                  </button>
                </div>
              </li>
            ) : (
              <li key={p.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => {
                      setEditando(p.id);
                      setEdicao({ nome: p.nome, telefone: p.telefone ?? "", posto: p.posto ?? "" });
                    }}
                    title="Editar nome, função e WhatsApp"
                  >
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-sm text-stone-500">
                      {p.posto ? ` · ${p.posto}` : ""}
                      {p.itens > 0 ? ` · ${p.itens === 1 ? "1 item" : `${p.itens} itens`}` : ""}
                    </span>
                  </button>
                  <span className="flex flex-wrap items-center gap-2">
                    {temItens && (
                      <button
                        type="button"
                        aria-expanded={designando === p.id}
                        className={p.itens === 0 && designando !== p.id ? botaoForte : botao}
                        onClick={() => setDesignando((atual) => (atual === p.id ? null : p.id))}
                      >
                        Designar itens
                      </button>
                    )}
                    <a href={whatsapp(p)} target="_blank" rel="noopener noreferrer" className={botao}>
                      Enviar no WhatsApp
                    </a>
                    <button type="button" className={botao} onClick={() => copiar(p)}>
                      {copiado === p.id ? "Copiado!" : "Copiar link"}
                    </button>
                    {p.itens > 0 && (
                      <a
                        href={`/imprimir/roteiro/${eventId}?pessoa=${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={botao}
                      >
                        Imprimir
                      </a>
                    )}
                  </span>
                </div>
                {designando === p.id && (
                  <DesignarItens
                    key={p.id}
                    pessoa={p}
                    horarios={horarios}
                    checklist={checklist}
                    nomePorId={nomePorId}
                    pendente={pendente}
                    onCancelar={() => setDesignando(null)}
                    onSalvar={(escolha) =>
                      rodar(() => designarItens(eventId, p.id, escolha), () => setDesignando(null))
                    }
                  />
                )}
              </li>
            )
          )}
        </ul>
      )}

      <form
        className="mt-3 grid gap-2 sm:grid-cols-[1fr,1fr,1fr,auto]"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(
            () => adicionarPessoa(eventId, nova),
            (r) => {
              setNova({ nome: "", telefone: "", posto: "" });
              // quem acabou de entrar já abre com a lista do dia para marcar
              if (r.id && temItens) setDesignando(r.id);
            }
          );
        }}
      >
        <input
          className={campo}
          value={nova.nome}
          onChange={(e) => setNova({ ...nova, nome: e.target.value })}
          placeholder="Nome"
          aria-label="Nome de quem trabalha no dia"
        />
        <input
          className={campo}
          value={nova.posto}
          onChange={(e) => setNova({ ...nova, posto: e.target.value })}
          placeholder="Função (portaria, noiva…)"
          aria-label="Função"
        />
        <input
          className={campo}
          value={nova.telefone}
          onChange={(e) => setNova({ ...nova, telefone: e.target.value })}
          placeholder="WhatsApp"
          aria-label="WhatsApp"
          inputMode="tel"
        />
        <button
          type="submit"
          disabled={pendente || !nova.nome.trim()}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Adicionar
        </button>
      </form>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}

function DesignarItens({
  pessoa,
  horarios,
  checklist,
  nomePorId,
  pendente,
  onCancelar,
  onSalvar,
}: {
  pessoa: PessoaDaEquipe;
  horarios: HorarioParaDesignar[];
  checklist: ItemParaDesignar[];
  nomePorId: Map<string, string>;
  pendente: boolean;
  onCancelar: () => void;
  onSalvar: (escolha: { roteiro: string[]; checklist: string[] }) => void;
}) {
  const [roteiro, setRoteiro] = useState(
    () => new Set(horarios.filter((h) => h.equipeId === pessoa.id).map((h) => h.id))
  );
  const [doChecklist, setDoChecklist] = useState(
    () => new Set(checklist.filter((c) => c.equipeId === pessoa.id).map((c) => c.id))
  );

  const blocos = BLOCOS.map((b) => ({
    ...b,
    itens: checklist.filter((c) => c.bloco === b.key),
  })).filter((b) => b.itens.length > 0);

  function alternar(conjunto: Set<string>, id: string, set: (s: Set<string>) => void) {
    const novo = new Set(conjunto);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    set(novo);
  }

  // quem cuida hoje, quando não é ela: some ao marcar (passa a ser dela)
  function comQuem(equipeId: string | null, responsavel: string | null, marcado: boolean) {
    if (marcado) return null;
    if (equipeId && equipeId !== pessoa.id) return nomePorId.get(equipeId) ?? null;
    if (!equipeId && responsavel) return responsavel.split(" ")[0];
    return null;
  }

  const total = roteiro.size + doChecklist.size;

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <div className="gap-6 sm:columns-2">
        {horarios.length > 0 && (
          <Grupo titulo="Roteiro do dia">
            {horarios.map((h) => {
              const marcado = roteiro.has(h.id);
              return (
                <Linha
                  key={h.id}
                  marcado={marcado}
                  onChange={() => alternar(roteiro, h.id, setRoteiro)}
                  hora={hora(h.time)}
                  texto={h.title}
                  com={comQuem(h.equipeId, h.responsavel, marcado)}
                />
              );
            })}
          </Grupo>
        )}
        {blocos.map((b) => (
          <Grupo key={b.key} titulo={b.label}>
            {b.itens.map((c) => {
              const marcado = doChecklist.has(c.id);
              return (
                <Linha
                  key={c.id}
                  marcado={marcado}
                  onChange={() => alternar(doChecklist, c.id, setDoChecklist)}
                  hora={hora(c.horario)}
                  texto={c.titulo}
                  com={comQuem(c.equipeId, null, marcado)}
                />
              );
            })}
          </Grupo>
        ))}
      </div>
      {/* a lista passa de 30 itens: o Salvar acompanha a rolagem */}
      <div className="sticky bottom-0 -mx-3 -mb-3 flex items-center gap-2 rounded-b-xl border-t border-stone-100 bg-white px-3 py-3">
        <button
          type="button"
          className={botaoForte}
          disabled={pendente}
          onClick={() => onSalvar({ roteiro: [...roteiro], checklist: [...doChecklist] })}
        >
          {pendente
            ? "Salvando…"
            : total === 0
              ? "Salvar"
              : `Salvar ${total === 1 ? "1 item" : `${total} itens`}`}
        </button>
        <button type="button" className="px-2 text-sm text-stone-500" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mb-4 break-inside-avoid">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{titulo}</p>
      <ul>{children}</ul>
    </div>
  );
}

function Linha({
  marcado,
  onChange,
  hora,
  texto,
  com,
}: {
  marcado: boolean;
  onChange: () => void;
  hora: string;
  texto: string;
  com: string | null;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-stone-50">
        <input
          type="checkbox"
          checked={marcado}
          onChange={onChange}
          className="mt-0.5 h-4 w-4 shrink-0 accent-stone-900"
        />
        {hora && <span className="w-11 shrink-0 tabular-nums text-stone-500">{hora}</span>}
        <span className={`min-w-0 flex-1 ${marcado ? "text-stone-900" : "text-stone-700"}`}>{texto}</span>
        {com && <span className="shrink-0 text-xs text-stone-400">com {com}</span>}
      </label>
    </li>
  );
}
