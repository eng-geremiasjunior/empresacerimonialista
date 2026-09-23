"use client";

// Equipe do dia (171): quem trabalha neste evento, e o link de cada um.
// No dia, a cerimonialista está no rádio — cada pessoa precisa chegar
// sabendo a própria parte. O link abre no celular, sem login, com as
// deixas dela em cima e o dia inteiro embaixo.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adicionarPessoa,
  removerPessoa,
  salvarPessoa,
} from "@/app/(app)/eventos/[id]/roteiro/equipe-actions";
import { linkCompartilharWhatsapp, linkWhatsapp, primeiroNome } from "@/lib/whatsapp-link";

export type PessoaDaEquipe = {
  id: string;
  nome: string;
  telefone: string | null;
  posto: string | null;
  hash: string;
  /** quantos itens do roteiro são dela */
  itens: number;
};

const campo =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none";
const botao =
  "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:border-stone-400 disabled:opacity-50";

export function EquipeDoDia({
  eventId,
  pessoas,
  base,
  eventoNome,
}: {
  eventId: string;
  pessoas: PessoaDaEquipe[];
  /** endereço público do sistema, para o link que sai no WhatsApp */
  base: string;
  eventoNome: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nova, setNova] = useState({ nome: "", telefone: "", posto: "" });
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState({ nome: "", telefone: "", posto: "" });
  const [copiado, setCopiado] = useState<string | null>(null);

  function rodar(f: () => Promise<{ error: string } | { success: true }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      depois?.();
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
                    placeholder="Posto (portaria, noiva…)"
                    aria-label="Posto"
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
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => {
                    setEditando(p.id);
                    setEdicao({ nome: p.nome, telefone: p.telefone ?? "", posto: p.posto ?? "" });
                  }}
                  title="Editar"
                >
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-sm text-stone-500">
                    {p.posto ? ` · ${p.posto}` : ""}
                    {` · ${p.itens === 0 ? "nenhum item" : p.itens === 1 ? "1 item" : `${p.itens} itens`}`}
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-2">
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
              </li>
            )
          )}
        </ul>
      )}

      <form
        className="mt-3 grid gap-2 sm:grid-cols-[1fr,1fr,1fr,auto]"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(() => adicionarPessoa(eventId, nova), () => setNova({ nome: "", telefone: "", posto: "" }));
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
          placeholder="Posto (portaria, noiva…)"
          aria-label="Posto"
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
