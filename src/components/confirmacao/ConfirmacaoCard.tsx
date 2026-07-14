"use client";

import { useState } from "react";
import { Calendar, Check, Clock, MapPin, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatTime } from "@/lib/format";
import type { ConfirmacaoData } from "@/app/confirmacao/[hash]/page";

export function ConfirmacaoCard({
  hash,
  initial,
}: {
  hash: string;
  initial: ConfirmacaoData;
}) {
  const [status, setStatus] = useState(initial.status);
  const [enviando, setEnviando] = useState<"confirmado" | "recusado" | null>(
    null
  );
  const [erro, setErro] = useState<string | null>(null);

  async function responder(resposta: "confirmado" | "recusado") {
    setEnviando(resposta);
    setErro(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("responder_confirmacao", {
      p_hash: hash,
      p_status: resposta,
    });
    setEnviando(null);
    if (error || (data as { error?: string })?.error) {
      setErro("Não foi possível registrar sua resposta. Tente novamente.");
      return;
    }
    setStatus(resposta);
  }

  const respondido = status !== "pendente";

  return (
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Vela — confirmação de presença
      </p>
      <h1 className="mt-3 text-lg font-semibold text-gray-900">
        Olá, {initial.supplier_name}!
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Você está escalado(a) para o evento abaixo. Por favor, confirme sua
        presença.
      </p>

      <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-900">
          {initial.event_label}
        </p>
        <div className="mt-3 space-y-1.5 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            {formatDate(initial.event_date)}
          </p>
          <p className="flex items-center gap-2">
            <Clock size={15} className="text-gray-400" />
            {formatTime(initial.event_time)}
          </p>
          {initial.event_location && (
            <p className="flex items-center gap-2">
              <MapPin size={15} className="text-gray-400" />
              {initial.event_location}
            </p>
          )}
        </div>
      </div>

      {respondido ? (
        <>
          <div
            className={`mt-5 flex items-center gap-2.5 rounded-lg border p-4 text-sm font-medium ${
              status === "confirmado"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {status === "confirmado" ? <Check size={17} /> : <X size={17} />}
            {status === "confirmado"
              ? "Presença confirmada. Obrigado!"
              : "Resposta registrada: você não poderá comparecer."}
          </div>
          <button
            onClick={() =>
              responder(status === "confirmado" ? "recusado" : "confirmado")
            }
            disabled={enviando !== null}
            className="mt-3 w-full text-center text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700 disabled:opacity-60"
          >
            {enviando
              ? "Enviando…"
              : status === "confirmado"
                ? "Mudou de planos? Marcar que não poderei comparecer"
                : "Mudou de planos? Confirmar presença"}
          </button>
        </>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => responder("confirmado")}
            disabled={enviando !== null}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Check size={16} />
            {enviando === "confirmado" ? "Enviando…" : "Confirmar presença"}
          </button>
          <button
            onClick={() => responder("recusado")}
            disabled={enviando !== null}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <X size={16} />
            {enviando === "recusado" ? "Enviando…" : "Não poderei"}
          </button>
        </div>
      )}

      {!respondido && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Se algo mudar, você pode responder novamente por este mesmo link.
        </p>
      )}

      {erro && <p className="mt-3 text-center text-sm text-red-600">{erro}</p>}
    </div>
  );
}
