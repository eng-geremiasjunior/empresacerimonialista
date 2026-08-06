"use client";

import { useState, useTransition } from "react";
import { Mail, MessageCircle } from "lucide-react";
import {
  salvarDiasAntecedencia,
  salvarWhatsappAuto,
} from "@/app/(app)/eventos/[id]/fornecedores/actions";

export function ConfigAntecedencia({
  eventId,
  diasAtual,
  whatsappAtivo = true,
}: {
  eventId: string;
  diasAtual: number;
  whatsappAtivo?: boolean;
}) {
  const [dias, setDias] = useState(diasAtual);
  const [zap, setZap] = useState(whatsappAtivo);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function alternarZap() {
    const novo = !zap;
    setZap(novo);
    setErro(null);
    startTransition(async () => {
      const r = await salvarWhatsappAuto(eventId, novo);
      if (r.error) {
        setZap(!novo);
        setErro(r.error);
      } else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    });
  }

  function salvar(valor: number) {
    setDias(valor);
    setSalvo(false);
    setErro(null);
    startTransition(async () => {
      const r = await salvarDiasAntecedencia(eventId, valor);
      if (r.error) setErro(r.error);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 2000);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
      <span>Enviar confirmação automática</span>
      <select
        value={dias}
        onChange={(e) => salvar(Number(e.target.value))}
        disabled={pending}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-800 focus:border-gray-500 focus:outline-none disabled:opacity-60"
      >
        {Array.from(new Set([3, 5, 7, 10, 14, 21, 30, dias]))
          .sort((a, b) => a - b)
          .map((n) => (
          <option key={n} value={n}>
            {n} dias
          </option>
        ))}
      </select>
      <span>antes do evento</span>

      {/* Canais do disparo automático — antes ficavam invisíveis: o
          WhatsApp já era enviado junto do e-mail sem aparecer na tela. */}
      <span className="mx-1 h-4 w-px bg-gray-200" />
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Mail size={13} className="text-gray-400" />
        E-mail
      </span>
      <button
        type="button"
        onClick={alternarZap}
        disabled={pending}
        aria-pressed={zap}
        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
          zap
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
        }`}
      >
        <MessageCircle size={13} />
        WhatsApp {zap ? "ligado" : "desligado"}
      </button>

      {salvo && <span className="text-xs font-medium text-emerald-600">Salvo</span>}
      {erro && <span className="text-xs font-medium text-red-600">{erro}</span>}
    </div>
  );
}
