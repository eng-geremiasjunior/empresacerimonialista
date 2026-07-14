// Templates de checklist / fases / timeline por tipo de evento.
// Módulo PURO e autossuficiente (sem I/O, sem imports) — testável isolado.
// A fiação no wizard (StepRevisao) e na criação transacional consome estas
// funções; aqui só definimos o quê é gerado para cada tipo.

export type TemplateEventType =
  | "casamento"
  | "debutante"
  | "formatura"
  | "corporativo"
  | "religioso"
  | "maternidade"
  | "outro";

// Agrupamento visual do checklist (não confundir com a categoria de tarefa
// do app — som/buffet/etc.). Usado para organizar a revisão.
export type ChecklistGroup = "documentacao" | "fornecedores" | "evento";

// Respostas do wizard que disparam itens condicionais.
export type WizardRespostas = {
  // Categorias de fornecedor JÁ contratadas (não geram tarefa "Confirmar X").
  fornecedoresContratados?: string[];
  religiousCeremony?: boolean; // casamento
  hasDanceFloor?: boolean; // casamento
  luaDeMel?: boolean; // casamento (opcional)
  cabineFotos?: boolean; // debutante
  colacaoNoLocal?: boolean; // formatura
  palestrantes?: boolean; // corporativo
  chaRevelacao?: boolean; // maternidade
};

export type TaskDraft = {
  title: string;
  group: ChecklistGroup;
  optional?: boolean;
};

export type PhaseDraft = { name: string; order: number };

export type RoteiroItemDraft = {
  title: string;
  order: number;
  time: string | null; // null = "A definir" (a cerimonialista ajusta depois)
};

type CondKey = keyof Omit<WizardRespostas, "fornecedoresContratados">;

type TimelineTemplateItem = { titulo: string; condicao?: CondKey };

type EventTemplate = {
  documentacao: string[];
  fornecedoresPadrao: string[]; // "Buffet" -> "Confirmar Buffet" (se não contratado)
  fornecedoresCondicionais?: { condicao: CondKey; categoria: string }[];
  evento: string[]; // sempre gerados
  eventoCondicional?: { condicao: CondKey; item: string }[];
  eventoOpcional?: { condicao: CondKey; item: string }[]; // opt-in (ex.: lua de mel)
  fases: string[];
  timelineSugerida: TimelineTemplateItem[];
};

const TEMPLATES: Record<TemplateEventType, EventTemplate> = {
  casamento: {
    documentacao: [
      "Contrato assinado",
      "Entrada registrada",
      "Documentação civil/religiosa em dia",
    ],
    fornecedoresPadrao: ["Buffet", "DJ/Som", "Decoração", "Fotografia", "Filmagem"],
    fornecedoresCondicionais: [
      { condicao: "religiousCeremony", categoria: "Celebrante" },
    ],
    evento: [
      "Alianças conferidas",
      "Padrinhos confirmados",
      "Daminhas/Pajens confirmados",
      "Ensaio realizado",
      "Mapa de mesas definido",
      "Lembrancinhas confirmadas",
    ],
    eventoCondicional: [
      { condicao: "religiousCeremony", item: "Liturgia definida" },
    ],
    eventoOpcional: [{ condicao: "luaDeMel", item: "Planejamento lua de mel" }],
    fases: [
      "Contrato",
      "Planejamento",
      "Reunião Final",
      "Cerimônia",
      "Recepção",
      "Pós-evento",
    ],
    timelineSugerida: [
      { titulo: "Chegada da equipe/decoração" },
      { titulo: "Chegada do buffet" },
      { titulo: "Chegada do cerimonialista" },
      { titulo: "Cerimônia" },
      { titulo: "Fotos" },
      { titulo: "Recepção/Entrada dos noivos" },
      { titulo: "Jantar" },
      { titulo: "Abertura da pista", condicao: "hasDanceFloor" },
      { titulo: "Corte do bolo" },
    ],
  },

  debutante: {
    documentacao: ["Contrato assinado", "Entrada registrada"],
    fornecedoresPadrao: ["Buffet", "DJ/Som", "Decoração", "Fotografia"],
    fornecedoresCondicionais: [
      { condicao: "cabineFotos", categoria: "Cabine de fotos" },
    ],
    evento: [
      "Vestido principal confirmado",
      "Vestido de troca confirmado",
      "Coreografia da valsa definida",
      "Grupo de valsa confirmado",
      "Homenagem aos pais preparada",
      "Cerimônia das 15 velas organizada (lista de nomes)",
      "Mapa de mesas definido",
      "Lembrancinhas confirmadas",
    ],
    fases: ["Contrato", "Planejamento", "Ensaio da Valsa", "Evento", "Pós-evento"],
    timelineSugerida: [
      { titulo: "Chegada da equipe/decoração" },
      { titulo: "Chegada do buffet" },
      { titulo: "Entrada da aniversariante" },
      { titulo: "Valsa" },
      { titulo: "Troca de vestido" },
      { titulo: "Cerimônia das 15 velas" },
      { titulo: "Homenagem aos pais" },
      { titulo: "Abertura da pista" },
      { titulo: "Cabine de fotos ativa", condicao: "cabineFotos" },
    ],
  },

  formatura: {
    documentacao: ["Contrato assinado", "Lista de formandos confirmada"],
    fornecedoresPadrao: ["Buffet", "DJ/Som", "Fotografia", "Decoração"],
    evento: [
      "Becas confirmadas (quantidade)",
      "Canudos confirmados",
      "Texto do juramento definido",
      "Paraninfo confirmado",
      "Homenagens preparadas (professores/patronos)",
      "Ordem do baile definida",
    ],
    fases: [
      "Contrato",
      "Planejamento",
      "Ensaio",
      "Colação de Grau",
      "Baile",
      "Pós-evento",
    ],
    timelineSugerida: [
      { titulo: "Chegada dos formandos" },
      { titulo: "Colação de grau", condicao: "colacaoNoLocal" },
      { titulo: "Juramento" },
      { titulo: "Entrega de canudos" },
      { titulo: "Homenagens" },
      { titulo: "Baile" },
      { titulo: "Fotos" },
    ],
  },

  corporativo: {
    documentacao: ["Contrato assinado", "Lista de convidados/inscritos"],
    fornecedoresPadrao: [
      "Buffet/Coffee Break",
      "Equipe técnica (som/projeção)",
      "Recepção/Credenciamento",
    ],
    fornecedoresCondicionais: [
      { condicao: "palestrantes", categoria: "Palestrantes" },
    ],
    evento: [
      "Credenciamento organizado",
      "Lista de presença preparada",
      "Projetor/telão testado",
      "Certificados preparados",
      "Brindes confirmados",
      "Sonorização testada",
    ],
    eventoCondicional: [
      { condicao: "palestrantes", item: "Palestrantes confirmados" },
    ],
    fases: [
      "Contrato",
      "Planejamento",
      "Confirmação Final",
      "Evento",
      "Pós-evento",
    ],
    timelineSugerida: [
      { titulo: "Montagem/Credenciamento" },
      { titulo: "Abertura" },
      { titulo: "Palestra 1 / Coffee Break" },
      { titulo: "Palestra 2" },
      { titulo: "Encerramento/Certificados" },
    ],
  },

  religioso: {
    documentacao: ["Contrato assinado", "Documentação religiosa em dia"],
    fornecedoresPadrao: ["Celebrante", "Som", "Recepção/Buffet", "Ornamentação"],
    evento: [
      "Liturgia definida (se aplicável)",
      "Ornamentação confirmada",
      "Recepção organizada",
    ],
    fases: ["Contrato", "Planejamento", "Ensaio", "Cerimônia", "Recepção"],
    timelineSugerida: [
      { titulo: "Chegada da equipe/ornamentação" },
      { titulo: "Chegada do celebrante" },
      { titulo: "Cerimônia/Liturgia" },
      { titulo: "Recepção" },
    ],
  },

  maternidade: {
    documentacao: ["Contrato assinado"],
    fornecedoresPadrao: ["Buffet", "Decoração/Balões", "Fotografia"],
    evento: ["Brincadeiras organizadas", "Decoração/balões confirmados"],
    eventoCondicional: [
      { condicao: "chaRevelacao", item: "Método de revelação definido" },
    ],
    fases: ["Contrato", "Planejamento", "Evento", "Pós-evento"],
    timelineSugerida: [
      { titulo: "Chegada da decoração" },
      { titulo: "Chegada do buffet" },
      { titulo: "Recepção dos convidados" },
      { titulo: "Momento da revelação", condicao: "chaRevelacao" },
      { titulo: "Brincadeiras" },
      { titulo: "Fotos" },
    ],
  },

  outro: {
    documentacao: ["Contrato assinado", "Entrada registrada"],
    fornecedoresPadrao: ["Buffet", "DJ/Som", "Decoração", "Fotografia"],
    evento: ["Mapa de mesas definido", "Cronograma definido"],
    fases: ["Contrato", "Planejamento", "Evento", "Pós-evento"],
    timelineSugerida: [],
  },
};

// Os 9 tipos de evento do app mapeiam para 7 arquétipos de template.
// (aniversario/bodas/outro → outro; cha_revelacao → maternidade;
//  batizado → religioso). Mantém event-templates.ts autossuficiente.
export function resolverTemplate(tipoEvento: string): TemplateEventType {
  switch (tipoEvento) {
    case "casamento":
      return "casamento";
    case "debutante":
      return "debutante";
    case "formatura":
      return "formatura";
    case "corporativo":
      return "corporativo";
    case "cha_revelacao":
      return "maternidade";
    case "batizado":
      return "religioso";
    default:
      return "outro"; // aniversario, bodas, outro, ou qualquer desconhecido
  }
}

function contratado(cat: string, respostas: WizardRespostas): boolean {
  return (respostas.fornecedoresContratados ?? []).includes(cat);
}

// ------------------------------------------------------------
// Geradores
// ------------------------------------------------------------

export function gerarChecklistPorTipo(
  tipo: TemplateEventType,
  respostas: WizardRespostas = {}
): TaskDraft[] {
  const tpl = TEMPLATES[tipo] ?? TEMPLATES.outro;
  const drafts: TaskDraft[] = [];

  // Documentação (sempre)
  for (const title of tpl.documentacao) {
    drafts.push({ title, group: "documentacao" });
  }

  // Fornecedores padrão → "Confirmar X" só se NÃO contratado
  for (const cat of tpl.fornecedoresPadrao) {
    if (!contratado(cat, respostas)) {
      drafts.push({ title: `Confirmar ${cat}`, group: "fornecedores" });
    }
  }
  // Fornecedores condicionais (ex.: Celebrante se cerimônia religiosa)
  for (const fc of tpl.fornecedoresCondicionais ?? []) {
    if (respostas[fc.condicao] && !contratado(fc.categoria, respostas)) {
      drafts.push({ title: `Confirmar ${fc.categoria}`, group: "fornecedores" });
    }
  }

  // Evento (sempre)
  for (const title of tpl.evento) {
    drafts.push({ title, group: "evento" });
  }
  // Evento condicional
  for (const ec of tpl.eventoCondicional ?? []) {
    if (respostas[ec.condicao]) {
      drafts.push({ title: ec.item, group: "evento" });
    }
  }
  // Evento opcional (opt-in; marcado como optional para a revisão)
  for (const eo of tpl.eventoOpcional ?? []) {
    if (respostas[eo.condicao]) {
      drafts.push({ title: eo.item, group: "evento", optional: true });
    }
  }

  return drafts;
}

export function gerarFasesPorTipo(tipo: TemplateEventType): PhaseDraft[] {
  const tpl = TEMPLATES[tipo] ?? TEMPLATES.outro;
  return tpl.fases.map((name, i) => ({ name, order: i + 1 }));
}

export function gerarTimelineSugerida(
  tipo: TemplateEventType,
  respostas: WizardRespostas = {}
): RoteiroItemDraft[] {
  const tpl = TEMPLATES[tipo] ?? TEMPLATES.outro;
  return tpl.timelineSugerida
    .filter((item) => !item.condicao || respostas[item.condicao])
    .map((item, i) => ({ title: item.titulo, order: i + 1, time: null }));
}

// Categorias de fornecedor do tipo (para os checkboxes "já contratado").
export function fornecedoresDoTipo(tipoEvento: string): string[] {
  return TEMPLATES[resolverTemplate(tipoEvento)].fornecedoresPadrao;
}

// Checklist mínimo fixo do fluxo "Criar evento rápido" (regra de negócio 3).
export function checklistMinimoRapido(): TaskDraft[] {
  return [
    { title: "Contrato assinado", group: "documentacao" },
    { title: "Entrada registrada", group: "documentacao" },
    { title: "Confirmar fornecedor principal", group: "fornecedores" },
  ];
}

// Útil para a UI agrupar a revisão por seção, na ordem certa.
export const CHECKLIST_GROUP_LABELS: Record<ChecklistGroup, string> = {
  documentacao: "Documentação",
  fornecedores: "Fornecedores",
  evento: "Evento",
};
