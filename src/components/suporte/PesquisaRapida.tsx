"use client";

// A pesquisa rápida (24/09/2026, pedido do dono): uma caixinha no canto
// direito, uma vez por conta, para a dona dizer se está gostando, do que
// mais gostou, do que sentiu falta e o que a faria assinar. A resposta vai
// pelo mesmo caminho da caixinha de suporte (161) e chega no /admin →
// Suporte, com o WhatsApp dela ao lado — sem migração.
//
// "Uma vez": quem envia ou fecha não vê de novo (marca no navegador e, para
// valer em outro aparelho, a própria conversa de suporte já com a resposta).

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { enviarMensagemDeSuporte, lerConversaDeSuporte } from "@/app/(app)/suporte-actions";

const MARCA = "eorg-pesquisa-rapida-1";
const TITULO_NA_CONVERSA = "Pesquisa rápida";

const AJUDA = ["Sim", "Mais ou menos", "Ainda não"] as const;
const GOSTOU = ["Planejamento", "Roteiro do dia", "Fornecedores", "Financeiro", "Portal da cliente", "Outro"] as const;

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={
        ativo
          ? "rounded-full border border-[#6E3F5F] bg-[#6E3F5F] px-2.5 py-1 text-xs font-medium text-white"
          : "rounded-full border border-[#E6E0D8] bg-white px-2.5 py-1 text-xs text-[#4A443F] hover:border-[#6E3F5F]"
      }
    >
      {children}
    </button>
  );
}

export function PesquisaRapida() {
  const [aberta, setAberta] = useState(false);
  const [ajuda, setAjuda] = useState<string | null>(null);
  const [gostou, setGostou] = useState<string | null>(null);
  const [gostouOutro, setGostouOutro] = useState("");
  const [falta, setFalta] = useState("");
  const [assinar, setAssinar] = useState("");
  const [whats, setWhats] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let ja = false;
    try {
      ja = localStorage.getItem(MARCA) === "1";
    } catch {
      /* sem armazenamento: confere pela conversa */
    }
    if (ja) return;
    let vivo = true;
    const t = setTimeout(async () => {
      const c = await lerConversaDeSuporte(false).catch(() => null);
      const respondeu = c?.mensagens.some((m) => m.autor === "cliente" && m.texto.startsWith(TITULO_NA_CONVERSA));
      if (vivo && !respondeu) setAberta(true);
    }, 5000);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, []);

  function marcar() {
    try {
      localStorage.setItem(MARCA, "1");
    } catch {
      /* nada */
    }
  }

  async function enviar() {
    if (!ajuda && !gostou && !falta.trim() && !assinar.trim()) {
      setErro("Responda pelo menos uma pergunta.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const linhas = [
      `${TITULO_NA_CONVERSA}`,
      `Está ajudando no trabalho: ${ajuda ?? "—"}`,
      `Mais gostou: ${gostou ?? "—"}${gostouOutro.trim() ? ` (${gostouOutro.trim()})` : ""}`,
      `Sentiu falta: ${falta.trim() || "—"}`,
      `O que faria assinar: ${assinar.trim() || "—"}`,
      `Posso chamar no WhatsApp: ${whats ?? "—"}`,
    ];
    const r = await enviarMensagemDeSuporte(linhas.join("\n"), window.location.pathname);
    setEnviando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    marcar();
    setPronto(true);
    setTimeout(() => setAberta(false), 3500);
  }

  if (!aberta) return null;

  return (
    <div
      role="dialog"
      aria-label="Como está sendo o eOrganizei?"
      className="fixed bottom-4 right-4 z-[75] w-[min(360px,calc(100vw-32px))] rounded-2xl border border-[#E6E0D8] bg-white p-4 shadow-[0_18px_40px_rgba(34,30,27,.18)]"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => {
          marcar();
          setAberta(false);
        }}
        className="absolute right-3 top-3 rounded-md p-1 text-[#928A81] hover:bg-[#F2EEE9] hover:text-[#221E1B]"
      >
        <X size={16} />
      </button>

      {pronto ? (
        <p className="pr-6 text-sm text-[#221E1B]">Obrigado. Isso vai direto para quem faz o eOrganizei.</p>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
          <p className="pr-6 text-[15px] font-semibold text-[#221E1B]">Como está sendo o eOrganizei?</p>

          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium text-[#4A443F]">Está ajudando no seu trabalho?</p>
            <div className="flex flex-wrap gap-1.5">
              {AJUDA.map((o) => (
                <Chip key={o} ativo={ajuda === o} onClick={() => setAjuda(ajuda === o ? null : o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium text-[#4A443F]">Do que você mais gostou até agora?</p>
            <div className="flex flex-wrap gap-1.5">
              {GOSTOU.map((o) => (
                <Chip key={o} ativo={gostou === o} onClick={() => setGostou(gostou === o ? null : o)}>
                  {o}
                </Chip>
              ))}
            </div>
            {gostou && (
              <input
                id="pesquisa-gostou"
                value={gostouOutro}
                onChange={(e) => setGostouOutro(e.target.value)}
                maxLength={200}
                placeholder="Quer contar mais? (opcional)"
                className="rounded-lg border border-[#E6E0D8] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#6E3F5F]"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pesquisa-falta" className="text-[13px] font-medium text-[#4A443F]">
              O que você mais sentiu falta?
            </label>
            <textarea
              id="pesquisa-falta"
              value={falta}
              onChange={(e) => setFalta(e.target.value)}
              maxLength={600}
              rows={2}
              className="resize-none rounded-lg border border-[#E6E0D8] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#6E3F5F]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pesquisa-assinar" className="text-[13px] font-medium text-[#4A443F]">
              O que faria você decidir assinar?
            </label>
            <textarea
              id="pesquisa-assinar"
              value={assinar}
              onChange={(e) => setAssinar(e.target.value)}
              maxLength={600}
              rows={2}
              className="resize-none rounded-lg border border-[#E6E0D8] px-2.5 py-1.5 text-[13px] outline-none focus:border-[#6E3F5F]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-medium text-[#4A443F]">Posso te chamar no WhatsApp para entender melhor?</p>
            <div className="flex flex-wrap gap-1.5">
              {["Pode sim", "Prefiro não"].map((o) => (
                <Chip key={o} ativo={whats === o} onClick={() => setWhats(whats === o ? null : o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>

          {erro && <p className="text-xs text-[#A5544B]">{erro}</p>}
          <button
            type="button"
            disabled={enviando}
            onClick={() => void enviar()}
            className="self-start rounded-lg bg-[#6E3F5F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4A2A40] disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
      )}
    </div>
  );
}
