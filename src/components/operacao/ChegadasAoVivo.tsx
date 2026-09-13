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
  /**
   * Data do evento (yyyy-mm-dd). Só serve para esconder "fechar a
   * contagem" enquanto a festa não aconteceu — na aba RSVP, meses antes,
   * o botão era um convite a apertar o que não se deve. Ausente = mostra.
   */
  dataEvento?: string | null;
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

/** "2026-09-13T03:00:00+00:00" → "13/9", no fuso do país. */
function diaCurto(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/** Hoje, no fuso do país, como yyyy-mm-dd. */
function hojeNoBrasil() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function ChegadasAoVivo({
  eventId,
  painel: painelProp,
  qrPorPosto,
  linkBase,
  dataEvento,
  t,
}: ChegadasProps & { t: ModoTheme }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [painel, setPainel] = useState(painelProp);
  const [aviso, setAviso] = useState<string | null>(null);
  const [qrAberto, setQrAberto] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  // "Fechar a contagem" só a partir do dia do evento. Decidido DEPOIS da
  // montagem: a data de hoje no servidor (UTC) e no celular podem ser dias
  // diferentes perto da meia-noite, e isso quebraria a hidratação.
  const [podeFechar, setPodeFechar] = useState(false);
  useEffect(() => {
    setPodeFechar(!dataEvento || hojeNoBrasil() >= dataEvento);
  }, [dataEvento]);

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
  // Links desligados não voltam a funcionar: mostrá-los ao lado dos vivos
  // só fazia a pessoa perguntar "qual destes eu mando?".
  const vivos = painel.postos.filter((p) => p.revogado_em === null);
  const desligados = painel.postos.length - vivos.length;

  // O NÚMERO. Antes: "4 de 3 chegaram" — conta que parece erro quando
  // entra alguém que não confirmou. Agora o número grande é quem chegou,
  // e a referência vem embaixo, com o motivo de passar dela.
  const passou = painel.presentes > painel.esperados;
  const pct =
    painel.esperados > 0 ? Math.min(100, Math.round((painel.presentes / painel.esperados) * 100)) : 0;

  /** A mensagem que a cerimonialista manda para quem fica na porta. */
  const textoParaRecepcao = (p: PostoDoPainel) =>
    `Olá! Este é o link da recepção do evento. Abra no seu celular na hora de receber os convidados — ele funciona de ${diaCurto(p.vale_de)} a ${diaCurto(p.vale_ate)}: ${linkBase}${p.hash}`;

  return (
    <div className="space-y-6">
      {/* ---------- quem chegou ---------- */}
      <div>
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums leading-none">{painel.presentes}</span>
          <span className={`text-lg ${t.sub}`}>
            {painel.presentes === 1 ? "pessoa chegou" : "pessoas chegaram"}
          </span>
        </p>
        {painel.esperados > 0 && (
          <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${t.chip}`}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <p className={`mt-2 text-sm ${t.sub}`}>
          {[
            painel.esperados > 0
              ? passou
                ? `${painel.esperados} tinham confirmado`
                : `de ${painel.esperados} confirmados`
              : null,
            painel.sem_confirmar > 0
              ? `${painel.sem_confirmar} ${painel.sem_confirmar === 1 ? "entrou" : "entraram"} sem ter confirmado`
              : null,
            painel.avulsos > 0
              ? `${painel.avulsos} ${painel.avulsos === 1 ? "não estava" : "não estavam"} na lista`
              : null,
            encerrada ? `contagem fechada às ${hora(painel.porta_encerrada_em!)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      {aviso && (
        <p className="rounded-lg border border-red-300 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {aviso}
        </p>
      )}

      {/* ---------- as últimas chegadas ---------- */}
      {painel.ultimas.length > 0 && (
        <div>
          <p className={`mb-1 text-xs font-medium uppercase tracking-wide ${t.sub}`}>Últimas chegadas</p>
          <ul className={`divide-y ${t.divide} text-sm`}>
            {painel.ultimas.map((u, i) => (
              <li key={`${u.em}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
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
        </div>
      )}

      {/* ---------- o link de quem fica na porta ---------- */}
      <div className="space-y-3">
        {vivos.length === 0 ? (
          // Nenhum link ainda: UM botão, sem perguntar nome. O nome só
          // importa quando existe mais de uma porta — aí ele é pedido.
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => abrirPosto(eventId, "Recepção"))}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Criar o link da recepção
          </button>
        ) : (
          vivos.map((p) => {
            const qr = qrPorPosto[p.id];
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${t.panel}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 truncate font-medium">
                    {vivos.length > 1 ? p.nome : "Link da recepção"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.aberto ? "bg-emerald-500/15 text-emerald-600" : `${t.chip} ${t.sub}`
                    }`}
                  >
                    {p.aberto
                      ? "funcionando agora"
                      : `funciona de ${diaCurto(p.vale_de)} a ${diaCurto(p.vale_ate)}`}
                  </span>
                </div>
                <p className={`mt-1 text-xs ${t.sub}`}>
                  {p.aberturas === 0
                    ? "Ninguém abriu ainda."
                    : `Aberto ${plural(p.aberturas, "vez", "vezes")} · ${plural(p.marcacoes, "entrada registrada", "entradas registradas")}`}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {/* WhatsApp sem número: o próprio app pergunta para quem
                      mandar. É o gesto de verdade — ninguém "copia link". */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(textoParaRecepcao(p))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Enviar no WhatsApp
                  </a>
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
                      {qrAberto === p.id ? "Esconder QR" : "Abrir por QR"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() => {
                      if (!window.confirm("Desligar este link? Ele para de funcionar na hora, inclusive no celular de quem já está com ele.")) return;
                      rodar(() => revogarPosto(eventId, p.id));
                    }}
                    className={`ml-auto rounded-lg px-2 py-1.5 text-sm ${t.sub} hover:text-red-500 disabled:opacity-50`}
                  >
                    Desligar
                  </button>
                </div>

                {qr && qrAberto === p.id && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    {/* fundo branco sempre: é o que a câmera precisa */}
                    <div
                      className="w-full max-w-[200px] rounded-lg bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: qr }}
                    />
                    <p className={`max-w-xs text-center text-xs ${t.sub}`}>
                      Na porta, quem vai trabalhar aponta a câmera do celular para este código e a lista abre.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}

        {vivos.length > 0 &&
          (abrindo ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                rodar(() => abrirPosto(eventId, nomeNovo || "Segunda porta"));
                setAbrindo(false);
                setNomeNovo("");
              }}
            >
              <input
                autoFocus
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                maxLength={60}
                placeholder="Nome da porta (ex.: Entrada lateral)"
                className={`min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm ${t.border}`}
              />
              <button
                type="submit"
                disabled={pendente}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Criar
              </button>
              <button type="button" onClick={() => setAbrindo(false)} className={`px-2 text-sm ${t.sub}`}>
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAbrindo(true)}
              className={`text-sm ${t.sub} underline-offset-2 hover:underline`}
            >
              + Outra porta de entrada
            </button>
          ))}

        {desligados > 0 && (
          <p className={`text-xs ${t.sub}`}>
            {plural(desligados, "link desligado", "links desligados")} — não funciona mais.
          </p>
        )}
      </div>

      {/* ---------- fechar a contagem ----------
          Só a partir do dia do evento. Antes disso o botão não tem o que
          fechar, e na aba RSVP ele aparecia meses antes da festa. */}
      {podeFechar && (painel.presentes > 0 || encerrada) && (
        <div className={`border-t pt-4 ${t.border}`}>
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => encerrarPorta(eventId, !encerrada))}
            className={`w-full rounded-xl border py-2.5 text-sm font-medium disabled:opacity-50 ${t.border}`}
          >
            {encerrada ? "Reabrir a contagem" : "Fechar a contagem da porta"}
          </button>
          {!encerrada && (
            <p className={`mt-1.5 text-center text-xs ${t.sub}`}>
              Use quando a entrada acabar: este número vai para a prestação de contas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
