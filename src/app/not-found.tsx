import Link from "next/link";

// A tela de "não achei" de TODA a árvore — inclusive das páginas que a
// noiva, a cliente e o fornecedor abrem sem login.
//
// Sem este arquivo, um link de proposta trocado, vencido ou revogado
// entregava "404 — This page could not be found.": em inglês, sem marca,
// no meio do fechamento comercial dela. São 28 chamadas de notFound() no
// app, entre elas /orcamento/[hash] e 13 páginas do portal.
//
// O tom é o mesmo que /fornecedor/[hash] já usava sozinho: dizer o que
// provavelmente aconteceu e o que fazer, em vez de um número.
export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-16">
      <div className="max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-stone-400">
          Vela
        </p>
        <h1 className="mt-3 text-xl font-semibold text-stone-900">
          Esta página não existe
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Pode ser um link antigo, um endereço digitado com um caractere a
          mais, ou algo que saiu do ar. Se alguém te mandou este link, peça
          um novo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-400"
        >
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
