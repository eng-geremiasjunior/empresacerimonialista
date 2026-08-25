"use client";

// A senha nova da cerimonialista, depois do link de "esqueci minha senha".
//
// Antes esta tela não existia: o link do e-mail levava a /auth/confirm, que
// abria a sessão e mandava para "/" — a pessoa entrava no app com a senha
// antiga ainda valendo e sem nunca ver um campo para trocá-la. Do ponto de
// vista dela, "esqueci minha senha" não fazia nada.
//
// Aqui, diferente do login, as mensagens de erro são específicas: não há
// segredo a proteger sobre a senha que a própria pessoa está criando.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100";

export function NovaSenhaForm() {
  const router = useRouter();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [revelar, setRevelar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [temSessao, setTemSessao] = useState<boolean | null>(null);

  // Sem a sessão que o link do e-mail abriu, não há usuário para atualizar.
  // Dizer isso logo evita ela digitar uma senha duas vezes para ouvir não.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setTemSessao(Boolean(data.user)));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setErro(null);

    if (pw1.length < 8 || !/[a-zA-Z]/.test(pw1) || !/\d/.test(pw1)) {
      setErro("A senha precisa de ao menos 8 caracteres, uma letra e um número.");
      return;
    }
    if (pw1 !== pw2) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setSalvando(false);
      setErro(
        /same as the old|should be different/i.test(error.message)
          ? "Essa é a senha que você já usava. Escolha outra."
          : "Não foi possível salvar a senha. Peça um link novo e tente de novo."
      );
      return;
    }
    router.push("/eventos/dashboard");
    router.refresh();
  }

  if (temSessao === false) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">
          Este link não vale mais
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Links de senha valem por pouco tempo e só uma vez. Peça outro na tela
          de entrada.
        </p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Voltar para a entrada
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={salvar}
      className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
    >
      <h1 className="text-lg font-semibold text-gray-900">Criar uma senha nova</h1>
      <p className="mt-1 text-sm text-gray-600">
        Ao menos 8 caracteres, com uma letra e um número.
      </p>

      <div className="mt-6 space-y-4">
        <div className="relative">
          <Lock
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type={revelar ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Nova senha"
            aria-label="Nova senha"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setRevelar((v) => !v)}
            aria-label={revelar ? "Esconder senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {revelar ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <Lock
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type={revelar ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            aria-label="Repita a nova senha"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando || temSessao === null}
        className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar e entrar"}
      </button>
    </form>
  );
}
