"use client";

// A tela de planos (23/09/2026), uma peça só em três lugares:
//   * cadastro — a segunda etapa, depois dos dados (sem X: é uma etapa);
//   * login    — a cada entrada de quem não paga, com um X à vista;
//   * limite   — quando o plano chega ao teto de eventos, para subir.
// Compacta e no meio da tela, como janela de sistema (pedido do dono,
// 23/09): título pequeno, a promoção numa linha, cartões baixos. Preço e
// limite vêm do painel (lib/planos-banner.ts); aqui só se desenha.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Marca } from "@/components/marca/Marca";
import type { DadosDoBanner, PlanoNoBanner } from "@/lib/planos-banner";

type Codigo = PlanoNoBanner["codigo"];
export type ModoDoBanner = "cadastro" | "login" | "limite";

const K = {
  fundo: "#FFFFFF",
  tinta: "#221E1B",
  corpo: "#4A443F",
  suave: "#7A726B",
  ameixa: "#6E3F5F",
  ameixaEscura: "#4A2A40",
  faixa: "#F4EEF1",
  linha: "#E6DFDA",
};

const CSS = `
.pb-grade{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media (max-width:720px){.pb-grade{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:340px){.pb-grade{grid-template-columns:1fr}}
.pb-cartao{transition:border-color .15s ease, box-shadow .15s ease}
.pb-cartao:hover:not(:disabled){border-color:#C9AFBE}
`;

function rotuloDoBotao(p: PlanoNoBanner | undefined, modo: ModoDoBanner, planoAtual: string | null, testeAberto: boolean) {
  if (!p) return "Escolha um plano";
  if (p.codigo === "gratuito") return modo === "cadastro" ? "Começar com 1 evento" : "Continuar no Gratuito";
  if (modo === "cadastro") return testeAberto ? "Comece seu teste de 7 dias" : `Assinar o ${p.nome}`;
  return planoAtual === p.codigo ? `Você está no ${p.nome}` : `Assinar o ${p.nome}`;
}

export function PlanosBanner({
  dados,
  modo,
  planoAtual = null,
  mensagem = null,
  inicial,
  enviando = false,
  erro = null,
  onEscolher,
  onFechar,
  testeAberto = true,
}: {
  dados: DadosDoBanner;
  modo: ModoDoBanner;
  /** no cadastro: com o portão do teste fechado, o botão diz "Assinar" */
  testeAberto?: boolean;
  /** o plano da conta ("gratuito" ou o código do catálogo) — marca "seu plano" */
  planoAtual?: string | null;
  /** a linha de cima no modo limite: "Seu plano chegou a 6 eventos." */
  mensagem?: string | null;
  inicial?: Codigo;
  enviando?: boolean;
  erro?: string | null;
  onEscolher: (codigo: Codigo) => void;
  onFechar?: () => void;
}) {
  // no limite, o plano atual não serve de saída: o selecionado de partida
  // é o primeiro acima dele
  const partida: Codigo =
    inicial ??
    (() => {
      if (modo !== "limite") return "essencial";
      const i = dados.planos.findIndex((p) => p.codigo === planoAtual);
      return dados.planos[Math.min(i + 1, dados.planos.length - 1)]?.codigo ?? "essencial";
    })();
  const [escolhido, setEscolhido] = useState<Codigo>(partida);
  const plano = dados.planos.find((p) => p.codigo === escolhido);
  const indiceAtual = dados.planos.findIndex((p) => p.codigo === planoAtual);
  const janela = modo !== "cadastro";
  // a janela vai direto no <body>: dentro do layout ela ficava abaixo do
  // guia do primeiro acesso, que tem o próprio empilhamento
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const miolo = (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 700,
        margin: janela ? "auto" : "0 auto",
        background: janela ? K.fundo : "transparent",
        borderRadius: janela ? 14 : 0,
        padding: janela ? "22px 22px 20px" : "4px 0 0",
        color: K.tinta,
        boxShadow: janela ? "0 20px 50px rgba(34,30,27,.22)" : "none",
      }}
    >
      <style>{CSS}</style>
      {onFechar && (
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: `1px solid ${K.linha}`,
            background: "#fff",
            color: K.corpo,
            fontSize: 18,
            lineHeight: "30px",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}

      <div style={{ textAlign: janela ? "left" : "center", paddingRight: janela ? 40 : 0 }}>
        {janela && (
          <div style={{ marginBottom: 10 }}>
            <Marca tamanho={16} />
          </div>
        )}
        {mensagem && (
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: K.ameixa }}>{mensagem}</p>
        )}
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 }}>
          Escolha seu plano
        </h2>
        <p style={{ margin: "3px 0 0", fontSize: 13, color: K.suave }}>
          Todos os planos incluem os recursos do eOrganizei.
        </p>
      </div>

      {dados.promocao && (
        <div
          style={{
            marginTop: 14,
            background: K.faixa,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            color: K.corpo,
            textAlign: janela ? "left" : "center",
          }}
        >
          <strong style={{ color: K.ameixaEscura }}>
            {dados.promocao.meses === 1 ? "Primeiro mês" : `${dados.promocao.meses} primeiros meses`} por{" "}
            {dados.promocao.valor}/mês
          </strong>{" "}
          no Essencial · depois, {dados.promocao.aPartirDe}/mês
        </div>
      )}

      <div className="pb-grade" style={{ marginTop: 16 }}>
        {dados.planos.map((p, i) => {
          const ativo = p.codigo === escolhido;
          const seu = planoAtual === p.codigo;
          // no limite, o que está abaixo ou no plano atual não resolve
          const semSaida = modo === "limite" && indiceAtual >= 0 && i <= indiceAtual;
          return (
            <button
              key={p.codigo}
              type="button"
              className="pb-cartao"
              disabled={semSaida}
              onClick={() => setEscolhido(p.codigo)}
              aria-pressed={ativo}
              style={{
                position: "relative",
                textAlign: "left",
                background: ativo ? "#FCFAFB" : "#fff",
                border: `1px solid ${ativo ? K.ameixa : K.linha}`,
                boxShadow: ativo ? `0 0 0 1px ${K.ameixa}` : "none",
                borderRadius: 10,
                padding: "12px 12px 11px",
                cursor: semSaida ? "default" : "pointer",
                opacity: semSaida && !seu ? 0.45 : 1,
                fontFamily: "inherit",
                color: K.tinta,
              }}
            >
              <div style={{ height: 17, marginBottom: 4 }}>
                {(p.maisEscolhido || seu) && (
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      background: seu ? "#EEEAE7" : K.faixa,
                      color: seu ? K.corpo : K.ameixa,
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 4,
                      padding: "2px 6px",
                      display: "inline-block",
                    }}
                  >
                    {seu ? "Seu plano" : "Mais escolhido"}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{p.nome}</div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: K.suave }}>{p.eventos}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>R$</span>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{p.inteiro}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.centavos}</span>
                <span style={{ fontSize: 12, color: K.suave, marginLeft: 2 }}>/mês</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: janela ? "flex-end" : "center", gap: 8, marginTop: 18 }}>
        {janela && onFechar && (
          <button
            type="button"
            onClick={onFechar}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              border: `1px solid ${K.linha}`,
              background: "#fff",
              color: K.corpo,
              fontSize: 13.5,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Agora não
          </button>
        )}
        <button
          type="button"
          disabled={enviando || !plano || (modo !== "cadastro" && planoAtual === plano.codigo && plano.codigo !== "gratuito")}
          onClick={() => plano && onEscolher(plano.codigo)}
          style={{
            minWidth: janela ? 0 : 260,
            height: janela ? 38 : 44,
            padding: "0 18px",
            border: "none",
            borderRadius: 8,
            background: K.ameixa,
            color: "#fff",
            fontSize: janela ? 13.5 : 15,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: enviando ? "default" : "pointer",
            opacity: enviando ? 0.7 : 1,
          }}
        >
          {enviando ? "Um instante…" : rotuloDoBotao(plano, modo, planoAtual, testeAberto)}
        </button>
      </div>
      {erro && <p style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "#A34A2E" }}>{erro}</p>}
    </div>
  );

  if (!janela) return miolo;
  if (!montado) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolha seu plano"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(34,30,27,.45)",
        overflowY: "auto",
        padding: "24px 14px",
        display: "flex",
      }}
    >
      {miolo}
    </div>,
    document.body
  );
}
