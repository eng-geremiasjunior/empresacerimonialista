// O que a demonstração da página de vendas mostra nascendo.
//
// RETRATO DO MÉTODO REAL, tirado do banco em 07/09/2026 — os objetivos,
// as decisões com prazo e o roteiro do dia que `instanciar_metodo_evento`
// cria num evento novo de casamento e de debutante. Nada aqui é
// inventado para vender: é o que a cerimonialista vai encontrar quando
// criar o evento de verdade.
//
// É um retrato, não uma leitura ao vivo: a demonstração roda inteira no
// navegador, sem banco e sem IA, de propósito — é uma tela pública, e
// porta pública não chama nada que custe dinheiro. Se o método mudar no
// banco, este arquivo precisa ser refeito (a sonda que o gerou está no
// histórico do commit).
//
// Contagens: casamento tem 17 objetivos e 90 decisões; debutante, 15 e
// 57. Aqui entram todos os objetivos e as três decisões de maior
// prioridade de cada um — o suficiente para ela ver a espinha inteira.

export type TipoDaDemo = "casamento" | "debutante";

export type DecisaoDaDemo = {
  titulo: string;
  /** dias ANTES do evento em que precisa estar decidida */
  dias: number;
  /** quem decide: o casal/a família, os dois juntos, ou a cerimonialista */
  resp: "cliente" | "ambos" | "cerimonialista";
};

export type ObjetivoDaDemo = {
  nome: string;
  /** quantas decisões o objetivo tem no método real */
  total: number;
  /** nasce ligado? (a cerimônia religiosa, por exemplo, nasce desligada) */
  ativo: boolean;
  decisoes: DecisaoDaDemo[];
};

export type RoteiroDaDemo = {
  titulo: string;
  /** minutos em relação à âncora do dia (cerimônia / entrada) */
  offset: number;
  duracao: number | null;
};

export type MetodoDaDemo = {
  rotulo: string;
  /** como a tela chama quem decide do lado da cliente */
  cliente: string;
  /** o nome da âncora do roteiro e a hora padrão dela */
  ancora: string;
  horaPadrao: string;
  totalDecisoes: number;
  objetivos: ObjetivoDaDemo[];
  roteiro: RoteiroDaDemo[];
};

export const METODO_DA_DEMO: Record<TipoDaDemo, MetodoDaDemo> = {
  casamento: {
    rotulo: "Casamento",
    cliente: "o casal",
    ancora: "Cerimônia",
    horaPadrao: "19:00",
    totalDecisoes: 90,
    objetivos: [
      { nome: "Estrutura e datas", total: 7, ativo: true, decisoes: [
        { titulo: "Data do casamento", dias: 365, resp: "cliente" },
        { titulo: "Formato do casamento", dias: 360, resp: "cliente" },
        { titulo: "Número de convidados", dias: 355, resp: "cliente" },
      ] },
      { nome: "Espaço e recepção", total: 4, ativo: true, decisoes: [
        { titulo: "Cotações de espaços", dias: 330, resp: "ambos" },
        { titulo: "Visitas aos espaços", dias: 320, resp: "ambos" },
        { titulo: "Espaço da festa", dias: 310, resp: "ambos" },
      ] },
      { nome: "Buffet e bebidas", total: 8, ativo: true, decisoes: [
        { titulo: "Tipo de serviço do buffet", dias: 320, resp: "ambos" },
        { titulo: "Cotações de buffet", dias: 315, resp: "ambos" },
        { titulo: "Degustação do buffet", dias: 310, resp: "cliente" },
      ] },
      { nome: "Cerimônia religiosa", total: 7, ativo: false, decisoes: [
        { titulo: "Igreja", dias: 300, resp: "cliente" },
        { titulo: "Reserva da data na igreja", dias: 290, resp: "ambos" },
        { titulo: "Coral ou músicos da cerimônia", dias: 180, resp: "ambos" },
      ] },
      { nome: "Celebrante", total: 3, ativo: true, decisoes: [
        { titulo: "Cotações de celebrante", dias: 300, resp: "ambos" },
        { titulo: "Celebrante", dias: 270, resp: "ambos" },
        { titulo: "Roteiro da cerimônia com o celebrante", dias: 60, resp: "ambos" },
      ] },
      { nome: "Decoração e flores", total: 6, ativo: true, decisoes: [
        { titulo: "Briefing da decoração", dias: 280, resp: "ambos" },
        { titulo: "Portfólios e cotações de decoração", dias: 270, resp: "ambos" },
        { titulo: "Decoração", dias: 260, resp: "ambos" },
      ] },
      { nome: "Foto e vídeo", total: 6, ativo: true, decisoes: [
        { titulo: "Estilo de fotografia", dias: 310, resp: "cliente" },
        { titulo: "Portfólios e pacotes de fotografia", dias: 300, resp: "ambos" },
        { titulo: "Fotografia", dias: 290, resp: "ambos" },
      ] },
      { nome: "Música e atrações", total: 5, ativo: true, decisoes: [
        { titulo: "Estilo da música", dias: 280, resp: "cliente" },
        { titulo: "DJ ou banda", dias: 270, resp: "ambos" },
        { titulo: "Som e luz de pista", dias: 240, resp: "ambos" },
      ] },
      { nome: "Trajes e beleza — noiva", total: 6, ativo: true, decisoes: [
        { titulo: "Vestido: comprar, alugar ou sob medida", dias: 300, resp: "cliente" },
        { titulo: "Vestido da noiva", dias: 270, resp: "cliente" },
        { titulo: "Dia da noiva", dias: 150, resp: "cliente" },
      ] },
      { nome: "Trajes — noivo, padrinhos e daminhas", total: 5, ativo: true, decisoes: [
        { titulo: "Padrinhos, madrinhas, daminhas e pajens", dias: 240, resp: "cliente" },
        { titulo: "Traje do noivo", dias: 150, resp: "cliente" },
        { titulo: "Vestidos das madrinhas: cor e modelo", dias: 150, resp: "cliente" },
      ] },
      { nome: "Papelaria e convites", total: 5, ativo: true, decisoes: [
        { titulo: "Save the date", dias: 240, resp: "ambos" },
        { titulo: "Referências de identidade visual e convites", dias: 220, resp: "ambos" },
        { titulo: "Papelaria", dias: 200, resp: "ambos" },
      ] },
      { nome: "Doces, bolo e lembrancinhas", total: 5, ativo: true, decisoes: [
        { titulo: "Bolo", dias: 150, resp: "ambos" },
        { titulo: "Docinhos", dias: 150, resp: "ambos" },
        { titulo: "Bem-casados", dias: 120, resp: "ambos" },
      ] },
      { nome: "Convidados e RSVP", total: 4, ativo: true, decisoes: [
        { titulo: "Lista de convidados com endereços", dias: 240, resp: "cliente" },
        { titulo: "Hotel para convidados de fora", dias: 180, resp: "cerimonialista" },
        { titulo: "Confirmação de presença", dias: 30, resp: "cerimonialista" },
      ] },
      { nome: "Infraestrutura e logística", total: 8, ativo: true, decisoes: [
        { titulo: "Plano B para chuva", dias: 200, resp: "cerimonialista" },
        { titulo: "Infraestrutura extra", dias: 180, resp: "cerimonialista" },
        { titulo: "Valet e segurança", dias: 120, resp: "cerimonialista" },
      ] },
      { nome: "Documentação civil", total: 3, ativo: true, decisoes: [
        { titulo: "Regime de bens", dias: 150, resp: "cliente" },
        { titulo: "Documentos do casamento civil", dias: 120, resp: "cliente" },
        { titulo: "Entrada no cartório", dias: 90, resp: "cliente" },
      ] },
      { nome: "Lua de mel", total: 4, ativo: true, decisoes: [
        { titulo: "Destino da lua de mel", dias: 180, resp: "cliente" },
        { titulo: "Passagens e hospedagem da lua de mel", dias: 120, resp: "cliente" },
        { titulo: "Passaporte, vistos e vacinas", dias: 90, resp: "cliente" },
      ] },
      { nome: "Eventos satélite", total: 4, ativo: true, decisoes: [
        { titulo: "Festa de noivado", dias: 330, resp: "cliente" },
        { titulo: "Chá de cozinha / chá bar", dias: 90, resp: "cliente" },
      ] },
    ],
    roteiro: [
      { titulo: "Chegada da equipe/decoração", offset: -360, duracao: 240 },
      { titulo: "Chegada do cerimonialista", offset: -300, duracao: null },
      { titulo: "Chegada do buffet", offset: -240, duracao: 90 },
      { titulo: "Cerimônia", offset: 0, duracao: 60 },
      { titulo: "Fotos", offset: 60, duracao: 45 },
      { titulo: "Recepção/Entrada dos noivos", offset: 105, duracao: 15 },
      { titulo: "Jantar", offset: 120, duracao: 90 },
      { titulo: "Abertura da pista", offset: 210, duracao: null },
      { titulo: "Corte do bolo", offset: 270, duracao: null },
    ],
  },

  debutante: {
    rotulo: "Debutante",
    cliente: "a família",
    ancora: "Entrada da aniversariante",
    horaPadrao: "20:00",
    totalDecisoes: 57,
    objetivos: [
      { nome: "Estrutura e datas", total: 5, ativo: true, decisoes: [
        { titulo: "Data da festa", dias: 365, resp: "cliente" },
        { titulo: "Tema da festa", dias: 350, resp: "cliente" },
        { titulo: "Número de convidados", dias: 350, resp: "cliente" },
      ] },
      { nome: "Espaço e recepção", total: 4, ativo: true, decisoes: [
        { titulo: "Cotações de espaços", dias: 330, resp: "ambos" },
        { titulo: "Visitas aos espaços", dias: 320, resp: "ambos" },
        { titulo: "Espaço da festa", dias: 310, resp: "ambos" },
      ] },
      { nome: "Buffet e bebidas", total: 7, ativo: true, decisoes: [
        { titulo: "Tipo de serviço do buffet", dias: 300, resp: "ambos" },
        { titulo: "Cotações de buffet", dias: 290, resp: "ambos" },
        { titulo: "Degustação do buffet", dias: 280, resp: "cliente" },
      ] },
      { nome: "Decoração e cenografia", total: 5, ativo: true, decisoes: [
        { titulo: "Conceito da decoração", dias: 240, resp: "ambos" },
        { titulo: "Cotações de decoração", dias: 230, resp: "ambos" },
        { titulo: "Decoração", dias: 210, resp: "ambos" },
      ] },
      { nome: "Foto e vídeo", total: 3, ativo: true, decisoes: [
        { titulo: "Cotações de foto e vídeo", dias: 260, resp: "ambos" },
        { titulo: "Foto e vídeo", dias: 240, resp: "ambos" },
        { titulo: "Vídeo de retrospectiva", dias: 60, resp: "cliente" },
      ] },
      { nome: "Música e balada", total: 5, ativo: true, decisoes: [
        { titulo: "Cotações de DJ ou banda", dias: 240, resp: "ambos" },
        { titulo: "DJ ou banda", dias: 220, resp: "ambos" },
        { titulo: "Atrações da balada", dias: 150, resp: "ambos" },
      ] },
      { nome: "Valsa e coreografia", total: 4, ativo: true, decisoes: [
        { titulo: "Professor de dança", dias: 200, resp: "ambos" },
        { titulo: "Príncipe e pares da valsa", dias: 170, resp: "cliente" },
        { titulo: "Música da valsa", dias: 150, resp: "cliente" },
      ] },
      { nome: "Vestidos da debutante", total: 4, ativo: true, decisoes: [
        { titulo: "Vestido da valsa", dias: 180, resp: "cliente" },
        { titulo: "Vestido da recepção", dias: 150, resp: "cliente" },
        { titulo: "Look da balada", dias: 120, resp: "cliente" },
      ] },
      { nome: "Beleza e making of", total: 2, ativo: true, decisoes: [
        { titulo: "Cabelo e maquiagem do dia", dias: 120, resp: "ambos" },
        { titulo: "Teste de beleza", dias: 45, resp: "cliente" },
      ] },
      { nome: "Book 15 anos", total: 3, ativo: true, decisoes: [
        { titulo: "Book 15 anos", dias: 180, resp: "ambos" },
        { titulo: "Ensaio do book", dias: 120, resp: "cliente" },
        { titulo: "Fotos do book", dias: 90, resp: "cliente" },
      ] },
      { nome: "Cerimonial e protocolo", total: 4, ativo: true, decisoes: [
        { titulo: "Homenageados das 15 velas", dias: 60, resp: "cliente" },
        { titulo: "Roteiro de entrada", dias: 45, resp: "ambos" },
        { titulo: "Homenagens e discursos", dias: 40, resp: "cliente" },
      ] },
      { nome: "Convidados e RSVP", total: 3, ativo: true, decisoes: [
        { titulo: "Lista de convidados", dias: 200, resp: "cliente" },
        { titulo: "Envio dos convites", dias: 60, resp: "ambos" },
        { titulo: "Confirmação de presença", dias: 21, resp: "cerimonialista" },
      ] },
      { nome: "Doces, bolo e lembrancinhas", total: 3, ativo: true, decisoes: [
        { titulo: "Cotações de bolo e doces", dias: 120, resp: "ambos" },
        { titulo: "Bolo e doces", dias: 90, resp: "ambos" },
        { titulo: "Lembrancinhas", dias: 45, resp: "cliente" },
      ] },
      { nome: "Papelaria e convites", total: 2, ativo: true, decisoes: [
        { titulo: "Identidade visual do tema", dias: 150, resp: "ambos" },
        { titulo: "Convites e papelaria", dias: 120, resp: "ambos" },
      ] },
      { nome: "Infraestrutura e logística", total: 3, ativo: true, decisoes: [
        { titulo: "Segurança e apoio", dias: 90, resp: "cerimonialista" },
        { titulo: "Plano B para chuva", dias: 90, resp: "cerimonialista" },
        { titulo: "Transporte da debutante", dias: 30, resp: "cliente" },
      ] },
    ],
    roteiro: [
      { titulo: "Chegada da equipe/decoração", offset: -360, duracao: 240 },
      { titulo: "Chegada do buffet", offset: -240, duracao: 90 },
      { titulo: "Entrada da aniversariante", offset: 0, duracao: 15 },
      { titulo: "Valsa", offset: 15, duracao: 20 },
      { titulo: "Troca de vestido", offset: 120, duracao: 30 },
      { titulo: "As 15 velas", offset: 150, duracao: 30 },
      { titulo: "Homenagem aos pais", offset: 180, duracao: 20 },
      { titulo: "Abertura da pista", offset: 200, duracao: null },
      { titulo: "Cabine de fotos", offset: 200, duracao: null },
    ],
  },
};

/** O que a barra lateral da demonstração mostra — e o que fica trancado. */
export const MENU_DA_DEMO: { rotulo: string; aberto: boolean }[] = [
  { rotulo: "Dashboard", aberto: false },
  { rotulo: "Eventos", aberto: true },
  { rotulo: "Orçamentos", aberto: false },
  { rotulo: "Clientes", aberto: false },
  { rotulo: "Fornecedores", aberto: false },
  { rotulo: "Solicitações", aberto: false },
  { rotulo: "Contratos", aberto: false },
  { rotulo: "Tarefas", aberto: false },
  { rotulo: "Calendário", aberto: false },
  { rotulo: "Financeiro", aberto: false },
  { rotulo: "Catálogo", aberto: false },
];
