"use client";

// Página pública do orçamento (sem login): mesma linguagem visual do PDF,
// com ações de aprovar/recusar e a ficha de cadastro na sequência.
// Mobile-first — o cliente costuma abrir pelo celular.

import { useState } from "react";
import { Check, FileDown, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { criarEventoAPartirDoOrcamento } from "@/lib/orcamento-para-evento";
import { FichaCadastroAprovacao } from "@/components/orcamento-publico/FichaCadastroAprovacao";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import { formatBRL, formatDateBR } from "@/lib/orcamentos";
import {
  dataResposta,
  expirado,
  type OrcamentoPublicoData,
} from "@/lib/orcamento-publico";

export function OrcamentoPublico({
  hash,
  inicial,
}: {
  hash: string;
  inicial: OrcamentoPublicoData;
}) {
  const [dados, setDados] = useState(inicial);
  const [fichaEnviada, setFichaEnviada] = useState(inicial.ficha_preenchida);
  // Etapa 6: o evento é gerado logo após a ficha. Se falhar, a ficha
  // continua salva — a cerimonialista cria pelo painel.
  const [eventoCriado, setEventoCriado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [confirmandoRecusa, setConfirmandoRecusa] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const venceu = expirado(dados);
  const podeResponder = dados.status === "enviado" && !venceu;

  async function responder(status: "aprovado" | "recusado") {
    setErro(null);
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("responder_orcamento", {
      p_hash: hash,
      p_status: status,
    });
    setEnviando(false);

    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) {
      setErro(
        typeof falha === "string" && falha.includes("expirou")
          ? "Este orçamento expirou."
          : "Não foi possível registrar sua resposta. Atualize a página e tente novamente."
      );
      return;
    }

    setDados((d) => ({
      ...d,
      status,
      respondido_em: new Date().toISOString(),
    }));
  }

  const tipo =
    EVENT_TYPE_LABELS[dados.tipo_evento as EventType] ?? dados.tipo_evento;
  const local =
    [dados.local_evento, dados.cidade_evento].filter(Boolean).join(" — ") ||
    "A definir";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-[#ECEBF3] bg-white">
        {/* Cabeçalho */}
        <div className="border-b border-[#ECEBF3] px-6 py-6 sm:px-8">
          {dados.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dados.logo_url}
              alt={dados.nome_empresa}
              className="mb-4 h-14 w-auto object-contain"
            />
          ) : (
            <p className="mb-2 text-lg font-bold text-[#17162A]">
              {dados.nome_empresa}
            </p>
          )}

          <h1 className="text-xl font-bold text-[#17162A]">
            Orçamento para {dados.nome_contato}
          </h1>

          <div className="mt-4 space-y-1 text-sm text-[#6B6884]">
            <p className="font-semibold text-[#17162A]">{tipo}</p>
            <p>
              Data prevista:{" "}
              {dados.data_evento ? formatDateBR(dados.data_evento) : "A definir"}
            </p>
            <p>Local: {local}</p>
            {dados.numero_convidados != null && (
              <p>Convidados: {dados.numero_convidados}</p>
            )}
          </div>
        </div>

        {/* Itens */}
        <div className="px-6 py-6 sm:px-8">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#9A97AE]">
            Itens inclusos
          </h2>
          <ul className="divide-y divide-[#F1F0F5]">
            {dados.itens.map((item, i) => (
              <li
                key={`${item.nome}-${i}`}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#17162A]">{item.nome}</p>
                  {item.descricao && (
                    <p className="text-sm text-[#6B6884]">{item.descricao}</p>
                  )}
                </div>
                <p className="flex-shrink-0 font-semibold text-[#17162A]">
                  {formatBRL(Number(item.valor))}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t-2 border-[#17162A] pt-4">
            <span className="text-sm font-bold uppercase tracking-wide text-[#6B6884]">
              Total
            </span>
            <span className="text-2xl font-bold text-[#17162A]">
              {formatBRL(Number(dados.valor_total))}
            </span>
          </div>

          {venceu ? (
            <p className="mt-4 rounded-xl bg-[#FEF3C7] px-4 py-3 text-sm text-[#B4790E]">
              Este orçamento expirou em {formatDateBR(dados.data_validade)}.
              Entre em contato para uma nova proposta.
            </p>
          ) : (
            <p className="mt-4 text-sm text-[#6B6884]">
              Válido até <strong>{formatDateBR(dados.data_validade)}</strong>
            </p>
          )}

          <a
            href={`/orcamento/${hash}/pdf`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#ECEBF3] px-4 py-2.5 text-sm font-semibold text-[#3D3A52] hover:bg-[#F6F6FA]"
          >
            <FileDown size={15} /> Baixar PDF
          </a>
        </div>

        {/* Ações / estado */}
        <div className="border-t border-[#ECEBF3] px-6 py-6 sm:px-8">
          {podeResponder && (
            <>
              {!confirmandoRecusa ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => responder("aprovado")}
                    disabled={enviando}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#17A34A] py-3.5 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check size={17} /> Aprovar orçamento
                  </button>
                  <button
                    onClick={() => setConfirmandoRecusa(true)}
                    disabled={enviando}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#ECEBF3] py-3.5 text-[15px] font-semibold text-[#6B6884] hover:bg-[#F6F6FA] disabled:opacity-50"
                  >
                    <X size={17} /> Recusar
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-[#F6F6FA] p-4">
                  <p className="text-sm text-[#3D3A52]">
                    Tem certeza que deseja recusar esta proposta?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmandoRecusa(false)}
                      className="rounded-xl border border-[#ECEBF3] bg-white py-2.5 text-sm font-semibold text-[#3D3A52]"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => responder("recusado")}
                      disabled={enviando}
                      className="rounded-xl bg-[#E0574F] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {enviando ? "Enviando…" : "Sim, recusar"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {dados.status === "aprovado" && (
            <div className="rounded-xl bg-[#E7F8ED] px-4 py-4">
              <p className="font-semibold text-[#17A34A]">
                Orçamento aprovado! 🎉
              </p>
              <p className="mt-1 text-sm text-[#3D3A52]">
                {dados.respondido_em
                  ? `Aprovado em ${dataResposta(dados.respondido_em)}. `
                  : ""}
                {fichaEnviada
                  ? "Recebemos seus dados — em breve entraremos em contato para os próximos passos."
                  : "Complete seus dados abaixo para seguirmos."}
              </p>
            </div>
          )}

          {dados.status === "recusado" && (
            <div className="rounded-xl bg-[#F1F0F5] px-4 py-4">
              <p className="font-semibold text-[#3D3A52]">
                Você recusou este orçamento
                {dados.respondido_em
                  ? ` em ${dataResposta(dados.respondido_em)}`
                  : ""}
                .
              </p>
              <p className="mt-1 text-sm text-[#6B6884]">
                Se mudar de ideia, entre em contato com {dados.nome_empresa}.
              </p>
            </div>
          )}

          {dados.status === "rascunho" && (
            <p className="text-sm text-[#6B6884]">
              Esta proposta ainda está sendo preparada.
            </p>
          )}

          {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
        </div>
      </div>

      {/* Tela final (Etapa 6): confirmação de que está tudo registrado. */}
      {dados.status === "aprovado" && fichaEnviada && (
        <div className="mt-6 rounded-2xl border border-[#ECEBF3] bg-white p-6 text-center">
          <p className="text-3xl">🎉</p>
          <h2 className="mt-2 text-lg font-bold text-[#17162A]">Tudo certo!</h2>
          <p className="mt-1 text-[15px] text-[#3D3A52]">
            {gerando
              ? "Registrando seu evento…"
              : eventoCriado
                ? "Seu evento foi registrado com sucesso."
                : "Recebemos seus dados."}
          </p>
          <p className="mt-3 font-semibold text-[#17162A]">
            {tipo}
            {dados.data_evento ? ` — ${formatDateBR(dados.data_evento)}` : ""}
          </p>
          <p className="mt-3 text-sm text-[#6B6884]">
            Em breve entraremos em contato para os próximos passos.
          </p>
        </div>
      )}

      {/* Ficha de cadastro (após aprovar, some depois de enviada). */}
      {dados.status === "aprovado" && !fichaEnviada && (
        <FichaCadastroAprovacao
          hash={hash}
          nomeInicial={dados.nome_contato}
          onConcluido={async () => {
            setFichaEnviada(true);
            setGerando(true);
            const res = await criarEventoAPartirDoOrcamento(
              hash,
              dados.tipo_evento,
              dados.data_evento
            );
            setGerando(false);
            if ("success" in res) setEventoCriado(true);
            // semData/erro: nada a fazer aqui — a cerimonialista é
            // notificada e finaliza pelo painel. Os dados estão salvos.
          }}
        />
      )}

      <p className="mt-6 text-center text-xs text-[#9A97AE]">
        {dados.nome_empresa} · Vela
      </p>
    </div>
  );
}
