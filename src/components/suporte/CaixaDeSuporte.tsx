"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { LifeBuoy, Send, X } from "lucide-react";
import {
  enviarMensagemDeSuporte,
  lerConversaDeSuporte,
  type MensagemDeSuporte,
} from "@/app/(app)/suporte-actions";

/**
 * A caixinha de suporte — canto inferior esquerdo, logo acima do Copiloto.
 *
 * Pedido do dono (13/09/2026), no dia da primeira conta de alguém que ele
 * não conhecia: "uma caixinha com botão X de fechar, com 'precisa de
 * suporte?' ou 'tem dúvidas?', e então ali recebo a mensagem". As
 * mensagens chegam no painel de gestão, e a resposta volta para cá.
 *
 * O X NÃO some com o suporte: encolhe a caixa num link pequeno
 * "Suporte". Sumir de vez deixaria quem fechou uma vez sem porta de ajuda
 * justamente no dia em que ela precisasse.
 *
 * O Instagram fica dentro, como segunda porta: se a mensagem não sair, a
 * pessoa não fica sem saída.
 */

const CHAVE_RECOLHIDO = "eorg:suporte:recolhido";
/** Com a caixa aberta, a resposta do dono aparece rápido. */
const POLL_ABERTA_MS = 20_000;
/** Fechada, só para acender o pontinho de resposta nova. */
const POLL_FECHADA_MS = 90_000;
const INSTAGRAM = "https://instagram.com/eorganizei";

function hora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function CaixaDeSuporte() {
  const pathname = usePathname();
  const [montado, setMontado] = useState(false);
  const [recolhido, setRecolhido] = useState(false);
  const [aberta, setAberta] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemDeSuporte[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement | null>(null);

  // localStorage só depois de montar: no servidor não existe, e ler no
  // primeiro render faria a caixa nascer diferente do HTML e quebrar a
  // hidratação.
  useEffect(() => {
    setMontado(true);
    try {
      setRecolhido(localStorage.getItem(CHAVE_RECOLHIDO) === "1");
    } catch {
      /* navegador que bloqueia armazenamento: caixa aberta, sem memória */
    }
    // O botão do e-mail da resposta chega com ?suporte=abrir: a caixinha
    // abre sozinha (e abrir é o que conta a resposta como vista), e o
    // parâmetro sai do endereço para recarregar não abrir de novo.
    const url = new URL(window.location.href);
    if (url.searchParams.get("suporte") === "abrir") {
      setAberta(true);
      url.searchParams.delete("suporte");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const carregar = useCallback(async (marcarLidas: boolean) => {
    if (document.visibilityState !== "visible") return;
    const c = await lerConversaDeSuporte(marcarLidas);
    if (!c) return;
    setMensagens(c.mensagens);
    setNaoLidas(c.naoLidas);
  }, []);

  useEffect(() => {
    if (!montado) return;
    void carregar(aberta);
    const id = setInterval(() => void carregar(aberta), aberta ? POLL_ABERTA_MS : POLL_FECHADA_MS);
    return () => clearInterval(id);
  }, [montado, aberta, carregar]);

  useEffect(() => {
    if (aberta) fimRef.current?.scrollIntoView({ block: "end" });
  }, [aberta, mensagens.length]);

  function recolher() {
    setRecolhido(true);
    try {
      localStorage.setItem(CHAVE_RECOLHIDO, "1");
    } catch {
      /* sem armazenamento: vale até recarregar */
    }
  }

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro(null);
    const r = await enviarMensagemDeSuporte(t, pathname);
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setTexto("");
    await carregar(true);
  }

  if (!montado) return null;

  const ponto = naoLidas > 0 && !aberta;

  return (
    <>
      {recolhido ? (
        <button
          type="button"
          onClick={() => setAberta(true)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-stone-400 hover:bg-stone-800/60 hover:text-white"
        >
          <LifeBuoy size={13} />
          Suporte
          {ponto && <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" aria-label="Resposta nova" />}
        </button>
      ) : (
        <div className="relative rounded-xl border border-stone-700 bg-stone-800/60 p-3">
          <button
            type="button"
            onClick={recolher}
            aria-label="Fechar"
            className="absolute right-1.5 top-1.5 rounded p-1 text-stone-500 hover:bg-stone-700 hover:text-white"
          >
            <X size={12} />
          </button>
          <button type="button" onClick={() => setAberta(true)} className="block w-full pr-5 text-left">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <LifeBuoy size={13} className="text-emerald-400" />
              Tem dúvidas?
              {ponto && <span className="h-2 w-2 rounded-full bg-emerald-400" aria-label="Resposta nova" />}
            </span>
            <span className="mt-1 block text-xs leading-snug text-stone-400">
              {ponto ? "A equipe respondeu você." : "Fale com a gente por aqui."}
            </span>
          </button>
        </div>
      )}

      {/* PORTAL, não filho da barra: a <aside> tem transform (é gaveta
          no celular), e transform num ancestral faz `position: fixed`
          ancorar na barra em vez da tela — o painel nascia cortado lá
          embaixo, com o campo de digitar fora da vista. Mesmo motivo da
          ficha do "?" (ExplicacaoDoMenu). */}
      {aberta && createPortal(
        <div
          role="dialog"
          aria-label="Suporte"
          className="fixed bottom-4 left-4 right-4 z-[65] flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl lg:left-[272px] lg:right-auto lg:w-[360px]"
        >
          <header className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">Suporte eOrganizei</p>
              <p className="text-xs text-stone-500">Escreva sua dúvida — respondemos por aqui mesmo.</p>
            </div>
            <button
              type="button"
              onClick={() => setAberta(false)}
              aria-label="Fechar suporte"
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto bg-stone-50 px-4 py-3">
            {mensagens.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">
                Nenhuma conversa ainda. Conte o que aconteceu ou o que você quer fazer.
              </p>
            ) : (
              mensagens.map((m) => (
                <div key={m.id} className={`flex ${m.autor === "cliente" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.autor === "cliente"
                        ? "rounded-br-md bg-stone-900 text-white"
                        : "rounded-bl-md border border-stone-200 bg-white text-stone-800"
                    }`}
                  >
                    {m.autor === "eorganizei" && (
                      <p className="mb-0.5 text-[11px] font-semibold text-emerald-700">eOrganizei</p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                    <p className={`mt-1 text-[10px] ${m.autor === "cliente" ? "text-white/60" : "text-stone-400"}`}>
                      {hora(m.em)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={fimRef} />
          </div>

          <div className="border-t border-stone-100 px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void enviar();
                }}
                rows={2}
                maxLength={2000}
                placeholder="Sua mensagem"
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-stone-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void enviar()}
                disabled={enviando || !texto.trim()}
                aria-label="Enviar"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </div>
            {erro && (
              <p className="mt-2 text-xs text-red-600">
                {erro}{" "}
                <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  Chame no Instagram
                </a>
              </p>
            )}
            <p className="mt-2 text-center text-[11px] text-stone-400">
              Prefere o Instagram? Chame no direct{" "}
              <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="font-medium text-stone-600 hover:underline">
                @eorganizei
              </a>
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
