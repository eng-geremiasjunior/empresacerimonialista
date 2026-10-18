"use client";

// Divulgar a página profissional (214, 18/10/2026, com a Wedy de
// referência): o endereço para copiar, o texto pronto para o WhatsApp e
// para a bio do Instagram, e o QR Code para cartão de visita e material
// impresso. O QR chega pronto do servidor (src/lib/qr.ts).

import { useState } from "react";
import { Check, Copy, Download, MessageCircle } from "lucide-react";
import { linkCompartilharWhatsapp } from "@/lib/whatsapp-link";

const caixa = "rounded-xl border border-gray-200 bg-white p-5";
const titulo = "text-sm font-semibold text-gray-900";
const botao =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50";

export function DivulgarPagina({
  endereco,
  textoBio,
  textoWhatsapp,
  qrSvg,
  qrPng,
}: {
  endereco: string;
  textoBio: string;
  textoWhatsapp: string;
  qrSvg: string;
  qrPng: string;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const copiar = async (chave: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 2000);
    } catch {
      setCopiado(null);
    }
  };
  const Copiar = ({ chave, texto, rotulo }: { chave: string; texto: string; rotulo: string }) => (
    <button type="button" className={botao} onClick={() => copiar(chave, texto)}>
      {copiado === chave ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {copiado === chave ? "Copiado" : rotulo}
    </button>
  );

  return (
    <div className="space-y-5">
      <section className={caixa}>
        <h2 className={titulo}>Link da página</h2>
        <p className="mt-2 break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800">{endereco}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Copiar chave="link" texto={endereco} rotulo="Copiar link" />
          <a href={endereco} target="_blank" rel="noopener noreferrer" className={botao}>
            Abrir a página
          </a>
        </div>
      </section>

      <section className={caixa}>
        <h2 className={titulo}>WhatsApp</h2>
        <p className="mt-2 whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">{textoWhatsapp}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={linkCompartilharWhatsapp(textoWhatsapp)} target="_blank" rel="noopener noreferrer" className={botao}>
            <MessageCircle size={14} aria-hidden /> Enviar pelo WhatsApp
          </a>
          <Copiar chave="whats" texto={textoWhatsapp} rotulo="Copiar o texto" />
        </div>
      </section>

      <section className={caixa}>
        <h2 className={titulo}>Bio do Instagram</h2>
        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">{textoBio}</p>
        <div className="mt-3">
          <Copiar chave="bio" texto={textoBio} rotulo="Copiar para a bio" />
        </div>
      </section>

      <section className={caixa}>
        <h2 className={titulo}>QR Code</h2>
        <p className="mt-1 text-sm text-gray-500">Para cartão de visita, convite impresso e material de divulgação.</p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div
            className="w-40 rounded-lg border border-gray-200 bg-white p-2"
            aria-label="QR Code da página"
            role="img"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <a href={qrPng} download="qr-pagina-profissional.png" className={botao}>
            <Download size={14} aria-hidden /> Baixar o QR Code
          </a>
        </div>
      </section>
    </div>
  );
}
