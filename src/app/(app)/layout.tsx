import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirEmpresaDoUsuario, getMeuCargo } from "@/lib/supabase/equipe";
import { precisaAssinar } from "@/lib/supabase/porta-da-assinatura";
import { getEspera } from "@/lib/supabase/espera-solicitacoes";
import { fraseDoCopiloto } from "@/lib/espera-core";
import { getAlertasCopiloto } from "@/lib/supabase/queries";
import { frasePrazos, resumirPrazos } from "@/lib/copiloto-prazos";
import { AppShell, type Congelamento } from "@/components/AppShell";
import { TaskNotifications } from "@/components/TaskNotifications";
import { signOut } from "./actions";

/**
 * A conta cancelou (151): já congelou, e em que dia congela. Null quando
 * não há nada a dizer — e erro (a 151 ainda não aplicada, por exemplo)
 * também vira null: uma faixa a menos é melhor que uma faixa mentindo que
 * a conta parou.
 *
 * A pergunta é a mesma para todos os cargos, e é sobre a PRÓPRIA conta:
 * `meu_congelamento()` resolve a empresa pelo login. Antes a proprietária
 * passava por `minha_assinatura()`, que conta eventos e logins duas vezes
 * a cada navegação para devolver um booleano; e os outros cargos passavam
 * a empresa por argumento, o que deixava a situação comercial de qualquer
 * conta legível por qualquer login que soubesse o uuid.
 *
 * O DIA vem junto porque avisar depois não serve: quem cancelou não volta
 * mais à tela de assinatura, e a coordenadora e a cerimonialista nem têm
 * essa tela.
 */
async function congelamentoDaConta(): Promise<Congelamento | null> {
  const supabase = createClient();
  const { data } = await supabase.rpc("meu_congelamento");
  const d = data as { congelada?: boolean; congela_em?: string | null } | null;
  if (!d) return null;
  return { congelada: d.congelada === true, congelaEm: d.congela_em ?? null };
}

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

  // A PORTA: quem nunca pagou vai para o checkout, não para o painel.
  //
  // Só a proprietária é levada — ela é a única que pode assinar, e
  // /assinatura devolve os outros cargos ao painel, o que viraria um
  // laço. Na prática não há outro cargo numa conta sem assinatura: sem
  // pagar, o teto é de um login só.
  //
  // O caminho vem do cabeçalho que o middleware repassa. Sem ele a trava
  // não age — falta de informação nunca vira porta trancada, e trancar
  // /assinatura seria trancar a única saída.
  const caminho = headers().get("x-caminho") ?? "";
  if (
    cargo === "proprietaria" &&
    caminho &&
    !caminho.startsWith("/assinatura") &&
    (await precisaAssinar())
  ) {
    redirect("/assinatura");
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
  const [prazosFrase, esperaFrase, congelamento] = await Promise.all([
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
    congelamentoDaConta().catch(() => null),
  ]);

  return (
    <>
      <AppShell
        userEmail={user.email ?? ""}
        cargo={cargo}
        prazosFrase={prazosFrase}
        esperaFrase={esperaFrase}
        congelamento={congelamento}
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
