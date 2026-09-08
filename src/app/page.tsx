import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams,
}: {
  searchParams?: { code?: string; error?: string; error_description?: string };
}) {
  // Rede de segurança do link de confirmação.
  //
  // O cadastro pede que o e-mail volte para /auth/confirm, mas o Supabase
  // IGNORA um destino que não esteja na lista de URLs permitidas do
  // projeto — e, em silêncio, manda para o Site URL, que é a raiz. Foi
  // assim que um link de confirmação chegou apontando para
  // "localhost:3000/?code=…": a página abria, o código não era trocado
  // por sessão nenhuma e a conta ficava sem confirmar, sem erro nenhum
  // em lugar nenhum.
  //
  // Isto não substitui o conserto no painel (Site URL e lista de
  // permitidas); só impede que uma configuração errada quebre o cadastro
  // inteiro em silêncio.
  const code = searchParams?.code;
  if (code) {
    redirect(`/auth/confirm?code=${encodeURIComponent(code)}&next=/eventos/dashboard`);
  }
  if (searchParams?.error) {
    redirect("/login?erro=link");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quem não tem sessão vê a PÁGINA DE VENDAS, não o login (08/09/2026).
  // Até aqui a raiz mandava todo mundo para /login: quem chegava por
  // indicação, por cartão de visita ou digitando o endereço encontrava
  // uma caixa de e-mail e senha de um sistema que nunca tinha visto.
  // A /planos existe, tem a demonstração do evento nascendo e é para onde
  // os anúncios apontam — é ela que responde "o que é isto?". O login
  // continua a um clique, no cabeçalho dela.
  redirect(user ? "/eventos/dashboard" : "/planos");
}
