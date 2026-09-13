"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retomarGuia } from "@/app/(app)/actions";

/**
 * O caminho de volta do guia do primeiro acesso (160).
 *
 * Existe por causa da HostGator: lá o tutorial nunca vai embora e não há
 * como dizer que você não quer. Aqui é o contrário — pular é definitivo,
 * e o guia só volta se ela vier buscar. Esta seção é esse lugar, e é o
 * único.
 *
 * Quando o guia está em curso, nada aparece aqui: o cartão dele está na
 * tela, com o "Pular por agora" à vista.
 */
export function GuiaSection({
  dispensado,
  concluido,
}: {
  dispensado: boolean;
  concluido: boolean;
}) {
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState(false);
  const [indo, comecar] = useTransition();
  const router = useRouter();

  if (!dispensado && !concluido) return null;
  if (feito) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white px-6 py-5">
      <h2 className="text-sm font-semibold text-gray-900">
        Guia de primeiro acesso
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        {concluido
          ? "Você já percorreu o guia. Dá para fazer de novo, se quiser rever o caminho."
          : "Você pulou o guia. Ele não volta sozinho — mas volta por aqui."}
      </p>
      <button
        type="button"
        disabled={indo}
        onClick={() => {
          setErro(false);
          comecar(async () => {
            const r = await retomarGuia();
            if (!r.ok) {
              setErro(true);
              return;
            }
            setFeito(true);
            router.refresh();
          });
        }}
        className="mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Retomar o guia
      </button>
      {erro && (
        <p className="mt-2 text-xs text-red-600">
          Não deu para retomar agora. Tente de novo.
        </p>
      )}
    </section>
  );
}
