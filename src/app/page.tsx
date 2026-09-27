import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { newsreader, planosDoSite } from "@/lib/planos-do-site";
import { SiteModelo2 } from "@/components/planos/SiteModelo2";
import { MenuDoSite } from "@/components/site/MenuDoSite";
import { Apresentacao } from "@/components/site/Apresentacao";
import { Palco } from "@/components/site/Palco";
import { RoteiroAoVivo } from "@/components/site/RoteiroAoVivo";
import { Medicao } from "@/components/marketing/Medicao";
import { Origem } from "@/components/marketing/Origem";
import { MedirCliques } from "@/components/marketing/MedirCliques";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eorganizei — a gestão dos seus eventos, em um só lugar",
  description:
    "O sistema das cerimonialistas e assessorias de eventos. Do primeiro contato ao fim da festa, cada evento num lugar só.",
};

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

  if (user) redirect("/eventos/dashboard");

  // Quem não tem sessão vê o SITE (27/09/2026): a base da página de vendas
  // (modelo 2) com o menu do site, a apresentação que troca de tela com a
  // rolagem, o palco do dia do evento e o roteiro andando. A /planos
  // continua igual: é o destino dos anúncios.
  //
  // Antes (08/09/2026): quem não tinha sessão ia para a PÁGINA DE VENDAS, não o login.
  // Até aqui a raiz mandava todo mundo para /login: quem chegava por
  // indicação, por cartão de visita ou digitando o endereço encontrava
  // uma caixa de e-mail e senha de um sistema que nunca tinha visto.
  // A /planos existe, tem a demonstração do evento nascendo e é para onde
  // os anúncios apontam — é ela que responde "o que é isto?". O login
  // continua a um clique, no cabeçalho dela.
  const { planos, hrefConta, hrefPlano } = await planosDoSite();
  return (
    <div className={newsreader.variable}>
      <SiteModelo2
        planos={planos}
        hrefConta={hrefConta}
        hrefPlano={hrefPlano}
        menu={<MenuDoSite hrefConta={hrefConta} />}
        apresentacao={
          <>
            <Apresentacao />
            <Palco />
            <RoteiroAoVivo />
          </>
        }
      />
      <Origem />
      <MedirCliques />
      <Medicao />
    </div>
  );
}
