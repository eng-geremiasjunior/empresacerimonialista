"use client";

// Um pedido de orçamento, na fila da equipe.
//
// Diz quem, o quê, quando e de onde veio — e oferece as três saídas que
// existem: responder com proposta (o formulário nasce preenchido),
// conversar no WhatsApp, ou encerrar. Tudo o que é tempo ("há 3 horas")
// chega pronto do servidor: calculado aqui, divergiria na hidratação.

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { encerrarPedido } from "@/app/(app)/orcamentos/pedidos/actions";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { whatsappFormatado, type PedidoStatus } from "@/lib/comercial/pedidos";

export type PedidoVisto = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  /** "Casamento · 21/10/2027 · Goiânia · 120 convidados" */
  resumo: string;
  /** "há 3 horas" */
  quando: string;
  /** "pela vitrine (Instagram)" */
  origem: string;
  repeticoes: number;
  clienteJaCadastrada: boolean;
  mensagem: string | null;
  status: PedidoStatus;
  orcamentoId: string | null;
  motivoEncerramento: string | null;
};

const botaoPrincipal =
  "rounded-lg bg-gray-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-700";
const botaoSecundario =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

export function PedidoCartao({ pedido, compacto = false }: { pedido: PedidoVisto; compacto?: boolean }) {
  const [encerrando, setEncerrando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [aberta, setAberta] = useState(false);

  const primeiroNome = pedido.nome.trim().split(/\s+/)[0] ?? "";
  const wa = linkWhatsapp(
    pedido.whatsapp,
    `Olá, ${primeiroNome}! Recebi o seu pedido de orçamento.`
  );

  function confirmarEncerramento() {
    setErro(null);
    iniciar(async () => {
      const r = await encerrarPedido(pedido.id, motivo || null);
      if ("error" in r) setErro(r.error);
      else setEncerrando(false);
    });
  }

  // No topo de Propostas: uma linha por pedido, só o que decide "respondo
  // agora?". Encerrar e ler a mensagem ficam na visão Pedidos.
  if (compacto) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-gray-900">{pedido.nome}</span>
            {" · "}
            {pedido.resumo}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {pedido.origem} · {pedido.quando}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/orcamentos/novo?pedido=${pedido.id}`}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Responder com proposta
          </Link>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Conversar com ${primeiroNome} no WhatsApp`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <MessageCircle size={15} aria-hidden />
            </a>
          )}
        </div>
      </li>
    );
  }

  const detalhes = [
    pedido.origem,
    pedido.clienteJaCadastrada ? "cliente já cadastrada" : null,
    pedido.repeticoes > 0
      ? `enviou de novo ${pedido.repeticoes === 1 ? "1 vez" : `${pedido.repeticoes} vezes`}`
      : null,
  ].filter(Boolean);

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[15px] font-semibold text-gray-900">{pedido.nome}</p>
        <p className="text-xs text-gray-500">{pedido.quando}</p>
      </div>
      <p className="mt-1 text-sm text-gray-700">{pedido.resumo}</p>
      <p className="mt-1 text-xs text-gray-500">{detalhes.join(" · ")}</p>

      <p className="mt-1 text-xs text-gray-500">
        {whatsappFormatado(pedido.whatsapp)}
        {pedido.email ? ` · ${pedido.email}` : ""}
      </p>

      {pedido.mensagem && (
        <div className="mt-3">
          <p
            className={`whitespace-pre-line text-sm leading-relaxed text-gray-700 ${
              aberta ? "" : "line-clamp-3"
            }`}
          >
            {pedido.mensagem}
          </p>
          {pedido.mensagem.length > 180 && (
            <button
              type="button"
              onClick={() => setAberta((v) => !v)}
              className="mt-1 text-xs text-gray-500 underline hover:text-gray-800"
            >
              {aberta ? "Mostrar menos" : "Ler tudo"}
            </button>
          )}
        </div>
      )}

      {pedido.status === "encerrado" && (
        <p className="mt-3 text-xs text-gray-500">
          Encerrado{pedido.motivoEncerramento ? `: ${pedido.motivoEncerramento}` : "."}
        </p>
      )}

      {encerrando ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            aria-label="Motivo do encerramento (opcional)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={200}
            placeholder="Motivo, se quiser (fechou com outra, data ocupada...)"
            className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmarEncerramento}
              disabled={pendente}
              className={botaoPrincipal}
            >
              {pendente ? "Encerrando…" : "Encerrar"}
            </button>
            <button
              type="button"
              onClick={() => setEncerrando(false)}
              disabled={pendente}
              className={botaoSecundario}
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {pedido.status === "em_proposta" && pedido.orcamentoId ? (
            <Link href={`/orcamentos/${pedido.orcamentoId}`} className={botaoPrincipal}>
              Ver a proposta
            </Link>
          ) : pedido.status === "novo" ? (
            <Link href={`/orcamentos/novo?pedido=${pedido.id}`} className={botaoPrincipal}>
              Responder com proposta
            </Link>
          ) : (
            <Link href={`/orcamentos/novo?pedido=${pedido.id}`} className={botaoSecundario}>
              Responder com proposta
            </Link>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={botaoSecundario}>
              <MessageCircle size={14} aria-hidden />
              WhatsApp
            </a>
          )}
          {pedido.status === "novo" && (
            <button
              type="button"
              onClick={() => setEncerrando(true)}
              className="px-2 py-2 text-sm text-gray-500 hover:text-gray-800"
            >
              Encerrar
            </button>
          )}
        </div>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {erro}
        </p>
      )}
    </li>
  );
}
