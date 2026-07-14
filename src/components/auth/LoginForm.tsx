"use client";

// Formulário de login/cadastro — mesma lógica Supabase Auth de antes,
// visual novo (card, ícones nos campos, mostrar/ocultar senha).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError("Não foi possível criar a conta. " + error.message);
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
    await supabase.auth.resetPasswordForEmail(email);
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

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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
          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-gray-600">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 accent-indigo-600"
              />
              Continuar conectado
            </label>
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
              ? "Entrar no Vela"
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
