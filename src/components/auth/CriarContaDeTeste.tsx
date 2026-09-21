"use client";

// A tela do teste de sete dias — com o cartão no cadastro (21/09/2026).
//
// Duas etapas, na ordem em que ela pensa: quem é você → o cartão. A
// primeira é a mesma de antes (nome, negócio, e-mail, WhatsApp, senha,
// quantos eventos, Instagram). A segunda pede o que a operadora exige de
// quem paga (CPF ou CNPJ e o endereço do cartão, que o CEP preenche) e o
// cartão — e diz, em destaque, o que o dono fez questão de deixar claro:
// hoje não se paga nada; a primeira cobrança é no dia seguinte ao fim do
// teste; cancelou antes, não pagou.
//
// O cartão vai do formulário DIRETO para a operadora (chave pública), que
// devolve um token de uso único; só o token chega ao nosso servidor. Por
// isso esta página não carrega pixel nem tag: script de terceiro não
// entra em formulário de pagamento. A conversão do cadastro sai pelo
// servidor.
//
// Do clique até a primeira tela do sistema não há confirmação de e-mail
// no meio: a conta nasce confirmada, a sessão abre aqui e ela cai no
// painel.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { criarContaDeTeste, type CobrancaDoCadastro } from "@/app/criar-conta/actions";
import { contaCriada, guardarOrigemDoClique } from "@/lib/marketing";
import { normalizarDDI } from "@/lib/whatsapp-link";
import { EVENTOS_3_MESES, type Eventos3Meses } from "@/lib/cadastro-qualificacao";
import { faltaNoCartao, faltaNoEndereco, tokenizar } from "@/lib/assinatura/cartao";
import { COBRANCA_VAZIA } from "@/components/assinatura/DadosDeCobranca";
import { documentoValido, mascararDocumento } from "@/lib/documento";
import { mascararCep, UFS } from "@/lib/contato";
import { TERMOS_CAMINHO } from "@/lib/termos";

const C = {
  fundo: "#FAF8F5",
  tinta: "#221E1B",
  corpo: "#3D3835",
  meta: "#6B6259",
  borda: "#E6E0D8",
  ameixa: "#6E3F5F",
  ameixaClaro: "#F3EBF0",
};
const F_TITLE = "var(--font-title, Inter, sans-serif)";
const F_MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

/** A oferta já em palavras: a página calcula, a tela só mostra. */
export type OfertaNaTela = {
  dias: number;
  /** "28 de setembro" — o dia da primeira cobrança */
  comecaEm: string;
  /** "27 de setembro" — o último dia do teste */
  termina: string;
  /** "R$ 27,90/mês nos 3 primeiros meses, depois R$ 59,90" */
  preco: string;
  /** "R$ 27,90" */
  primeiraCobranca: string;
  planoNome: string;
};

const campo = {
  width: "100%",
  height: "46px",
  padding: "0 14px",
  borderRadius: "8px",
  border: `1px solid ${C.borda}`,
  background: "#FFFFFF",
  color: C.tinta,
  fontFamily: "inherit",
  fontSize: "16px",
  outline: "none",
} as const;
const campoMono = { ...campo, fontFamily: F_MONO, fontSize: "15px" } as const;
const rotulo = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13.5px",
  fontWeight: 500,
  color: C.corpo,
} as const;
const dica = { margin: "6px 0 0", fontSize: "12.5px", color: C.meta } as const;

function Botao({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="pl-h-ameixa pl-cta"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "52px",
        padding: "0 24px",
        borderRadius: "8px",
        border: "none",
        background: C.ameixa,
        color: "#FAF8F5",
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: "16.5px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}

export function CriarContaDeTeste({
  oferta,
  precoDeEntrada,
}: {
  oferta: OfertaNaTela;
  /** o preço do botão "assinar agora", sem teste */
  precoDeEntrada: string | null;
}) {
  const router = useRouter();
  const [passo, setPasso] = useState<1 | 2>(1);

  // etapa 1 — a conta
  const [nome, setNome] = useState("");
  const [negocio, setNegocio] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [eventos3m, setEventos3m] = useState<Eventos3Meses | null>(null);
  const [instagram, setInstagram] = useState("");

  // etapa 2 — o cartão
  const [cobranca, setCobranca] = useState<CobrancaDoCadastro>({
    documento: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [cartao, setCartao] = useState({ numero: "", nome: "", mes: "", ano: "", cvv: "" });
  const [aceitei, setAceitei] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  // o CEP preencheu: rua, bairro, cidade e estado ficam à vista para conferir
  const [enderecoAberto, setEnderecoAberto] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [jaTemConta, setJaTemConta] = useState(false);
  const [enviando, setEnviando] = useState<null | "conferindo" | "abrindo">(null);
  const [, startTransition] = useTransition();

  // o clique que trouxe ela até aqui, guardado antes de qualquer coisa
  useEffect(() => {
    guardarOrigemDoClique();
  }, []);

  const contaCompleta =
    nome.trim().length >= 2 &&
    negocio.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    senha.length >= 6 &&
    normalizarDDI(whatsapp) !== null &&
    eventos3m !== null;

  const set = (p: Partial<CobrancaDoCadastro>) => setCobranca((c) => ({ ...c, ...p }));

  /** O CEP preenche o resto. Se o serviço não responder, ela digita à mão. */
  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = (await r.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!j.erro) {
        set({
          rua: j.logradouro || "",
          bairro: j.bairro || "",
          cidade: j.localidade || "",
          estado: (j.uf || "").toUpperCase(),
        });
      }
    } catch {
      // sem internet ou serviço fora: segue o preenchimento manual
    } finally {
      setBuscandoCep(false);
      setEnderecoAberto(true);
    }
  }

  function faltaNoPagamento(): string | null {
    if (!documentoValido(cobranca.documento)) return "Informe um CPF ou CNPJ válido.";
    const endereco = faltaNoEndereco({ ...COBRANCA_VAZIA, ...cobranca });
    if (endereco) return endereco;
    return faltaNoCartao(cartao);
  }

  function continuar() {
    setErro(null);
    if (!contaCompleta) return;
    setPasso(2);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (passo !== 2 || enviando) return;
    setErro(null);
    setJaTemConta(false);
    const falta = faltaNoPagamento();
    if (falta) {
      setErro(falta);
      return;
    }
    if (!aceitei) {
      setErro("Para começar, é preciso aceitar os Termos e Condições.");
      return;
    }

    setEnviando("conferindo");
    // o cartão vai direto para a operadora; só o token vem para cá
    const t = await tokenizar(cartao);
    if (!t.token) {
      setErro(t.erro ?? "Confira os dados do cartão.");
      setEnviando(null);
      return;
    }

    setEnviando("abrindo");
    let r;
    try {
      r = await criarContaDeTeste(
        { nome, negocio, email, senha, whatsapp, eventos3m: eventos3m ?? "", instagram },
        { cardToken: t.token, cobranca, aceitouTermos: aceitei }
      );
    } catch {
      setErro("Não foi possível criar a conta agora. Tente de novo em alguns instantes.");
      setEnviando(null);
      return;
    }

    if (!r?.ok) {
      setErro(r?.error ?? "Não foi possível criar a conta agora.");
      setJaTemConta(Boolean(r?.jaTemConta));
      setEnviando(null);
      return;
    }

    // A conta existe: a Meta já recebeu o cadastro pelo servidor; o
    // navegador só repete com o MESMO id, se houver pixel (aqui não há).
    contaCriada(r.idDoEvento);

    // A sessão nasce aqui, com a senha que ela acabou de escolher — é o
    // que a leva ao painel sem passar por tela de login.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) {
      setErro("Sua conta está criada! Entre com seu e-mail e senha para começar.");
      setEnviando(null);
      startTransition(() => router.push("/login"));
      return;
    }
    startTransition(() => {
      router.push("/eventos/dashboard");
      router.refresh();
    });
  }

  const travado = enviando !== null;

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* onde ela está: 1 conta · 2 cartão */}
      <ol
        aria-label="Etapas"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          gap: "14px",
          fontSize: "12.5px",
          color: C.meta,
        }}
      >
        {["Sua conta", "Cartão"].map((nomeDaEtapa, i) => {
          const atual = passo === i + 1;
          return (
            <li
              key={nomeDaEtapa}
              aria-current={atual ? "step" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: atual ? 600 : 400,
                color: atual ? C.tinta : C.meta,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `1px solid ${atual ? C.ameixa : C.borda}`,
                  background: atual ? C.ameixa : "transparent",
                  color: atual ? "#FAF8F5" : C.meta,
                  fontFamily: F_MONO,
                  fontSize: "11px",
                }}
              >
                {i + 1}
              </span>
              {nomeDaEtapa}
            </li>
          );
        })}
      </ol>

      {passo === 1 && (
        <>
          <div>
            <label htmlFor="cc-nome" style={rotulo}>
              Seu nome
            </label>
            <input
              id="cc-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              style={campo}
            />
          </div>
          <div>
            <label htmlFor="cc-negocio" style={rotulo}>
              Nome do seu negócio
            </label>
            <input
              id="cc-negocio"
              value={negocio}
              onChange={(e) => setNegocio(e.target.value)}
              autoComplete="organization"
              placeholder="pode ser o seu próprio nome"
              style={campo}
            />
            <p style={dica}>Exclusivo para assessoras e cerimonialistas.</p>
          </div>
          <div>
            <label htmlFor="cc-email" style={rotulo}>
              E-mail
            </label>
            <input
              id="cc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={campo}
            />
          </div>
          <div>
            <label htmlFor="cc-whatsapp" style={rotulo}>
              WhatsApp
            </label>
            <input
              id="cc-whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              autoComplete="tel"
              placeholder="(11) 99999-0000"
              style={campo}
            />
            <p style={dica}>Com DDD. É por ele que a gente te ajuda durante o teste.</p>
          </div>
          <div>
            <label htmlFor="cc-senha" style={rotulo}>
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="cc-senha"
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                style={{ ...campo, paddingRight: "84px" }}
              />
              {/* no lugar do "confirme sua senha": ver o que digitou */}
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-pressed={verSenha}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "6px",
                  height: "34px",
                  padding: "0 10px",
                  border: "none",
                  borderRadius: "6px",
                  background: "transparent",
                  color: C.meta,
                  fontFamily: "inherit",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {verSenha ? "Esconder" : "Mostrar"}
              </button>
            </div>
            <p style={dica}>Pelo menos 6 caracteres.</p>
          </div>

          <fieldset style={{ margin: 0, padding: 0, border: "none" }}>
            <legend style={{ ...rotulo, padding: 0 }}>
              Quantos eventos você tem nos próximos 3 meses?
            </legend>
            <div role="radiogroup" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {EVENTOS_3_MESES.map((o) => {
                const marcado = eventos3m === o.valor;
                return (
                  <button
                    key={o.valor}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    onClick={() => setEventos3m(o.valor)}
                    style={{
                      minHeight: "42px",
                      padding: "0 14px",
                      borderRadius: "8px",
                      border: `1px solid ${marcado ? C.ameixa : C.borda}`,
                      background: marcado ? C.ameixaClaro : "#FFFFFF",
                      color: marcado ? "#4A2A40" : C.corpo,
                      fontFamily: "inherit",
                      fontSize: "14.5px",
                      fontWeight: marcado ? 600 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {o.rotulo}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="cc-instagram" style={rotulo}>
              @ do Instagram profissional{" "}
              <span style={{ fontWeight: 400, color: C.meta }}>(opcional)</span>
            </label>
            <input
              id="cc-instagram"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="@seuperfil"
              style={campo}
            />
          </div>

          <Botao disabled={!contaCompleta} onClick={continuar}>
            Continuar
          </Botao>
          <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.5, color: C.meta, textAlign: "center" }}>
            No próximo passo, o cartão. Nada é cobrado hoje: a primeira cobrança é em{" "}
            <strong style={{ color: C.corpo }}>{oferta.comecaEm}</strong>.
          </p>
        </>
      )}

      {passo === 2 && (
        <>
          {/* O DESTAQUE (pedido do dono): o que acontece com o cartão, em
              três linhas, antes de qualquer campo. */}
          <div
            style={{
              borderRadius: "10px",
              background: C.ameixaClaro,
              border: "1px solid #E7D9E3",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "14.5px",
              lineHeight: 1.5,
              color: "#4A2A40",
            }}
          >
            <p style={{ margin: 0, fontFamily: F_TITLE, fontWeight: 600, fontSize: "16.5px", color: C.tinta }}>
              Hoje você não paga nada.
            </p>
            <p style={{ margin: 0 }}>
              Seu teste vai até <strong>{oferta.termina}</strong>. A primeira cobrança é em{" "}
              <strong>{oferta.comecaEm}</strong>: {oferta.preco}.
            </p>
            <p style={{ margin: 0 }}>
              Cancele até {oferta.termina}, em um clique, e nada é cobrado.
            </p>
          </div>

          <div>
            <label htmlFor="cc-documento" style={rotulo}>
              CPF ou CNPJ de quem paga
            </label>
            <input
              id="cc-documento"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cobranca.documento}
              onChange={(e) => set({ documento: mascararDocumento(e.target.value) })}
              disabled={travado}
              style={campoMono}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label htmlFor="cc-cep" style={rotulo}>
                CEP do endereço do cartão{" "}
                {buscandoCep && <span style={{ fontWeight: 400, color: C.meta }}>buscando…</span>}
              </label>
              <input
                id="cc-cep"
                inputMode="numeric"
                placeholder="00000-000"
                autoComplete="postal-code"
                value={cobranca.cep}
                onChange={(e) => {
                  const v = mascararCep(e.target.value);
                  set({ cep: v });
                  if (v.replace(/\D/g, "").length === 8) void buscarCep(v);
                }}
                disabled={travado}
                style={campoMono}
              />
            </div>
            <div>
              <label htmlFor="cc-numero" style={rotulo}>
                Número
              </label>
              <input
                id="cc-numero"
                value={cobranca.numero}
                onChange={(e) => set({ numero: e.target.value })}
                disabled={travado}
                style={campoMono}
              />
            </div>
          </div>

          {(enderecoAberto || cobranca.rua || cobranca.cidade) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="cc-rua" style={rotulo}>
                  Rua
                </label>
                <input
                  id="cc-rua"
                  value={cobranca.rua}
                  onChange={(e) => set({ rua: e.target.value })}
                  disabled={travado}
                  style={campo}
                />
              </div>
              <div>
                <label htmlFor="cc-complemento" style={rotulo}>
                  Complemento <span style={{ fontWeight: 400, color: C.meta }}>(opcional)</span>
                </label>
                <input
                  id="cc-complemento"
                  value={cobranca.complemento}
                  onChange={(e) => set({ complemento: e.target.value })}
                  disabled={travado}
                  style={campo}
                />
              </div>
              <div>
                <label htmlFor="cc-bairro" style={rotulo}>
                  Bairro
                </label>
                <input
                  id="cc-bairro"
                  value={cobranca.bairro}
                  onChange={(e) => set({ bairro: e.target.value })}
                  disabled={travado}
                  style={campo}
                />
              </div>
              <div>
                <label htmlFor="cc-cidade" style={rotulo}>
                  Cidade
                </label>
                <input
                  id="cc-cidade"
                  value={cobranca.cidade}
                  onChange={(e) => set({ cidade: e.target.value })}
                  disabled={travado}
                  style={campo}
                />
              </div>
              <div>
                <label htmlFor="cc-estado" style={rotulo}>
                  Estado
                </label>
                <select
                  id="cc-estado"
                  value={cobranca.estado}
                  onChange={(e) => set({ estado: e.target.value })}
                  disabled={travado}
                  style={{ ...campo, appearance: "auto" as const }}
                >
                  <option value="">—</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="cc-cartao" style={rotulo}>
              Número do cartão
            </label>
            <input
              id="cc-cartao"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cartao.numero}
              onChange={(e) => setCartao({ ...cartao, numero: e.target.value })}
              disabled={travado}
              style={campoMono}
            />
            <p style={dica}>Crédito. Vai direto para a operadora: o número não passa pelo eorganizei.</p>
          </div>
          <div>
            <label htmlFor="cc-cartao-nome" style={rotulo}>
              Nome como está no cartão
            </label>
            <input
              id="cc-cartao-nome"
              autoComplete="cc-name"
              value={cartao.nome}
              onChange={(e) => setCartao({ ...cartao, nome: e.target.value })}
              disabled={travado}
              style={campo}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label htmlFor="cc-mes" style={rotulo}>
                Mês
              </label>
              <input
                id="cc-mes"
                inputMode="numeric"
                placeholder="12"
                autoComplete="cc-exp-month"
                value={cartao.mes}
                onChange={(e) => setCartao({ ...cartao, mes: e.target.value })}
                disabled={travado}
                style={campoMono}
              />
            </div>
            <div>
              <label htmlFor="cc-ano" style={rotulo}>
                Ano
              </label>
              <input
                id="cc-ano"
                inputMode="numeric"
                placeholder="2030"
                autoComplete="cc-exp-year"
                value={cartao.ano}
                onChange={(e) => setCartao({ ...cartao, ano: e.target.value })}
                disabled={travado}
                style={campoMono}
              />
            </div>
            <div>
              <label htmlFor="cc-cvv" style={rotulo}>
                CVV
              </label>
              <input
                id="cc-cvv"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cartao.cvv}
                onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
                disabled={travado}
                style={campoMono}
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "13.5px",
              lineHeight: 1.5,
              color: C.corpo,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={aceitei}
              onChange={(e) => setAceitei(e.target.checked)}
              disabled={travado}
              style={{ width: "20px", height: "20px", margin: "1px 0 0", flex: "none", accentColor: C.ameixa }}
            />
            <span>
              Li e aceito os{" "}
              <a href={TERMOS_CAMINHO} target="_blank" rel="noreferrer" style={{ color: C.ameixa }}>
                Termos e Condições
              </a>
              . A assinatura do plano {oferta.planoNome} começa em {oferta.comecaEm} ({oferta.preco}), é
              mensal e eu cancelo quando quiser, sem multa.
            </span>
          </label>

          {erro && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "10px 12px",
                borderRadius: "8px",
                background: C.ameixaClaro,
                color: "#4A2A40",
                fontSize: "13.5px",
                lineHeight: 1.45,
              }}
            >
              {erro}
              {jaTemConta && (
                <>
                  {" "}
                  <a href="/login" style={{ color: C.ameixa, fontWeight: 600 }}>
                    Entrar
                  </a>
                </>
              )}
            </p>
          )}

          <Botao type="submit" disabled={travado || !aceitei}>
            {enviando === "conferindo"
              ? "Conferindo o cartão…"
              : enviando === "abrindo"
                ? "Abrindo sua conta…"
                : `Começar meu teste de ${oferta.dias} dias`}
          </Botao>

          <button
            type="button"
            onClick={() => {
              setErro(null);
              setPasso(1);
            }}
            disabled={travado}
            style={{
              border: "none",
              background: "transparent",
              color: C.meta,
              fontFamily: "inherit",
              fontSize: "13.5px",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Voltar e corrigir os dados da conta
          </button>
        </>
      )}

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          fontSize: "13.5px",
          lineHeight: 1.5,
          color: C.meta,
        }}
      >
        <li>Nada é cobrado hoje: a primeira cobrança é em {oferta.comecaEm}.</li>
        <li>
          <span style={{ fontFamily: F_MONO }}>{oferta.dias}</span> dias com o sistema completo. Cancele
          antes e não paga nada.
        </li>
        <li>O que você cadastrar continua salvo.</li>
      </ul>

      <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: C.meta, textAlign: "center" }}>
        Prefere assinar agora, sem teste?{" "}
        <a href="/comecar" style={{ color: C.ameixa, fontWeight: 600 }}>
          {precoDeEntrada ? `Assinar por ${precoDeEntrada}` : "Assinar agora"}
        </a>
        {" · "}
        <a href="/login" style={{ color: C.meta, textDecoration: "underline" }}>
          Já tenho conta
        </a>
      </p>

      <span style={{ display: "none", fontFamily: F_TITLE }} aria-hidden="true" />
    </form>
  );
}
