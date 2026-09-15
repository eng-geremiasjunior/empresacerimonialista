"use client";

// Envio do orçamento ao cliente: muda status para 'enviado' e mostra o
// link público para copiar (mesmo padrão de UX do Roteiro). Quando o
// contato tem telefone, também o botão que abre o WhatsApp com a mensagem
// e o link já escritos — é por ali que a maioria das propostas vai.

import { useEffect, useState, useTransition } from "react";
import { MessageCircle, Send } from "lucide-react";
import { enviarOrcamento } from "@/app/(app)/orcamentos/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { linkWhatsapp, textoPropostaWhatsapp } from "@/lib/whatsapp-link";

// O retorno da action pode trazer o contato (contato_telefone,
// contato_nome, tipo_evento). Lido pelo nome do campo, sem depender do
// tipo declarado lá: enquanto o campo não existir, o botão do WhatsApp só
// não aparece — nada quebra.
function campoTexto(obj: object, chave: string): string | null {
  const v = (obj as Record<string, unknown>)[chave];
  return typeof v === "string" && v.trim() ? v : null;
}

export function EnviarOrcamentoBox({
  orcamentoId,
  hashPublico,
  status,
  temEmail,
  contatoTelefone = null,
  contatoNome = null,
  tipoEvento = null,
}: {
  orcamentoId: string;
  hashPublico: string;
  status: string;
  temEmail: boolean;
  /** telefone do contato — com ele, o botão "Enviar por WhatsApp" */
  contatoTelefone?: string | null;
  contatoNome?: string | null;
  /** código do tipo (casamento, debutante…) para a frase da mensagem */
  tipoEvento?: string | null;
}) {
  const [enviado, setEnviado] = useState(status !== "rascunho");
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [contato, setContato] = useState({
    telefone: contatoTelefone,
    nome: contatoNome,
    tipo: tipoEvento,
  });

  // A mensagem leva o endereço completo da proposta — dentro do WhatsApp
  // um caminho relativo não abre nada. O domínio vem do navegador depois
  // de montar (no servidor não há window), o mesmo que "Copiar link"
  // entrega.
  const [origem, setOrigem] = useState("");
  useEffect(() => {
    setOrigem(window.location.origin);
  }, []);

  const path = `/orcamento/${hashPublico}`;
  const tipoLabel =
    contato.tipo && contato.tipo !== "outro"
      ? (EVENT_TYPE_LABELS[contato.tipo as EventType] ?? null)
      : null;
  const whatsapp = origem
    ? linkWhatsapp(
        contato.telefone,
        textoPropostaWhatsapp(contato.nome, tipoLabel, `${origem}${path}`)
      )
    : null;

  function enviar() {
    setErro(null);
    startTransition(async () => {
      const res = await enviarOrcamento(orcamentoId);
      if ("error" in res) {
        setErro(res.error);
        return;
      }
      setEnviado(true);
      setContato((c) => ({
        telefone: campoTexto(res, "contato_telefone") ?? c.telefone,
        nome: campoTexto(res, "contato_nome") ?? c.nome,
        tipo: campoTexto(res, "tipo_evento") ?? c.tipo,
      }));
      if (res.emailEnviado) setEmailInfo("E-mail enviado para o cliente.");
      else if (res.emailErro)
        setEmailInfo(`Link pronto para copiar. O e-mail não saiu: ${res.emailErro}`);
      else if (!temEmail)
        setEmailInfo("Sem e-mail no contato — envie o link você mesma.");
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {path}
        </code>
        <CopyLinkButton path={path} />
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            <MessageCircle size={14} /> Enviar por WhatsApp
          </a>
        )}
      </div>
      {emailInfo && <p className="mt-2 text-xs text-gray-500">{emailInfo}</p>}
    </div>
  );
}
