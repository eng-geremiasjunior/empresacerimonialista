"use client";

// O checkout de quem chega do anúncio e ainda não tem conta.
//
// Não existe conta gratuita. Mandar a pessoa se cadastrar, sair, abrir o
// e-mail e voltar para pagar é perder no caminho quem já tinha decidido
// pagar — então a conta nasce e a cobrança acontece no mesmo envio.
//
// Três etapas, na ordem em que ela pensa: quem é você → onde você está →
// como você paga. Errar o CPF aparece no passo 1, não depois de digitar
// o cartão.
//
// O cartão vai do formulário DIRETO para o gateway (chave pública), que
// devolve um token de uso único; só o token chega ao nosso servidor. É a
// mesma `tokenizar` da tela de dentro do app — código de dinheiro mora
// num lugar só.
//
// SEM PIXEL NESTA TELA, de propósito: aqui há campos de cartão, e script
// de terceiro não entra em formulário de pagamento. Os eventos de
// InitiateCheckout e Purchase saem pelo servidor, com o valor real.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assinarCriandoConta } from "@/app/(app)/assinatura/actions";
import { createClient } from "@/lib/supabase/client";
import { guardarOrigemDoClique } from "@/lib/marketing";
import { TERMOS_CAMINHO } from "@/lib/termos";
import {
  faltaNoCartao,
  faltaNoEndereco,
  faltaNosDadosPessoais,
  tokenizar,
} from "@/lib/assinatura/cartao";
import {
  COBRANCA_VAZIA,
  DadosPessoais,
  EnderecoDeCobranca,
  type Cobranca,
} from "@/components/assinatura/DadosDeCobranca";
import { C, CSS_ASSINATURA, F_MONO, F_TITLE, F_UI } from "@/components/assinatura/estilo-assinatura";
import { Simbolo } from "@/components/marca/Marca";

export type OfertaDoCheckout = {
  planoCodigo: string;
  planoNome: string;
  /** o que vai ser cobrado AGORA, já com o degrau da promoção */
  precoTexto: string;
  /** o preço de tabela, quando a promoção está valendo */
  precoCheioTexto: string | null;
  /** a escada inteira numa frase, quando há promoção */
  fraseDaEscada: string | null;
  eventosTexto: string;
  loginsTexto: string;
};

const rotulo: React.CSSProperties = { font: `500 12.5px ${F_UI}`, color: C.apoio };
const grupo: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };

export function ComecarAgora({ oferta }: { oferta: OfertaDoCheckout }) {
  const router = useRouter();
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [conta, setConta] = useState({ nome: "", negocio: "", email: "", senha: "" });
  const [cobranca, setCobranca] = useState<Cobranca>(COBRANCA_VAZIA);
  const [cartao, setCartao] = useState({ numero: "", nome: "", mes: "", ano: "", cvv: "" });
  const [aceitei, setAceitei] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [jaTemConta, setJaTemConta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [, startTransition] = useTransition();

  // A origem do clique (o anúncio de onde ela veio) mora num cookie que o
  // pixel da /planos deixou no domínio. Guardar aqui é o que permite ao
  // servidor dizer, depois, de qual anúncio saiu esta venda.
  useEffect(() => {
    guardarOrigemDoClique();
  }, []);

  // O e-mail e o nome da conta são também os da cobrança — pedir duas
  // vezes o mesmo dado é burocracia sem ganho. Ela ainda pode trocar.
  function mudarConta(p: Partial<typeof conta>) {
    const novo = { ...conta, ...p };
    setConta(novo);
    setCobranca((c) => ({
      ...c,
      nome: c.nome === conta.nome || !c.nome ? novo.nome : c.nome,
      email: c.email === conta.email || !c.email ? novo.email : c.email,
    }));
  }

  function faltaNaConta(): string | null {
    if (conta.nome.trim().length < 2) return "Escreva seu nome.";
    if (conta.negocio.trim().length < 2) return "Escreva o nome do seu negócio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(conta.email.trim()))
      return "Confira o e-mail digitado.";
    if (conta.senha.length < 6) return "A senha precisa de pelo menos 6 caracteres.";
    return faltaNosDadosPessoais(cobranca);
  }

  function avancar() {
    setErro(null);
    const falta = passo === 1 ? faltaNaConta() : faltaNoEndereco(cobranca);
    if (falta) {
      setErro(falta);
      return;
    }
    setPasso(passo === 1 ? 2 : 3);
  }

  async function enviar() {
    setErro(null);
    setJaTemConta(false);
    const falta = faltaNaConta() ?? faltaNoEndereco(cobranca) ?? faltaNoCartao(cartao);
    if (falta) {
      setErro(falta);
      return;
    }
    if (!aceitei) {
      setErro("Para assinar, é preciso aceitar os Termos e Condições.");
      return;
    }

    setEnviando(true);
    const t = await tokenizar(cartao);
    if (!t.token) {
      setErro(t.erro ?? "Confira os dados do cartão.");
      setEnviando(false);
      return;
    }

    // Sem este try, uma exceção na action (rede caindo no meio, o servidor
    // reiniciando) deixava o botão preso em "Confirmando…" para sempre, e
    // a pessoa sem saber se pagou ou não.
    let r: Awaited<ReturnType<typeof assinarCriandoConta>>;
    try {
      r = await assinarCriandoConta(
        {
          nome: conta.nome,
          negocio: conta.negocio,
          email: conta.email,
          senha: conta.senha,
        },
        oferta.planoCodigo,
        t.token,
        cobranca,
        aceitei
      );
    } catch {
      setErro(
        "Não conseguimos falar com o servidor agora. Tente de novo em alguns instantes — se a cobrança tiver passado, ela não será feita duas vezes."
      );
      setEnviando(false);
      return;
    }

    if (r && "error" in r && r.error) {
      setErro(r.error);
      setJaTemConta("jaTemConta" in r && r.jaTemConta === true);
      setEnviando(false);
      return;
    }

    // Pagou. A sessão nasce aqui, com a senha que ela acabou de escolher —
    // é o que a leva ao painel sem passar por tela de login.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: conta.email.trim().toLowerCase(),
      password: conta.senha,
    });
    if (error) {
      // A assinatura ESTÁ paga; só a sessão não abriu. Dizer a verdade e
      // mandar para o login é melhor do que uma tela girando.
      setErro("Assinatura confirmada! Entre com seu e-mail e senha para começar.");
      setEnviando(false);
      startTransition(() => router.push("/login"));
      return;
    }
    startTransition(() => {
      router.push("/eventos/dashboard");
      router.refresh();
    });
  }

  const etapas = ["Sua conta", "Endereço", "Pagamento"];

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, padding: "24px 16px 64px" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS_ASSINATURA }} />

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Simbolo tamanho={26} />
          <span
            style={{
              font: `600 18px ${F_TITLE}`,
              letterSpacing: "-0.03em",
              color: "#221E1B",
            }}
          >
            e<span style={{ color: "#6E3F5F" }}>organizei</span>
          </span>
        </div>

        {/* A oferta, à vista, do lado de quem está digitando o cartão: o
            número que ela leu no anúncio precisa estar aqui também. */}
        <div
          style={{
            background: C.chumbo,
            color: "#fff",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, font: `500 12px ${F_MONO}`, letterSpacing: ".06em", color: C.rotuloChumbo, textTransform: "uppercase" }}>
            {oferta.fraseDaEscada ? "Condição de lançamento" : "Sua assinatura"}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <b style={{ font: `600 30px ${F_MONO}`, letterSpacing: "-0.02em" }}>{oferta.precoTexto}</b>
            <span style={{ font: `400 14px ${F_UI}`, color: C.sobChumbo }}>por mês</span>
            {oferta.precoCheioTexto && (
              <span
                style={{
                  font: `400 14px ${F_MONO}`,
                  color: C.rotuloChumbo,
                  textDecoration: "line-through",
                }}
              >
                {oferta.precoCheioTexto}
              </span>
            )}
          </div>
          <p style={{ margin: "8px 0 0", font: `400 13.5px/1.55 ${F_UI}`, color: C.sobChumbo }}>
            Plano {oferta.planoNome} · {oferta.eventosTexto} eventos em andamento ·{" "}
            {oferta.loginsTexto} {oferta.loginsTexto === "1" ? "login" : "logins"}
          </p>
          {oferta.fraseDaEscada && (
            <p style={{ margin: "10px 0 0", font: `400 12.5px/1.55 ${F_UI}`, color: C.rotuloChumbo }}>
              {oferta.fraseDaEscada}. Cancela quando quiser, sem multa.
            </p>
          )}
        </div>

        <div
          style={{
            background: C.card,
            border: `1px solid ${C.bordaCard}`,
            borderRadius: 14,
            padding: "22px 22px 26px",
          }}
        >
          <ol className="subx-trilha">
            {etapas.map((e, i) => (
              <li key={e} data-atual={passo === i + 1} data-feita={passo > i + 1}>
                <span className="subx-trilha-num">{i + 1}</span>
                {e}
              </li>
            ))}
          </ol>

          {passo === 1 && (
            <>
              <h2 style={{ margin: 0, font: `600 17px ${F_TITLE}`, color: C.forte }}>
                Quem vai usar o sistema
              </h2>
              <div className="subx-form-grid" style={{ marginTop: 14 }}>
                <div style={grupo}>
                  <label style={rotulo}>Seu nome</label>
                  <input
                    className="subx-in"
                    disabled={enviando}
                    value={conta.nome}
                    onChange={(e) => mudarConta({ nome: e.target.value })}
                  />
                </div>
                <div style={grupo}>
                  <label style={rotulo}>Nome do seu negócio</label>
                  <input
                    className="subx-in"
                    disabled={enviando}
                    value={conta.negocio}
                    onChange={(e) => mudarConta({ negocio: e.target.value })}
                  />
                </div>
                <div style={grupo}>
                  <label style={rotulo}>E-mail de acesso</label>
                  <input
                    className="subx-in"
                    type="email"
                    autoComplete="email"
                    disabled={enviando}
                    value={conta.email}
                    onChange={(e) => mudarConta({ email: e.target.value })}
                  />
                </div>
                <div style={grupo}>
                  <label style={rotulo}>Senha</label>
                  <input
                    className="subx-in"
                    type="password"
                    autoComplete="new-password"
                    disabled={enviando}
                    value={conta.senha}
                    onChange={(e) => setConta({ ...conta, senha: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{ margin: "22px 0 0", font: `600 15px ${F_TITLE}`, color: C.forte }}>
                Dados da cobrança
              </h3>
              <DadosPessoais valor={cobranca} onChange={setCobranca} desabilitado={enviando} />
            </>
          )}

          {passo === 2 && (
            <>
              <h2 style={{ margin: 0, font: `600 17px ${F_TITLE}`, color: C.forte }}>
                Endereço de cobrança
              </h2>
              <p style={{ margin: "6px 0 0", font: `400 13.5px/1.55 ${F_UI}`, color: C.apoio }}>
                É o endereço do cartão — a operadora usa para confirmar a compra.
              </p>
              <EnderecoDeCobranca valor={cobranca} onChange={setCobranca} desabilitado={enviando} />
            </>
          )}

          {passo === 3 && (
            <>
              <h2 style={{ margin: 0, font: `600 17px ${F_TITLE}`, color: C.forte }}>Pagamento</h2>
              <p style={{ margin: "6px 0 0", font: `400 13.5px/1.55 ${F_UI}`, color: C.apoio }}>
                O cartão vai direto para a operadora. O número não passa pelo eorganizei.
              </p>
              <div className="subx-form-grid" style={{ marginTop: 14 }}>
                <div style={{ ...grupo, gridColumn: "1 / -1" }}>
                  <label style={rotulo}>Número do cartão</label>
                  <input
                    className="subx-in subx-in--mono"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    disabled={enviando}
                    value={cartao.numero}
                    onChange={(e) => setCartao({ ...cartao, numero: e.target.value })}
                  />
                </div>
                <div style={{ ...grupo, gridColumn: "1 / -1" }}>
                  <label style={rotulo}>Nome como está no cartão</label>
                  <input
                    className="subx-in"
                    autoComplete="cc-name"
                    disabled={enviando}
                    value={cartao.nome}
                    onChange={(e) => setCartao({ ...cartao, nome: e.target.value })}
                  />
                </div>
              </div>
              <div className="subx-exp" style={{ marginTop: 14 }}>
                <div style={grupo}>
                  <label style={rotulo}>Mês</label>
                  <input
                    className="subx-in subx-in--mono"
                    inputMode="numeric"
                    placeholder="12"
                    autoComplete="cc-exp-month"
                    disabled={enviando}
                    value={cartao.mes}
                    onChange={(e) => setCartao({ ...cartao, mes: e.target.value })}
                  />
                </div>
                <div style={grupo}>
                  <label style={rotulo}>Ano</label>
                  <input
                    className="subx-in subx-in--mono"
                    inputMode="numeric"
                    placeholder="2030"
                    autoComplete="cc-exp-year"
                    disabled={enviando}
                    value={cartao.ano}
                    onChange={(e) => setCartao({ ...cartao, ano: e.target.value })}
                  />
                </div>
                <div style={grupo}>
                  <label style={rotulo}>CVV</label>
                  <input
                    className="subx-in subx-in--mono"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    disabled={enviando}
                    value={cartao.cvv}
                    onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
                  />
                </div>
              </div>

              <label className="subx-aceite" style={{ marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={aceitei}
                  disabled={enviando}
                  onChange={(e) => setAceitei(e.target.checked)}
                />
                <span>
                  Li e aceito os{" "}
                  <a href={TERMOS_CAMINHO} target="_blank" rel="noreferrer">
                    Termos e Condições
                  </a>
                  . A assinatura é mensal e você cancela quando quiser, sem multa.
                </span>
              </label>
            </>
          )}

          {erro && (
            <p style={{ margin: "16px 0 0", font: `400 13.5px/1.5 ${F_UI}`, color: "#8A2E22" }}>
              {erro}
              {jaTemConta && (
                <>
                  {" "}
                  <a href="/login" style={{ color: C.forte, textDecoration: "underline" }}>
                    Entrar
                  </a>
                </>
              )}
            </p>
          )}

          <div className="subx-actions" style={{ marginTop: 22 }}>
            {passo > 1 && (
              <button
                type="button"
                className="subx-btn2"
                disabled={enviando}
                onClick={() => {
                  setErro(null);
                  setPasso(passo === 3 ? 2 : 1);
                }}
              >
                Voltar
              </button>
            )}
            {passo < 3 ? (
              <button type="button" className="subx-btn" disabled={enviando} onClick={avancar}>
                Continuar
              </button>
            ) : (
              <button type="button" className="subx-btn" disabled={enviando} onClick={enviar}>
                {enviando ? "Confirmando…" : `Assinar por ${oferta.precoTexto}`}
              </button>
            )}
          </div>
        </div>

        <p
          style={{
            margin: "16px 0 0",
            textAlign: "center",
            font: `400 13px ${F_UI}`,
            color: C.apoio,
          }}
        >
          Já tem conta?{" "}
          <a href="/login" style={{ color: C.forte, textDecoration: "underline" }}>
            Entrar
          </a>
        </p>
      </div>
    </div>
  );
}
