"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, RefreshCw } from "lucide-react";
import { gerarNovoLinkFornecedor } from "@/app/(app)/solicitacoes/actions";

export function LinkDoFornecedor({
  supplierId,
  hashInicial,
  aberturas,
  baseUrl,
}: {
  supplierId: string;
  hashInicial: string | null;
  aberturas: number;
  baseUrl: string;
}) {
  const [hash, setHash] = useState(hashInicial);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const url = hash ? `${baseUrl}/fornecedor/${hash}` : null;

  function novo() {
    setErro(null);
    iniciar(async () => {
      const r = await gerarNovoLinkFornecedor(supplierId);
      if ("error" in r) setErro(r.error);
      else {
        setHash(r.hash);
        setCopiado(false);
      }
    });
  }

  async function copiar() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2_000);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Link2 size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">
          Link deste fornecedor
        </h2>
      </div>

      {url ? (
        <>
          <p className="mt-3 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
            {url}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {aberturas === 0
              ? "Ainda não foi aberto."
              : aberturas === 1
                ? "Aberto uma vez."
                : `Aberto ${aberturas} vezes.`}{" "}
            Vale para todos os eventos dele com você.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          Ainda não existe. Ele nasce sozinho na primeira mensagem que você
          mandar por aqui — ou você pode criar agora.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {url && (
          <button
            onClick={copiar}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Copy size={14} />
            {copiado ? "Copiado" : "Copiar"}
          </button>
        )}
        <button
          onClick={novo}
          disabled={pendente}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={14} />
          {pendente ? "Gerando…" : url ? "Gerar novo (o antigo para de valer)" : "Criar link"}
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
