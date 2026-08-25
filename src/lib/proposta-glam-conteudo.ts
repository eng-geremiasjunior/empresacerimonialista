// Copy autoral do template "Debut Festa Glam" (template-3 Debbut),
// transcrita do reference-original.html. Igual aos outros templates, é o
// texto do template — o que a empresa edita (pacotes, extras, regra de
// convidados) vem do Catálogo de debutante e é compartilhado com o
// template clássico. Ver [[proposta-templates]] e [[proposta-debutante-conteudo]].

export const INCLUSO_GLAM = [
  { icone: "musica", titulo: "PISTA LIBERADA", descricao: "DJ profissa, playlist sua, pista aberta a noite toda" },
  { icone: "coroa", titulo: "CERIMONIAL TOTAL", descricao: "Equipe cuida de tudo, você só curte e brilha" },
  { icone: "pessoas", titulo: "RECEPÇÃO VIP", descricao: "Recepção com tapete, painel neon e hostess" },
  { icone: "camera", titulo: "FOTOGRAFIA HYPE", descricao: "Fotos que bombam no feed" },
  { icone: "luz", titulo: "SOM E LUZ PRO", descricao: "Moving, laser, fumaça - balada de verdade" },
  { icone: "taca", titulo: "OPEN BAR JOVEM", descricao: "Drinks sem álcool + soda italiana liberada" },
];

export const ETAPAS_GLAM = [
  { n: "01", titulo: "BRIEFING", descricao: "Definimos tema, cores e playlist juntas" },
  { n: "02", titulo: "MONTAGEM", descricao: "Equipe monta tudo antes de você chegar, sem stress" },
  { n: "03", titulo: "CHEGADA", descricao: "Você chega rainha, tudo pronto pra foto" },
  { n: "04", titulo: "FESTA", descricao: "Pura energia, pista lotada" },
  { n: "05", titulo: "AFTER", descricao: "Desmontamos tudo, você só posta stories" },
];

// Cada card do "no dia" tem um gradiente e uma cor de acento próprios.
export const CARDS_DIA_GLAM = [
  {
    titulo: "CHEGADA DE ESTRELA",
    gradiente: "linear-gradient(135deg,#1a1a1a,#2a2a2a)",
    acento: "#D4AF37",
    itens: ["Camarim pronto", "Make checada", "Família posicionada", "DJ no ponto"],
  },
  {
    titulo: "A FESTA ACONTECENDO",
    gradiente: "linear-gradient(135deg,rgba(233,30,140,.3),#111)",
    acento: "#E91E8C",
    itens: ["Pista cheia", "Fotos rolando", "Cerimonial ativo", "Você brilhando"],
  },
  {
    titulo: "FINAL ÉPICO",
    gradiente: "linear-gradient(135deg,rgba(212,175,55,.4),#111)",
    acento: "#FFFFFF",
    itens: ["Parabéns com efeito", "Vídeo final", "Despedida organizada", "Material entregue"],
  },
];

export const HERO_PARAGRAFO_GLAM =
  "Uma festa que vai parar o feed e ficar na memória pra sempre. Pista cheia, luz profissional, você no centro.";

// O badge "FESTA REAL · CLIENTE ANTERIOR" ficava por cima da foto de capa
// que ela subiu — ou, quando não subiu nenhuma, por cima de puro gradiente.
// Rótulo de procedência para uma festa que pode nunca ter existido, na
// proposta de uma cliente de verdade. O título fica; ele é entusiasmo do
// template, não afirmação sobre um evento específico.
export const VIDEO_LEGENDA_GLAM = {
  titulo: "Pista cheia até o fim. Essa é a energia que a gente entrega.",
};
