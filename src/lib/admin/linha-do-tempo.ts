// A linha do tempo da ficha da conta: o que a conta fez, dia a dia, em
// palavras. Puro. Só números e nomes de área: nada do que está nas telas
// dela chega aqui (regra dele: "não quero ver telas").

import type { LinhaDoTempo } from "@/lib/supabase/admin-contas";
import {
  acaoEmPalavras,
  diaBR,
  diasAte,
  emTeste,
  type ResumoDaConta,
} from "@/lib/admin/saude-da-conta";
import { minutosEmTexto, plural, reais } from "@/lib/admin/formatos";
import { hojeBR, somarDias } from "@/lib/tempo";

/** O registro de uso por tela começou no ar em 16/09/2026, à noite. */
export const INICIO_DO_REGISTRO_DE_USO = "2026-09-16";

export type TipoDaLinha = "futuro" | "marco" | "acao" | "uso" | "ausencia" | "assinatura" | "suporte";

export type DiaDaLinha = {
  dia: string;
  linhas: { tipo: TipoDaLinha; texto: string }[];
};

const ORDEM: TipoDaLinha[] = ["futuro", "marco", "assinatura", "acao", "uso", "suporte", "ausencia"];

function eventoDeAssinatura(e: LinhaDoTempo["assinatura"][number]): string {
  const depois = e.valor_depois !== null ? reais(Number(e.valor_depois)) : null;
  switch (e.tipo) {
    case "inicio":
      return depois ? `começou a pagar ${depois} por mês` : "começou a pagar";
    case "upgrade":
      return depois ? `subiu de plano: ${depois} por mês` : "subiu de plano";
    case "downgrade":
      return depois ? `desceu de plano: ${depois} por mês` : "desceu de plano";
    case "cancelamento":
      return e.nota ? `cancelou (${e.nota})` : "cancelou";
    case "reativacao":
      return depois ? `voltou a pagar ${depois} por mês` : "voltou a pagar";
    case "pausa":
      return "assinatura pausada";
    case "retomada":
      return "assinatura retomada";
    default:
      return e.tipo;
  }
}

function avisoDaOperadora(tipo: string): string | null {
  if (tipo === "invoice.paid" || tipo === "charge.paid") return "operadora: pagamento confirmado";
  if (tipo.endsWith("payment_failed")) return "operadora: cobrança recusada";
  if (tipo === "subscription.canceled") return "operadora: assinatura cancelada";
  if (tipo === "subscription.created") return "operadora: assinatura criada";
  return null;
}

export function montarLinhaDoTempo(
  c: ResumoDaConta,
  lt: LinhaDoTempo,
  agora: Date,
  dias: number
): DiaDaLinha[] {
  const hoje = hojeBR(agora);
  const desde = somarDias(hoje, -dias);
  const porDia = new Map<string, DiaDaLinha["linhas"]>();
  const por = (dia: string, tipo: TipoDaLinha, texto: string) => {
    if (dia < desde && tipo !== "futuro") return;
    const lista = porDia.get(dia) ?? [];
    lista.push({ tipo, texto });
    porDia.set(dia, lista);
  };

  // o que vem pela frente: o fim do teste
  if (emTeste(c) && c.assinatura?.teste_termina_em) {
    const faltam = diasAte(c.assinatura.teste_termina_em, agora);
    if (faltam !== null && faltam >= 0) {
      por(
        c.assinatura.teste_termina_em,
        "futuro",
        faltam === 0 ? "o teste termina hoje" : `o teste termina (daqui a ${plural(faltam, "dia", "dias")})`
      );
    }
  }

  // marcos
  por(diaBR(c.criada_em), "marco", "conta criada");
  if (c.dona.guia_concluido_em) por(diaBR(c.dona.guia_concluido_em), "marco", "concluiu o guia do primeiro acesso");
  if (c.dona.guia_dispensado_em) por(diaBR(c.dona.guia_dispensado_em), "marco", "pulou o guia do primeiro acesso");

  // o que a equipe fez
  const diasComAcao = new Set<string>();
  for (const a of lt.acoes) {
    diasComAcao.add(a.dia);
    por(a.dia, "acao", acaoEmPalavras(a.tipo, a.n));
  }

  // quanto tempo ficou no sistema, e onde
  const diasComUso = new Set<string>();
  for (const u of lt.uso) {
    diasComUso.add(u.dia);
    const areas = u.areas
      .slice(0, 3)
      .map((x) => x.area)
      .join(", ");
    por(
      u.dia,
      "uso",
      u.minutos > 0
        ? `usou ${minutosEmTexto(u.minutos)}${areas ? ` · ${areas}` : ""}`
        : `abriu o sistema${areas ? ` · ${areas}` : ""}`
    );
  }

  // os dias sem abrir o sistema: só onde o registro existe (desde 16/09)
  const criada = diaBR(c.criada_em);
  let d = [INICIO_DO_REGISTRO_DE_USO, criada, desde].sort().pop() as string;
  while (d < hoje) {
    if (!diasComUso.has(d) && !diasComAcao.has(d)) por(d, "ausencia", "não abriu o sistema");
    d = somarDias(d, 1);
  }

  // assinatura e operadora
  for (const e of lt.assinatura) por(e.em.slice(0, 10), "assinatura", eventoDeAssinatura(e));
  for (const g of lt.gateway) {
    const texto = avisoDaOperadora(g.tipo);
    if (texto) por(diaBR(g.em), "assinatura", g.erro && !/sem assinatura/.test(g.erro) ? `${texto} (${g.erro})` : texto);
  }

  // suporte
  for (const s of lt.suporte) {
    if (s.dela) por(s.dia, "suporte", `escreveu ${plural(s.dela, "mensagem", "mensagens")} no suporte`);
    if (s.nossas) por(s.dia, "suporte", `recebeu ${plural(s.nossas, "resposta", "respostas")} nossa${s.nossas === 1 ? "" : "s"}`);
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, linhas]) => ({
      dia,
      linhas: [...linhas].sort((x, y) => ORDEM.indexOf(x.tipo) - ORDEM.indexOf(y.tipo)),
    }));
}
