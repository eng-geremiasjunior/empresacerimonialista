"use client";

// Botão de upload em lote da galeria de portfólio. Aceita vários arquivos
// de uma vez e mostra progresso por foto, porque comprimir + subir 8 fotos
// de celular leva alguns segundos e sem feedback parece travado.

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadFotos, type PortfolioFoto } from "@/lib/portfolio";

export function UploadFotosPortfolio({
  empresaId,
  proximaOrdem,
  onEnviadas,
}: {
  empresaId: string;
  proximaOrdem: number;
  onEnviadas: (fotos: PortfolioFoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [erros, setErros] = useState<string[]>([]);

  async function enviar(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const arquivos = Array.from(lista);
    setErros([]);
    setProgresso({ feitos: 0, total: arquivos.length });

    const res = await uploadFotos(empresaId, arquivos, proximaOrdem, (feitos, total) =>
      setProgresso({ feitos, total })
    );

    setProgresso(null);
    setErros(res.erros);
    if (res.fotos.length > 0) onEnviadas(res.fotos);
    if (inputRef.current) inputRef.current.value = "";
  }

  const enviando = progresso !== null;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => enviar(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-60"
      >
        {enviando ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Enviando {progresso.feitos} de {progresso.total}…
          </>
        ) : (
          <>
            <ImagePlus size={15} />
            Adicionar fotos
          </>
        )}
      </button>

      {erros.length > 0 && (
        <ul className="space-y-0.5 text-xs text-red-600">
          {erros.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
