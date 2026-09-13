"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirExplicacoes } from "@/app/(app)/actions";

/**
 * O religador das fichas do menu (159).
 *
 * A ficha do `?` desliga a si mesma — e é justamente por isso que o
 * caminho de volta precisa existir num lugar fixo: depois de desligar,
 * não há mais `?` nenhum para clicar. Sem esta seção, a escolha seria de
 * mão única.
 */
export function ExplicacoesSection({ ligadas }: { ligadas: boolean }) {
  const [ativo, setAtivo] = useState(ligadas);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();
  const router = useRouter();

  function alternar(valor: boolean) {
    setAtivo(valor);
    setErro(null);
    comecar(async () => {
      const r = await definirExplicacoes(valor);
      // O `revalidatePath` do servidor não bastou: medi e o "?" da barra
      // continuou lá até eu recarregar a página à mão. O menu mora no
      // layout, e só um refresh do roteador o traz de novo com o valor
      // novo — sem isto a pessoa desmarca aqui e o menu não obedece.
      if (r.ok) router.refresh();
      if (!r.ok) {
        // Devolve o interruptor ao que o banco tem. Deixar ligado na tela
        // e desligado no banco é pior que não ter salvado: a pessoa
        // recarrega e a escolha dela evaporou sem aviso.
        setAtivo(r.ativo);
        setErro("Não deu para salvar agora. Tente de novo.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-900">
        Explicações do menu
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        O “?” ao lado de cada item do menu, com o que ele é, para que serve e
        como usar. Vale só para você — cada pessoa da equipe tem a sua.
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={ativo}
          disabled={salvando}
          onChange={(e) => alternar(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-900 accent-gray-900 disabled:opacity-40"
        />
        <span className="text-sm text-gray-700">
          Mostrar as explicações
          <span className="mt-0.5 block text-xs text-gray-400">
            Desligado, o menu fica só com os nomes.
          </span>
        </span>
      </label>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </section>
  );
}
