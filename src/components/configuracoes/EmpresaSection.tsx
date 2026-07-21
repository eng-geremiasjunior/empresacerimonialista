"use client";

// Configurações > Minha Empresa: upload da logo (só proprietária).
// Preview antes de confirmar; a logo vale para todos os orçamentos.

import { useRef, useState } from "react";
import { Building2, Trash2, Upload } from "lucide-react";
import {
  removeEmpresaLogo,
  uploadEmpresaLogo,
  validateLogoFile,
} from "@/lib/empresa-logo";

export function EmpresaSection({
  empresaId,
  empresaNome,
  initialLogoUrl,
}: {
  empresaId: string;
  empresaNome: string;
  initialLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(
    null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function escolherArquivo(file: File | undefined) {
    setErro(null);
    if (!file) return;
    const invalido = validateLogoFile(file);
    if (invalido) {
      setErro(invalido);
      return;
    }
    setPreview({ url: URL.createObjectURL(file), file });
  }

  async function confirmarUpload() {
    if (!preview) return;
    setSalvando(true);
    setErro(null);
    const res = await uploadEmpresaLogo(empresaId, preview.file);
    setSalvando(false);
    if (res.error) {
      setErro(res.error);
      return;
    }
    setLogoUrl(res.url ?? null);
    URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function remover() {
    if (!confirm("Remover a logo da empresa?")) return;
    setSalvando(true);
    const res = await removeEmpresaLogo(empresaId);
    setSalvando(false);
    if (res.error) {
      setErro(res.error);
      return;
    }
    setLogoUrl(null);
  }

  const exibida = preview?.url ?? logoUrl;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Building2 size={18} className="text-gray-400" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Minha Empresa</h2>
          <p className="text-xs text-gray-500">
            A logo aparece em todos os orçamentos em PDF — passados e futuros.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        {/* Preview */}
        <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
          {exibida ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={exibida}
              alt={`Logo de ${empresaNome}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="px-3 text-center text-xs text-gray-400">
              Nenhuma logo enviada — o nome “{empresaNome}” será usado no PDF
            </span>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => escolherArquivo(e.target.files?.[0])}
          />
          {preview ? (
            <div className="flex items-center gap-2">
              <button
                onClick={confirmarUpload}
                disabled={salvando}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {salvando ? "Enviando…" : "Confirmar logo"}
              </button>
              <button
                onClick={() => {
                  URL.revokeObjectURL(preview.url);
                  setPreview(null);
                }}
                className="rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={salvando}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
              >
                <Upload size={15} />
                {logoUrl ? "Alterar logo" : "Enviar logo"}
              </button>
              {logoUrl && (
                <button
                  onClick={remover}
                  disabled={salvando}
                  className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remover
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400">
            PNG com fundo transparente fica melhor · máx. 2 MB
          </p>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
        </div>
      </div>
    </section>
  );
}
