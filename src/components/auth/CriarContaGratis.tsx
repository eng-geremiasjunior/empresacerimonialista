"use client";

// A tela do teste de sete dias.
//
// Quatro campos e nenhum cartão — é o degrau que não existia entre o
// anúncio e a primeira conta criada. Do clique até a primeira tela do
// sistema não há confirmação de e-mail no meio: a conta nasce
// confirmada, a sessão abre aqui e ela cai no painel.
//
// O botão de assinar agora continua ao lado, menor. A promoção não sai
// de cena; sai do lugar de porta de entrada.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { criarContaDeTeste } from "@/app/criar-conta/actions";
import { guardarOrigemDoClique } from "@/lib/marketing";
import { useEffect } from "react";

const C = {
  fundo: "#FAF8F5",
  tinta: "#221E1B",
  corpo: "#3D3835",
  meta: "#6B6259",
  borda: "#E6E0D8",
  ameixa: "#6E3F5F",
};
const F_TITLE = "var(--font-title, Inter, sans-serif)";
const F_MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

export function CriarContaGratis({
  dias,
  precoDeEntrada,
}: {
  dias: number;
  precoDeEntrada: string | null;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [negocio, setNegocio] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [jaTemConta, setJaTemConta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [, startTransition] = useTransition();

  // o clique que trouxe ela até aqui, guardado antes de qualquer coisa
  useEffect(() => {
    guardarOrigemDoClique();
  }, []);

  const podeEnviar =
    nome.trim().length >= 2 &&
    negocio.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) &&
    senha.length >= 6 &&
    !enviando;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setErro(null);
    setJaTemConta(false);
    setEnviando(true);

    let r;
    try {
      r = await criarContaDeTeste({ nome, negocio, email, senha });
    } catch {
      setErro("Não foi possível criar a conta agora. Tente de novo em alguns instantes.");
      setEnviando(false);
      return;
    }

    if (!r?.ok) {
      setErro(r?.error ?? "Não foi possível criar a conta agora.");
      setJaTemConta(Boolean(r?.jaTemConta));
      setEnviando(false);
      return;
    }

    // A conta existe. A sessão nasce aqui, com a senha que ela acabou de
    // escolher — é o que a leva ao painel sem passar por tela de login.
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) {
      setErro("Sua conta está criada! Entre com seu e-mail e senha para começar.");
      setEnviando(false);
      startTransition(() => router.push("/login"));
      return;
    }
    startTransition(() => {
      router.push("/eventos/dashboard");
      router.refresh();
    });
  }

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
  const rotulo = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13.5px",
    fontWeight: 500,
    color: C.corpo,
  } as const;

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        <label htmlFor="cc-senha" style={rotulo}>
          Senha
        </label>
        <input
          id="cc-senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="new-password"
          style={campo}
        />
        <p style={{ margin: "6px 0 0", fontSize: "12.5px", color: C.meta }}>
          Pelo menos 6 caracteres.
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#F3EBF0",
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

      <button
        type="submit"
        disabled={!podeEnviar}
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
          cursor: podeEnviar ? "pointer" : "default",
          opacity: podeEnviar ? 1 : 0.55,
        }}
      >
        {enviando ? "Criando sua conta…" : `Criar conta e começar`}
      </button>

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
        <li>Sem cartão de crédito.</li>
        <li>
          <span style={{ fontFamily: F_MONO }}>{dias}</span> dias, e acaba sozinho — não cobramos
          nada depois.
        </li>
        <li>O que você cadastrar continua salvo se decidir assinar.</li>
      </ul>

      <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: C.meta, textAlign: "center" }}>
        Já quer assinar?{" "}
        <a href="/comecar" style={{ color: C.ameixa, fontWeight: 600 }}>
          {precoDeEntrada ? `Assinar por ${precoDeEntrada}` : "Assinar agora"}
        </a>
        {" · "}
        <a href="/login" style={{ color: C.meta, textDecoration: "underline" }}>
          Já tenho conta
        </a>
      </p>

      <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, color: "#928A81", textAlign: "center" }}>
        Ao criar a conta você aceita os{" "}
        <a href="/termos" style={{ color: "#928A81" }}>
          Termos
        </a>{" "}
        e a{" "}
        <a href="/privacidade" style={{ color: "#928A81" }}>
          Política de Privacidade
        </a>
        .
      </p>

      <span style={{ display: "none", fontFamily: F_TITLE }} aria-hidden="true" />
    </form>
  );
}
