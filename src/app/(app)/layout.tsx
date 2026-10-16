import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { garantirEmpresaDoUsuario, getMeuCargo } from "@/lib/supabase/equipe";
import { precisaAssinar } from "@/lib/supabase/porta-da-assinatura";
import { getEspera } from "@/lib/supabase/espera-solicitacoes";
import { getExplicacoesLigadas } from "@/lib/supabase/explicacoes";
import { getEstadoDoGuia } from "@/lib/supabase/guia-vivo";
import { passoAtual, terminou } from "@/lib/guia-vivo";
import { fraseDoCopiloto } from "@/lib/espera-core";
import { getAlertasCopiloto } from "@/lib/supabase/queries";
import { frasePrazos, resumirPrazos } from "@/lib/copiloto-prazos";
import { Moldura, type Congelamento } from "@/components/moldura/Moldura";
import { hojeBR } from "@/lib/tempo";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/types";
import type { AbaDeEvento } from "@/lib/abas-de-evento";
import { TaskNotifications } from "@/components/TaskNotifications";
import { Presenca } from "@/components/Presenca";
import { GuiaVivo } from "@/components/guia/GuiaVivo";
import { BannerAoEntrar } from "@/components/planos/BannerAoEntrar";
import { PesquisaRapida } from "@/components/suporte/PesquisaRapida";
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
/**
 * As abas da moldura (15/10/2026): os 3 eventos mais próximos que ela
 * enxerga, de hoje em diante, sem os cancelados e concluídos. Falha vira
 * lista vazia — a moldura continua com Hoje e Todos.
 */
async function proximosEventos(hoje: string): Promise<AbaDeEvento[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select("id, name, type, date, clients(name)")
    .gte("date", hoje)
    .in("status", ["orcamento", "confirmado"])
    .order("date", { ascending: true })
    .limit(3);
  return ((data ?? []) as unknown as { id: string; name: string | null; type: EventType; date: string | null; clients: { name: string } | null }[]).map((e) => ({
    id: e.id,
    nome: e.name?.trim() || e.clients?.name?.trim() || EVENT_TYPE_LABELS[e.type] || "Evento",
    data: e.date,
  }));
}

async function nomeDaEmpresa(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("empresas").select("nome").limit(1).maybeSingle();
  return (data as { nome?: string } | null)?.nome ?? null;
}

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
  const hoje = hojeBR();
  const [prazosFrase, esperaFrase, congelamento, explicacoes, estadoDoGuia, proximos, empresaNome] =
    await Promise.all([
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
    // O "?" ao lado de cada item do menu (159). Falha vira `true` dentro
    // da própria leitura: o padrão tem de servir a quem está chegando.
    getExplicacoesLigadas(),
    // O guia do primeiro acesso (160): as duas datas e os cinco fatos
    // numa viagem so. Falha vira null — sem guia, nunca tela quebrada.
    getEstadoDoGuia(),
    proximosEventos(hoje).catch(() => []),
    nomeDaEmpresa().catch(() => null),
  ]);

  return (
    <>
      <Moldura
        userEmail={user.email ?? ""}
        cargo={cargo}
        empresaNome={empresaNome}
        proximos={proximos}
        hoje={hoje}
        prazosFrase={prazosFrase}
        esperaFrase={esperaFrase}
        congelamento={congelamento}
        explicacoes={explicacoes}
        signOut={signOut}
      >
        {children}
      </Moldura>
      {/* Fora do AppShell: o recorte cobre a tela inteira, barra lateral
          inclusive, e o passo 1 aponta justamente para um botao de fora
          do conteudo. */}
      <GuiaVivo guia={passoAtual(estadoDoGuia)} terminou={terminou(estadoDoGuia)} />
      {/* a tela de planos, a cada login de quem não paga (23/09/2026) */}
      {cargo === "proprietaria" && <BannerAoEntrar />}
      {/* a pesquisa rápida, uma vez por conta (24/09/2026) */}
      {cargo === "proprietaria" && <PesquisaRapida />}
      <TaskNotifications />
      {/* o "ao vivo" do painel do dono: só o nome da área, nada da tela */}
      <Presenca />
    </>
  );
}
