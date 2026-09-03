"use client";

// Formulário de login/cadastro — mesma lógica Supabase Auth de antes,
// visual novo (card, ícones nos campos, mostrar/ocultar senha).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [negocio, setNegocio] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(
          error.code === "email_not_confirmed"
            ? "Seu e-mail ainda não foi confirmado. Procure o link de confirmação na sua caixa de entrada."
            : "E-mail ou senha incorretos."
        );
        setLoading(false);
        return;
      }
      router.push("/eventos/dashboard");
      router.refresh();
    } else {
      // O nome do negócio vira o nome da empresa no provisionamento
      // (garantir_empresa_propria lê 'empresa'). Sem ele, toda conta nova
      // nasceria como "Minha Empresa" — e esse nome vai para a proposta
      // pública, o rodapé e o PDF que o casal recebe.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // 'empresa' vira o nome da empresa; 'name' vira o nome da PESSOA
          // no membros_equipe (o gatilho já lê essa chave). Sem ele, toda
          // conta nascia com a cerimonialista chamada "Proprietária" — e é
          // esse nome que a noiva lê no portal e no rodapé da proposta.
          data: { empresa: negocio.trim(), name: nome.trim() },
          // Sem isto o link de confirmação sai com o Site URL do projeto,
          // que aponta para localhost.
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/eventos/dashboard`,
        },
      });
      if (error) {
        // O ramo de login logo acima já traduz por código; este mostrava
        // meia frase em português e meia em inglês ("User already
        // registered") na PRIMEIRA tela do sistema.
        console.error("[vela:cadastro]", error);
        setError(
          error.code === "user_already_exists" || /already registered/i.test(error.message)
            ? "Já existe uma conta com este e-mail. Entre em vez de criar."
            : error.code === "validation_failed"
              ? "Confira o e-mail digitado."
              : error.code === "weak_password"
                ? "A senha precisa de pelo menos 6 caracteres."
                : "Não foi possível criar a conta agora. Tente de novo em alguns instantes."
        );
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/eventos/dashboard");
        router.refresh();
      } else {
        setInfo("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        setMode("login");
        setLoading(false);
      }
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Preencha o campo de e-mail para recuperar a senha.");
      return;
    }
    const supabase = createClient();
    // Sem redirectTo o link cai no Site URL do projeto (localhost) e,
    // mesmo acertando, não havia tela para digitar a senha nova.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/nova-senha`,
    });
    setInfo(
      "Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha."
    );
  }

  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Lock size={22} strokeWidth={1.75} />
        </span>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-gray-900">
          {isLogin ? "Bem-vinda de volta!" : "Crie sua conta"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isLogin
            ? "Faça login para acessar sua conta."
            : "Comece a organizar seus eventos em minutos."}
        </p>
      </div>

      {/* method="post" não é decoração: até o React hidratar, o submit é
          NATIVO, e o padrão do HTML é GET — a senha iria parar na barra de
          endereço, no histórico do navegador e no log de acesso. Com POST,
          o pior caso vira um 405 sem vazamento. */}
      <form onSubmit={handleSubmit} method="post" className="mt-7 space-y-4">
        {!isLogin && (
          <div>
            <label
              htmlFor="nome"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Seu nome
            </label>
            <div className="relative">
              <User
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="nome"
                type="text"
                required
                autoComplete="name"
                placeholder="Marina Alves"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClass}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              É como a cliente vê você no portal dela.
            </p>
          </div>
        )}

        {!isLogin && (
          <div>
            <label
              htmlFor="negocio"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Nome do seu negócio
            </label>
            <div className="relative">
              <Building2
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="negocio"
                type="text"
                required
                autoComplete="organization"
                placeholder="Ateliê Marina Cerimonial"
                value={negocio}
                onChange={(e) => setNegocio(e.target.value)}
                className={inputClass}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              É o nome que seus clientes veem na proposta. Dá para mudar depois.
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            E-mail
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Senha
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {isLogin && (
          <div className="flex items-center justify-end text-sm">
            {/* "Continuar conectado" saiu: era um checkbox sem name, sem estado e
              sem leitura no submit — desmarcar não mudava nada, porque a
              duração da sessão é sempre a do Supabase Auth. Controle que
              promete uma escolha inexistente, na primeira tela do produto. */}
            <button
              type="button"
              onClick={handleForgotPassword}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Esqueceu a senha?
            </button>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {info && <p className="text-sm text-emerald-600">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading
            ? "Aguarde..."
            : isLogin
              ? "Entrar no eOrganizei"
              : "Criar conta gratuita"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium uppercase text-gray-400">ou</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={() => {
          setMode(isLogin ? "signup" : "login");
          setError(null);
          setInfo(null);
        }}
        className="w-full rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
      >
        {isLogin ? "Criar conta gratuita" : "Já tenho conta — entrar"}
      </button>
    </div>
  );
}
