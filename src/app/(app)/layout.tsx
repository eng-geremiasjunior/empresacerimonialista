import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirEmpresaDoUsuario, getMeuCargo } from "@/lib/supabase/equipe";
import { getEspera } from "@/lib/supabase/espera-solicitacoes";
import { fraseDoCopiloto } from "@/lib/espera-core";
import { getAlertasCopiloto } from "@/lib/supabase/queries";
import { frasePrazos, resumirPrazos } from "@/lib/copiloto-prazos";
import { AppShell } from "@/components/AppShell";
import { TaskNotifications } from "@/components/TaskNotifications";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Cliente do Portal nunca entra na área profissional — e o redirect vem
  // ANTES do provisionamento: sem isso ela ganharia uma empresa vazia e
  // viraria "proprietária" de um sistema que não é dela. O middleware já
  // barra antes; aqui é a segunda tranca, para o caso de a rota ser
  // alcançada por outro caminho.
  if (user.app_metadata?.portal === true) {
    redirect("/portal");
  }

  let { cargo } = await getMeuCargo();

  // Usuário logado sem equipe (signup novo do zero): provisiona a empresa
  // própria e relê o cargo. Idempotente; não afeta membros convidados.
  if (cargo === null) {
    await garantirEmpresaDoUsuario();
    ({ cargo } = await getMeuCargo());
  }

  // A linha dos prazos vem da MESMA fonte que o bloco do dashboard: antes
  // eram duas contas diferentes (a sidebar somava saúde<80 + dois gatilhos;
  // o dashboard listava alertas por data) e os números discordavam na cara
  // dela. Erro não vira "tudo em dia" de mentira — vira traço.
  // A linha da espera no Copiloto — só para quem conduz. O erro não vira
  // "em dia" de mentira: vira a frase que diz que não deu para checar.
  const conduz =
    cargo === "proprietaria" ||
    cargo === "coordenadora" ||
    cargo === "cerimonialista";

  // Em série, cada navegação do app esperava as 3 consultas dos prazos
  // TERMINAREM antes de começar as da espera. Nada aqui depende do outro.
  const [prazosFrase, esperaFrase] = await Promise.all([
    getAlertasCopiloto()
      .then((alertas) => frasePrazos(resumirPrazos(alertas.map((a) => a.tipo))))
      .catch(() => null),
    conduz
      ? getEspera()
          .then((espera) =>
            espera
              ? fraseDoCopiloto(espera.resumo)
              : "Não deu para checar os fornecedores agora."
          )
          .catch(() => "Não deu para checar os fornecedores agora.")
      : Promise.resolve(null),
  ]);

  return (
    <>
      <AppShell
        userEmail={user.email ?? ""}
        cargo={cargo}
        prazosFrase={prazosFrase}
        esperaFrase={esperaFrase}
        avatarUrl={
          ((user.user_metadata as { avatar_url?: string | null } | null)
            ?.avatar_url as string | null) ?? null
        }
        signOut={signOut}
      >
        {children}
      </AppShell>
      <TaskNotifications />
    </>
  );
}
