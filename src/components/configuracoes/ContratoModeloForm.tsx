"use client";

// O contrato de prestação dela, em PDF (163). Em Configurações vale para a
// empresa inteira; no Catálogo, só para aquele tipo de evento. A proposta
// mostra o contrato antes do aceite, e no aceite ele vira documento da
// cliente junto com o termo assinado.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Upload } from "lucide-react";
import { enviarArquivo } from "@/lib/contratos-cliente";
import {
  abrirModeloContrato,
  confirmarModeloContrato,
  pedirEnvioModeloContrato,
  removerModeloContrato,
} from "@/lib/modelo-contrato";

const LIMITE = 10 * 1024 * 1024;

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function ContratoModeloForm({
  tipo,
  inicial,
  padraoNome,
}: {
  /** null = o padrão da empresa; um tipo = a exceção dele */
  tipo: string | null;
  inicial: { nome: string; em: string | null } | null;
  /** Só no Catálogo: o nome do padrão da empresa, que vale quando o tipo não tem o seu. */
  padraoNome?: string | null;
}) {
  const router = useRouter();
  const [atual, setAtual] = useState(inicial);
  const [ocupado, setOcupado] = useState<null | "enviando" | "removendo">(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function enviar(arquivo: File | undefined) {
    setErro(null);
    if (!arquivo) return;
    if (arquivo.type !== "application/pdf" && !/\.pdf$/i.test(arquivo.name)) {
      setErro("Envie o contrato em PDF.");
      return;
    }
    if (arquivo.size > LIMITE) {
      setErro("O arquivo passa de 10 MB.");
      return;
    }

    setOcupado("enviando");
    try {
      const pedido = await pedirEnvioModeloContrato(tipo, arquivo.name, arquivo.type, arquivo.size);
      if ("error" in pedido) return setErro(pedido.error);

      const envio = await enviarArquivo(pedido.permissao, arquivo);
      if (!envio.ok) return setErro(envio.erro);

      const r = await confirmarModeloContrato(tipo, pedido.permissao.caminho, arquivo.name);
      if ("error" in r) return setErro(r.error);

      setAtual({ nome: r.nome, em: r.em });
      router.refresh();
    } finally {
      setOcupado(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remover() {
    const aviso = tipo
      ? "Tirar o contrato deste tipo? As próximas propostas passam a usar o padrão da empresa."
      : "Tirar o contrato da empresa? As próximas propostas saem sem contrato. Os aceites já feitos guardam a cópia deles.";
    if (!confirm(aviso)) return;
    setErro(null);
    setOcupado("removendo");
    const r = await removerModeloContrato(tipo);
    setOcupado(null);
    if ("error" in r) return setErro(r.error);
    setAtual(null);
    router.refresh();
  }

  async function abrir() {
    setErro(null);
    // a janela abre no clique; a URL assinada chega depois
    const janela = window.open("", "_blank");
    const r = await abrirModeloContrato(tipo);
    if ("error" in r) {
      janela?.close();
      setErro(r.error);
      return;
    }
    if (janela) janela.location.href = r.url;
    else window.location.href = r.url;
  }

  return (
    <div className="space-y-3">
      {atual ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            onClick={abrir}
            className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-gray-900 hover:underline"
          >
            <FileText size={16} className="shrink-0 text-gray-400" />
            <span className="truncate">{atual.nome}</span>
          </button>
          {atual.em && (
            <span className="text-xs text-gray-400">enviado em {dataCurta(atual.em)}</span>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {tipo
            ? padraoNome
              ? `Vale o contrato da empresa: ${padraoNome}.`
              : "Sem contrato. A proposta sai sem contrato anexo."
            : "Sem contrato. A proposta sai sem contrato anexo."}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => enviar(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={ocupado !== null}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
        >
          <Upload size={15} />
          {ocupado === "enviando"
            ? "Enviando…"
            : atual
              ? "Trocar PDF"
              : tipo
                ? "Usar um contrato só para este tipo"
                : "Enviar contrato em PDF"}
        </button>
        {atual && (
          <button
            type="button"
            onClick={remover}
            disabled={ocupado !== null}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} /> {ocupado === "removendo" ? "Removendo…" : "Remover"}
          </button>
        )}
      </div>
      {erro && <p className="text-sm text-rose-600">{erro}</p>}
    </div>
  );
}
