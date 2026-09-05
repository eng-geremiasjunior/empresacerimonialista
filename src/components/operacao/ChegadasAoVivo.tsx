"use client";

// Chegadas ao vivo (148) — o bloco do Modo Evento que responde "quantos
// já entraram" e dá à cerimonialista a porta: abrir o posto que a
// recepção vai escanear, mostrar o QR dele, revogar, e encerrar a
// contagem quando a porta fecha.
//
// O número grande vem de recepcao_painel, a mesma fórmula que a tela de
// Mesas e a prestação de contas passaram a ler — este bloco nunca soma
// nada por conta própria. Atualiza a cada 15s só enquanto a aba está
// visível: no dia da festa o celular dela fica no bolso com a tela
// apagada, e um poll cego gastaria bateria contando para ninguém.
//
// O QR do posto chega pronto em SVG, desenhado no servidor (src/lib/qr.ts);
// aqui ele só é injetado, sempre sobre fundo branco — no tema escuro um
// QR com o fundo da tela não escaneia.

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ModoTheme } from "@/lib/modo-tema";
import { plural } from "@/lib/format";
import {
  abrirPosto,
  encerrarPorta,
  lerPainel,
  revogarPosto,
  type Painel,
  type PostoDoPainel,
} from "@/app/(app)/eventos/[id]/recepcao-actions";

const POLL_MS = 15_000;

export type ChegadasProps = {
  eventId: string;
  painel: Painel;
  /** SVG do QR de cada posto ABERTO, por id — gerado na page (servidor) */
  qrPorPosto: Record<string, string>;
  /** publicBase() + "/recepcao/" — o hash do posto vai no fim */
  linkBase: string;
};

// Hora fixa no fuso do país: o Modo Evento renderiza no servidor (UTC na
// Vercel) e hidrata no celular — hora local nos dois lados divergiria.
function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function ChegadasAoVivo({
  eventId,
  painel: painelProp,
  qrPorPosto,
  linkBase,
  t,
}: ChegadasProps & { t: ModoTheme }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [painel, setPainel] = useState(painelProp);
  const [aviso, setAviso] = useState<string | null>(null);
  const [qrAberto, setQrAberto] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("Recepção");
  const [copiado, setCopiado] = useState<string | null>(null);

  // o servidor re-renderizou (posto novo, QR novo): a page manda de novo
  useEffect(() => setPainel(painelProp), [painelProp]);

  const atualizar = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const p = await lerPainel(eventId);
    if (p) setPainel(p);
  }, [eventId]);

  useEffect(() => {
    const id = setInterval(atualizar, POLL_MS);
    // voltou para a aba: não espera os 15s para mostrar o número certo
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [atualizar]);

  function rodar(acao: () => Promise<{ error?: string } | { success: true }>) {
    iniciar(async () => {
      const r = await acao();
      if ("error" in r && r.error) {
        setAviso(r.error);
        return;
      }
      setAviso(null);
      // o QR do posto novo nasce na page: só o refresh o traz
      router.refresh();
      await atualizar();
    });
  }

  async function copiar(p: PostoDoPainel) {
    await navigator.clipboard.writeText(`${linkBase}${p.hash}`);
    setCopiado(p.id);
    setTimeout(() => setCopiado(null), 2000);
  }

  const encerrada = painel.porta_encerrada_em !== null;
  const postos = painel.postos;

  return (
    <div className="space-y-5">
      {/* o número — o único que vale */}
      <div>
        <p className="text-4xl font-semibold tabular-nums leading-none">
          {painel.presentes}
          <span className={`text-xl font-normal ${t.sub}`}> de {painel.esperados} chegaram</span>
        </p>
        {(painel.sem_confirmar > 0 || painel.avulsos > 0 || encerrada) && (
          <p className={`mt-2 text-sm ${t.sub}`}>
            {[
              painel.sem_confirmar > 0
                ? `${painel.sem_confirmar} ${painel.sem_confirmar === 1 ? "entrou" : "entraram"} sem ter confirmado`
                : null,
              painel.avulsos > 0
                ? `${painel.avulsos} ${painel.avulsos === 1 ? "entrou" : "entraram"} na porta`
                : null,
              encerrada ? `contagem encerrada às ${hora(painel.porta_encerrada_em!)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>

      {aviso && (
        <p className="rounded-lg border border-red-300 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {aviso}
        </p>
      )}

      {/* as últimas chegadas — nome, hora, por qual porta */}
      {painel.ultimas.length > 0 && (
        <ul className={`divide-y ${t.divide} text-sm`}>
          {painel.ultimas.map((u, i) => (
            <li key={`${u.em}-${i}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate">
                {u.nome}
                {u.pessoas > 1 && <span className={t.sub}> +{u.pessoas - 1}</span>}
              </span>
              <span className={`shrink-0 tabular-nums ${t.sub}`}>
                {hora(u.em)} · {u.porta === "recepcao" ? (u.operador || "recepção") : "equipe"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* os postos da porta */}
      {postos.length > 0 && (
        <ul className="space-y-2">
          {postos.map((p) => {
            const qr = qrPorPosto[p.id];
            const vivo = p.revogado_em === null;
            return (
              <li key={p.id} className={`rounded-xl border p-3 ${t.panel}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">{p.nome}</span>
                  <span className={`shrink-0 text-xs ${t.sub}`}>
                    {!vivo
                      ? `revogado às ${hora(p.revogado_em!)}`
                      : p.aberto
                        ? "aberto"
                        : "fora da janela"}
                  </span>
                </div>
                <p className={`mt-0.5 text-xs ${t.sub}`}>
                  {plural(p.aberturas, "abertura", "aberturas")} ·{" "}
                  {plural(p.marcacoes, "marcação", "marcações")}
                  {p.avulsos > 0 && ` · ${plural(p.avulsos, "avulso", "avulsos")}`}
                </p>
                {vivo && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => copiar(p)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${t.border}`}
                    >
                      {copiado === p.id ? "Copiado" : "Copiar link"}
                    </button>
                    {qr && (
                      <button
                        type="button"
                        onClick={() => setQrAberto(qrAberto === p.id ? null : p.id)}
                        className={`rounded-lg border px-3 py-1.5 text-sm ${t.border}`}
                      >
                        {qrAberto === p.id ? "Esconder QR" : "Mostrar QR do link"}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pendente}
                      onClick={() => {
                        if (!window.confirm(`Revogar o posto "${p.nome}"? O link deixa de abrir na hora.`)) return;
                        rodar(() => revogarPosto(eventId, p.id));
                      }}
                      className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red-500 disabled:opacity-50"
                    >
                      Revogar
                    </button>
                  </div>
                )}
                {vivo && qr && qrAberto === p.id && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    {/* fundo branco sempre: é o que a câmera precisa */}
                    <div
                      className="w-full max-w-[220px] rounded-lg bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qr }}
                    />
                    <p className={`text-center text-xs ${t.sub}`}>
                      A recepção aponta a câmera para este QR e abre a porta no celular.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* abrir posto */}
      {abrindo ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            rodar(() => abrirPosto(eventId, nomeNovo));
            setAbrindo(false);
          }}
        >
          <input
            autoFocus
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            maxLength={60}
            placeholder="Recepção"
            className={`min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm ${t.border}`}
          />
          <button
            type="submit"
            disabled={pendente}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Abrir
          </button>
          <button
            type="button"
            onClick={() => setAbrindo(false)}
            className={`px-2 text-sm ${t.sub}`}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAbrindo(true)}
          className={`w-full rounded-xl border py-2.5 text-sm font-medium ${t.border}`}
        >
          Abrir posto
        </button>
      )}

      {/* o carimbo: a partir dele a prestação de contas usa o número da porta */}
      <div>
        <button
          type="button"
          disabled={pendente}
          onClick={() => rodar(() => encerrarPorta(eventId, !encerrada))}
          className={`w-full rounded-xl border py-2.5 text-sm font-semibold disabled:opacity-50 ${t.border}`}
        >
          {encerrada ? "Reabrir contagem da porta" : "Encerrar contagem da porta"}
        </button>
        {!encerrada && (
          <p className={`mt-1.5 text-center text-xs ${t.sub}`}>
            Depois de encerrada, a prestação de contas usa este número.
          </p>
        )}
      </div>
    </div>
  );
}
