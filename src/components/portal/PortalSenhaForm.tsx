"use client";

// Definição de senha: primeiro acesso (senha provisória dada pela
// cerimonialista) e redefinição por link de e-mail. Mesma tela, dois
// textos — no primeiro acesso a senha que veio no e-mail deixa de valer.
//
// Aqui, diferente do login, as mensagens de erro SÃO específicas: não há
// segredo a proteger sobre a própria senha que a pessoa está criando.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconeAlerta, IconeCheck, IconeOlho } from "./AcessoOrnamento";
import { concluirTrocaDeSenha } from "@/app/(portal)/portal/primeiro-acesso/actions";

export function PortalSenhaForm({ modo }: { modo: "primeiro" | "redefinir" }) {
  const router = useRouter();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [revelar, setRevelar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;

    if (pw1.length < 8 || !/[a-zA-Z]/.test(pw1) || !/\d/.test(pw1)) {
      setErro("A senha precisa de ao menos 8 caracteres, uma letra e um número.");
      return;
    }
    if (pw1 !== pw2) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    setErro("");

    // A senha é trocada com a sessão da própria pessoa.
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setCarregando(false);
      setErro("Não foi possível salvar a senha. Tente de novo.");
      return;
    }

    // A flag de senha provisória vive em app_metadata e só o servidor
    // pode limpá-la — se ficasse com a usuária, ela poderia se declarar
    // "já trocou" sem ter trocado.
    const r = await concluirTrocaDeSenha();
    if ("error" in r) {
      setCarregando(false);
      setErro(r.error);
      return;
    }

    router.replace("/portal");
    router.refresh();
  }

  return (
    <main className="acesso">
      <div className="acesso-glow" aria-hidden="true" />
      <div className="acesso-shell">
        <div className="acesso-top" />
        <div className="acesso-col">
          <p className="acesso-eyebrow">
            {modo === "primeiro" ? "Primeiro acesso" : "Nova senha"}
          </p>
          <p className="acesso-lead">
            {modo === "primeiro" ? (
              <>
                Sua cerimonialista abriu este acesso.{" "}
                <span className="acesso-say2">Escolha agora uma senha só sua.</span>
              </>
            ) : (
              "Escolha uma senha nova para entrar."
            )}
          </p>
          {erro && (
            <p className="acesso-alert" role="alert">
              <IconeAlerta />
              <span>{erro}</span>
            </p>
          )}
          {/* method="post": antes da hidratação o submit é nativo e o
              padrão é GET — a senha nova iria para a URL. */}
          <form className="acesso-fields" method="post" onSubmit={salvar}>
            <div className="acesso-field">
              <label htmlFor="pw1">Nova senha</label>
              <div className="acesso-pw">
                <input
                  id="pw1"
                  type={revelar ? "text" : "password"}
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  {...(erro ? { "data-invalid": true, "aria-invalid": true } : {})}
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
            <div className="acesso-field">
              <label htmlFor="pw2">Repita a senha</label>
              <input
                id="pw2"
                type={revelar ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                {...(erro ? { "data-invalid": true, "aria-invalid": true } : {})}
              />
            </div>
            <p className="acesso-hint">
              <IconeCheck />
              <span>ao menos 8 caracteres · uma letra e um número</span>
            </p>
            <button type="submit" className="acesso-btn" disabled={carregando}>
              {carregando ? (
                <>
                  <span className="acesso-spin" />
                  Salvando
                </>
              ) : (
                "Salvar e entrar"
              )}
            </button>
          </form>
        </div>
        <div className="acesso-spacer" />
        <div className="acesso-rule" />
        <p className="acesso-help">
          {modo === "primeiro" ? (
            <>A senha que veio no e-mail deixa de valer depois desta etapa.</>
          ) : (
            <>
              Precisa de ajuda? <b>Fale com sua cerimonialista</b>
            </>
          )}
        </p>
        <p className="acesso-vela">Vela</p>
      </div>
    </main>
  );
}
