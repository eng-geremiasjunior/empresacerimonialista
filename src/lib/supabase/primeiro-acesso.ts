import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Cargo } from "@/lib/equipe-shared";

// O painel de quem acaba de chegar (handoff "Dashboard · primeiro acesso",
// 29/09/2026). A regra do desenho:
//   · 0 eventos e ela não pulou     → a tela de boas-vindas;
//   · 0 eventos e ela pulou         → o painel de sempre;
//   · 1 evento ou mais              → o painel de sempre, com os passos que
//     faltam (fornecedores, equipe) num bloco compacto no topo, até serem
//     feitos ou dispensados.
// Os eventos e fornecedores de EXEMPLO (174) não contam: a conta nova já
// nasce com eles, e ninguém criou nada ainda.
//
// "Pular" e "Dispensar" são preferência da pessoa, não da empresa: ficam
// no user_metadata dela (sem migração).

/** quem vê as boas-vindas e os passos: quem monta a conta */
const QUEM_MONTA: Cargo[] = ["proprietaria", "coordenadora"];

export type PrimeiroAcesso = {
  boasVindas: boolean;
  /** só com evento real; null = nada a mostrar */
  passos: { fornecedores: boolean; equipe: boolean } | null;
  /** o primeiro nome dela, nunca o e-mail */
  primeiroNome: string | null;
};

export async function getPrimeiroAcesso(
  cargo: Cargo | null,
  empresaId: string | null
): Promise<PrimeiroAcesso> {
  const vazio: PrimeiroAcesso = { boasVindas: false, passos: null, primeiroNome: null };
  if (!cargo || !QUEM_MONTA.includes(cargo)) return vazio;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vazio;
  const meta = (user.user_metadata ?? {}) as {
    name?: string;
    onboarding_dispensado?: boolean;
    passos_dispensados?: boolean;
  };

  let nome = typeof meta.name === "string" ? meta.name.trim() : "";
  if (!nome) {
    const { data: m } = await supabase
      .from("membros_equipe")
      .select("nome")
      .eq("user_id", user.id)
      .eq("status", "ativo")
      .limit(1)
      .maybeSingle();
    nome = ((m as { nome?: string | null } | null)?.nome ?? "").trim();
  }
  // nome que é e-mail não vira saudação
  const primeiroNome = nome && !nome.includes("@") ? nome.split(/\s+/)[0] : null;

  const { count: eventos } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .not("exemplo", "is", true);

  if ((eventos ?? 0) === 0) {
    return { boasVindas: meta.onboarding_dispensado !== true, passos: null, primeiroNome };
  }

  if (meta.passos_dispensados === true || !empresaId) {
    return { boasVindas: false, passos: null, primeiroNome };
  }
  const [forn, equipe] = await Promise.all([
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("exemplo", false),
    supabase
      .from("membros_equipe")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .eq("status", "ativo"),
  ]);
  // sem leitura (coluna ou policy), o passo não aparece — melhor faltar
  // o lembrete do que cobrar o que ela já fez
  const faltaFornecedor = !forn.error && (forn.count ?? 0) === 0;
  const faltaEquipe = cargo === "proprietaria" && !equipe.error && (equipe.count ?? 0) <= 1;
  return {
    boasVindas: false,
    passos: faltaFornecedor || faltaEquipe ? { fornecedores: faltaFornecedor, equipe: faltaEquipe } : null,
    primeiroNome,
  };
}
