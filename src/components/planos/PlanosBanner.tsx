"use client";

// A tela de planos (23/09/2026), uma peça só em três lugares:
//   * cadastro — a segunda etapa, depois dos dados (sem X: é uma etapa);
//   * login    — a cada entrada de quem não paga, com um X à vista;
//   * limite   — quando o plano chega ao teto de eventos, para subir.
// Desenho do anexo do dono: marfim, "Escolha seu plano", a faixa da
// promoção, os cartões, um botão só. Preço e limite vêm do painel
// (lib/planos-banner.ts); aqui só se desenha.

import { useState } from "react";
import { Marca } from "@/components/marca/Marca";
import type { DadosDoBanner, PlanoNoBanner } from "@/lib/planos-banner";

type Codigo = PlanoNoBanner["codigo"];
export type ModoDoBanner = "cadastro" | "login" | "limite";

const K = {
  marfim: "#FAF8F5",
  tinta: "#221E1B",
  corpo: "#4A443F",
  suave: "#7A726B",
  ameixa: "#6E3F5F",
  ameixaEscura: "#4A2A40",
  faixa: "#EFE8EA",
  linha: "#E6DFDA",
};

const CSS = `
.pb-grade{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
@media (max-width:860px){.pb-grade{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:520px){.pb-grade{grid-template-columns:1fr}}
.pb-cartao{transition:border-color .15s ease, box-shadow .15s ease, transform .15s ease}
.pb-cartao:hover:not(:disabled){transform:translateY(-2px)}
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

  const miolo = (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 980,
        margin: "0 auto",
        background: K.marfim,
        borderRadius: modo === "cadastro" ? 0 : 20,
        padding: modo === "cadastro" ? "8px 0 0" : "34px 28px 30px",
        color: K.tinta,
        boxShadow: modo === "cadastro" ? "none" : "0 30px 80px rgba(34,30,27,.28)",
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
            top: 14,
            right: 14,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: `1px solid ${K.linha}`,
            background: "#fff",
            color: K.corpo,
            fontSize: 20,
            lineHeight: "38px",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}

      <div style={{ textAlign: "center" }}>
        {modo !== "cadastro" && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Marca tamanho={22} />
          </div>
        )}
        {mensagem && (
          <p style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 600, color: K.ameixa }}>{mensagem}</p>
        )}
        <h2 style={{ margin: 0, fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          Escolha <strong style={{ fontWeight: 800, color: K.ameixaEscura }}>seu plano</strong>
        </h2>
        <div style={{ width: 56, height: 2, background: "#D9B7C6", margin: "16px auto 0", borderRadius: 2 }} />
      </div>

      {dados.promocao && (
        <div
          style={{
            margin: "22px auto 0",
            maxWidth: 560,
            background: K.faixa,
            borderRadius: 18,
            padding: "16px 20px 14px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".22em", color: K.ameixa, textTransform: "uppercase" }}>
            {dados.promocao.meses === 1 ? "Primeiro mês" : `${dados.promocao.meses} primeiros meses`}
          </div>
          <div style={{ marginTop: 2, fontWeight: 800, color: K.ameixaEscura, letterSpacing: "-0.03em" }}>
            <span style={{ fontSize: 26 }}>R$ </span>
            <span style={{ fontSize: 52 }}>{dados.promocao.valor.replace(/^R\$\s?/, "")}</span>
            <span style={{ fontSize: 17, fontWeight: 600 }}>/mês</span>
          </div>
          <div style={{ fontSize: 14, color: K.corpo }}>
            no Essencial · depois, a partir de {dados.promocao.aPartirDe}/mês
          </div>
        </div>
      )}

      <div className="pb-grade" style={{ marginTop: 26 }}>
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
                background: "#fff",
                border: `${ativo ? 2 : 1}px solid ${ativo ? K.ameixa : K.linha}`,
                borderRadius: 16,
                padding: ativo ? "21px 19px 17px" : "22px 20px 18px",
                boxShadow: ativo ? "0 14px 34px rgba(110,63,95,.16)" : "0 4px 14px rgba(34,30,27,.05)",
                cursor: semSaida ? "default" : "pointer",
                opacity: semSaida && !seu ? 0.45 : 1,
                fontFamily: "inherit",
                color: K.tinta,
              }}
            >
              {(p.maisEscolhido || seu) && (
                <span
                  style={{
                    position: "absolute",
                    top: -11,
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    background: seu ? K.corpo : K.ameixa,
                    color: "#fff",
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    borderRadius: 999,
                    padding: "4px 12px",
                  }}
                >
                  {seu ? "Seu plano" : "Mais escolhido"}
                </span>
              )}
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{p.nome}</div>
              <div style={{ width: 26, height: 2, background: "#D9B7C6", margin: "10px 0 12px", borderRadius: 2 }} />
              <div style={{ fontSize: 15, color: K.corpo }}>{p.eventos}</div>
              <div style={{ height: 1, background: K.linha, margin: "16px 0 14px" }} />
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>R$</span>
                <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{p.inteiro}</span>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{p.centavos}</span>
                <span style={{ fontSize: 13.5, color: K.suave, marginLeft: 2 }}>/mês</span>
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ textAlign: "center", margin: "22px 0 0", fontSize: 14, color: K.corpo }}>
        Todos os planos incluem os recursos do eOrganizei.
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <button
          type="button"
          disabled={enviando || !plano || (modo !== "cadastro" && planoAtual === plano.codigo && plano.codigo !== "gratuito")}
          onClick={() => plano && onEscolher(plano.codigo)}
          style={{
            minWidth: 300,
            height: 56,
            padding: "0 30px",
            border: "none",
            borderRadius: 999,
            background: K.ameixa,
            color: "#fff",
            fontSize: 17,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: enviando ? "default" : "pointer",
            opacity: enviando ? 0.7 : 1,
            boxShadow: "0 12px 28px rgba(110,63,95,.3)",
          }}
        >
          {enviando ? "Um instante…" : `${rotuloDoBotao(plano, modo, planoAtual, testeAberto)} →`}
        </button>
      </div>
      {erro && <p style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: "#A34A2E" }}>{erro}</p>}
    </div>
  );

  if (modo === "cadastro") return miolo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escolha seu plano"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(34,30,27,.45)",
        overflowY: "auto",
        padding: "28px 14px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      {miolo}
    </div>
  );
}
