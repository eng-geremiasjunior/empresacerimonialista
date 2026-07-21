"use client";

// Envio do orçamento ao cliente: muda status para 'enviado' e mostra o
// link público para copiar (mesmo padrão de UX do Roteiro).

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { enviarOrcamento } from "@/app/(app)/orcamentos/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export function EnviarOrcamentoBox({
  orcamentoId,
  hashPublico,
  status,
  temEmail,
}: {
  orcamentoId: string;
  hashPublico: string;
  status: string;
  temEmail: boolean;
}) {
  const [enviado, setEnviado] = useState(status !== "rascunho");
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const path = `/orcamento/${hashPublico}`;

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const res = await enviarOrcamento(orcamentoId);
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      setEnviado(true);
      if (res.emailEnviado) setEmailInfo("E-mail enviado para o cliente.");
      else if (res.emailErro)
        setEmailInfo(`Link pronto para copiar. O e-mail não saiu: ${res.emailErro}`);
      else if (!temEmail)
        setEmailInfo("Sem e-mail no contato — copie o link e envie você mesma.");
    });
  }

  if (!enviado) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">
          Enviar para o cliente
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Ao enviar, o orçamento sai de rascunho e o cliente pode aprovar ou
          recusar pelo link.
          {temEmail ? " Também mandamos um e-mail com o link." : ""}
        </p>
        <button
          onClick={enviar}
          disabled={pending}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
        >
          <Send size={15} /> {pending ? "Enviando…" : "Enviar para o cliente"}
        </button>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-900">
        Link do cliente
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Envie este link para o cliente ver a proposta e responder — sem
        precisar de login.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {path}
        </code>
        <CopyLinkButton path={path} />
      </div>
      {emailInfo && <p className="mt-2 text-xs text-gray-500">{emailInfo}</p>}
    </div>
  );
}
