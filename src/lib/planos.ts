// Os planos vendidos — lidos do banco, nunca escritos aqui.
//
// Até a 147 o único preço morava numa variável de ambiente e o plano era
// gravado como o texto fixo "mensal". Agora preço e tetos são DADO em
// `plano_catalogo`: o admin edita lá, e a tela de assinatura, a cobrança
// e o painel do dono leem daqui. Nenhum número de plano vive em TS.

import { createClient } from "@/lib/supabase/server";

export type CodigoDoPlano = "essencial" | "profissional" | "master";

export type PlanoDoCatalogo = {
  codigo: CodigoDoPlano;
  nome: string;
  valorMensal: number;
  /** teto de eventos de pé; null = sem limite */
  eventosEmAndamento: number | null;
  /** teto de pessoas ativas com login; null = sem limite */
  logins: number | null;
  ordem: number;
};

const CODIGOS: CodigoDoPlano[] = ["essencial", "profissional", "master"];

export function ehCodigoDoPlano(v: unknown): v is CodigoDoPlano {
  return typeof v === "string" && (CODIGOS as string[]).includes(v);
}

type Linha = {
  codigo: string;
  nome: string;
  valor_mensal: number | string;
  eventos_em_andamento: number | null;
  logins: number | null;
  ordem: number;
};

function comoPlano(l: Linha): PlanoDoCatalogo {
  return {
    codigo: l.codigo as CodigoDoPlano,
    nome: l.nome,
    valorMensal: Number(l.valor_mensal),
    eventosEmAndamento: l.eventos_em_andamento,
    logins: l.logins,
    ordem: l.ordem,
  };
}

/** Os planos ativos, na ordem da vitrine (Essencial → Master). */
export async function getCatalogoDePlanos(): Promise<PlanoDoCatalogo[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("plano_catalogo")
    .select("codigo, nome, valor_mensal, eventos_em_andamento, logins, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  return ((data ?? []) as Linha[]).filter((l) => ehCodigoDoPlano(l.codigo)).map(comoPlano);
}

/** Um plano pelo código; null se não existe ou está inativo. */
export async function getPlano(codigo: string): Promise<PlanoDoCatalogo | null> {
  if (!ehCodigoDoPlano(codigo)) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("plano_catalogo")
    .select("codigo, nome, valor_mensal, eventos_em_andamento, logins, ordem")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();
  return data ? comoPlano(data as Linha) : null;
}

/** "R$ 149,00" — o gateway pensa em centavos, a tela em reais. */
export function reais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function centavos(valorReais: number): number {
  return Math.round(valorReais * 100);
}

/** "sem limite" quando o teto é nulo — a palavra que a tela usa. */
export function tetoEmTexto(teto: number | null): string {
  return teto === null ? "sem limite" : String(teto);
}
