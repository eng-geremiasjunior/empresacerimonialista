"use client";

import { useState, useTransition } from "react";
import { Check, Mail, Pencil, Send } from "lucide-react";
import {
  salvarEmailFornecedor,
  enviarConfirmacaoAgora,
  setSupplierConfirmed,
} from "@/app/(app)/eventos/[id]/fornecedores/actions";
import { formatDate } from "@/lib/format";

export type ConfirmacaoInfo = {
  status: "pendente" | "confirmado" | "recusado";
  sent_at: string | null;
  responded_at: string | null;
} | null;

type Props = {
  eventId: string;
  supplierId: string;
  name: string;
  category: string | null;
  email: string | null;
  confirmed: boolean;
  confirmacao: ConfirmacaoInfo;
  emailDisponivel: boolean; // false enquanto a migração 019 não rodou
};

function badge(confirmacao: ConfirmacaoInfo) {
  if (confirmacao?.status === "confirmado") {
    return { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700" };
  }
  if (confirmacao?.status === "recusado") {
    return { label: "Recusado", cls: "bg-red-50 text-red-700" };
  }
  if (confirmacao?.sent_at) {
    return { label: "Aguardando resposta", cls: "bg-amber-50 text-amber-700" };
  }
  return { label: "Convite não enviado", cls: "bg-gray-100 text-gray-600" };
}

export function FornecedorRow({
  eventId,
  supplierId,
  name,
  category,
  email,
  confirmed,
  confirmacao,
  emailDisponivel,
}: Props) {
  const [editando, setEditando] = useState(false);
  const [emailLocal, setEmailLocal] = useState(email ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const b = badge(confirmacao);
  const respondido =
    confirmacao?.status === "confirmado" || confirmacao?.status === "recusado";

  function salvarEmail() {
    setErro(null);
    startTransition(async () => {
      const r = await salvarEmailFornecedor(eventId, supplierId, emailLocal);
      if (r.error) setErro(r.error);
      else setEditando(false);
    });
  }

  function enviar() {
    setErro(null);
    setFeedback(null);
    startTransition(async () => {
      const r = await enviarConfirmacaoAgora(eventId, supplierId);
      if (r.error) setErro(r.error);
      else setFeedback("Convite enviado!");
    });
  }

  function toggleConfirmado() {
    startTransition(async () => {
      await setSupplierConfirmed(eventId, supplierId, !confirmed);
    });
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{name}</p>
          {category && <p className="text-sm text-gray-500">{category}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {emailDisponivel && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}
            >
              {b.label}
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              confirmed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {confirmed ? "Confirmado no evento" : "Pendente"}
          </span>
          <button
            onClick={toggleConfirmado}
            disabled={pending}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-60"
          >
            {confirmed ? "Desmarcar" : "Confirmar"}
          </button>
        </div>
      </div>

      {emailDisponivel && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          {editando ? (
            <>
              <input
                type="email"
                value={emailLocal}
                onChange={(e) => setEmailLocal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && salvarEmail()}
                placeholder="email@fornecedor.com"
                autoFocus
                className="w-56 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
              />
              <button
                onClick={salvarEmail}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <Check size={14} />
                Salvar
              </button>
              <button
                onClick={() => {
                  setEditando(false);
                  setEmailLocal(email ?? "");
                  setErro(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-sm text-gray-600">
                <Mail size={14} className="text-gray-400" />
                {email ?? "Sem e-mail cadastrado"}
              </span>
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                <Pencil size={13} />
                {email ? "Editar" : "Adicionar e-mail"}
              </button>
              {email && !respondido && (
                <button
                  onClick={enviar}
                  disabled={pending}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-60"
                >
                  <Send size={14} />
                  {pending
                    ? "Enviando…"
                    : confirmacao?.sent_at
                      ? "Reenviar confirmação"
                      : "Enviar confirmação agora"}
                </button>
              )}
            </>
          )}
          {confirmacao?.sent_at && !respondido && !editando && (
            <span className="w-full text-xs text-gray-400">
              Convite enviado em {formatDate(confirmacao.sent_at)}
            </span>
          )}
          {feedback && (
            <span className="w-full text-xs font-medium text-emerald-600">
              {feedback}
            </span>
          )}
          {erro && (
            <span className="w-full text-xs font-medium text-red-600">
              {erro}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
