"use client";

// A assinatura, do lado de quem paga.
//
// O cartão vai do formulário DIRETO para o gateway (chave pública), que
// devolve um token de uso único; só o token chega ao nosso servidor. O
// número do cartão nunca passa por aqui — nem pelo nosso banco, nem
// pelos nossos logs.
//
// A tela fala em tempo e em consequência, não em estado: "sua próxima
// cobrança é dia 12", não "status: ativa".
//
// Desde a 147 são três planos (Essencial, Profissional, Master), lidos do
// catálogo — o produto é o mesmo inteiro nos três; o que muda é quantos
// eventos ficam de pé ao mesmo tempo e quantas pessoas têm login. A tela
// mostra o uso em número ("8 de 10 eventos em andamento · 1 de 1 login")
// e a vitrine dos três; quem já paga muda de plano sem refazer o cartão.
//
// Visual: Especificacao-Assinatura.md (Claude Design, 31/08/2026) —
// tema neutro, canvas #E4E5E7, painel do plano em chumbo. A única cor de
// matiz é o âmbar da linha de uso quando a conta passou do teto. Todo
// valor, data, documento e contagem em IBM Plex Mono; texto corrente em
// Instrument Sans; o H1 em Inter. As três fontes já são carregadas pelo
// layout do app.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assinar, atualizarCartao, cancelar, trocarPlano } from "@/app/(app)/assinatura/actions";
import { documentoValido } from "@/lib/documento";
import { cepValido, telefoneValido, ufValida } from "@/lib/contato";
import {
  COBRANCA_VAZIA,
  DadosDeCobranca,
  type Cobranca,
} from "@/components/assinatura/DadosDeCobranca";

export type EstadoAssinatura = {
  status: string;
  plano: string;
  valor_mensal: number;
  proximo_vencimento: string | null;
  ultimo_pagamento_em: string | null;
  cartao_final: string | null;
  cartao_bandeira: string | null;
  falhas_seguidas: number;
  tem_gateway: boolean;
  plano_nome: string;
  eventos: number;
  /** teto do plano; null = sem limite */
  limite_eventos: number | null;
  pode_criar_evento: boolean;
  logins: number;
  limite_logins: number | null;
  pode_adicionar_login: boolean;
  /** o aceite de uma proposta pode deixar 11 em 10 — nada trava, a tela avisa */
  acima_do_plano: boolean;
};

/**
 * Um cartão da vitrine, já em texto. planos.ts é módulo de servidor (lê
 * cookies) e esta tela é cliente: o preço e os tetos chegam formatados
 * pela page, e aqui só se mostra.
 */
export type PlanoDaVitrine = {
  codigo: string;
  nome: string;
  valorMensal: number;
  precoTexto: string;
  eventosTexto: string;
  loginsTexto: string;
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataLonga(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : iso;
}

/** Troca o cartão por um token, direto com o gateway. */
async function tokenizar(cartao: {
  numero: string;
  nome: string;
  mes: string;
  ano: string;
  cvv: string;
}): Promise<{ token?: string; erro?: string }> {
  const pk = process.env.NEXT_PUBLIC_PAGARME_PUBLIC_KEY;
  if (!pk) return { erro: "Pagamento não configurado. Fale com o suporte." };
  try {
    const r = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${pk}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "card",
        card: {
          number: cartao.numero.replace(/\s/g, ""),
          holder_name: cartao.nome,
          exp_month: Number(cartao.mes),
          exp_year: Number(cartao.ano),
          cvv: cartao.cvv,
        },
      }),
    });
    const d = (await r.json()) as { id?: string; message?: string };
    if (!r.ok || !d.id) {
      return { erro: "Confira os dados do cartão e tente de novo." };
    }
    return { token: d.id };
  } catch {
    return { erro: "Não conseguimos falar com a operadora. Tente de novo." };
  }
}

/**
 * O que falta antes de ir à operadora — a mesma régua do servidor, aqui,
 * para o erro ser instantâneo e específico. Botão desabilitado sem dizer
 * por quê é adivinha; clique que responde "informe o bairro" é resposta.
 */
function faltaNoFormulario(
  form: { numero: string; nome: string; mes: string; ano: string; cvv: string },
  cobranca: Cobranca | null
): string | null {
  if (form.numero.replace(/\s/g, "").length < 13) return "Confira o número do cartão.";
  if (!form.nome.trim()) return "Informe o nome como está no cartão.";
  const mes = Number(form.mes);
  if (!form.mes || mes < 1 || mes > 12) return "Confira o mês de validade.";
  if (!form.ano) return "Confira o ano de validade.";
  if (form.cvv.length < 3) return "Confira o CVV.";
  if (!cobranca) return null; // troca de cartão não recadastra o pagador
  if (!cobranca.nome.trim()) return "Informe o nome de quem vai pagar.";
  if (!cobranca.email.includes("@")) return "Informe um e-mail válido para a cobrança.";
  if (!telefoneValido(cobranca.telefone)) return "Informe um telefone válido, com DDD.";
  if (!documentoValido(cobranca.documento)) return "Informe um CPF ou CNPJ válido.";
  if (!cepValido(cobranca.cep)) return "Informe um CEP válido.";
  if (!cobranca.rua.trim()) return "Informe a rua.";
  if (!cobranca.numero.trim()) return "Informe o número do endereço.";
  if (!cobranca.bairro.trim()) return "Informe o bairro.";
  if (!cobranca.cidade.trim()) return "Informe a cidade.";
  if (!ufValida(cobranca.estado)) return "Escolha o estado.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Tokens do design (Especificacao-Assinatura.md) — só escala de cinza */
/* ------------------------------------------------------------------ */

const C = {
  canvas: "#E4E5E7",
  card: "#FFFFFF",
  chumbo: "#23262A",
  preto: "#000000",
  recuo: "#EFF0F1",
  bordaCard: "#A9AEB3",
  bordaFina: "#D3D6D9",
  bordaChumbo: "#3B4046",
  forte: "#23262A",
  apoio: "#5B6167",
  rotulo: "#7C8288",
  sobChumbo: "#C6C9CC",
  rotuloChumbo: "#9BA0A6",
};

// A única cor de matiz da tela: a linha de uso quando a conta passou do
// teto. Aviso, não erro — nada foi travado.
const AMBAR = "#9A6700";

const F_UI = "var(--font-ui), 'Instrument Sans', sans-serif";
const F_MONO = "var(--font-mono), 'IBM Plex Mono', monospace";
const F_TITLE = "var(--font-title), Inter, sans-serif";

const rotuloSecao: React.CSSProperties = {
  font: `500 11px ${F_MONO}`,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#7C8288",
};

const cardBranco: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #A9AEB3",
  borderRadius: 14,
};

export function AssinaturaTela({
  estado,
  planos,
  emailDaConta,
  nomeDaConta,
}: {
  estado: EstadoAssinatura;
  /** os planos à venda, na ordem da vitrine; vazio = assinatura ainda fechada */
  planos: PlanoDaVitrine[];
  /** só para começar o formulário preenchido — ela pode trocar */
  emailDaConta?: string;
  nomeDaConta?: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [form, setForm] = useState({ numero: "", nome: "", mes: "", ano: "", cvv: "" });
  // O gateway exige CPF/CNPJ, telefone e endereço de quem paga (cada um
  // custou uma cobrança recusada até ser descoberto). Nada disso fica no
  // nosso banco: vai para o gateway e acabou.
  const [cobranca, setCobranca] = useState<Cobranca>({
    ...COBRANCA_VAZIA,
    nome: nomeDaConta ?? "",
    email: emailDaConta ?? "",
  });
  // null = sem formulário; "assinar" pede cartão + cobrança; "trocar" só cartão
  const [modoForm, setModoForm] = useState<null | "assinar" | "trocar">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  // o cartão da vitrine que ela escolheu: o formulário abre para ele
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanoDaVitrine | null>(null);
  // quem já paga não refaz o cartão: escolhe outro plano e confirma a troca
  const [trocando, setTrocando] = useState<PlanoDaVitrine | null>(null);

  const ativa = estado.status === "ativa";
  const inadimplente = estado.status === "inadimplente";
  const cortesia = estado.status === "pausada";
  // A regra que faltava: se existe assinatura no GATEWAY, ela precisa
  // poder trocar o cartão e CANCELAR — qualquer que seja o status aqui
  // dentro. Amarrar isso a "ativa" deixou uma assinatura real presa,
  // cobrando por fora, sem botão de saída na tela.
  const temAssinaturaLa = estado.tem_gateway;
  const jaCancelada = estado.status === "cancelada";
  // Assinatura encerrada não pode virar um segundo beco: quem cancelou
  // precisa poder voltar. E não faz sentido oferecer "cancelar" de novo.
  const podeAssinar = !ativa && !inadimplente && (!temAssinaturaLa || jaCancelada);
  const podeCancelar = temAssinaturaLa && !jaCancelada;

  // O plano gravado na conta, se é um dos vendidos. 'cortesia' e 'piloto'
  // (contas herdadas) não estão na vitrine e seguem sem limite.
  //
  // "Vendido" é decidido pelo CÓDIGO, não pela vitrine: se o dono tirar
  // um plano de venda (ativo = false no catálogo), quem já paga por ele
  // continua pagando — e não pode ler "cortesia" numa conta cobrada.
  const planoAtual = planos.find((p) => p.codigo === estado.plano) ?? null;
  const planoVendido =
    estado.plano === "essencial" || estado.plano === "profissional" || estado.plano === "master";
  const planoForaDaVitrine = (ativa || inadimplente) && !planoVendido;

  // O uso, em número: "8 de 10 eventos em andamento · 1 de 1 login".
  // A concordância segue a CONTAGEM, não o teto: "5 de 1 evento" seria
  // exatamente o caso de quem cancelou com a agenda cheia.
  const eventosTexto =
    estado.limite_eventos === null
      ? `${estado.eventos} ${estado.eventos === 1 ? "evento" : "eventos"} em andamento`
      : `${estado.eventos} de ${estado.limite_eventos} ${
          estado.eventos === 1 ? "evento" : "eventos"
        } em andamento`;
  const loginsTexto =
    estado.limite_logins === null
      ? `${estado.logins} ${estado.logins === 1 ? "login" : "logins"}`
      : `${estado.logins} de ${estado.limite_logins} ${
          estado.logins === 1 ? "login" : "logins"
        }`;
  // A tela sabe que está acima; não sabe POR QUÊ (aceite da cliente,
  // queda de plano, evento reativado). Diz o número e a saída — a causa
  // só se afirma quando é conhecida, e aqui não é.
  const usoAcima = estado.acima_do_plano
    ? ativa || inadimplente
      ? `${eventosTexto}. Nada foi travado; para criar o próximo, mude de plano ou espere um evento concluir.`
      : `${eventosTexto}. Nada foi travado; para criar o próximo, escolha um plano ou espere um evento concluir.`
    : null;

  const cartaoTexto = estado.cartao_final
    ? `${estado.cartao_bandeira ?? "cartão"} •••• ${estado.cartao_final}`
    : "—";

  function enviarCartao(troca: boolean) {
    setErro(null);
    setOk(null);
    const falta = faltaNoFormulario(form, troca ? null : cobranca);
    if (falta) {
      setErro(falta);
      return;
    }
    // o plano vai junto com o token: o que ela escolheu na vitrine é o que
    // o servidor cobra e grava, com o mesmo código
    const escolhido = planoEscolhido;
    if (!troca && !escolhido) {
      setErro("Escolha um plano.");
      return;
    }
    iniciar(async () => {
      const t = await tokenizar(form);
      if (t.erro || !t.token) {
        setErro(t.erro ?? "Não foi possível validar o cartão.");
        return;
      }
      const r =
        troca || !escolhido
          ? await atualizarCartao(t.token)
          : await assinar(escolhido.codigo, t.token, cobranca);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setForm({ numero: "", nome: "", mes: "", ano: "", cvv: "" });
      setModoForm(null);
      setPlanoEscolhido(null);
      setOk(troca ? "Cartão atualizado." : "Assinatura ativa. Obrigado!");
      router.refresh();
    });
  }

  function confirmarCancelamento() {
    iniciar(async () => {
      // limpar antes: sem isto, a mensagem de uma tentativa anterior fica
      // na tela e o cancelamento que deu certo parece ter falhado
      setErro(null);
      setOk(null);
      const r = await cancelar(motivo);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setCancelando(false);
      setMotivo("");
      setOk("Assinatura cancelada. Você pode voltar quando quiser.");
      router.refresh();
    });
  }

  function confirmarTroca(plano: PlanoDaVitrine) {
    iniciar(async () => {
      setErro(null);
      setOk(null);
      const r = await trocarPlano(plano.codigo);
      if (r.error) {
        setErro(r.error);
        return;
      }
      setTrocando(null);
      setOk(`Agora você está no ${plano.nome}. O novo valor vale a partir da próxima cobrança.`);
      router.refresh();
    });
  }

  const pilula = jaCancelada
    ? "cancelada"
    : cortesia
      ? "cortesia"
      : inadimplente
        ? "cobrança falhou"
        : null;

  const subtitulo = ativa
    ? planoForaDaVitrine
      ? "Sua conta segue liberada como cortesia."
      : null // o painel chumbo já diz a próxima cobrança
    : inadimplente
      ? "A última cobrança não passou. Nada foi bloqueado — atualize o cartão quando puder."
      : jaCancelada
        ? "Assinatura cancelada. Você pode voltar quando quiser."
        : cortesia
          ? "Sua conta está liberada como cortesia."
          : estado.pode_criar_evento
            ? "Seu primeiro evento é por nossa conta."
            : "Você já usou o evento gratuito. Escolha um plano para criar os próximos.";

  // A vitrine: os três cartões. Quem nunca assinou escolhe um e o
  // formulário abre para ele; quem já paga vê o seu marcado e muda para
  // outro sem refazer o cartão. Conta herdada (cortesia/piloto ativa)
  // não vê vitrine — não tem para onde subir.
  const mostrarVitrine =
    planos.length > 0 && !planoForaDaVitrine && (podeAssinar || ativa || inadimplente);
  const vitrine = mostrarVitrine && (
    <div style={{ marginTop: 24 }}>
      <div style={rotuloSecao}>{podeAssinar ? "Planos" : "Mudar de plano"}</div>
      <div className="subx-planos" style={{ marginTop: 12 }}>
        {planos.map((p) => {
          const atual = planoAtual?.codigo === p.codigo;
          const emTroca = trocando?.codigo === p.codigo;
          const acao = podeAssinar ? (
            <button
              className="subx-btn"
              style={{ width: "100%" }}
              disabled={pendente}
              onClick={() => {
                setErro(null);
                setOk(null);
                setPlanoEscolhido(p);
                setModoForm("assinar");
              }}
            >
              Assinar o {p.nome}
            </button>
          ) : atual ? null : emTroca ? (
            <>
              <p style={{ margin: "0 0 10px", font: `400 12.5px/1.5 ${F_UI}`, color: C.apoio }}>
                {/* descer de plano pede o número NA HORA da decisão: quantos
                    ela tem hoje e quantos o destino permite — "falar em
                    número", não descobrir depois */}
                {planoAtual && p.valorMensal < planoAtual.valorMensal
                  ? `Você tem ${estado.eventos} ${estado.eventos === 1 ? "evento" : "eventos"} em andamento e ${estado.logins} ${estado.logins === 1 ? "login" : "logins"}; o ${p.nome} permite ${p.eventosTexto === "sem limite" ? "eventos sem limite" : `${p.eventosTexto} eventos`} e ${p.loginsTexto === "sem limite" ? "logins sem limite" : `${p.loginsTexto} ${p.loginsTexto === "1" ? "login" : "logins"}`}. O novo valor vale a partir da próxima cobrança.`
                  : "O novo valor vale a partir da próxima cobrança."}
              </p>
              <div className="subx-actions">
                <button
                  className="subx-btn"
                  style={{ flex: 1 }}
                  disabled={pendente}
                  onClick={() => confirmarTroca(p)}
                >
                  {pendente ? "Mudando…" : "Confirmar"}
                </button>
                <button className="subx-btn2" disabled={pendente} onClick={() => setTrocando(null)}>
                  Voltar
                </button>
              </div>
            </>
          ) : (
            <button
              className="subx-btn2"
              style={{ width: "100%" }}
              disabled={pendente}
              onClick={() => {
                setErro(null);
                setOk(null);
                setTrocando(p);
              }}
            >
              Mudar para este
            </button>
          );
          return (
            <div
              key={p.codigo}
              style={{
                ...cardBranco,
                borderColor: atual ? C.chumbo : C.bordaCard,
                padding: "20px 22px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                <div style={{ font: `600 15px ${F_UI}`, color: C.forte }}>{p.nome}</div>
                {atual && (
                  <span
                    style={{
                      font: `500 11px ${F_MONO}`,
                      color: "#fff",
                      background: C.chumbo,
                      borderRadius: 999,
                      padding: "3px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    seu plano
                  </span>
                )}
              </div>
              <div
                style={{
                  marginTop: 10,
                  font: `600 24px ${F_MONO}`,
                  letterSpacing: "-0.01em",
                  color: C.forte,
                }}
              >
                {p.precoTexto}
                <span style={{ font: `400 13px ${F_MONO}`, color: C.rotulo }}> /mês</span>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${C.bordaFina}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  font: `400 12.5px ${F_UI}`,
                  color: C.apoio,
                  flex: 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>eventos em andamento</span>
                  <span style={{ font: `500 12.5px ${F_MONO}`, color: C.forte }}>
                    {p.eventosTexto}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>pessoas com login</span>
                  <span style={{ font: `500 12.5px ${F_MONO}`, color: C.forte }}>
                    {p.loginsTexto}
                  </span>
                </div>
              </div>
              {acao && <div style={{ marginTop: 18 }}>{acao}</div>}
            </div>
          );
        })}
      </div>
      {podeAssinar && (
        <p style={{ margin: "12px 0 0", font: `400 13px/1.5 ${F_UI}`, color: C.apoio }}>
          {cortesia
            ? "Sua cortesia continua valendo. A cobrança começa no dia em que você assinar."
            : "Cancele quando quiser, sem multa."}
        </p>
      )}
    </div>
  );

  return (
    <div
      className="subx-wrap"
      style={{
        background: C.canvas,
        borderRadius: 16,
        padding: "44px 56px 64px",
        fontFamily: F_UI,
      }}
    >
      {/* grades responsivas do design — colapsam a 720px */}
      <style>{`
        .subx-grid{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}
        .subx-row{display:flex;align-items:center;gap:16px}
        .subx-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .subx-form-grid>div,.subx-exp>div{min-width:0}
        .subx-form-grid input,.subx-form-grid select,.subx-exp input{width:100%;min-width:0}
        .subx-exp{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .subx-actions{display:flex;gap:10px;align-items:center}
        .subx-planos{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-items:stretch}
        .subx-in{height:44px;border:1px solid ${C.bordaCard};border-radius:10px;padding:0 12px;
          font:400 14px ${F_UI};color:${C.forte};background:#fff;outline:none;box-sizing:border-box}
        .subx-in--mono{font:400 14px ${F_MONO}}
        .subx-in:focus{border-color:${C.chumbo};box-shadow:0 0 0 3px rgba(35,38,42,.14)}
        .subx-in::placeholder{color:${C.bordaCard}}
        .subx-in:disabled{background:${C.recuo}}
        .subx-btn{height:38px;padding:0 18px;background:${C.chumbo};color:#fff;border:none;
          border-radius:8px;font:600 13.5px ${F_UI};cursor:pointer}
        .subx-btn:hover{background:${C.preto}}
        .subx-btn:disabled{opacity:.5;cursor:default}
        .subx-btn2{height:38px;padding:0 16px;background:transparent;color:${C.forte};
          border:1px solid ${C.bordaCard};border-radius:8px;font:600 13px ${F_UI};cursor:pointer}
        .subx-btn2:hover{background:#fff}
        .subx-btn2:disabled{opacity:.5;cursor:default}
        @media (max-width:720px){
          .subx-wrap{padding:28px 20px 40px !important}
          .subx-grid{grid-template-columns:1fr}
          .subx-planos{grid-template-columns:1fr}
          .subx-row{flex-direction:column;align-items:stretch}
          .subx-row button{width:100%;height:44px !important}
          .subx-actions{flex-direction:column;align-items:stretch}
          .subx-actions button{width:100%;height:44px !important}
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* cabeçalho */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1
            style={{
              margin: 0,
              font: `600 22px/1.2 ${F_TITLE}`,
              letterSpacing: "-0.02em",
              color: C.forte,
            }}
          >
            Assinatura
          </h1>
          {pilula && (
            <span
              style={{
                font: `500 12px ${F_MONO}`,
                color: C.apoio,
                background: C.recuo,
                border: `1px solid ${C.bordaFina}`,
                borderRadius: 999,
                padding: "4px 12px",
                whiteSpace: "nowrap",
              }}
            >
              {pilula}
            </span>
          )}
        </div>
        {subtitulo && !modoForm && (
          <p style={{ margin: "6px 0 0", font: `400 14px/1.5 ${F_UI}`, color: C.apoio }}>
            {subtitulo}
          </p>
        )}
        {/* o uso atual, em número — em âmbar quando a conta passou do teto */}
        {!modoForm && (
          <p
            style={{
              margin: "10px 0 0",
              font: `500 13.5px/1.55 ${F_UI}`,
              color: usoAcima ? AMBAR : C.forte,
            }}
          >
            {usoAcima ?? `${eventosTexto} · ${loginsTexto}`}
          </p>
        )}

        {/* avisos — neutros como o design manda; o erro se destaca pela borda forte */}
        {ok && !erro && (
          <p style={{ margin: "14px 0 0", font: `500 13.5px ${F_UI}`, color: C.forte }}>{ok}</p>
        )}
        {erro && (
          <div
            style={{
              marginTop: 14,
              background: C.recuo,
              border: `1px solid ${C.forte}`,
              borderRadius: 10,
              padding: "10px 14px",
              font: `500 13.5px/1.5 ${F_UI}`,
              color: C.forte,
            }}
          >
            {erro}
          </div>
        )}

        {/* ---------------- ATIVA / INADIMPLENTE ---------------- */}
        {(ativa || inadimplente) && !modoForm && (
          <>
            <div className="subx-grid" style={{ marginTop: 24 }}>
              {/* o painel do plano, em chumbo */}
              <div style={{ background: C.chumbo, borderRadius: 14, padding: 24, color: "#fff" }}>
                <div style={{ ...rotuloSecao, color: C.rotuloChumbo }}>Plano</div>
                <div style={{ marginTop: 10, font: `600 18px ${F_UI}` }}>{estado.plano_nome}</div>
                <div style={{ marginTop: 6, font: `600 28px ${F_MONO}`, letterSpacing: "-0.01em" }}>
                  {`R$ ${estado.valor_mensal.toFixed(2).replace(".", ",")}`}
                  <span style={{ font: `400 14px ${F_MONO}`, color: C.rotuloChumbo }}> /mês</span>
                </div>
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: `1px solid ${C.bordaChumbo}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      font: `400 12.5px ${F_UI}`,
                      color: C.sobChumbo,
                    }}
                  >
                    <span>Próxima cobrança</span>
                    <span style={{ font: `500 12px ${F_MONO}`, color: "#fff" }}>
                      {dataLonga(estado.proximo_vencimento) || "próximo ciclo"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      font: `400 12.5px ${F_UI}`,
                      color: C.sobChumbo,
                    }}
                  >
                    <span>Status</span>
                    <span style={{ font: `500 12px ${F_MONO}`, color: "#fff" }}>
                      {inadimplente ? "cobrança falhou" : "ativa"}
                    </span>
                  </div>
                </div>
              </div>

              {/* coluna direita: só o que ela pode mexer — o uso já está na linha do topo */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="subx-row" style={{ ...cardBranco, padding: "18px 24px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: `600 14px ${F_UI}`, color: C.forte }}>Forma de pagamento</div>
                    <div style={{ marginTop: 2, font: `400 13px ${F_UI}`, color: C.apoio }}>
                      {estado.cartao_final
                        ? `${cartaoTexto} · a cobrança mensal usa este cartão`
                        : "Nenhum cartão salvo."}
                    </div>
                  </div>
                  <button
                    className="subx-btn"
                    style={{ height: 34, background: C.preto }}
                    disabled={pendente}
                    onClick={() => setModoForm("trocar")}
                  >
                    {inadimplente ? "Atualizar cartão" : "Trocar cartão"}
                  </button>
                </div>
              </div>
            </div>

            {inadimplente && (
              <div
                style={{
                  marginTop: 16,
                  background: C.recuo,
                  border: `1px solid ${C.bordaFina}`,
                  borderRadius: 14,
                  padding: "14px 20px",
                  font: `400 13.5px/1.5 ${F_UI}`,
                  color: C.forte,
                }}
              >
                {estado.falhas_seguidas > 1
                  ? `A cobrança falhou ${estado.falhas_seguidas} vezes.`
                  : "A última cobrança falhou."}{" "}
                Seus eventos continuam funcionando normalmente — a gente não trava nada no meio de
                um casamento.
              </div>
            )}

            {vitrine}
          </>
        )}

        {/* ---------------- CORTESIA / CANCELADA / GRATUITO ---------------- */}
        {!ativa && !inadimplente && !modoForm && (
          <>
            {vitrine}

            {/* catálogo vazio: a assinatura ainda não abriu */}
            {podeAssinar && planos.length === 0 && (
              <div style={{ ...cardBranco, marginTop: 24, padding: "20px 24px" }}>
                <div style={{ font: `600 14px ${F_UI}`, color: C.forte }}>
                  A assinatura ainda não está aberta
                </div>
                <p style={{ margin: "4px 0 0", font: `400 13px/1.5 ${F_UI}`, color: C.apoio }}>
                  {cortesia
                    ? "Sua conta segue liberada como cortesia. Quando a assinatura abrir, você verá o valor aqui."
                    : estado.pode_criar_evento
                      ? "Seu primeiro evento continua liberado. Quando a assinatura abrir, você verá o valor aqui."
                      : "Fale com a gente para liberar os próximos eventos — a assinatura abre em breve."}
                </p>
              </div>
            )}

            {/* cortesia com assinatura viva no gateway: cartão e saída continuam à mão */}
            {temAssinaturaLa && !jaCancelada && (
              <div className="subx-row" style={{ ...cardBranco, marginTop: 16, padding: "18px 24px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `600 14px ${F_UI}`, color: C.forte }}>Forma de pagamento</div>
                  <div style={{ marginTop: 2, font: `400 13px ${F_UI}`, color: C.apoio }}>
                    {estado.cartao_final ? cartaoTexto : "Nenhum cartão salvo."}
                  </div>
                </div>
                <button
                  className="subx-btn"
                  style={{ height: 34, background: C.preto }}
                  disabled={pendente}
                  onClick={() => setModoForm("trocar")}
                >
                  Trocar cartão
                </button>
              </div>
            )}
          </>
        )}

        {/* ---------------- ZONA DE CANCELAMENTO ---------------- */}
        {podeCancelar && !modoForm && !cancelando && (
          <div
            className="subx-row"
            style={{
              marginTop: 32,
              background: C.recuo,
              border: `1px solid ${C.bordaFina}`,
              borderRadius: 14,
              padding: "20px 24px",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ font: `600 14px ${F_UI}`, color: C.forte }}>Cancelar assinatura</div>
              <p
                style={{
                  margin: "4px 0 0",
                  font: `400 13px/1.5 ${F_UI}`,
                  color: C.apoio,
                  maxWidth: 440,
                }}
              >
                Seus eventos e tudo o que está dentro deles continuam seus. Você só não poderá criar
                eventos novos.
              </p>
            </div>
            <button
              className="subx-btn2"
              style={{ height: 34 }}
              disabled={pendente}
              onClick={() => setCancelando(true)}
            >
              Cancelar
            </button>
          </div>
        )}

        {podeCancelar && !modoForm && cancelando && (
          <div
            style={{
              marginTop: 32,
              background: C.recuo,
              border: `1px solid ${C.bordaCard}`,
              borderRadius: 14,
              padding: "20px 24px",
            }}
          >
            <div style={{ font: `400 13.5px/1.5 ${F_UI}`, color: C.forte }}>
              Confirmar o cancelamento? A assinatura encerra hoje e nenhuma nova cobrança será
              feita.
            </div>
            <input
              className="subx-in"
              style={{ marginTop: 12, width: "100%" }}
              placeholder="Se quiser, conte o motivo (ajuda muito)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <div className="subx-actions" style={{ marginTop: 12 }}>
              <button
                className="subx-btn2"
                style={{ height: 34 }}
                disabled={pendente}
                onClick={() => setCancelando(false)}
              >
                Manter
              </button>
              <button
                className="subx-btn"
                style={{ height: 34 }}
                disabled={pendente}
                onClick={confirmarCancelamento}
              >
                {pendente ? "Cancelando…" : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- FORMULÁRIO ---------------- */}
        {modoForm && (
          <>
            {modoForm === "assinar" && planoEscolhido && (
              <p style={{ margin: "6px 0 0", font: `400 14px/1.5 ${F_UI}`, color: C.apoio }}>
                {planoEscolhido.nome} por{" "}
                <span style={{ font: `500 13px ${F_MONO}`, color: C.forte }}>
                  {planoEscolhido.precoTexto}
                </span>{" "}
                por mês. Cancele quando quiser, sem multa.
              </p>
            )}
            <div style={{ ...cardBranco, marginTop: 24, padding: "28px 24px" }}>
              <div style={rotuloSecao}>Cartão</div>
              <div className="subx-form-grid" style={{ marginTop: 14 }}>
                <div
                  style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <label style={{ font: `500 12.5px ${F_UI}`, color: C.apoio }}>
                    Número do cartão
                  </label>
                  <input
                    className="subx-in subx-in--mono"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    disabled={pendente}
                    value={form.numero}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        numero: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 19)
                          .replace(/(\d{4})(?=\d)/g, "$1 "),
                      })
                    }
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ font: `500 12.5px ${F_UI}`, color: C.apoio }}>
                    Nome como está no cartão
                  </label>
                  <input
                    className="subx-in"
                    autoComplete="cc-name"
                    disabled={pendente}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="subx-exp">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ font: `500 12.5px ${F_UI}`, color: C.apoio }}>Mês</label>
                    <input
                      className="subx-in subx-in--mono"
                      inputMode="numeric"
                      autoComplete="cc-exp-month"
                      placeholder="MM"
                      maxLength={2}
                      disabled={pendente}
                      value={form.mes}
                      onChange={(e) => setForm({ ...form, mes: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ font: `500 12.5px ${F_UI}`, color: C.apoio }}>Ano</label>
                    <input
                      className="subx-in subx-in--mono"
                      inputMode="numeric"
                      autoComplete="cc-exp-year"
                      placeholder="AA"
                      maxLength={4}
                      disabled={pendente}
                      value={form.ano}
                      onChange={(e) => setForm({ ...form, ano: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ font: `500 12.5px ${F_UI}`, color: C.apoio }}>CVV</label>
                    <input
                      className="subx-in subx-in--mono"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="000"
                      maxLength={4}
                      disabled={pendente}
                      value={form.cvv}
                      onChange={(e) => setForm({ ...form, cvv: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                </div>
              </div>

              {modoForm === "assinar" && (
                <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.bordaFina}` }}>
                  <div style={rotuloSecao}>Dados de cobrança</div>
                  <DadosDeCobranca valor={cobranca} onChange={setCobranca} desabilitado={pendente} />
                </div>
              )}

              <div className="subx-actions" style={{ marginTop: 24 }}>
                <button
                  className="subx-btn"
                  disabled={pendente}
                  onClick={() => enviarCartao(modoForm === "trocar")}
                >
                  {pendente
                    ? "Processando…"
                    : modoForm === "trocar"
                      ? "Salvar cartão"
                      : `Assinar o ${planoEscolhido?.nome ?? ""}`.trim()}
                </button>
                <button
                  className="subx-btn2"
                  disabled={pendente}
                  onClick={() => {
                    setModoForm(null);
                    setPlanoEscolhido(null);
                  }}
                >
                  Voltar
                </button>
              </div>
            </div>
          </>
        )}

        {/* rodapé legal */}
        <p style={{ marginTop: 28, font: `400 12px/1.5 ${F_UI}`, color: C.rotulo }}>
          O pagamento é processado pela Pagar.me. Os dados do seu cartão não passam pelos nossos
          servidores.
        </p>
      </div>
    </div>
  );
}
