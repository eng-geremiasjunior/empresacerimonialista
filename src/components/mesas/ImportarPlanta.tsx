"use client";

// Importar a planta baixa do local e calibrar a escala.
//
// Salão de festa raramente é retângulo. Quando o espaço tem a planta,
// ela vira o fundo do croqui e as mesas passam a ser posicionadas
// contra as paredes de verdade.
//
// Calibração de dois pontos: ela clica nas duas pontas de algo que
// conhece (a frente do palco, uma parede) e diz quantos metros são.
// Daí sai a escala inteira. É como toda ferramenta de planta faz,
// porque arquivo de CAD não traz a unidade de forma confiável.
//
// PDF é rasterizado AQUI, no navegador: sobe só o PNG resultante. O
// servidor não ganha leitor de PDF e o arquivo original nem viaja.
//
// SVG entra como <image href>, jamais inline: o arquivo veio de
// terceiro e SVG aceita <script>. Imagem referenciada não executa
// script nem busca recurso externo.

import { useEffect, useRef, useState } from "react";
import { Crosshair, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ponto = { x: number; y: number };

const TIPOS_ACEITOS = ".svg,.png,.jpg,.jpeg,.webp,.pdf";
const LIMITE_BYTES = 15 * 1024 * 1024;

/** Rasteriza a primeira página do PDF em PNG, no navegador.
 *  O import é dinâmico para o leitor de PDF (1 MB) não entrar no bundle
 *  de quem nunca importa planta. */
async function pdfParaPng(file: File): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pagina = await doc.getPage(1);
  // 2x para a planta continuar legível quando ela der zoom no croqui
  const viewport = pagina.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pagina.render({ canvas, canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("png");
  return blob;
}

export function ImportarPlanta({
  eventId,
  temPlanta,
  pendente,
  aoSalvar,
  aoRemover,
  aoFechar,
}: {
  eventId: string;
  temPlanta: boolean;
  pendente: boolean;
  aoSalvar: (input: {
    path: string;
    tipo: "svg" | "imagem";
    larguraCm: number;
    alturaCm: number;
  }) => void;
  aoRemover: () => void;
  aoFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{
    url: string;
    blob: Blob;
    ehSvg: boolean;
    largura: number;
    altura: number;
  } | null>(null);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [medida, setMedida] = useState("");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    return () => {
      if (previa) URL.revokeObjectURL(previa.url);
    };
  }, [previa]);

  async function escolherArquivo(file: File) {
    setErro(null);
    if (file.size > LIMITE_BYTES) {
      setErro("O arquivo passa de 15 MB. Exporte em resolução menor.");
      return;
    }
    try {
      setOcupado(file.type === "application/pdf" ? "Lendo o PDF…" : "Abrindo…");
      const ehPdf = file.type === "application/pdf";
      const blob = ehPdf ? await pdfParaPng(file) : file;
      const ehSvg = blob.type === "image/svg+xml";
      const url = URL.createObjectURL(blob);

      const dims = await new Promise<{ largura: number; altura: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({
            largura: img.naturalWidth || 1000,
            altura: img.naturalHeight || 1000,
          });
        img.onerror = () => reject(new Error("imagem"));
        img.src = url;
      });

      setPrevia({ url, blob, ehSvg, ...dims });
      setPontos([]);
      setMedida("");
    } catch {
      setErro("Não foi possível ler este arquivo. Tente PNG, SVG ou outro PDF.");
    } finally {
      setOcupado(null);
    }
  }

  function marcarPonto(e: React.MouseEvent<HTMLImageElement>) {
    if (!previa) return;
    const r = e.currentTarget.getBoundingClientRect();
    // guarda em coordenada NATURAL do arquivo: independe do zoom da tela
    const p = {
      x: ((e.clientX - r.left) / r.width) * previa.largura,
      y: ((e.clientY - r.top) / r.height) * previa.altura,
    };
    setPontos(pontos.length >= 2 ? [p] : [...pontos, p]);
  }

  async function salvar() {
    if (!previa || pontos.length < 2) return;
    const metros = Number(medida.replace(",", "."));
    if (!Number.isFinite(metros) || metros <= 0) {
      setErro("Diga quantos metros tem a distância que você marcou.");
      return;
    }
    const pixels = Math.hypot(pontos[1].x - pontos[0].x, pontos[1].y - pontos[0].y);
    if (pixels < 5) {
      setErro("Os dois pontos ficaram muito perto. Marque uma distância maior.");
      return;
    }
    const cmPorPixel = (metros * 100) / pixels;
    const larguraCm = Math.round(previa.largura * cmPorPixel);
    const alturaCm = Math.round(previa.altura * cmPorPixel);
    if (larguraCm < 100 || larguraCm > 50000) {
      setErro("A escala não fechou. Confira a medida que você digitou.");
      return;
    }

    setErro(null);
    setOcupado("Enviando…");
    const supabase = createClient();
    const ext = previa.ehSvg ? "svg" : "png";
    const path = `${eventId}/planta-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("plantas")
      .upload(path, previa.blob, {
        contentType: previa.ehSvg ? "image/svg+xml" : "image/png",
        upsert: true,
      });
    setOcupado(null);
    if (error) {
      setErro("Não foi possível enviar a planta.");
      return;
    }
    aoSalvar({
      path,
      tipo: previa.ehSvg ? "svg" : "imagem",
      larguraCm,
      alturaCm,
    });
  }

  const prontoParaSalvar = previa && pontos.length === 2 && medida.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        role="dialog"
        aria-label="Planta do local"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-base font-semibold text-gray-900">Planta do local</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!previa ? (
            <>
              <p className="text-sm text-gray-500">
                Se o espaço te mandou a planta, ela vira o fundo do croqui — e
                aí as mesas ficam posicionadas contra as paredes de verdade,
                não contra um retângulo inventado.
              </p>
              <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center hover:border-gray-400">
                <Upload size={22} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Escolher arquivo
                </span>
                <span className="text-xs text-gray-400">
                  PDF, SVG, PNG ou JPG · até 15 MB
                </span>
                <input
                  type="file"
                  accept={TIPOS_ACEITOS}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) escolherArquivo(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {temPlanta && (
                <button
                  type="button"
                  onClick={aoRemover}
                  disabled={pendente}
                  className="mt-3 text-sm text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Remover a planta que está no croqui
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                <Crosshair size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {pontos.length === 0 &&
                    "Clique nas duas pontas de algo que você sabe medir — a frente do palco, uma parede inteira."}
                  {pontos.length === 1 && "Agora clique na outra ponta."}
                  {pontos.length === 2 &&
                    "Quantos metros tem essa distância? É ela que dá a escala de tudo."}
                </p>
              </div>

              <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200 bg-[repeating-conic-gradient(#f5f5f4_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={previa.url}
                  alt="Planta do local"
                  onClick={marcarPonto}
                  className="mx-auto block max-h-[46vh] w-auto cursor-crosshair"
                />
                {/* as marcas ficam num SVG por cima, no mesmo referencial natural */}
                <svg
                  viewBox={`0 0 ${previa.largura} ${previa.altura}`}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {pontos.length === 2 && (
                    <line
                      x1={pontos[0].x}
                      y1={pontos[0].y}
                      x2={pontos[1].x}
                      y2={pontos[1].y}
                      stroke="#dc2626"
                      strokeWidth={previa.largura / 300}
                      strokeDasharray={`${previa.largura / 100} ${previa.largura / 150}`}
                    />
                  )}
                  {pontos.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={previa.largura / 120}
                      fill="#dc2626"
                      stroke="#fff"
                      strokeWidth={previa.largura / 400}
                    />
                  ))}
                </svg>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Essa distância tem
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      inputMode="decimal"
                      value={medida}
                      onChange={(e) => setMedida(e.target.value)}
                      disabled={pontos.length < 2}
                      placeholder="0"
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal tracking-normal text-gray-900 focus:border-gray-500 focus:outline-none disabled:bg-gray-50"
                    />
                    <span className="text-sm font-normal normal-case tracking-normal text-gray-600">
                      metros
                    </span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setPontos([])}
                  disabled={pontos.length === 0}
                  className="mt-5 text-sm text-gray-500 underline-offset-2 hover:underline disabled:opacity-40"
                >
                  Marcar de novo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(previa.url);
                    setPrevia(null);
                    setPontos([]);
                  }}
                  className="mt-5 text-sm text-gray-500 underline-offset-2 hover:underline"
                >
                  Trocar arquivo
                </button>
              </div>
            </>
          )}

          {ocupado && <p className="mt-3 text-sm text-gray-500">{ocupado}</p>}
          {erro && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={!prontoParaSalvar || !!ocupado || pendente}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Usar no croqui
          </button>
        </div>
      </div>
    </div>
  );
}
