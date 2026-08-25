import { NovaSenhaForm } from "@/components/auth/NovaSenhaForm";

// Definir a senha nova depois do link de "esqueci minha senha".
//
// A rota é pública no middleware porque a sessão que a torna útil nasce em
// /auth/confirm, que redireciona para cá. Sem sessão o próprio formulário
// recusa e manda de volta para o login — não há o que fazer aqui sem o
// link do e-mail.
//
// O portal da cliente tem a sua própria (/portal/redefinir): mesma
// mecânica, textos diferentes, e ela não deve cair numa tela que fala em
// "cerimonialista".
export const dynamic = "force-dynamic";

export default function NovaSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
      <NovaSenhaForm />
    </div>
  );
}
