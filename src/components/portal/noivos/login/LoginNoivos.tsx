"use client";

// Login do portal dos noivos — desenho 3b do Claude Design (30/09/2026).
// A foto do casal na tela toda, folhas caindo, e o convite em arco com o
// formulário. Ao entrar, o convite sobe e somem, e aparecem as iniciais.
//
// Três portas, todas do Supabase Auth: senha, link de acesso sem senha
// (OTP por e-mail, sem criar conta nova) e "Esqueci a senha". A regra de
// segurança da porta antiga continua: o erro nunca diz se a conta existe,
// e os dois links respondem "enviado" exista a conta ou não.
//
// Antes do login o sistema não sabe de quem é o casamento: a linha
// "Marina e Téo contam os dias por aqui" do desenho não aparece, e a foto
// é a do desenho. As iniciais só entram depois que a senha confere.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { escolherLembrar } from "@/lib/lembrar-sessao";
import "../noivos.css";
import "./login-noivos.css";

const FOTO =
  "https://images.unsplash.com/photo-1467715701630-de0db4a0fbf0?w=1800&q=70&auto=format&fit=crop";

const CORES_DAS_FOLHAS = ["#c8672f", "#d9a441", "#a8452a", "#e08a3c", "#8c5a2b", "#b8862e"];
const FOLHAS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 53 + 7) % 100}%`,
  background: CORES_DAS_FOLHAS[i % 6],
  animationDuration: `${11 + ((i * 7) % 9)}s`,
  animationDelay: `${((i * 1.7) % 12).toFixed(2)}s`,
}));

const EMAIL_OK = /\S+@\S+\.\S+/;

type Passo = "form" | "load" | "reset" | "magic" | "sent" | "ok";
type QuemEntrou = { a: string | null; b: string | null; dias: number | null } | null;

function faltamEmPalavras(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias === 0) return "É hoje. Vamos juntos.";
  if (dias === 1) return "Falta 1 dia. Vamos juntos.";
  return `Faltam ${dias} dias. Vamos juntos.`;
}

export function LoginNoivos({
  erroInicial,
  sessaoAtual,
}: {
  /** ?erro=link: o link do e-mail não funcionou */
  erroInicial?: string;
  /** e-mail da EQUIPE já logada neste navegador, quando houver */
  sessaoAtual?: string | null;
}) {
  const router = useRouter();
  const [passo, setPasso] = useState<Passo>("form");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState(
    erroInicial === "link" ? "Este link não funcionou. Peça outro, ou entre com a senha." : ""
  );
  const [treme, setTreme] = useState(0);
  const [quem, setQuem] = useState<QuemEntrou>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (espera.current) clearTimeout(espera.current);
  }, []);

  function errar(msg: string) {
    setErro(msg);
    setTreme((t) => t + 1);
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (passo !== "form") return;
    if (!EMAIL_OK.test(email)) return errar("Confira o e-mail. Parece que faltou alguma coisa.");
    if (!senha) return errar("Digite a sua senha, ou peça um link sem senha.");
    setErro("");
    setPasso("load");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setPasso("form");
      // genérico de propósito: não confirma se o e-mail existe
      errar("E-mail ou senha não conferem.");
      return;
    }
    escolherLembrar(lembrar);

    // as iniciais e os dias: só depois da senha, e sem travar a entrada
    const dados: QuemEntrou = await fetch("/portal/quem-entrou", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    setQuem(dados && typeof dados === "object" ? dados : null);
    setPasso("ok");
    // quem decide o destino é o servidor (/portal: um evento entra
    // direto; senha provisória vai trocar primeiro)
    espera.current = setTimeout(() => {
      router.replace("/portal");
      router.refresh();
    }, 2800);
  }

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    if (passo !== "reset" && passo !== "magic") return;
    if (!EMAIL_OK.test(email)) return errar("Confira o e-mail. Parece que faltou alguma coisa.");
    setErro("");
    const supabase = createClient();
    const origem = window.location.origin;
    escolherLembrar(lembrar);
    if (passo === "magic") {
      // sem criar conta: link sem senha é só para quem já tem acesso
      await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: `${origem}/auth/confirm?next=/portal` },
      });
    } else {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origem}/auth/confirm?next=/portal/redefinir`,
      });
    }
    // sempre "enviado", exista a conta ou não
    setPasso("sent");
  }

  function irPara(p: Passo) {
    setErro("");
    setPasso(p);
  }

  const saindo = passo === "ok";
  const faltam = faltamEmPalavras(quem?.dias ?? null);

  return (
    <main className="pnl">
      <div className="pnl-foto" style={{ backgroundImage: `url("${FOTO}")` }} aria-hidden />
      <div className="pnl-vinheta" aria-hidden />
      <div className="pnl-folhas" aria-hidden>
        {FOLHAS.map((f, i) => (
          <span key={i} style={f} />
        ))}
      </div>

      <div className="pnl-logo pnl-t">
        e<span>organizei</span>
      </div>

      <div className={`pnl-texto${saindo ? " saindo" : ""}`}>
        <div className="pnl-texto-dentro">
          <div className="pnl-sobrefoto">Portal dos noivos</div>
          <p className="pnl-frase pnl-t">O começo do para sempre mora aqui.</p>
          <p className="pnl-subfrase">
            Cada escolha, cada música, cada convidado. Tudo em um só lugar, com a sua cerimonialista ao lado.
          </p>
        </div>
      </div>

      <div className={`pnl-convite${saindo ? " saindo" : ""}`}>
        <div className="pnl-arco" aria-hidden />
        <div className="pnl-cartao">
          <div className="pnl-filete" aria-hidden />
          <div className="pnl-corpo">
            <div className="pnl-selo pnl-t" aria-hidden>
              {/* um só filho: na grade do círculo, "e" e "." soltos
                  viravam duas linhas */}
              <span>
                e<span className="pnl-ponto">.</span>
              </span>
            </div>

            {passo === "form" && (
              <div className="pnl-passo">
                <div className="pnl-eyebrow">Vocês foram convidados</div>
                <h1 className="pnl-titulo pnl-t">
                  Entrem no portal
                  <br />
                  do casamento
                </h1>
                {/* method="post": até o React hidratar, o envio é o do
                    HTML, e o padrão (GET) poria a senha na barra de
                    endereço e no histórico */}
                <form
                  className={`pnl-form${treme ? (treme % 2 ? " treme-1" : " treme-2") : ""}`}
                  method="post"
                  onSubmit={entrar}
                  noValidate
                >
                  <label className="pnl-campo">
                    <span className="pn-ic" aria-hidden>
                      mail
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErro("");
                      }}
                      placeholder="Seu e-mail"
                      aria-label="Seu e-mail"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </label>
                  <label className="pnl-campo senha">
                    <span className="pn-ic" aria-hidden>
                      lock
                    </span>
                    <input
                      type={mostrar ? "text" : "password"}
                      name="senha"
                      value={senha}
                      onChange={(e) => {
                        setSenha(e.target.value);
                        setErro("");
                      }}
                      placeholder="Sua senha"
                      aria-label="Sua senha"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="pnl-olho"
                      aria-pressed={mostrar}
                      aria-label={mostrar ? "Esconder a senha" : "Mostrar a senha"}
                      onClick={() => setMostrar((m) => !m)}
                    >
                      <span className="pn-ic" aria-hidden>
                        {mostrar ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </label>
                  {erro && (
                    <div className="pnl-aviso" role="alert">
                      <span className="pn-ic" aria-hidden>
                        info
                      </span>
                      {erro}
                    </div>
                  )}
                  {/* o navegador guarda uma sessão por endereço: entrar
                      aqui encerra a da equipe */}
                  {sessaoAtual && !erro && (
                    <div className="pnl-aviso" role="status">
                      <span className="pn-ic" aria-hidden>
                        info
                      </span>
                      Entrar aqui encerra a sessão de {sessaoAtual}.
                    </div>
                  )}
                  <div className="pnl-opcoes">
                    <button
                      type="button"
                      className="pnl-lembrar"
                      role="checkbox"
                      aria-checked={lembrar}
                      onClick={() => setLembrar((l) => !l)}
                    >
                      <span className={`pnl-caixa${lembrar ? " marcada" : ""}`}>
                        {lembrar && (
                          <span className="pn-ic" aria-hidden>
                            check
                          </span>
                        )}
                      </span>
                      Lembrar de mim
                    </button>
                    <button type="button" className="pnl-esqueci" onClick={() => irPara("reset")}>
                      Esqueci a senha
                    </button>
                  </div>
                  <button type="submit" className="pnl-entrar">
                    Abrir o nosso portal
                  </button>
                  <button type="button" className="pnl-fantasma" onClick={() => irPara("magic")}>
                    <span className="pn-ic" aria-hidden>
                      auto_awesome
                    </span>
                    Receber um link de acesso, sem senha
                  </button>
                </form>
                <div className="pnl-rodape">
                  Primeiro acesso? A sua cerimonialista
                  <br />
                  envia o convite pelo WhatsApp.
                  <br />
                  Sem cerimonialista? <Link href="/portal/criar-conta">Criem a conta da festa</Link>
                </div>
              </div>
            )}

            {passo === "load" && (
              <div className="pnl-carregando" role="status">
                <div className="pnl-giro" aria-hidden />
                <div className="pnl-carregando-texto pnl-t">Abrindo o convite…</div>
              </div>
            )}

            {(passo === "reset" || passo === "magic") && (
              <div className="pnl-passo">
                <h1 className="pnl-titulo-2 pnl-t">Tudo bem, acontece.</h1>
                <p className="pnl-explica">
                  {passo === "magic"
                    ? "Mandamos um link para o seu e-mail. Tocou, entrou. Sem precisar lembrar de senha."
                    : "Digite o seu e-mail e mandamos um link para criar uma senha nova."}
                </p>
                <form
                  className={`pnl-form-2${treme ? (treme % 2 ? " treme-1" : " treme-2") : ""}`}
                  method="post"
                  onSubmit={enviarLink}
                  noValidate
                >
                  <label className="pnl-campo">
                    <span className="pn-ic" aria-hidden>
                      mail
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErro("");
                      }}
                      placeholder="Seu e-mail"
                      aria-label="Seu e-mail"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </label>
                  {erro && (
                    <div className="pnl-aviso" role="alert">
                      <span className="pn-ic" aria-hidden>
                        info
                      </span>
                      {erro}
                    </div>
                  )}
                  <button type="submit" className="pnl-entrar">
                    {passo === "magic" ? "Enviar link de acesso" : "Enviar link para nova senha"}
                  </button>
                  <button type="button" className="pnl-voltar" onClick={() => irPara("form")}>
                    Voltar
                  </button>
                </form>
              </div>
            )}

            {passo === "sent" && (
              <div className="pnl-enviado" role="status">
                <span className="pn-ic" aria-hidden>
                  mark_email_read
                </span>
                <h1 className="pnl-enviado-titulo pnl-t">Olhe o seu e-mail.</h1>
                <p className="pnl-enviado-texto">
                  O link foi para <b>{email.trim()}</b>.
                </p>
                <button type="button" className="pnl-borda" onClick={() => irPara("form")}>
                  Voltar ao login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {passo === "ok" && (
        <div className="pnl-bemvindos" role="status">
          <div className="pnl-sobrefoto">Bem-vindos</div>
          {quem?.a && (
            <div className="pnl-iniciais pnl-t">
              {quem.a}
              {quem.b && (
                <>
                  <span>&amp;</span>
                  {quem.b}
                </>
              )}
            </div>
          )}
          {faltam && <div className="pnl-faltam">{faltam}</div>}
        </div>
      )}
    </main>
  );
}
