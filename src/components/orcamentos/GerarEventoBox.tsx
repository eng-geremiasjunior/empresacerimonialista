"use client";

// Painel da cerimonialista para gerar o evento a partir de um orçamento
// APROVADO que ainda não virou evento. Cobre o caso "sem data" (Etapa 6,
// item 6): a ficha do cliente já foi salva; aqui só falta a data.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { gerarEventoDoOrcamentoManual } from "@/lib/orcamento-para-evento";

export function GerarEventoBox({
  orcamentoId,
  dataEvento,
}: {
  orcamentoId: string;
  dataEvento: string | null;
}) {
  const router = useRouter();
  const [data, setData] = useState(dataEvento ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function gerar() {
    setErro(null);
    if (!data) {
      setErro("Informe a data do evento para gerá-lo.");
      return;
    }
    startTransition(async () => {
      const res = await gerarEventoDoOrcamentoManual(orcamentoId, data);
      if ("success" in res) {
        router.push(`/eventos/${res.eventoId}`);
      } else if ("semData" in res) {
        setErro("Informe a data do evento para gerá-lo.");
      } else {
        setErro(res.error);
      }
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <CalendarPlus size={17} /> Orçamento aprovado — gerar o evento
      </h2>
      <p className="mt-1 text-sm text-amber-800">
        O cliente aprovou e enviou os dados.{" "}
        {dataEvento
          ? "Confira a data e gere o evento."
          : "Faltou definir a data do evento — informe-a para criar o evento."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <button
          onClick={gerar}
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? "Gerando…" : "Gerar evento"}
        </button>
      </div>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
