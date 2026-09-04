"use client";

// Telas de acesso do Portal da Cliente: entrar, esqueci a senha, enviado.
// Recriação em React do custom element handoff/portal-login.js — estrutura,
// copy, estados e animações idênticos; o markup segue as convenções do
// repo (nada de Babel no navegador, nada de shadow DOM).
//
// Regra de segurança da tela: o erro é SEMPRE o mesmo e nunca revela se a
// conta existe. O mesmo vale para o "esqueci a senha", que responde
// "verifique sua caixa" mesmo quando não há conta.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AcessoOrnamento,
  IconeAlerta,
  IconeCheck,
  IconeEnvelope,
  IconeOlho,
  IconeVoltar,
} from "./AcessoOrnamento";

type Vista = "login" | "forgot" | "sent";

function horaEValidade(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const fim = new Date(d.getTime() + 30 * 60000);
  return `${p(d.getHours())}:${p(d.getMinutes())} · válido até ${p(fim.getHours())}:${p(fim.getMinutes())}`;
}

export function PortalLoginForm({
  erroInicial,
  sessaoAtual,
}: {
  /** Vem do ?erro= da URL (ex.: link de redefinição expirado). */
  erroInicial?: string;
  /** e-mail da EQUIPE já logada neste navegador, quando houver */
  sessaoAtual?: string | null;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [revelar, setRevelar] = useState(false);
  const [manter, setManter] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(
    erroInicial === "link"
      ? "Este link não funcionou — pode ter expirado, ou foi aberto em outro aparelho. Peça um novo em “Esqueci minha senha”."
      : ""
  );
  const [enviadoAs, setEnviadoAs] = useState("");

  function irPara(v: Vista) {
    setVista(v);
    setErro("");
    if (v === "sent") setEnviadoAs(horaEValidade());
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    setErro("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      setCarregando(false);
      // Mensagem genérica de propósito: não confirma se o e-mail existe.
      setErro("E-mail ou senha inválidos.");
      return;
    }

    // Quem decide o destino é o servidor: o middleware manda para
    // /portal/primeiro-acesso enquanto a senha for a provisória.
    router.replace("/portal");
    router.refresh();
  }

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/portal/redefinir`,
    });
    setCarregando(false);
    // Sempre "enviado", exista a conta ou não.
    irPara("sent");
  }

  const rodape = (
    <>
      <div className="acesso-rule" />
      <p className="acesso-help">
        Primeiro acesso? <b>Fale com sua cerimonialista</b>
      </p>
      <p className="acesso-vela">eorganizei</p>
    </>
  );

  return (
    <main className="acesso">
      <div className="acesso-glow" aria-hidden="true" />
      <div className="acesso-shell">
        {vista === "login" && <AcessoOrnamento />}

        {vista === "forgot" && (
          <button
            type="button"
            className="acesso-back"
            onClick={() => irPara("login")}
            aria-label="Voltar para entrar"
          >
            <IconeVoltar />
          </button>
        )}
        {vista === "sent" && (
          <button
            type="button"
            className="acesso-back"
            onClick={() => irPara("forgot")}
            aria-label="Voltar"
          >
            <IconeVoltar />
          </button>
        )}
        {vista === "login" && <div className="acesso-top" />}

        {vista === "login" && (
          <div className="acesso-col">
            <p className="acesso-eyebrow">Acesso privado</p>
            <p className="acesso-lead">
              Cada detalhe do seu dia já está sob cuidado.{" "}
              <span className="acesso-say2">Entre para acompanhar de perto.</span>
            </p>
            {erro && (
              <p className="acesso-alert" role="alert">
                <IconeAlerta />
                <span>{erro}</span>
              </p>
            )}
            {/* O navegador guarda uma sessão por domínio: entrar aqui
                encerra a de quem já estava. Sem este aviso, a
                cerimonialista que abre o portal para conferir perde a
                própria sessão e acha que o sistema se confundiu. */}
            {sessaoAtual && (
              <p className="acesso-alert" role="status">
                <IconeAlerta />
                <span>
                  Você está conectada como <strong>{sessaoAtual}</strong>.
                  Entrar aqui vai encerrar essa sessão. Para ver o portal sem
                  sair do sistema, use uma janela anônima.
                </span>
              </p>
            )}
            {/* method="post" não é decoração: até o React hidratar, o
                submit é NATIVO, e o padrão do HTML é GET — a senha da
                noiva iria parar na barra de endereço, no histórico do
                navegador e no log de acesso. Com POST, o pior caso vira
                um 405 sem vazamento. */}
            <form className="acesso-fields" method="post" onSubmit={entrar}>
              <div className="acesso-field">
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  {...(erro ? { "data-invalid": true, "aria-invalid": true } : {})}
                />
              </div>
              <div className="acesso-field">
                <label htmlFor="senha">Senha</label>
                <div className="acesso-pw">
                  <input
                    id="senha"
                    name="senha"
                    type={revelar ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    {...(erro
                      ? { "data-invalid": true, "aria-invalid": true }
                      : {})}
                  />
                  <button
                    type="button"
                    className="acesso-reveal"
                    aria-pressed={revelar}
                    aria-label={revelar ? "Ocultar a senha" : "Mostrar a senha"}
                    onClick={() => setRevelar((r) => !r)}
                  >
                    <IconeOlho aberto={!revelar} />
                  </button>
                </div>
              </div>
              <div className="acesso-row">
                <button
                  type="button"
                  className="acesso-keep"
                  role="checkbox"
                  aria-checked={manter}
                  onClick={() => setManter((m) => !m)}
                >
                  <span className="acesso-box">
                    <IconeCheck cor="#140D07" />
                  </span>
                  <span>Continuar conectado</span>
                </button>
                <span className="acesso-center">
                  <button
                    type="button"
                    className="acesso-link"
                    disabled={carregando}
                    onClick={() => irPara("forgot")}
                  >
                    Esqueci minha senha
                  </button>
                </span>
              </div>
              <button
                type="submit"
                className="acesso-btn"
                disabled={carregando}
                aria-busy={carregando || undefined}
              >
                {carregando ? (
                  <>
                    <span className="acesso-spin" />
                    Entrando
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>
        )}

        {vista === "forgot" && (
          <div className="acesso-col">
            <p className="acesso-eyebrow">Acesso privado</p>
            <p className="acesso-lead">
              Enviamos um link para você definir uma senha nova.
            </p>
            <p className="acesso-sub">
              Informe o e-mail que sua cerimonialista cadastrou.
            </p>
            <form className="acesso-fields" method="post" onSubmit={enviarLink}>
              <div className="acesso-field">
                <label htmlFor="email-recuperar">E-mail</label>
                <input
                  id="email-recuperar"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
              <button type="submit" className="acesso-btn" disabled={carregando}>
                {carregando ? (
                  <>
                    <span className="acesso-spin" />
                    Enviando
                  </>
                ) : (
                  "Enviar link"
                )}
              </button>
              <span className="acesso-center">
                <button
                  type="button"
                  className="acesso-link"
                  onClick={() => irPara("login")}
                >
                  Voltar para entrar
                </button>
              </span>
            </form>
          </div>
        )}

        {vista === "sent" && (
          <div className="acesso-col">
            <span className="acesso-mark">
              <IconeEnvelope />
            </span>
            <p className="acesso-lead">Verifique sua caixa de entrada.</p>
            <p className="acesso-sub">
              Se houver uma conta com esse e-mail, o link para redefinir a senha
              chega em instantes. Ele vale por 30 minutos.
            </p>
            <p className="acesso-meta">enviado às {enviadoAs}</p>
            <div className="acesso-fields">
              <button
                type="button"
                className="acesso-btn quiet"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/auth/confirm?next=/portal/redefinir`,
                  });
                  setEnviadoAs(horaEValidade());
                }}
              >
                Reenviar o link
              </button>
              <span className="acesso-center">
                <button
                  type="button"
                  className="acesso-link"
                  onClick={() => irPara("login")}
                >
                  Voltar para entrar
                </button>
              </span>
            </div>
          </div>
        )}

        <div className="acesso-spacer" />
        {rodape}
      </div>
    </main>
  );
}
