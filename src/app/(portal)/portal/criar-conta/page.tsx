import "../entrar/acesso.css";
import { createClient } from "@/lib/supabase/server";
import { CriarContaDaFamilia } from "@/components/portal/CriarContaDaFamilia";

// A conta da família (187): a outra metade da porta do portal. Pública no
// middleware; quem já tem sessão de portal é mandado para /portal lá.
export const metadata = { title: "Criar conta — eorganizei" };
export const dynamic = "force-dynamic";

export default async function CriarContaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // a mesma regra da porta de entrar: criar conta encerra a sessão da
  // equipe que estiver aberta neste navegador, e ela precisa saber antes
  const ehEquipe = Boolean(user) && user?.app_metadata?.portal !== true;

  // "hoje" vem do servidor, no horário de Brasília: o relógio do
  // navegador no primeiro render quebra a hidratação
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  return <CriarContaDaFamilia hoje={hoje} sessaoAtual={ehEquipe ? (user?.email ?? null) : null} />;
}
