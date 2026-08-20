"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Pause, Play, Send, X } from "lucide-react";
import {
  cancelarBatida,
  marcarEnviada,
  segurarBatida,
  soltarBatida,
} from "@/app/(app)/solicitacoes/actions";
import type { ItemDaFila } from "@/lib/supabase/fila-solicitacoes";

export function FilaDoDia({ itens }: { itens: ItemDaFila[] }) {
  const naFila = itens.filter((i) => i.status === "na_fila");
  const seguradas = itens.filter((i) => i.status === "segurada");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-gray-900">
          {naFila.length === 0
            ? "Nada para enviar hoje"
            : naFila.length === 1
              ? "1 mensagem pronta"
              : `${naFila.length} mensagens prontas`}
        </h2>
        {naFila.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Quando um prazo com fornecedor chegar, a mensagem aparece aqui
            escrita, para você conferir e mandar.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {naFila.map((i) => (
              <CartaoBatida key={i.batidaId} item={i} />
            ))}
          </div>
        )}
      </section>

      {seguradas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900">
            Seguradas por você
          </h2>
          <div className="mt-3 space-y-3">
            {seguradas.map((i) => (
              <CartaoBatida key={i.batidaId} item={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CartaoBatida({ item }: { item: ItemDaFila }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [textoAberto, setTextoAberto] = useState(false);

  function rodar(fn: () => Promise<{ error: string } | { success: true } | null>) {
    setErro(null);
    iniciar(async () => {
      const r = await fn();
      if (r && "error" in r) setErro(r.error);
    });
  }

  // O envio é em dois tempos por natureza: o WhatsApp abre no aparelho
  // dela com o texto pronto, ela toca em enviar lá, e só então o Vela
  // registra que saiu. Registrar antes seria mentir sobre o que aconteceu.
  function enviar() {
    if (item.linkWhatsapp) window.open(item.linkWhatsapp, "_blank");
    rodar(() => marcarEnviada(item.batidaId));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/fornecedores/${item.fornecedor.id}`}
            className="text-sm font-semibold text-gray-900 hover:underline"
          >
            {item.fornecedor.nome}
          </Link>
          <ul className="mt-1.5 space-y-1">
            {item.pendencias.map((p) => (
              <li key={p.id} className="text-sm text-gray-600">
                {p.titulo}
                <span className="text-gray-400"> · {p.evento}</span>
              </li>
            ))}
          </ul>
        </div>
        {item.canal === "email" && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            por e-mail
          </span>
        )}
      </div>

      <button
        onClick={() => setTextoAberto((v) => !v)}
        className="mt-3 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
      >
        {textoAberto ? "Esconder o texto" : "Ver o texto que vai sair"}
      </button>
      {textoAberto && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-sans text-sm text-gray-700">
          {item.texto}
        </pre>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.linkWhatsapp ? (
          <button
            onClick={enviar}
            disabled={pendente}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Send size={15} />
            {pendente ? "Registrando…" : "Abrir no WhatsApp e enviar"}
          </button>
        ) : (
          <button
            onClick={() => rodar(() => marcarEnviada(item.batidaId))}
            disabled={pendente}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Check size={15} />
            Já enviei {item.email ? `para ${item.email}` : ""}
          </button>
        )}

        {item.status === "na_fila" ? (
          <button
            onClick={() => rodar(() => segurarBatida(item.batidaId))}
            disabled={pendente}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Pause size={15} />
            Segurar
          </button>
        ) : (
          <button
            onClick={() => rodar(() => soltarBatida(item.batidaId))}
            disabled={pendente}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Play size={15} />
            Devolver à fila
          </button>
        )}

        <button
          onClick={() => rodar(() => cancelarBatida(item.batidaId))}
          disabled={pendente}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-60"
        >
          <X size={14} />
          Já resolvi por fora
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
