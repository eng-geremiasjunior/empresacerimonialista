"use client";

// O primeiro fornecedor (24/09/2026): no Roteiro de um evento ainda sem
// fornecedor, um passo só — quem é, o que faz, quais horários são dele —
// e o link pronto para mandar no WhatsApp. É o momento em que o sistema
// passa a valer: o roteiro chega no celular de quem trabalha no evento.

import { useState, useTransition } from "react";
import {
  criarPrimeiroFornecedor,
  marcarItensDoFornecedor,
} from "@/app/(app)/eventos/[id]/roteiro/primeiro-fornecedor-actions";

type Item = { id: string; title: string; time: string | null };

const FUNCOES: { rotulo: string; palavras: string[] }[] = [
  { rotulo: "Buffet", palavras: ["buffet", "jantar", "coquetel", "bolo", "comida", "bebida", "bar ", "garç"] },
  { rotulo: "Decoração", palavras: ["decora", "montagem", "flor", "arranjo"] },
  { rotulo: "Música / DJ", palavras: ["banda", "música", "musica", "dj", "som", "pista", "valsa"] },
  { rotulo: "Foto e vídeo", palavras: ["foto", "making", "vídeo", "video", "filmag"] },
  { rotulo: "Cerimônia", palavras: ["cerimônia", "cerimonia", "celebrante", "altar"] },
  { rotulo: "Outro", palavras: [] },
];

export function PrimeiroFornecedor({
  eventId,
  semFornecedor,
  itens,
  base,
  eventoNome,
}: {
  eventId: string;
  /** o evento ainda não tem fornecedor: é quando o passo aparece. Fica
   *  montado sempre, para não sumir no meio do caminho quando o vínculo
   *  novo recarrega a página. */
  semFornecedor: boolean;
  itens: Item[];
  base: string;
  eventoNome: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [nome, setNome] = useState("");
  const [zap, setZap] = useState("");
  const [funcao, setFuncao] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [hash, setHash] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function criar() {
    setErro(null);
    iniciar(async () => {
      const r = await criarPrimeiroFornecedor(eventId, nome, zap);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setSupplierId(r.supplierId);
      const palavras = FUNCOES.find((f) => f.rotulo === funcao)?.palavras ?? [];
      setMarcados(
        new Set(itens.filter((i) => palavras.some((p) => i.title.toLowerCase().includes(p))).map((i) => i.id))
      );
    });
  }

  function gerarLink() {
    if (!supplierId) return;
    setErro(null);
    iniciar(async () => {
      const r = await marcarItensDoFornecedor(eventId, supplierId, [...marcados]);
      if ("error" in r) {
        setErro(r.error);
        return;
      }
      setHash(r.hash);
    });
  }

  if (!semFornecedor && !supplierId) return null;

  const url = hash ? `${base}/eventos/${eventId}/roteiro/publico/${hash}` : "";
  const digitos = zap.replace(/\D/g, "");
  const texto = `Oi, ${nome.trim()}! Este é o roteiro do ${eventoNome}. Aqui você vê os seus horários, e a página se atualiza sozinha se algo mudar: ${url}`;
  const whatsapp = digitos
    ? `https://wa.me/${digitos.length <= 11 ? "55" + digitos : digitos}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return (
    <section data-primeiro-fornecedor className="mb-6 rounded-xl border-2 border-[#6E3F5F] bg-[#FBF7F9] p-4 print:hidden">
      {!supplierId && (
        <>
          <p className="text-base font-semibold text-stone-900">Mande o roteiro para o primeiro fornecedor</p>
          <p className="mt-1 text-sm text-stone-600">Ele recebe só os horários dele, no celular, sem senha e sem aplicativo.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              id="pf-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome (ex.: Buffet Aurora)"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#6E3F5F]"
            />
            <input
              id="pf-zap"
              value={zap}
              onChange={(e) => setZap(e.target.value)}
              inputMode="tel"
              placeholder="WhatsApp com DDD (opcional)"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#6E3F5F]"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FUNCOES.map((f) => (
              <button
                key={f.rotulo}
                type="button"
                aria-pressed={funcao === f.rotulo}
                onClick={() => setFuncao(f.rotulo)}
                className={
                  funcao === f.rotulo
                    ? "rounded-full border border-[#6E3F5F] bg-[#6E3F5F] px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:border-[#6E3F5F]"
                }
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={pendente || !nome.trim() || !funcao}
            onClick={criar}
            className="mt-3 rounded-lg bg-[#6E3F5F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A2A40] disabled:opacity-50"
          >
            {pendente ? "Um instante…" : "Continuar"}
          </button>
        </>
      )}

      {supplierId && !hash && (
        <>
          <p className="text-base font-semibold text-stone-900">Quais horários são de {nome.trim()}?</p>
          {itens.length === 0 ? (
            <p className="mt-1 text-sm text-stone-600">O roteiro ainda não tem horários. Gere o link agora; o que você marcar depois aparece nele sozinho.</p>
          ) : (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {itens.map((i) => (
                <li key={i.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white">
                    <input
                      type="checkbox"
                      checked={marcados.has(i.id)}
                      onChange={(e) =>
                        setMarcados((m) => {
                          const n = new Set(m);
                          if (e.target.checked) n.add(i.id);
                          else n.delete(i.id);
                          return n;
                        })
                      }
                    />
                    <span className="w-12 font-mono text-xs text-stone-500">{i.time?.slice(0, 5) ?? "—"}</span>
                    <span className="text-stone-800">{i.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={pendente}
            onClick={gerarLink}
            className="mt-3 rounded-lg bg-[#6E3F5F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A2A40] disabled:opacity-50"
          >
            {pendente ? "Um instante…" : "Gerar o link"}
          </button>
        </>
      )}

      {hash && (
        <>
          <p className="text-base font-semibold text-stone-900">Pronto. Mande para {nome.trim()}:</p>
          <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-stone-600">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#1F8F4E] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Enviar no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(url)
                  .then(() => setCopiado(true))
                  .catch(() => setCopiado(false));
              }}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-stone-400"
            >
              {copiado ? "Copiado" : "Copiar link"}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">Quando ele confirmar, você fica sabendo aqui. Os próximos fornecedores entram em Fornecedores.</p>
        </>
      )}

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
