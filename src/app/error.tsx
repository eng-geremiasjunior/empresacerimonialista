"use client";

// Rede de proteção da árvore inteira — inclusive das telas públicas.
//
// A área logada tem a sua em src/app/(app)/error.tsx. Esta pega o resto:
// proposta, portal da cliente, link do fornecedor, RSVP. Sem ela, uma
// exceção não tratada virava "Application error: a client-side exception
// has occurred" na tela em que a noiva estava fechando contrato.
//
// Aqui o texto não pode falar como se ela fosse do time: quem lê pode ser
// a noiva, um convidado ou um fornecedor que nunca ouviu falar do Vela.

import { useEffect } from "react";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vela] erro:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16">
      <div className="max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-stone-400">
          Vela
        </p>
        <h1 className="mt-3 text-xl font-semibold text-stone-900">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          O problema é do nosso lado, não do que você fez. Tente de novo — se
          continuar, avise quem te enviou o link.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          Tentar de novo
        </button>
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-stone-400">
            erro {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
