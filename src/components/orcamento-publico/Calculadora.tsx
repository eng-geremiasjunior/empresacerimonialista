"use client";

// Calculadora da proposta: o casal escolhe pacote, ajusta convidados,
// marca extras e vê o total mudar na hora.
//
// O valor mostrado aqui é de EXIBIÇÃO. Quem fecha o número é a RPC
// registrar_aceite_proposta, que relê os preços do banco — o navegador
// nunca envia valor, só as escolhas (id do pacote, ids dos extras).

import { Check, Minus, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/orcamentos";
import {
  calcularProposta,
  opcoesParcelamento,
  type CondicoesPagamento,
  type ExtraPublico,
  type PacotePublico,
  type RegraConvidados,
  type SelecaoProposta,
} from "@/lib/proposta";

export function Calculadora({
  pacotes,
  extras,
  regra,
  condicoes,
  selecao,
  onSelecao,
  onAceitar,
  podeAceitar,
}: {
  pacotes: PacotePublico[];
  extras: ExtraPublico[];
  regra: RegraConvidados;
  condicoes: CondicoesPagamento;
  selecao: SelecaoProposta;
  onSelecao: (s: SelecaoProposta) => void;
  onAceitar: () => void;
  podeAceitar: boolean;
}) {
  const valores = calcularProposta(selecao, extras, regra, condicoes);
  const parcelasOpcoes = opcoesParcelamento(condicoes.parcelasMaximo);
  const aVista = selecao.formaPagamento === "vista";

  return (
    <div className="space-y-8">
      {/* ---------- pacotes ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        {pacotes.map((p) => {
          const ativo = selecao.pacote?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelecao({ ...selecao, pacote: p })}
              aria-pressed={ativo}
              className="relative rounded-2xl border-2 p-6 text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: ativo ? "var(--cor-acento)" : "var(--cor-borda)",
                background: ativo ? "var(--cor-fundo-destaque)" : "var(--cor-card)",
                boxShadow: ativo
                  ? "0 14px 34px -18px var(--sombra-acento)"
                  : "0 2px 10px rgba(60,36,21,0.05)",
              }}
            >
              {p.recomendado && (
                <span
                  className="absolute -top-3 left-6 flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[1px] text-white"
                  style={{ background: "var(--cor-acento)" }}
                >
                  <Sparkles size={11} /> Mais escolhido
                </span>
              )}

              <div
                className="text-[11px] font-bold uppercase tracking-[2px]"
                style={{ color: "var(--cor-texto-terciario)" }}
              >
                {p.nome}
              </div>
              {p.subtitulo && (
                <div className="mt-0.5 text-xs" style={{ color: "var(--cor-texto-terciario)" }}>
                  {p.subtitulo}
                </div>
              )}

              <div
                className="mt-3 text-[30px] leading-none [font-family:var(--font-titulo)]"
                style={{ color: "var(--cor-texto-principal)" }}
              >
                {formatBRL(Number(p.preco))}
              </div>

              <ul className="mt-4 space-y-1.5">
                {p.inclui.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[12.5px] leading-[1.45]"
                    style={{ color: "var(--cor-texto-secundario)" }}
                  >
                    <Check
                      size={13}
                      strokeWidth={2.6}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: "var(--cor-acento)" }}
                    />
                    {f}
                  </li>
                ))}
                {p.nao_inclui.map((f, i) => (
                  <li
                    key={`n-${i}`}
                    className="flex items-start gap-2 text-[12.5px] leading-[1.45] line-through opacity-45"
                    style={{ color: "var(--cor-texto-terciario)" }}
                  >
                    <Minus size={13} className="mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* ---------- convidados + extras ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--cor-card)", boxShadow: "0 2px 10px rgba(60,36,21,0.05)" }}
        >
          <div className="flex items-baseline justify-between">
            <span
              className="text-[11px] font-bold uppercase tracking-[1.5px]"
              style={{ color: "var(--cor-texto-terciario)" }}
            >
              Convidados
            </span>
            <span
              className="text-[22px] [font-family:var(--font-titulo)]"
              style={{ color: "var(--cor-texto-principal)" }}
            >
              {selecao.convidados}
            </span>
          </div>

          <input
            type="range"
            min={regra.min}
            max={regra.max}
            step={10}
            value={selecao.convidados}
            onChange={(e) =>
              onSelecao({ ...selecao, convidados: Number(e.target.value) })
            }
            aria-label="Número de convidados"
            className="mt-4 w-full accent-[color:var(--cor-acento)]"
          />
          <div
            className="mt-1 flex justify-between text-[11px]"
            style={{ color: "var(--cor-texto-terciario)" }}
          >
            <span>{regra.min}</span>
            <span>{regra.max}</span>
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--cor-texto-terciario)" }}>
            {valores.convidadosExcedentes > 0 ? (
              <>
                {regra.inclusos} inclusos no pacote ·{" "}
                {valores.convidadosExcedentes} adicionais ={" "}
                <strong style={{ color: "var(--cor-acento)" }}>
                  +{formatBRL(valores.valorConvidadosExtra)}
                </strong>
              </>
            ) : (
              <>Até {regra.inclusos} convidados já inclusos no pacote.</>
            )}
          </p>
        </div>

        {extras.length > 0 && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--cor-card)", boxShadow: "0 2px 10px rgba(60,36,21,0.05)" }}
          >
            <span
              className="text-[11px] font-bold uppercase tracking-[1.5px]"
              style={{ color: "var(--cor-texto-terciario)" }}
            >
              Extras opcionais
            </span>
            <div className="mt-3 space-y-2">
              {extras.map((x) => {
                const marcado = selecao.extrasIds.includes(x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() =>
                      onSelecao({
                        ...selecao,
                        extrasIds: marcado
                          ? selecao.extrasIds.filter((id) => id !== x.id)
                          : [...selecao.extrasIds, x.id],
                      })
                    }
                    aria-pressed={marcado}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: marcado ? "var(--cor-acento)" : "var(--cor-borda)",
                      background: marcado ? "var(--cor-fundo-destaque)" : "transparent",
                    }}
                  >
                    <span className="min-w-0">
                      <span
                        className="block text-[13px] font-medium"
                        style={{ color: "var(--cor-texto-principal)" }}
                      >
                        {x.nome}
                      </span>
                      {x.descricao && (
                        <span className="block text-[11.5px]" style={{ color: "var(--cor-texto-terciario)" }}>
                          {x.descricao}
                        </span>
                      )}
                    </span>
                    <span
                      className="flex-shrink-0 text-[13px] font-semibold"
                      style={{ color: marcado ? "var(--cor-acento)" : "var(--cor-texto-terciario)" }}
                    >
                      +{formatBRL(Number(x.preco))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---------- pagamento + total ---------- */}
      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{ background: "var(--cor-escuro)", color: "#FFFFFF" }}
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/60">
              Forma de pagamento
            </span>

            <div className="mt-3 flex gap-2">
              {(["parcelado", "vista"] as const).map((forma) => {
                const ativo = selecao.formaPagamento === forma;
                return (
                  <button
                    key={forma}
                    onClick={() => onSelecao({ ...selecao, formaPagamento: forma })}
                    aria-pressed={ativo}
                    className="flex-1 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
                    style={{
                      background: ativo ? "var(--cor-acento)" : "rgba(255,255,255,0.08)",
                      color: "#FFFFFF",
                    }}
                  >
                    {forma === "vista"
                      ? `À vista · ${condicoes.descontoAVista}% off`
                      : "Parcelado"}
                  </button>
                );
              })}
            </div>

            {!aVista && (
              <div className="mt-3 flex flex-wrap gap-2">
                {parcelasOpcoes.map((n) => {
                  const ativo = selecao.parcelas === n;
                  return (
                    <button
                      key={n}
                      onClick={() => onSelecao({ ...selecao, parcelas: n })}
                      aria-pressed={ativo}
                      className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
                      style={{
                        background: ativo ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${ativo ? "var(--cor-acento)" : "transparent"}`,
                      }}
                    >
                      {n}x
                    </button>
                  );
                })}
              </div>
            )}

            <p className="mt-3 text-[11.5px] text-white/50">
              Entrada de {condicoes.entradaPercentual}% para reservar a data ·{" "}
              {condicoes.prazoParcelasTexto}
            </p>
          </div>

          <div>
            <div className="space-y-1.5 text-[13px] text-white/70">
              <Linha rotulo={selecao.pacote?.nome ?? "Pacote"} valor={valores.precoPacote} />
              {valores.valorConvidadosExtra > 0 && (
                <Linha
                  rotulo={`${valores.convidadosExcedentes} convidados adicionais`}
                  valor={valores.valorConvidadosExtra}
                />
              )}
              {valores.valorExtras > 0 && (
                <Linha rotulo="Extras" valor={valores.valorExtras} />
              )}
              {valores.desconto > 0 && (
                <Linha
                  rotulo={`Desconto à vista (${valores.descontoPercentual}%)`}
                  valor={-valores.desconto}
                  destaque
                />
              )}
            </div>

            <div className="mt-4 border-t border-white/15 pt-4">
              <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/50">
                Total
              </div>
              <div
                className="mt-1 text-[38px] font-medium leading-none sm:text-[46px] [font-family:var(--font-titulo)]"
                style={{ color: "var(--cor-acento)" }}
              >
                {formatBRL(valores.total)}
              </div>
              <div className="mt-2 text-[12.5px] text-white/70">
                {aVista ? (
                  <>Pagamento único</>
                ) : (
                  <>
                    Entrada {formatBRL(valores.entrada)} + {selecao.parcelas}x de{" "}
                    <strong className="text-white">
                      {formatBRL(valores.parcela ?? 0)}
                    </strong>
                  </>
                )}
              </div>
            </div>

            {podeAceitar && (
              <button
                onClick={onAceitar}
                disabled={!selecao.pacote}
                className="mt-5 w-full rounded-xl px-6 py-4 text-[14px] font-bold transition-opacity disabled:opacity-40"
                style={{ background: "var(--cor-acento)", color: "#FFFFFF" }}
              >
                Aceitar proposta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="min-w-0 truncate">{rotulo}</span>
      <span
        className="flex-shrink-0 tabular-nums"
        style={destaque ? { color: "var(--cor-acento)" } : undefined}
      >
        {valor < 0 ? "−" : ""}
        {formatBRL(Math.abs(valor))}
      </span>
    </div>
  );
}
