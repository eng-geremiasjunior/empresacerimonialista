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
  fotos: { url: string; legenda: string | null; tipo_evento: EventType }[];
  depoimentos: { texto: string; autor: string; contexto: string | null }[];
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
 * "Como funciona" — quatro passos, com o nome dela no meio.
 *
 * Fixo de propósito: é a parte que explica o ATENDIMENTO, e quem chega na
 * página quer saber o que acontece depois de mandar a mensagem. O último
 * passo fala do que ela entrega, não da ferramenta que ela usa: quem está
 * lendo não vai contratar o eOrganizei.
 */
export function comoFunciona(nomeEmpresa: string): { titulo: string; texto: string }[] {
  const quem = nomeEmpresa.trim() || "a equipe";
  return [
    {
      titulo: "Você conta do seu evento",
      texto: "Data, cidade, quantas pessoas e o que você já imagina.",
    },
    {
      titulo: `${quem} analisa`,
      texto: "Cada evento é diferente, então a conversa começa pelo seu.",
    },
    {
      titulo: "Você recebe uma proposta",
      texto: "Com o que está incluso, valores e condições, por escrito.",
    },
    {
      titulo: "A organização começa",
      texto:
        "Fechado o contrato, você acompanha fornecedores, prazos e o roteiro do dia.",
    },
  ];
}
