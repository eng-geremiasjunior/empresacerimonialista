// Fornecedores do evento — as regras, sem tela.
//
// Porta do `fornecedores.js` do handoff, ajustada ao schema real: o
// convite vive em supplier_confirmations (hash = magic link, status,
// sent_at, responded_at e — desde a 100 — aberturas), e o vínculo com o
// evento em roteiro_links.
//
// A UI não decide status, grupo, contagem nem elegibilidade: pergunta
// aqui. Parte PURA — componentes "use client" importam à vontade.

/* ---------------- modelo ---------------- */

export type Fornecedor = {
  supplierId: string;
  nome: string;
  categoria: string | null;
  email: string | null;
  whatsapp: string | null;
  /** roteiro_links.confirmed — o que alimenta a Saúde do Evento */
  confirmadoNoEvento: boolean;
  /** quando o fornecedor foi vinculado ao evento */
  vinculadoEm: string | null;
  convite: {
    status: "pendente" | "confirmado" | "recusado";
    enviadoEm: string | null;
    respondidoEm: string | null;
    aberturas: number;
    ultimaAbertura: string | null;
  } | null;
  /** o que já foi pedido a ele pela Central, vivo ou já respondido */
  pedidos: {
    id: string;
    tipo: "confirmacao" | "contrato";
    status: string;
    arquivoPath: string | null;
    arquivoNome: string | null;
  }[];
  /** o dinheiro deste fornecedor NESTE evento, vindo do Financeiro */
  dinheiro: DinheiroDoFornecedor | null;
};

/** Lançado no Financeiro do evento, somado por fornecedor. */
export type DinheiroDoFornecedor = {
  contratado: number;
  pago: number;
  parcelasAbertas: number;
  /** a próxima parcela a vencer, se houver */
  proximoVencimento: string | null;
};

/**
 * O valor do fornecedor em uma linha. Ela não precisa abrir o Financeiro
 * para saber quanto custa quem está olhando — e não precisa de um card
 * para isso, precisa de uma frase.
 */
export function dinheiroEmPalavras(d: DinheiroDoFornecedor | null): string {
  if (!d || d.contratado === 0) return "sem valor lançado no financeiro";
  const reais = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (d.pago >= d.contratado) return `${reais(d.contratado)} · tudo pago`;
  const falta = d.contratado - d.pago;
  const parcelas =
    d.parcelasAbertas === 1 ? "1 parcela" : `${d.parcelasAbertas} parcelas`;
  return `${reais(d.contratado)} · ${reais(falta)} a pagar em ${parcelas}`;
}

/** O contrato que ele mandou, se mandou. */
export function contratoAnexado(
  f: Fornecedor
): { path: string; nome: string } | null {
  for (const p of f.pedidos) {
    if (p.tipo === "contrato" && p.arquivoPath) {
      return { path: p.arquivoPath, nome: p.arquivoNome ?? "contrato" };
    }
  }
  return null;
}

/** O que está pendurado com ele agora, em uma frase — ou nada. */
export function pedidosEmPalavras(f: Fornecedor): string | null {
  const vivos = f.pedidos.filter((p) =>
    ["pendente", "enviada", "reenviada"].includes(p.status)
  );
  if (vivos.length === 0) return null;
  const nome = (t: string) => (t === "contrato" ? "contrato assinado" : "confirmação");
  const naFila = vivos.some((p) => p.status === "pendente");
  const lista = vivos.map((p) => nome(p.tipo)).join(" e ");
  return naFila ? `${lista}: na fila de hoje` : `${lista}: aguardando resposta`;
}

export type Automacao = {
  diasAntes: number;
  email: boolean;
  whatsapp: boolean;
};

export type Tom = "ok" | "neutro" | "late";
export type Grupo = "confirmados" | "pendentes" | "atencao";
export type Filtro = "todos" | Grupo;

export type Estado = { label: string; tom: Tom; meta: string };

/* ---------------- tempo ---------------- */

const horasEntre = (iso: string, agora: number) =>
  (agora - new Date(iso).getTime()) / 3_600_000;

/** "agora" · "há 3h" · "há 2 dias" */
export function relativo(iso: string, agora = Date.now()): string {
  const h = horasEntre(iso, agora);
  if (h < 1) return "agora";
  if (h < 24) return `há ${Math.floor(h)}h`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** "14/08 · 17:42" */
export function quando(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ---------------- estados ---------------- */

/** A coluna Convite: separa quem ABRIU de quem só recebeu. */
export function estadoConvite(f: Fornecedor, agora = Date.now()): Estado {
  const c = f.convite;
  const enviadoEm = c?.enviadoEm;
  if (!c || !enviadoEm) {
    return {
      label: "Não enviado",
      tom: "late",
      meta: f.email ? "magic link não gerado" : "sem e-mail: magic link não gerado",
    };
  }
  if (c.aberturas > 0 && c.ultimaAbertura) {
    return {
      label: `Visto ${relativo(c.ultimaAbertura, agora)}`,
      tom: "ok",
      meta: `aberto ${c.aberturas}x`,
    };
  }
  const h = horasEntre(enviadoEm, agora);
  return {
    label: `Enviado ${relativo(enviadoEm, agora)}`,
    tom: "neutro",
    meta: h >= 24 ? "sem abertura · 2º envio recomendado" : "aguardando abertura",
  };
}

export function estadoPresenca(f: Fornecedor): Estado {
  if (f.convite?.status === "confirmado") {
    return { label: "Confirmado", tom: "ok", meta: quando(f.convite.respondidoEm) };
  }
  if (f.convite?.status === "recusado") {
    return { label: "Recusou", tom: "late", meta: quando(f.convite.respondidoEm) };
  }
  // marcada à mão pela cerimonialista, sem passar pelo link
  if (f.confirmadoNoEvento) {
    return { label: "Confirmado", tom: "ok", meta: "manual" };
  }
  if (f.convite?.enviadoEm) {
    return { label: "Aguardando", tom: "neutro", meta: "sem resposta" };
  }
  return { label: "Pendente", tom: "neutro", meta: "—" };
}

/** Fonte única do filtro e do rodapé. */
export function grupoDe(f: Fornecedor): Grupo {
  if (f.convite?.status === "confirmado" || f.confirmadoNoEvento) return "confirmados";
  if (f.convite?.status === "recusado") return "atencao";
  if (!f.email || !f.convite?.enviadoEm) return "atencao";
  return "pendentes";
}

/* ---------------- envio ---------------- */

export function podeEnviarConvite(
  f: Fornecedor,
  a: Pick<Automacao, "email" | "whatsapp">
): { ok: true; canais: string[] } | { ok: false; motivo: string } {
  const porEmail = !!f.email && a.email;
  const porZap = !!f.whatsapp && a.whatsapp;
  if (!f.email && !f.whatsapp) {
    return { ok: false, motivo: "Sem e-mail nem WhatsApp cadastrado" };
  }
  if (!porEmail && !porZap) {
    return {
      ok: false,
      motivo: f.email
        ? "Os dois canais estão desligados neste evento"
        : "Sem e-mail, e o WhatsApp está desligado neste evento",
    };
  }
  if (!porEmail) {
    // sai por WhatsApp, mas sem e-mail não há magic link
    return { ok: true, canais: ["whatsapp"] };
  }
  return { ok: true, canais: porZap ? ["email", "whatsapp"] : ["email"] };
}

/** 24h do envio sem nenhuma abertura e sem resposta. */
export function precisaSegundoEnvio(f: Fornecedor, agora = Date.now()): boolean {
  const c = f.convite;
  if (!c?.enviadoEm || c.aberturas > 0 || c.status !== "pendente") return false;
  return horasEntre(c.enviadoEm, agora) >= 24;
}

/* ---------------- lista ---------------- */

export const filtrar = (lista: Fornecedor[], filtro: Filtro): Fornecedor[] =>
  filtro === "todos" ? lista : lista.filter((f) => grupoDe(f) === filtro);

export type Contagens = {
  todos: number;
  confirmados: number;
  pendentes: number;
  atencao: number;
};

export function contagens(lista: Fornecedor[]): Contagens {
  const g = (k: Grupo) => lista.filter((f) => grupoDe(f) === k).length;
  return {
    todos: lista.length,
    confirmados: g("confirmados"),
    pendentes: g("pendentes"),
    atencao: g("atencao"),
  };
}

export function textoRodape(lista: Fornecedor[]): string {
  const c = contagens(lista);
  const partes = [`${c.confirmados} de ${c.todos} confirmados`];
  if (c.pendentes > 0) partes.push(`${c.pendentes} aguardando`);
  if (c.atencao > 0) {
    partes.push(
      `${c.atencao} ${c.atencao === 1 ? "precisa" : "precisam"} de contato`
    );
  }
  return partes.join(" · ");
}

/* ---------------- ações do bloco expandido ---------------- */

export type AcaoId =
  | "enviar"
  | "reenviar"
  | "confirmar"
  | "desmarcar"
  | "editar-email"
  | "pedir-contrato"
  | "remover";

export type Acao = {
  id: AcaoId;
  label: string;
  variante: "primary" | "secondary" | "ghost";
};

export function acoesDe(f: Fornecedor, agora = Date.now()): Acao[] {
  const grupo = grupoDe(f);
  if (grupo === "confirmados") {
    return [
      { id: "desmarcar", label: "Desmarcar confirmação", variante: "ghost" },
      { id: "pedir-contrato", label: "Pedir contrato assinado", variante: "secondary" },
      { id: "remover", label: "Remover do evento", variante: "ghost" },
    ];
  }
  if (!f.email) {
    return [
      { id: "editar-email", label: "Cadastrar e-mail", variante: "primary" },
      { id: "pedir-contrato", label: "Pedir contrato assinado", variante: "secondary" },
      { id: "confirmar", label: "Confirmar manualmente", variante: "secondary" },
      { id: "remover", label: "Remover do evento", variante: "ghost" },
    ];
  }
  const jaEnviou = !!f.convite?.enviadoEm;
  return [
    {
      id: jaEnviou ? "reenviar" : "enviar",
      label: jaEnviou
        ? precisaSegundoEnvio(f, agora)
          ? "Enviar novamente"
          : "Reenviar convite"
        : "Enviar convite",
      variante: "primary",
    },
    { id: "pedir-contrato", label: "Pedir contrato assinado", variante: "secondary" },
    { id: "confirmar", label: "Confirmar manualmente", variante: "secondary" },
    { id: "remover", label: "Remover do evento", variante: "ghost" },
  ];
}

/* ---------------- histórico ---------------- */

/** O log derivado do que o banco realmente guarda. Não há tabela de
 *  log de envio: o que existe é o vínculo, o último envio, as aberturas
 *  e a resposta. Melhor quatro linhas verdadeiras que um histórico
 *  inventado. */
export function historicoDe(f: Fornecedor): { quando: string; texto: string }[] {
  const linhas: { iso: string | null; texto: string }[] = [];

  if (f.vinculadoEm) {
    linhas.push({ iso: f.vinculadoEm, texto: "Fornecedor vinculado ao evento" });
  }
  if (!f.email) {
    linhas.push({
      iso: null,
      texto: "Sem e-mail: convite automático desativado para este fornecedor",
    });
  }
  const c = f.convite;
  if (c?.enviadoEm) {
    const canais = [f.email ? "e-mail" : null, f.whatsapp ? "WhatsApp" : null]
      .filter(Boolean)
      .join(" + ");
    linhas.push({
      iso: c.enviadoEm,
      texto: `Convite enviado${canais ? ` por ${canais}` : ""} · magic link gerado`,
    });
  }
  if (c && c.aberturas > 0 && c.ultimaAbertura) {
    linhas.push({
      iso: c.ultimaAbertura,
      texto:
        c.aberturas === 1
          ? "Magic link aberto 1 vez"
          : `Magic link aberto ${c.aberturas} vezes · última abertura`,
    });
  }
  if (c?.respondidoEm) {
    linhas.push({
      iso: c.respondidoEm,
      texto:
        c.status === "confirmado"
          ? "Confirmou presença pelo link"
          : "Recusou o convite pelo link",
    });
  }
  if (!c?.respondidoEm && f.confirmadoNoEvento) {
    linhas.push({ iso: null, texto: "Confirmado manualmente pela cerimonialista" });
  }

  return linhas
    .sort((a, b) => (b.iso ?? "").localeCompare(a.iso ?? ""))
    .map((l) => ({ quando: l.iso ? quando(l.iso) : "—", texto: l.texto }));
}

/** A faixa mono do topo do bloco expandido. */
export function canaisDe(f: Fornecedor): string {
  if (f.email && f.whatsapp) return "via e-mail + WhatsApp";
  if (f.email) return "via e-mail";
  if (f.whatsapp) return "só WhatsApp disponível";
  return "sem canal de contato";
}

/** A nota ao lado dos botões: o que dá para dizer com verdade sobre o
 *  link (ele não expira — dizer "expira em 6 dias" seria invenção). */
export function notaDoLink(f: Fornecedor): string {
  if (f.convite?.status === "confirmado") {
    return f.convite.respondidoEm ? "confirmado via magic link" : "confirmado";
  }
  if (f.convite?.status === "recusado") return "recusou pelo link";
  if (!f.email) return "e-mail necessário para o magic link";
  if (f.convite?.enviadoEm) return "link ativo · sem login";
  return "o link nasce no primeiro envio";
}

/* ---------------- o único lugar que conhece cor ---------------- */

export const corDoTom = (tom: Tom): { texto: string; ponto: string } =>
  ({
    ok: { texto: "var(--text-body)", ponto: "var(--cinza-3)" },
    neutro: { texto: "var(--cinza-3)", ponto: "var(--cinza-2)" },
    late: { texto: "var(--state-late)", ponto: "var(--state-late)" },
  })[tom];
