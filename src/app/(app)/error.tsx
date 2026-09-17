"use client";

// Rede de proteção da área logada.
//
// Sem este arquivo, qualquer exceção não tratada — uma consulta que falha,
// um dado que veio diferente do esperado — virava a tela de erro do Next:
// fundo branco, "Application error: a server-side exception has occurred",
// sem saída. A cerimonialista trava e ninguém fica sabendo.
//
// O que ela precisa aqui é de duas coisas: entender que o problema é do
// sistema (não dela, não do dado que acabou de digitar) e ter um caminho
// de volta. O detalhe técnico fica no console e no log da Vercel.

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { areaDaRota } from "@/lib/presenca";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vela] erro na área logada:", error);
    // O painel do dono conta os erros que chegam à tela (123, seção 10).
    // Vai só o nome da área (sem endereço nem id) e o código do erro; a
    // mensagem fica aqui, porque pode repetir o que a pessoa digitou.
    Promise.resolve(
      createClient().rpc("registrar_erro_da_tela", {
        p_area: areaDaRota(window.location.pathname),
        p_codigo: error.digest ?? error.name ?? "erro",
      })
    ).catch(() => undefined);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <h1 className="text-xl font-semibold text-gray-900">
        Alguma coisa falhou aqui
      </h1>
      <p className="text-sm leading-relaxed text-gray-600">
        Não foi nada que você fez. Tente de novo — se continuar, o problema é
        do nosso lado e nada do que você já salvou se perdeu.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <RotateCw size={15} />
          Tentar de novo
        </button>
        <Link
          href="/eventos/dashboard"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
        >
          Ir para o início
        </Link>
      </div>

      {/* O digest é o que liga esta tela ao log da Vercel. Só aparece
          quando existe, e é a única coisa técnica que vale mostrar. */}
      {error.digest && (
        <p className="font-mono text-xs text-gray-400">erro {error.digest}</p>
      )}
    </div>
  );
}
