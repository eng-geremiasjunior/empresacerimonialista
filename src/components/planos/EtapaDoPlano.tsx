"use client";

// A etapa 2 do cadastro, "Plano" (23/09/2026): desenho do dono no Claude
// Design (design_handoff_cadastro_plano). Uma janela com as etapas no
// topo, a pergunta "quantos eventos você atende hoje?" que indica o
// plano, os quatro cartões e um botão. Preço, limite e promoção vêm do
// painel (lib/planos-banner.ts). O banner do login e o do limite seguem
// em PlanosBanner. A marca do desenho não entra na janela: o topo da
// página já tem o logo, e dois logos a 80 px pareciam erro.

import { useState } from "react";
import type { DadosDoBanner, PlanoNoBanner } from "@/lib/planos-banner";

type Codigo = PlanoNoBanner["codigo"];

// a faixa de eventos de índice i indica o plano de índice i
const FAIXAS = ["1", "2 a 6", "7 a 12", "Mais de 12"];

const CSS = `
.ep{width:100%;max-width:1040px;margin:0 auto;background:#FFFFFF;border:1px solid #E6E0D8;border-radius:20px;overflow:hidden;color:#221E1B;font-family:var(--font-ui),system-ui,sans-serif}
.ep-top{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;padding:18px 32px;border-bottom:1px solid #E6E0D8}
.ep-etapas{display:flex;align-items:center;gap:10px;margin:0;padding:0;list-style:none;font:500 13px/16px var(--font-ui),system-ui,sans-serif;color:#928A81}
.ep-etapas li{display:flex;align-items:center;gap:6px}
.ep-etapas b{width:18px;height:18px;border-radius:50%;font:600 11px/18px var(--font-ui),system-ui,sans-serif;text-align:center}
.ep-etapas .feita{color:#5E7355}.ep-etapas .feita b{background:#EDF0EA}
.ep-etapas .atual{color:#221E1B}.ep-etapas .atual b{background:#6E3F5F;color:#fff}
.ep-etapas .proxima b{border:1px solid #E6E0D8;line-height:16px}
.ep-etapas .ep-traco{width:24px;height:1px;background:#E6E0D8}
.ep-corpo{padding:40px 48px 36px;display:flex;flex-direction:column;gap:28px;align-items:center}
.ep h2{margin:0;font:600 24px/30px var(--font-title),system-ui,sans-serif;letter-spacing:-0.02em;text-align:center}
.ep-sub{margin:6px 0 0;font:400 14px/20px var(--font-ui),system-ui,sans-serif;color:#6B6259;text-align:center}
.ep-rotulo{font:600 13px/16px var(--font-ui),system-ui,sans-serif;letter-spacing:0.06em;text-transform:uppercase;color:#928A81;text-align:center;margin:0 0 10px}
.ep-seg{display:flex;padding:3px;background:#F2EEE9;border-radius:10px;gap:2px}
.ep-seg button{border:0;cursor:pointer;height:36px;padding:0 18px;border-radius:8px;font:600 13px/16px var(--font-ui),system-ui,sans-serif;background:transparent;color:#928A81;white-space:nowrap;transition:background 150ms ease,color 150ms ease}
.ep-seg button[aria-pressed="true"]{background:#FFFFFF;color:#221E1B;box-shadow:0 1px 2px rgba(34,30,27,0.08)}
.ep-grade{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;width:100%}
.ep-cartao{cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:14px;border:1px solid #E6E0D8;background:#FFFFFF;font:inherit;color:inherit;transition:border-color 150ms ease,box-shadow 150ms ease}
.ep-cartao[aria-checked="true"]{border-color:#6E3F5F;box-shadow:0 0 0 3px #F3EBF0}
.ep-cab{display:flex;justify-content:space-between;align-items:center;min-height:20px;gap:8px}
.ep-nome{font:600 16px/20px var(--font-title),system-ui,sans-serif;letter-spacing:-0.01em}
.ep-selo{font:600 11px/16px var(--font-ui),system-ui,sans-serif;color:#6E3F5F;background:#F3EBF0;padding:2px 8px;border-radius:999px;white-space:nowrap}
.ep-eventos{font:400 14px/20px var(--font-ui),system-ui,sans-serif;color:#6B6259}
.ep-preco{display:flex;align-items:baseline;gap:2px}
.ep-preco .rs{font:500 13px/16px var(--font-ui),system-ui,sans-serif;color:#6B6259}
.ep-preco .int{font:600 32px/36px var(--font-title),system-ui,sans-serif;letter-spacing:-0.02em}
.ep-preco .cent{font:600 14px/16px var(--font-title),system-ui,sans-serif}
.ep-preco .mes{font:400 13px/16px var(--font-ui),system-ui,sans-serif;color:#928A81}
.ep-promo{min-height:34px;font:400 12px/16px var(--font-mono),ui-monospace,monospace;color:#4F6147}
.ep-radio{display:flex;align-items:center;gap:8px;padding-top:12px;border-top:1px solid #E6E0D8;font:500 13px/16px var(--font-ui),system-ui,sans-serif;color:#928A81}
.ep-radio i{width:16px;height:16px;border-radius:50%;border:1.5px solid #B4ADA4;box-shadow:inset 0 0 0 3px #fff}
.ep-cartao[aria-checked="true"] .ep-radio{color:#6E3F5F}
.ep-cartao[aria-checked="true"] .ep-radio i{border-color:#6E3F5F;background:#6E3F5F}
.ep-pe{display:flex;flex-direction:column;gap:12px;align-items:center}
.ep-cta{min-width:280px;height:48px;padding:0 24px;border:0;border-radius:10px;background:#6E3F5F;color:#fff;font:600 15px/20px var(--font-ui),system-ui,sans-serif;cursor:pointer;transition:background 150ms ease}
.ep-cta:hover:not(:disabled),.ep-cta:active:not(:disabled){background:#4A2A40}
.ep-cta:disabled{opacity:.7;cursor:default}
.ep-cta:focus-visible,.ep-cartao:focus-visible,.ep-seg button:focus-visible{outline:none;box-shadow:0 0 0 3px #F3EBF0,0 0 0 1px #6E3F5F}
.ep-nota{font:400 12px/16px var(--font-mono),ui-monospace,monospace;color:#928A81;text-align:center}
.ep-link{border:0;background:transparent;padding:0;cursor:pointer;font:400 13px/16px var(--font-ui),system-ui,sans-serif;color:#6B6259;text-decoration:underline}
.ep-link:hover{color:#4A2A40}
.ep-erro{margin:0;font-size:13.5px;color:#A34A2E;text-align:center}
@media (max-width:820px){.ep-grade{grid-template-columns:repeat(2,minmax(0,1fr))}.ep-corpo{padding:32px 20px}.ep-top{padding:16px 20px}}
@media (max-width:480px){.ep-grade{grid-template-columns:1fr}.ep-seg button{padding:0 12px}}
`;

export function EtapaDoPlano({
  dados,
  testeAberto,
  inicial,
  enviando,
  erro,
  jaTemConta,
  onEscolher,
  onVoltar,
}: {
  dados: DadosDoBanner;
  /** o portão do teste: aberto, o plano pago cobra no 8º dia */
  testeAberto: boolean;
  /** o plano de quando ela volta a esta etapa */
  inicial?: string | null;
  enviando: boolean;
  erro: string | null;
  jaTemConta: boolean;
  onEscolher: (codigo: Codigo) => void;
  onVoltar: () => void;
}) {
  const indiceInicial = Math.max(
    0,
    dados.planos.findIndex((p) => p.codigo === (inicial || "essencial"))
  );
  const [faixa, setFaixa] = useState(indiceInicial);
  const [escolhido, setEscolhido] = useState(indiceInicial);
  const plano = dados.planos[escolhido];
  const gratuito = plano?.codigo === "gratuito";
  // a promoção é do primeiro plano pago (o Essencial), como no painel
  const daPromocao = (p: PlanoNoBanner) => dados.promocao !== null && p === dados.planos[1];

  const promo = dados.promocao;
  const textoDaPromo = promo
    ? `${promo.meses === 1 ? "Primeiro mês" : `${promo.meses} primeiros meses`} por ${promo.valor}/mês`
    : "";

  let nota = "próximo passo: cartão";
  if (gratuito) nota = "sem cartão · 1 evento";
  else if (plano && daPromocao(plano) && promo)
    nota = testeAberto
      ? `1ª cobrança em 7 dias · ${promo.valor} · depois ${promo.aPartirDe}/mês`
      : `hoje ${promo.valor} · depois ${promo.aPartirDe}/mês`;
  else if (testeAberto) nota = "próximo passo: cartão · 1ª cobrança em 7 dias";

  const rotulo = gratuito
    ? "Começar no Gratuito"
    : testeAberto
      ? "Comece seu teste de 7 dias"
      : `Assinar o ${plano?.nome ?? ""}`;

  return (
    <div className="ep">
      <style>{CSS}</style>
      <div className="ep-top">
        <ol className="ep-etapas" aria-label="Etapas">
          <li className="feita">
            <b aria-hidden>✓</b>Seus dados
          </li>
          <li aria-hidden className="ep-traco" />
          <li className="atual" aria-current="step">
            <b>2</b>Plano
          </li>
          <li aria-hidden className="ep-traco" />
          <li className="proxima">
            <b>3</b>
            {gratuito ? "Pronto" : "Cartão"}
          </li>
        </ol>
      </div>

      <div className="ep-corpo">
        <div>
          <h2>Escolha seu plano</h2>
          <p className="ep-sub">Todos os planos incluem os recursos do eOrganizei.</p>
        </div>

        <div>
          <p className="ep-rotulo" id="ep-faixa">
            Quantos eventos você atende hoje?
          </p>
          <div className="ep-seg" role="group" aria-labelledby="ep-faixa">
            {FAIXAS.slice(0, dados.planos.length).map((f, i) => (
              <button
                key={f}
                type="button"
                aria-pressed={i === faixa}
                onClick={() => {
                  setFaixa(i);
                  setEscolhido(i);
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="ep-grade" role="radiogroup" aria-label="Planos">
          {dados.planos.map((p, i) => {
            const selo = i === faixa ? "Indicado para você" : p.maisEscolhido ? "Mais escolhido" : "";
            const marcado = i === escolhido;
            return (
              <button
                key={p.codigo}
                type="button"
                role="radio"
                aria-checked={marcado}
                className="ep-cartao"
                onClick={() => setEscolhido(i)}
              >
                <div className="ep-cab">
                  <span className="ep-nome">{p.nome}</span>
                  {selo && <span className="ep-selo">{selo}</span>}
                </div>
                <span className="ep-eventos">{p.eventos}</span>
                <div className="ep-preco">
                  <span className="rs">R$</span>
                  <span className="int">{p.inteiro}</span>
                  <span className="cent">{p.centavos}</span>
                  <span className="mes">/mês</span>
                </div>
                <div className="ep-promo">{daPromocao(p) ? textoDaPromo : ""}</div>
                <div className="ep-radio">
                  <i aria-hidden />
                  {marcado ? "Selecionado" : "Selecionar"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="ep-pe">
          <button
            type="button"
            className="ep-cta"
            disabled={enviando || !plano}
            onClick={() => plano && onEscolher(plano.codigo)}
          >
            {enviando ? "Um instante…" : rotulo}
          </button>
          <span className="ep-nota">{nota}</span>
          {erro && <p className="ep-erro">{erro}</p>}
          {jaTemConta && (
            <a href="/login" style={{ color: "#6E3F5F", fontWeight: 600, fontSize: 14 }}>
              Entrar com minha senha
            </a>
          )}
          <button type="button" className="ep-link" onClick={onVoltar} disabled={enviando}>
            Voltar e corrigir meus dados
          </button>
        </div>
      </div>
    </div>
  );
}
