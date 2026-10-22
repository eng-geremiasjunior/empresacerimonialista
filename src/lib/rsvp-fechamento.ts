// Fechar a lista do RSVP (21/10/2026): o que o buffet e a equipe precisam
// saber, em números exatos. Puro, sem banco e sem IA — é conta.
//
// Adultos = os confirmados (menos quem é criança) + os acompanhantes;
// crianças = as crianças dos confirmados + os convidados marcados como
// criança. "O que mudou" = as respostas que chegaram depois do último
// fechamento registrado (a nota "Lista fechada em …" no Caderno).

export type LinhaOperacional = {
  id: string;
  nome: string;
  grupo: string | null;
  lado: string | null;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  acompanhantes: number;
  criancas: number;
  ehCrianca: boolean;
  restricao: string | null;
  acessibilidade: string | null;
  telefone: string | null;
  email: string | null;
  confirmadoEm: string | null;
};

export type ResumoDaLista = {
  confirmados: number;
  adultos: number;
  criancas: number;
  pessoas: number;
  naoVao: number;
  aguardando: number;
  semContato: number;
  restricoes: { texto: string; n: number }[];
  acessibilidade: { nome: string; texto: string }[];
  novas: { nome: string; confirmacao: LinhaOperacional["confirmacao"]; pessoas: number }[];
};

export const MARCA_DO_FECHAMENTO = "Lista fechada em";

const normal = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

export function resumoDaLista(linhas: LinhaOperacional[], desde: string | null): ResumoDaLista {
  const conf = linhas.filter((l) => l.confirmacao === "confirmado");
  const adultos = conf.reduce((s, l) => s + (l.ehCrianca ? 0 : 1) + l.acompanhantes, 0);
  const criancas = conf.reduce((s, l) => s + (l.ehCrianca ? 1 : 0) + l.criancas, 0);

  const contagem = new Map<string, { texto: string; n: number }>();
  for (const l of conf) {
    if (!l.restricao?.trim()) continue;
    const k = normal(l.restricao);
    const atual = contagem.get(k);
    if (atual) atual.n += 1;
    else contagem.set(k, { texto: l.restricao.trim().slice(0, 80), n: 1 });
  }

  return {
    confirmados: conf.length,
    adultos,
    criancas,
    pessoas: adultos + criancas,
    naoVao: linhas.filter((l) => l.confirmacao === "nao_vai").length,
    aguardando: linhas.filter((l) => l.confirmacao === "aguardando").length,
    semContato: linhas.filter((l) => l.confirmacao === "aguardando" && !l.telefone && !l.email).length,
    restricoes: Array.from(contagem.values()).sort((a, b) => b.n - a.n || a.texto.localeCompare(b.texto)),
    acessibilidade: conf
      .filter((l) => l.acessibilidade?.trim())
      .map((l) => ({ nome: l.nome, texto: l.acessibilidade!.trim().slice(0, 120) })),
    novas: desde
      ? linhas
          .filter((l) => l.confirmacao !== "aguardando" && l.confirmadoEm && l.confirmadoEm > desde)
          .sort((a, b) => (b.confirmadoEm ?? "").localeCompare(a.confirmadoEm ?? ""))
          .map((l) => ({
            nome: l.nome,
            confirmacao: l.confirmacao,
            pessoas: l.confirmacao === "confirmado" ? (l.ehCrianca ? 0 : 1) + l.acompanhantes + l.criancas + (l.ehCrianca ? 1 : 0) : 0,
          }))
      : [],
  };
}

const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** o texto para o buffet (WhatsApp) e para a nota do Caderno */
export function textoDoFechamento(r: ResumoDaLista, evento: { nome: string; data: string | null }, hoje: string): string {
  const linhas = [
    `${MARCA_DO_FECHAMENTO} ${dataBR(hoje)} · ${evento.nome}${evento.data ? ` (${dataBR(evento.data)})` : ""}`,
    `${r.pessoas} ${r.pessoas === 1 ? "pessoa" : "pessoas"}: ${r.adultos} ${r.adultos === 1 ? "adulto" : "adultos"} e ${r.criancas} ${r.criancas === 1 ? "criança" : "crianças"}`,
    `${r.confirmados} ${r.confirmados === 1 ? "convite confirmado" : "convites confirmados"} · ${r.naoVao} não ${r.naoVao === 1 ? "vai" : "vão"} · ${r.aguardando} sem resposta`,
  ];
  if (r.restricoes.length) linhas.push(`Restrições: ${r.restricoes.map((x) => `${x.texto} (${x.n})`).join(", ")}`);
  if (r.acessibilidade.length) linhas.push(`Acessibilidade: ${r.acessibilidade.map((x) => `${x.nome}: ${x.texto}`).join("; ")}`);
  return linhas.join("\n");
}

const celula = (v: string | number | null | undefined) => {
  const t = String(v ?? "");
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

const RESPOSTA: Record<LinhaOperacional["confirmacao"], string> = {
  confirmado: "Confirmado",
  nao_vai: "Não vai",
  aguardando: "Sem resposta",
};

/** A planilha para o buffet (CSV com ";" e BOM, como o Excel em português
 *  abre direto). Sem telefone nem e-mail: o buffet não precisa deles. */
export function planilhaDaLista(linhas: LinhaOperacional[]): string {
  const cab = ["Nome", "Resposta", "Adultos", "Crianças", "Grupo", "Lado", "Restrição alimentar", "Acessibilidade"];
  const corpo = [...linhas]
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((l) => {
      const conf = l.confirmacao === "confirmado";
      return [
        l.nome,
        RESPOSTA[l.confirmacao],
        conf ? (l.ehCrianca ? 0 : 1) + l.acompanhantes : "",
        conf ? (l.ehCrianca ? 1 : 0) + l.criancas : "",
        l.grupo,
        l.lado,
        l.restricao,
        l.acessibilidade,
      ]
        .map(celula)
        .join(";");
    });
  return "﻿" + [cab.join(";"), ...corpo].join("\r\n");
}
