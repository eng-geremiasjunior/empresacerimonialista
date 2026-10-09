import "server-only";

// O que o painel do dono vê de cada conta do portal (08/10/2026). Pedido
// dele: "igual os da cerimonialista, mas mais completo — se está online,
// mexendo no que, construindo o que". Lê, por conta de família:
//   · a presença (ao vivo + a tela) e o uso dos últimos 7 dias por tela;
//   · de onde veio (origem do clique, gravada na confirmação da conta);
//   · o que já existe na festa, parte a parte.
// Só CONTAGENS e estados: nome de convidado, recado, foto ou valor de
// presente de alguém não saem daqui. O total recebido em presentes sai
// em reais porque é o que diz se a lista funciona.

import type { Servico } from "./admin-painel";
import { lerTudo } from "./admin-painel";
import { AO_VIVO_ATE_MS } from "@/lib/presenca";
import { hojeBR, somarDias } from "@/lib/tempo";

export type PecaConstruida = { rotulo: string; detalhe: string | null; forte: boolean };

export type PortalDetalhado = {
  aoVivo: { area: string; desde: string } | null;
  vistoEm: string | null;
  /** minutos nos últimos 7 dias */
  uso7: number;
  dias7: number;
  areas7: { area: string; minutos: number }[];
  usoTotal: number;
  origem: string | null;
  construcao: PecaConstruida[];
};

type Linha = Record<string, unknown>;

async function porEvento(
  db: Servico,
  tabela: string,
  colunas: string,
  eventos: string[]
): Promise<Linha[]> {
  if (eventos.length === 0) return [];
  try {
    // colunas em texto variável: o cliente não sabe tipar, a linha vem genérica
    type Resposta = PromiseLike<{ data: Linha[] | null; error: { message: string } | null }>;
    return await lerTudo<Linha>(
      (de, ate) =>
        db.from(tabela).select(colunas).in("event_id", eventos).order("event_id").range(de, ate) as unknown as Resposta,
      tabela
    );
  } catch {
    // tabela ainda não existe (migração não aplicada): a peça só não aparece
    return [];
  }
}

const contar = (linhas: Linha[], evento: string, filtro?: (l: Linha) => boolean) =>
  linhas.filter((l) => l.event_id === evento && (!filtro || filtro(l))).length;

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function origemEmPalavras(o: Linha | undefined): string | null {
  if (!o) return null;
  const src = String(o.utm_source ?? "").toLowerCase();
  const conteudo = String(o.utm_content ?? "").toLowerCase();
  const anuncio = Boolean(o.fbc);
  const ua = String(o.user_agent ?? "");
  const aparelho = /iphone|ipad/i.test(ua)
    ? "iPhone"
    : /android/i.test(ua)
      ? "celular Android"
      : /mac os/i.test(ua)
        ? "Mac"
        : ua
          ? "computador"
          : null;
  let canal: string;
  if (anuncio && /^(ig|instagram)$/.test(src)) canal = "Anúncio no Instagram";
  else if (anuncio) canal = "Anúncio na Meta";
  else if (/^(ig|instagram)$/.test(src)) canal = conteudo.includes("bio") ? "Instagram · link da bio" : "Instagram";
  else if (src) canal = src;
  else canal = "Sem origem registrada";
  return [canal, aparelho].filter(Boolean).join(" · ");
}

export async function lerPortalDetalhado(
  db: Servico,
  contas: { empresaId: string; userId: string; eventoId: string | null }[]
): Promise<Map<string, PortalDetalhado>> {
  const empresas = contas.map((c) => c.empresaId);
  const eventos = contas.map((c) => c.eventoId).filter((e): e is string => Boolean(e));
  const saida = new Map<string, PortalDetalhado>();
  if (empresas.length === 0) return saida;

  const hoje = hojeBR();
  const desde7 = somarDias(hoje, -6);
  const agora = Date.now();

  const [
    presenca,
    uso,
    origens,
    sites,
    convites,
    convidados,
    presentes,
    listas,
    pagamentos,
    mesas,
    fotos,
    musicas,
    inspiracoes,
    gastos,
    decisoes,
    documentos,
  ] = await Promise.all([
    db.from("presenca").select("user_id, empresa_id, area, desde, visto_em").in("empresa_id", empresas),
    lerTudo<Linha>(
      (de, ate) =>
        db.from("uso_diario").select("empresa_id, dia, area, minutos").in("empresa_id", empresas).order("dia").range(de, ate),
      "o uso do portal"
    ).catch(() => [] as Linha[]),
    db.from("origem_do_clique").select("*").in("empresa_id", empresas),
    porEvento(db, "evento_site", "event_id, publicado, tema, estrutura, updated_at", eventos),
    porEvento(db, "evento_convite", "event_id, modelo, updated_at", eventos),
    porEvento(db, "evento_convidado", "event_id, confirmacao", eventos),
    porEvento(db, "evento_presente", "event_id, removido", eventos),
    porEvento(db, "evento_lista", "event_id, publicada", eventos),
    porEvento(db, "presente_pagamento", "event_id, status, valor_presente_centavos", eventos),
    porEvento(db, "evento_mesa", "event_id", eventos),
    porEvento(db, "evento_album_foto", "event_id", eventos),
    porEvento(db, "evento_musica", "event_id", eventos),
    porEvento(db, "evento_inspiracao", "event_id", eventos),
    porEvento(db, "familia_gasto", "event_id, valor", eventos),
    porEvento(db, "evento_decisao", "event_id, estado", eventos),
    porEvento(db, "evento_documento", "event_id", eventos),
  ]);

  for (const c of contas) {
    // presença: a do login dono da conta
    const p = ((presenca.data ?? []) as Linha[]).find((x) => x.user_id === c.userId);
    const visto = p ? String(p.visto_em) : null;
    const aoVivo =
      p && visto && agora - new Date(visto).getTime() <= AO_VIVO_ATE_MS
        ? { area: String(p.area), desde: String(p.desde) }
        : null;

    const meu = uso.filter((u) => u.empresa_id === c.empresaId);
    const ult7 = meu.filter((u) => String(u.dia) >= desde7);
    const porArea = new Map<string, number>();
    for (const u of ult7) porArea.set(String(u.area), (porArea.get(String(u.area)) ?? 0) + Number(u.minutos ?? 0));
    const areas7 = [...porArea.entries()]
      .map(([area, minutos]) => ({ area: area.replace(/^Portal › /, ""), minutos }))
      .filter((a) => a.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos)
      .slice(0, 4);

    const ev = c.eventoId;
    const construcao: PecaConstruida[] = [];
    if (ev) {
      const site = sites.find((s) => s.event_id === ev);
      if (site) {
        construcao.push({
          rotulo: site.publicado ? "Site publicado" : "Site em montagem",
          // tema é um objeto ({ modelo: "violino", paleta, fontes… })
          detalhe: (() => {
            const t = site.tema as { modelo?: unknown } | null;
            return t && typeof t.modelo === "string" && t.modelo ? `modelo ${t.modelo}` : null;
          })(),
          forte: Boolean(site.publicado),
        });
      }
      const convite = convites.find((s) => s.event_id === ev);
      if (convite) construcao.push({ rotulo: "Convite animado", detalhe: `modelo ${String(convite.modelo)}`, forte: true });

      const total = contar(convidados, ev);
      if (total > 0) {
        const sim = contar(convidados, ev, (l) => l.confirmacao === "confirmado");
        const nao = contar(convidados, ev, (l) => l.confirmacao === "nao_vai");
        construcao.push({
          rotulo: `${total} ${total === 1 ? "convidado" : "convidados"}`,
          detalhe: sim || nao ? `${sim} confirmaram · ${nao} não vão` : "nenhuma resposta ainda",
          forte: sim > 0,
        });
      }

      const itens = contar(presentes, ev, (l) => !l.removido);
      const lista = listas.find((l) => l.event_id === ev);
      const pagos = pagamentos.filter((x) => x.event_id === ev && x.status === "pago");
      if (itens > 0 || lista) {
        const recebido = pagos.reduce((s, x) => s + Number(x.valor_presente_centavos ?? 0), 0);
        construcao.push({
          rotulo: `Lista de presentes${lista?.publicada ? " publicada" : ""}`,
          detalhe: [
            `${itens} ${itens === 1 ? "item" : "itens"}`,
            pagos.length ? `${pagos.length} ${pagos.length === 1 ? "presente" : "presentes"} · ${reais(recebido)}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          forte: pagos.length > 0,
        });
      }

      const dec = decisoes.filter((d) => d.event_id === ev);
      const decididas = dec.filter((d) => d.estado === "decidida").length;
      if (decididas > 0) {
        construcao.push({ rotulo: "Planejamento", detalhe: `${decididas} de ${dec.length} decididas`, forte: true });
      }

      const extras: [Linha[], string, string][] = [
        [mesas, "mesa", "mesas"],
        [fotos, "foto no álbum", "fotos no álbum"],
        [musicas, "música", "músicas"],
        [inspiracoes, "inspiração", "inspirações"],
        [documentos, "documento", "documentos"],
      ];
      for (const [linhas, um, varios] of extras) {
        const n = contar(linhas, ev);
        if (n > 0) construcao.push({ rotulo: `${n} ${n === 1 ? um : varios}`, detalhe: null, forte: false });
      }
      const g = gastos.filter((x) => x.event_id === ev);
      if (g.length > 0) {
        const soma = g.reduce((s, x) => s + Number(x.valor ?? 0), 0);
        construcao.push({
          rotulo: `${g.length} ${g.length === 1 ? "gasto" : "gastos"} no orçamento`,
          detalhe: soma ? reais(soma * 100) : null,
          forte: false,
        });
      }
    }

    saida.set(c.empresaId, {
      aoVivo,
      vistoEm: visto,
      uso7: ult7.reduce((s, u) => s + Number(u.minutos ?? 0), 0),
      dias7: new Set(ult7.filter((u) => Number(u.minutos ?? 0) > 0).map((u) => String(u.dia))).size,
      areas7,
      usoTotal: meu.reduce((s, u) => s + Number(u.minutos ?? 0), 0),
      origem: origemEmPalavras(((origens.data ?? []) as Linha[]).find((o) => o.empresa_id === c.empresaId)),
      construcao,
    });
  }
  return saida;
}
