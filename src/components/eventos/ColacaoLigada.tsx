"use client";

// O elo entre baile e colação no hub da formatura.
//
// Três estados: este evento É a colação (mostra o caminho de volta ao
// baile); o baile já TEM colação ligada (mostra o atalho); a turma faz
// colação em outra data e o evento ainda não existe (o formulário curto
// cria — data, hora e local, nada além do essencial).

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { criarColacao } from "@/app/(app)/eventos/[id]/colacao-actions";
import { formatDate } from "@/lib/format";

const inputCls =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

export type ElosColacao =
  | { modo: "filho"; paiId: string; paiNome: string }
  | { modo: "tem"; filhoId: string; filhoData: string | null }
  | { modo: "oferecer" };

export function ColacaoLigada({
  eventId,
  elo,
}: {
  eventId: string;
  elo: ElosColacao;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({ date: "", time: "", location: "" });
  const [erro, setErro] = useState<string | null>(null);

  function criar() {
    if (!form.date) return;
    setErro(null);
    iniciar(async () => {
      const r = await criarColacao(eventId, form.date, form.time, form.location);
      if (r.error) {
        setErro(r.error);
        return;
      }
      if (r.id) router.push(`/eventos/${r.id}`);
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <GraduationCap size={15} className="text-indigo-500" />
        Colação de grau
      </h3>

      {elo.modo === "filho" && (
        <p className="mt-2 text-sm text-gray-600">
          Este evento é a colação de{" "}
          <Link
            href={`/eventos/${elo.paiId}`}
            className="font-medium text-indigo-600 hover:underline"
          >
            {elo.paiNome}
          </Link>
          .
        </p>
      )}

      {elo.modo === "tem" && (
        <p className="mt-2 text-sm text-gray-600">
          <Link
            href={`/eventos/${elo.filhoId}`}
            className="font-medium text-indigo-600 hover:underline"
          >
            Abrir o evento da colação
          </Link>
          {elo.filhoData ? ` — ${formatDate(elo.filhoData)}` : ""}
        </p>
      )}

      {elo.modo === "oferecer" && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
              aria-label="Data da colação"
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className={inputCls}
              aria-label="Hora da colação"
            />
          </div>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Local"
            className={inputCls}
          />
          {erro && <p className="text-sm text-rose-600">{erro}</p>}
          <button
            onClick={criar}
            disabled={pendente || !form.date}
            className="w-full rounded-[9px] bg-[#17162A] px-3.5 py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Criar o evento da colação
          </button>
        </div>
      )}
    </section>
  );
}
