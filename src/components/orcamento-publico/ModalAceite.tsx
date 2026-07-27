"use client";

// Aceite da proposta: resumo do que está sendo fechado, nomes, assinatura
// dos dois e confirmação. Ao confirmar, vira recibo com código.
//
// O cliente NUNCA envia valores — só as escolhas. A RPC recalcula lendo
// os preços do banco. Um total forjado no navegador não vira contrato.

import { useState } from "react";
import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/orcamentos";
import { AssinaturaCanvas } from "./AssinaturaCanvas";
import {
  calcularProposta,
  type CondicoesPagamento,
  type ExtraPublico,
  type RegraConvidados,
  type SelecaoProposta,
} from "@/lib/proposta";

type Recibo = {
  codigo: string;
  valorTotal: number;
  valorEntrada?: number;
  valorParcela?: number | null;
};

export function ModalAceite({
  hash,
  selecao,
  extras,
  regra,
  condicoes,
  nomeContato,
  whatsapp,
  nomeEmpresa,
  onFechar,
  onAceito,
}: {
  hash: string;
  selecao: SelecaoProposta;
  extras: ExtraPublico[];
  regra: RegraConvidados;
  condicoes: CondicoesPagamento;
  nomeContato: string;
  whatsapp: string | null;
  nomeEmpresa: string;
  onFechar: () => void;
  onAceito: () => void;
}) {
  const valores = calcularProposta(selecao, extras, regra, condicoes);
  const [nomeNoiva, setNomeNoiva] = useState(nomeContato);
  const [nomeNoivo, setNomeNoivo] = useState("");
  const [assNoiva, setAssNoiva] = useState<string | null>(null);
  const [assNoivo, setAssNoivo] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recibo, setRecibo] = useState<Recibo | null>(null);

  const extrasEscolhidos = extras.filter((x) => selecao.extrasIds.includes(x.id));

  async function confirmar() {
    setErro(null);
    if (!nomeNoiva.trim()) return setErro("Informe o nome de quem está aceitando.");
    if (!assNoiva) return setErro("A primeira assinatura é obrigatória.");

    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("registrar_aceite_proposta", {
      p_hash: hash,
      p_pacote_id: selecao.pacote?.id,
      p_convidados: selecao.convidados,
      p_extras_ids: selecao.extrasIds,
      p_forma_pagamento: selecao.formaPagamento,
      p_parcelas: selecao.formaPagamento === "vista" ? null : selecao.parcelas,
      p_nome_noiva: nomeNoiva.trim(),
      p_nome_noivo: nomeNoivo.trim() || null,
      p_assinatura_noiva: assNoiva,
      p_assinatura_noivo: assNoivo,
      p_observacoes: obs.trim() || null,
    });
    setEnviando(false);

    const falha = error?.message ?? (data as { error?: string })?.error;
    if (falha) {
      setErro(
        typeof falha === "string" && falha.includes("expirou")
          ? "Esta proposta expirou."
          : typeof falha === "string"
            ? falha
            : "Não foi possível registrar o aceite. Tente novamente."
      );
      return;
    }

    const d = data as {
      recibo: string;
      valor_total: number;
      valor_entrada: number;
      valor_parcela: number | null;
    };
    setRecibo({
      codigo: d.recibo,
      valorTotal: Number(d.valor_total),
      valorEntrada: Number(d.valor_entrada),
      valorParcela: d.valor_parcela != null ? Number(d.valor_parcela) : null,
    });
    onAceito();
  }

  const linkWhats = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Sou ${nomeNoiva} e acabei de aceitar a proposta ${
          selecao.pacote?.nome ?? ""
        }. Recibo ${recibo?.codigo ?? ""} — total ${formatBRL(
          recibo?.valorTotal ?? valores.total
        )}.`
      )}`
    : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ background: "rgba(60,36,21,0.55)" }}
      onClick={onFechar}
    >
      <div
        className="relative my-auto w-full max-w-[560px] rounded-2xl p-6 sm:p-8"
        style={{ background: "var(--cor-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-lg p-1"
          style={{ color: "var(--cor-texto-terciario)" }}
        >
          <X size={20} />
        </button>

        {recibo ? (
          // ---------- recibo ----------
          <div className="text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "var(--cor-acento)" }}
            >
              <Check size={28} strokeWidth={2.5} color="#FFFFFF" />
            </div>
            <h2
              className="mt-4 text-[26px] [font-family:var(--font-titulo)]"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              Proposta aceita!
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--cor-texto-secundario)" }}>
              {nomeEmpresa} já foi avisada e entrará em contato.
            </p>

            <div
              className="mt-5 rounded-xl px-5 py-4"
              style={{ background: "var(--cor-fundo-destaque)" }}
            >
              <div
                className="text-[11px] font-bold uppercase tracking-[1.5px]"
                style={{ color: "var(--cor-texto-terciario)" }}
              >
                Recibo
              </div>
              <div
                className="text-[22px] font-bold tracking-wide"
                style={{ color: "var(--cor-acento)" }}
              >
                {recibo.codigo}
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--cor-texto-secundario)" }}>
                {selecao.pacote?.nome} · {formatBRL(recibo.valorTotal)}
              </div>
              {recibo.valorParcela ? (
                <div className="text-xs" style={{ color: "var(--cor-texto-terciario)" }}>
                  Entrada {formatBRL(recibo.valorEntrada ?? 0)} + {selecao.parcelas}x de{" "}
                  {formatBRL(recibo.valorParcela)}
                </div>
              ) : null}
            </div>

            {linkWhats && (
              <a
                href={linkWhats}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[14px] font-bold text-white"
                style={{ background: "#25D366" }}
              >
                <MessageCircle size={17} /> Enviar no WhatsApp
              </a>
            )}
            <button
              onClick={onFechar}
              className="mt-3 w-full rounded-xl border px-6 py-3 text-sm font-medium"
              style={{ borderColor: "var(--cor-borda)", color: "var(--cor-texto-secundario)" }}
            >
              Fechar
            </button>
          </div>
        ) : (
          // ---------- formulário ----------
          <>
            <h2
              className="text-[24px] [font-family:var(--font-titulo)]"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              Confirmar proposta
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--cor-texto-secundario)" }}>
              Confira o resumo e assine para fechar.
            </p>

            <div
              className="mt-4 space-y-1.5 rounded-xl px-5 py-4 text-[13px]"
              style={{ background: "var(--cor-fundo-destaque)", color: "var(--cor-texto-secundario)" }}
            >
              <div className="flex justify-between">
                <span>{selecao.pacote?.nome}</span>
                <span>{formatBRL(valores.precoPacote)}</span>
              </div>
              <div className="flex justify-between">
                <span>{selecao.convidados} convidados</span>
                <span>
                  {valores.valorConvidadosExtra > 0
                    ? `+${formatBRL(valores.valorConvidadosExtra)}`
                    : "incluído"}
                </span>
              </div>
              {extrasEscolhidos.map((x) => (
                <div key={x.id} className="flex justify-between">
                  <span>{x.nome}</span>
                  <span>+{formatBRL(Number(x.preco))}</span>
                </div>
              ))}
              {valores.desconto > 0 && (
                <div className="flex justify-between" style={{ color: "var(--cor-acento)" }}>
                  <span>Desconto à vista ({valores.descontoPercentual}%)</span>
                  <span>−{formatBRL(valores.desconto)}</span>
                </div>
              )}
              <div
                className="mt-2 flex justify-between border-t pt-2 text-[15px] font-bold"
                style={{ borderColor: "var(--cor-borda)", color: "var(--cor-texto-principal)" }}
              >
                <span>Total</span>
                <span>{formatBRL(valores.total)}</span>
              </div>
              <div className="text-[11.5px]">
                {selecao.formaPagamento === "vista"
                  ? "Pagamento único"
                  : `Entrada ${formatBRL(valores.entrada)} + ${selecao.parcelas}x de ${formatBRL(valores.parcela ?? 0)}`}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "var(--cor-texto-terciario)" }}>
                  Nome completo
                </label>
                <input
                  value={nomeNoiva}
                  onChange={(e) => setNomeNoiva(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--cor-borda)", color: "var(--cor-texto-principal)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "var(--cor-texto-terciario)" }}>
                  Nome do parceiro(a) — opcional
                </label>
                <input
                  value={nomeNoivo}
                  onChange={(e) => setNomeNoivo(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--cor-borda)", color: "var(--cor-texto-principal)" }}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AssinaturaCanvas rotulo="Assinatura" onChange={setAssNoiva} />
              <AssinaturaCanvas rotulo="Assinatura do parceiro(a)" onChange={setAssNoivo} />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: "var(--cor-texto-terciario)" }}>
                Observações — opcional
              </label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                placeholder="Algo que queiram registrar?"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--cor-borda)", color: "var(--cor-texto-principal)" }}
              />
            </div>

            {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

            <button
              onClick={confirmar}
              disabled={enviando}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-[14px] font-bold text-white disabled:opacity-60"
              style={{ background: "var(--cor-acento)" }}
            >
              {enviando ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Registrando…
                </>
              ) : (
                <>
                  <Check size={17} /> Confirmar e assinar
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[11px]" style={{ color: "var(--cor-texto-terciario)" }}>
              A reserva da data se confirma com o pagamento da entrada.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
