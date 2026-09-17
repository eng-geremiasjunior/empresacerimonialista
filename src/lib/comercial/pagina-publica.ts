// A página pública da cerimonialista — as regras, sem banco e sem React.
//
// Módulo puro de propósito: a MESMA régua vale no editor (navegador), na
// página pública (servidor) e na rota que recebe o formulário. Regra que
// mora em três lugares diverge em duas semanas — e aqui divergir significa
// a tela aceitar um endereço que o banco recusa, com a dona no meio.
//
// O banco tem as mesmas travas (migração 165: CHECKs e o gatilho
// trg_empresa_pagina_valida). Não é repetição à toa: a tela avisa antes,
// o banco garante depois. Quem chamar a API direto esbarra no segundo.

import type { EventType } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* O que a página guarda                                               */
/* ------------------------------------------------------------------ */

export type ServicoDaPagina = { nome: string; descricao?: string | null };

/**
 * O desenho da vitrine (16/09/2026). Os campos são os mesmos nos dois; só a
 * forma muda. O banco guarda a escolha em empresa_pagina.modelo (165).
 */
export type ModeloDaVitrine = "classico" | "capitulos";

export const MODELOS_DA_VITRINE: { codigo: ModeloDaVitrine; nome: string; resumo: string }[] = [
  {
    codigo: "classico",
    nome: "Clássico",
    resumo: "Foto de abertura com o seu nome e um depoimento em destaque numa faixa escura.",
  },
  {
    codigo: "capitulos",
    nome: "Capítulos",
    resumo: "Página em capítulos numerados, com o que a cliente recebe em cada etapa e o formulário em linhas.",
  },
];

/** O que vier do banco (ou de antes da 165 reaplicada) vira um modelo válido. */
export function modeloDaVitrine(valor: unknown): ModeloDaVitrine {
  return valor === "capitulos" ? "capitulos" : "classico";
}

/** O que o editor manda para o servidor (o endereço vai por outra porta). */
export type PaginaEditavel = {
  titulo: string | null;
  posicionamento: string | null;
  paraQuem: string | null;
  cidade: string | null;
  tiposAtendidos: EventType[];
  servicos: ServicoDaPagina[];
  motivos: string[];
  whatsapp: string | null;
  instagram: string | null;
  /** o pixel da Meta dela: só o número */
  pixelMeta: string | null;
  /** o desenho escolhido; ausente = não muda o que está salvo */
  modelo?: ModeloDaVitrine;
};

/** O que a RPC `pagina_publica` devolve. Lista fechada: nada interno. */
export type PaginaPublica = {
  slug_atual: string;
  por_slug_antigo: boolean;
  nome_empresa: string;
  logo_url: string | null;
  titulo: string | null;
  posicionamento: string | null;
  para_quem: string | null;
  cidade: string | null;
  tipos_atendidos: EventType[];
  servicos: ServicoDaPagina[];
  motivos: string[];
  whatsapp: string | null;
  instagram: string | null;
  /**
   * O pixel da Meta dela (165, fim da tarde de 16/09/2026). A página só o
   * carrega publicada, para quem não é da casa, depois do "Permitir".
   */
  pixel_meta?: string | null;
  /** o desenho escolhido (165, noite de 16/09/2026); ausente = clássico */
  modelo?: string | null;
  fotos: { url: string; legenda: string | null; tipo_evento: EventType }[];
  /**
   * `tipo_evento` é o que deixa o depoimento em destaque acompanhar o
   * tipo escolhido no formulário. Opcional: a leitura pública só passa a
   * entregá-lo depois da 165 reaplicada; sem ele, a ordem fica a do
   * Catálogo.
   */
  depoimentos: {
    texto: string;
    autor: string;
    contexto: string | null;
    tipo_evento?: EventType | null;
  }[];
};

/* ------------------------------------------------------------------ */
/* Limites — os mesmos do banco                                        */
/* ------------------------------------------------------------------ */

export const LIMITES = {
  titulo: 80,
  posicionamento: 400,
  paraQuem: 160,
  cidade: 80,
  instagram: 40,
  servicoNome: 60,
  servicoDescricao: 160,
  servicos: 6,
  motivo: 120,
  motivos: 3,
  slugMin: 3,
  slugMax: 40,
} as const;

/* ------------------------------------------------------------------ */
/* O endereço                                                          */
/* ------------------------------------------------------------------ */

/**
 * Endereços que o produto já usa, ou vai usar. Um endereço reservado no
 * banco e livre na tela vira erro sem explicação na cara da dona; por
 * isso a lista é a MESMA da RPC definir_slug_pagina (165).
 *
 * A lista é de PROIBIÇÃO, não de permissão: endereço novo do sistema
 * precisa entrar aqui e lá. O risco de esquecer é conhecido e pequeno
 * (o `/cerimonialista/` dá um espaço próprio a estes endereços), mas a
 * colisão seria feia: alguém publicando em /cerimonialista/admin.
 */
export const SLUGS_RESERVADOS = new Set([
  "admin", "api", "login", "portal", "confirmar", "confirmacao",
  "guia", "orcamento", "orcamentos", "fornecedor", "fornecedores",
  "agendar", "eventos", "ajuda", "privacidade", "auth", "imprimir",
  "convite", "site", "www", "c", "app", "nova-senha", "clientes",
  "cerimonialista", "cerimonialistas", "assessoria", "eorganizei",
  "planos", "precos", "suporte", "contato", "blog", "termos",
  "equipe", "aceite", "recepcao", "entrada", "comecar",
  "criar-conta", "assinatura", "financeiro", "catalogo",
  "agenda", "calendario", "configuracoes", "contratos",
  "solicitacoes", "tarefas", "pagina", "pedido", "pedidos",
]);

const FORMATO_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Sugestão de endereço a partir do nome da empresa: acentos fora, espaços
 * viram hífen. É só sugestão — ela edita antes de salvar.
 */
export function sugerirSlug(nomeEmpresa: string): string {
  return nomeEmpresa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITES.slugMax)
    .replace(/-+$/g, "");
}

/** A frase do problema, ou null quando o endereço serve. */
export function erroDoSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  if (s.length < LIMITES.slugMin || s.length > LIMITES.slugMax) {
    return `O endereço precisa ter de ${LIMITES.slugMin} a ${LIMITES.slugMax} caracteres.`;
  }
  if (!FORMATO_SLUG.test(s)) {
    return "Use só letras minúsculas, números e hífen (sem acento e sem espaço).";
  }
  if (SLUGS_RESERVADOS.has(s)) return "Este endereço é reservado pelo sistema.";
  return null;
}

/** O endereço completo, para ela copiar. `base` vem de appUrl(). */
export function enderecoDaPagina(base: string, slug: string): string {
  return `${base.replace(/\/+$/, "")}/cerimonialista/${slug}`;
}

/* ------------------------------------------------------------------ */
/* O perfil do Instagram                                               */
/* ------------------------------------------------------------------ */

/** Aceita "@nome", "instagram.com/nome", "https://instagram.com/nome/". */
export function normalizarInstagram(valor: string | null): string | null {
  if (!valor) return null;
  const limpo = valor
    .trim()
    .replace(/^.*instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?].*$/, "");
  if (!limpo) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(limpo) ? limpo : null;
}

/* ------------------------------------------------------------------ */
/* O pixel da Meta dela                                                */
/* ------------------------------------------------------------------ */

/**
 * Só o número do pixel. Aceita o que ela colar — o número solto, "ID:
 * 1234…" ou até o código inteiro da Meta — e fica com a primeira
 * sequência de 10 a 20 dígitos. Código nunca passa daqui: a página monta
 * o pixel sozinha, a partir do número.
 */
export function normalizarPixelMeta(valor: string | null | undefined): string | null {
  const m = /(?:^|\D)(\d{10,20})(?!\d)/.exec(valor ?? "");
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ */
/* O gate da publicação                                                */
/* ------------------------------------------------------------------ */

/**
 * O que ainda falta para a página ir ao ar — em frases, na ordem em que
 * ela resolveria.
 *
 * A régua não é "todo campo preenchido": é "esta página funciona para
 * quem chegar nela". Sem telefone é um anúncio sem telefone; sem
 * apresentação, um cartão em branco. Logo e fotos ajudam muito e não
 * travam: quem está começando publica hoje e melhora depois.
 */
export function faltaParaPublicar(p: {
  slug: string | null;
  whatsapp: string | null;
  posicionamento: string | null;
  tiposAtendidos: string[];
}): string[] {
  const falta: string[] = [];
  if (!p.slug) falta.push("Escolha o endereço da sua vitrine.");
  if (!p.whatsapp) falta.push("Informe o WhatsApp que recebe os contatos.");
  if (!p.posicionamento?.trim()) {
    falta.push("Escreva a apresentação: quem você é e como trabalha.");
  }
  if (p.tiposAtendidos.length === 0) {
    falta.push("Escolha ao menos um tipo de evento que você atende.");
  }
  return falta;
}

/* ------------------------------------------------------------------ */
/* Os textos que a página usa                                          */
/* ------------------------------------------------------------------ */

/**
 * A mensagem que já vai escrita no WhatsApp de quem toca no botão.
 *
 * Diz de onde a pessoa veio: é a pista que chega pela conversa, num canal
 * onde o sistema não enxerga nada (clique não é mensagem enviada). Sem o
 * nome da empresa na frase: "Vi a página da Studio X" tropeça no gênero,
 * e "sua página" serve para qualquer nome.
 */
export function textoWhatsappPagina(): string {
  return "Olá! Vi a sua página e gostaria de um orçamento para o meu evento.";
}

/** O que ela cola na bio do Instagram. */
export function textoParaBio(endereco: string): string {
  return `Orçamento e informações: ${endereco}`;
}

/**
 * "Como funciona" — quatro passos, com o nome dela no meio. O texto é o
 * do desenho da vitrine (Claude Design, 16/09/2026).
 *
 * Fixo de propósito: é a parte que explica o ATENDIMENTO, e quem chega na
 * página quer saber o que acontece depois de mandar a mensagem. O último
 * passo fala do que ela entrega, não da ferramenta que ela usa: quem está
 * lendo não vai contratar o eOrganizei.
 */
export function comoFunciona(nomeEmpresa: string): string[] {
  const quem = nomeEmpresa.trim() || "A equipe";
  return [
    "Você conta do seu evento: data, cidade, quantas pessoas e o que imagina.",
    `${quem} analisa: cada evento é diferente.`,
    "Você recebe uma proposta, com o que está incluso, valores e condições, por escrito.",
    "A organização começa: fechado o contrato, você acompanha fornecedores, prazos e o roteiro do dia.",
  ];
}

/**
 * O que a cliente recebe em cada passo de `comoFunciona` — a coluna
 * "Você recebe" do modelo Capítulos. São os mesmos quatro passos ditos
 * pelo lado da entrega, sem promessa nova: mudou um passo lá, esta lista
 * muda junto.
 */
export function entregasDosPassos(): string[] {
  return [
    "A confirmação do pedido e o retorno pelo WhatsApp ou por e-mail.",
    "Uma conversa para entender o que o seu evento pede.",
    "A proposta escrita, para ler com calma e comparar.",
    "O contrato e o roteiro do dia, com fornecedores e prazos.",
  ];
}

/**
 * Os tipos atendidos numa linha só, para a abertura. Acima de cinco, a
 * linha resume ("… · e mais 3"): a abertura é o nome dela, não a lista.
 */
export function tiposEmLinha(rotulos: string[]): string {
  const MAX = 5;
  if (rotulos.length <= MAX) return rotulos.join(" · ");
  return `${rotulos.slice(0, MAX).join(" · ")} · e mais ${rotulos.length - MAX}`;
}

const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e", "&"]);

/** "Cerimonial Ipê" → "CI"; o que fica no círculo quando não há logo. */
export function iniciaisDoNome(nome: string): string {
  const palavras = nome
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p) && !CONECTORES.has(p.toLowerCase()));
  const letras = palavras
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  return letras || nome.trim().charAt(0).toUpperCase() || "·";
}

/**
 * "casais, famílias e empresas" → "Para casais, famílias e empresas."
 * Aceita o texto já começando por "Para", e fecha a frase com ponto.
 */
export function fraseParaQuem(paraQuem: string | null): string | null {
  const texto = paraQuem?.trim();
  if (!texto) return null;
  const corpo = /^para\s/i.test(texto) ? texto.slice(5).trimStart() : texto;
  if (!corpo) return null;
  const frase = `Para ${corpo.charAt(0).toLowerCase()}${corpo.slice(1)}`;
  return /[.!?]$/.test(frase) ? frase : `${frase}.`;
}

/**
 * O exemplo do campo de WhatsApp com o DDD dela: quem chega à vitrine
 * quase sempre é da mesma região.
 */
export function exemploDeWhatsapp(whatsappEmpresa: string | null): string {
  const d = (whatsappEmpresa ?? "").replace(/\D/g, "");
  const local = (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
  const ddd = /^[1-9][0-9]/.test(local) && local.length >= 10 ? local.slice(0, 2) : "00";
  return `(${ddd}) 90000-0000`;
}
