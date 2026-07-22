"use client";

// Configurações > Conteúdo da Proposta > imagens de fundo da landing.
// Um componente por slot (hero / no dia do evento): preview, troca e
// "Restaurar padrão" — este último só aparece quando há customização,
// porque restaurar o que já é padrão não faz nada.

import { useRef, useState } from "react";
import { RotateCcw, Upload } from "lucide-react";
import {
  IMAGEM_PADRAO,
  restaurarImagemPadrao,
  uploadImagemLanding,
  validarImagem,
  type SlotImagem,
} from "@/lib/landing-imagens";

export function LandingImagemForm({
  empresaId,
  slot,
  urlInicial,
  dica,
}: {
  empresaId: string;
  slot: SlotImagem;
  urlInicial: string | null;
  dica: string;
}) {
  const [url, setUrl] = useState(urlInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const customizada = Boolean(url);
  const exibida = url ?? IMAGEM_PADRAO[slot];

  async function enviar(file: File | undefined) {
    setErro(null);
    if (!file) return;
    const invalido = validarImagem(file);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setOcupado(true);
    const res = await uploadImagemLanding(empresaId, slot, file);
    setOcupado(false);
    if (inputRef.current) inputRef.current.value = "";
    if (res.error) {
      setErro(res.error);
      return;
    }
    setUrl(res.url ?? null);
  }

  async function restaurar() {
    if (!confirm("Voltar para a imagem padrão do sistema?")) return;
    setOcupado(true);
    const res = await restaurarImagemPadrao(empresaId, slot);
    setOcupado(false);
    if (res.error) {
      setErro(res.error);
      return;
    }
    setUrl(null);
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div
        className="h-28 w-48 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${exibida})` }}
        role="img"
        aria-label="Prévia da imagem da proposta"
      />

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => enviar(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
          >
            <Upload size={15} />
            {ocupado ? "Enviando…" : "Alterar imagem"}
          </button>
          {customizada && (
            <button
              onClick={restaurar}
              disabled={ocupado}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <RotateCcw size={14} /> Restaurar padrão
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {customizada ? "Usando sua imagem. " : "Usando a imagem padrão do sistema. "}
          {dica}
        </p>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
