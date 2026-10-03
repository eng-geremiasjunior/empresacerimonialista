import "server-only";

// O que a tela da lista de presentes lê (197), pela sessão de quem abre o
// portal: a lista salva (portal_lista — toda a família que vê o evento),
// os presentes recebidos (presente_pagamento — a RLS só devolve ao casal),
// a conta que recebe (182) e o site (o endereço público da lista).

import { createClient } from "@/lib/supabase/server";
import { getContatoCerimonialista } from "@/lib/supabase/portal";
import { getMeuAcesso } from "@/lib/supabase/portal-estilo";
import { getRecebedor, type RecebedorDoEvento } from "@/lib/supabase/portal-presentes";
import { publicBase } from "@/lib/app-url";
import { hojeBR, somarDias } from "@/lib/tempo";

export type PresenteDaLista = {
  id: string;
  codigo: string | null;
  categoria: string;
  titulo: string;
  valorCentavos: number;
  quantidade: number;
  /** quantos já foram pagos (não deixa a quantidade descer abaixo disso) */
  comprados: number;
};

export type PresenteRecebido = {
  id: string;
  titulo: string;
  quem: string;
  recado: string | null;
  /** o que chega ao casal (o preço, ou o preço menos a taxa) */
  familiaCentavos: number;
  /** "hoje", "ontem", "há 3 dias", "12/10" — calculado aqui, sem relógio no navegador */
  quando: string;
};

export type DadosDaTelaLista = {
  eventoId: string;
  /** a 197 ainda não foi aplicada */
  semMigracao: boolean;
  /** só o casal salva (portal_salvar_lista) */
  podeEditar: boolean;
  /** quem cadastra a conta que recebe (o casal; nunca a debutante) */
  souResponsavel: boolean;
  meuNome: string | null;
  /** o e-mail do login, que o cadastro da conta propõe (e deixa corrigir) */
  meuEmail: string | null;
  cerimonialista: string;
  lista: { taxaDoCasal: boolean; mensagem: string; publicada: boolean; salvaAlgumaVez: boolean };
  itens: PresenteDaLista[];
  /** null = quem abriu não vê os pagamentos (só o casal vê) */
  recebidos: PresenteRecebido[] | null;
  recebedor: RecebedorDoEvento | null;
  site: { publicado: boolean };
  /** o endereço da lista para os convidados (existe com o site tendo endereço) */
  link: string | null;
};

type ListaDaRpc = {
  lista: { taxa_do_casal: boolean; mensagem: string | null; publicada: boolean; updated_at: string } | null;
  itens: {
    id: string;
    codigo: string | null;
    categoria: string;
    titulo: string;
    valor_centavos: number;
    quantidade: number;
    ordem: number;
    comprados: number;
  }[];
} | null;

function quandoFoi(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = hojeBR(d);
  const hoje = hojeBR();
  if (dia === hoje) return "hoje";
  if (dia === somarDias(hoje, -1)) return "ontem";
  for (let n = 2; n <= 6; n++) if (dia === somarDias(hoje, -n)) return `há ${n} dias`;
  const [, m, dd] = dia.split("-");
  return `${dd}/${m}`;
}

export async function getListaDoCasal(eventoId: string): Promise<DadosDaTelaLista> {
  const supabase = createClient();
  const [listaR, pagosR, { data: nivel }, { data: siteBruto }, recebedor, eu, contato, { data: sessao }] = await Promise.all([
    supabase.rpc("portal_lista", { p_event_id: eventoId }),
    supabase
      .from("presente_pagamento")
      .select("id, titulo, quem, recado, valor_presente_centavos, taxa_centavos, taxa_do_casal, pago_em")
      .eq("event_id", eventoId)
      .eq("status", "pago")
      .order("pago_em", { ascending: false })
      .limit(500),
    supabase.rpc("portal_meu_nivel", { p_event_id: eventoId }),
    supabase.from("evento_site").select("slug, publicado").eq("event_id", eventoId).maybeSingle(),
    getRecebedor(eventoId),
    getMeuAcesso(eventoId),
    getContatoCerimonialista(eventoId),
    supabase.auth.getUser(),
  ]);

  const semMigracao = !!listaR.error && /portal_lista/.test(listaR.error.message ?? "");
  const salvo = (listaR.error ? null : (listaR.data as ListaDaRpc)) ?? null;
  const ehCasal = nivel === "casal";

  const pagos = (pagosR.error ? null : pagosR.data) as
    | {
        id: string;
        titulo: string;
        quem: string;
        recado: string | null;
        valor_presente_centavos: number;
        taxa_centavos: number;
        taxa_do_casal: boolean;
        pago_em: string | null;
      }[]
    | null;

  const site = siteBruto as { slug: string | null; publicado: boolean | null } | null;
  const slug = (site?.slug ?? "").trim() || null;

  return {
    eventoId,
    semMigracao,
    podeEditar: ehCasal,
    souResponsavel: ehCasal && eu.papel !== null && eu.papel !== "debutante",
    meuNome: eu.nome,
    meuEmail: sessao.user?.email ?? null,
    cerimonialista: contato.nome?.split(" ")[0] ?? "a cerimonialista",
    lista: {
      taxaDoCasal: salvo?.lista?.taxa_do_casal === true,
      mensagem: salvo?.lista?.mensagem ?? "",
      publicada: salvo?.lista?.publicada === true,
      salvaAlgumaVez: !!salvo?.lista,
    },
    itens: (salvo?.itens ?? []).map((i) => ({
      id: i.id,
      codigo: i.codigo,
      categoria: i.categoria,
      titulo: i.titulo,
      valorCentavos: i.valor_centavos,
      quantidade: i.quantidade,
      comprados: Number(i.comprados) || 0,
    })),
    // a RLS devolve vazio a quem não é do casal: aí a tela não mostra o bloco
    recebidos: ehCasal
      ? (pagos ?? []).map((p) => ({
          id: p.id,
          titulo: p.titulo,
          quem: p.quem,
          recado: p.recado,
          // o que foi dividido de verdade: a taxa gravada no pagamento
          familiaCentavos: p.taxa_do_casal ? p.valor_presente_centavos - p.taxa_centavos : p.valor_presente_centavos,
          quando: quandoFoi(p.pago_em),
        }))
      : null,
    recebedor,
    site: { publicado: site?.publicado === true && !!slug },
    link: slug ? `${publicBase()}/c/${slug}/presentes` : null,
  };
}
