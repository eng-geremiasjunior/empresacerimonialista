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
        { titulo: "Definir a data do casamento", dias: 365, resp: "cliente" },
        { titulo: "Definir o formato do casamento", dias: 360, resp: "cliente" },
        { titulo: "Definir o número estimado de convidados", dias: 355, resp: "cliente" },
      ] },
      { nome: "Espaço e recepção", total: 4, ativo: true, decisoes: [
        { titulo: "Buscar referências e orçar espaços", dias: 330, resp: "ambos" },
        { titulo: "Visitar e escolher o espaço", dias: 320, resp: "ambos" },
        { titulo: "Contratar o espaço", dias: 310, resp: "ambos" },
      ] },
      { nome: "Buffet e bebidas", total: 8, ativo: true, decisoes: [
        { titulo: "Definir o tipo de serviço", dias: 320, resp: "ambos" },
        { titulo: "Buscar referências e orçar buffets", dias: 315, resp: "ambos" },
        { titulo: "Fazer a degustação", dias: 310, resp: "cliente" },
      ] },
      { nome: "Cerimônia religiosa", total: 7, ativo: false, decisoes: [
        { titulo: "Escolher a igreja", dias: 300, resp: "cliente" },
        { titulo: "Reservar a data na igreja", dias: 290, resp: "ambos" },
        { titulo: "Contratar coral ou músicos da cerimônia", dias: 180, resp: "ambos" },
      ] },
      { nome: "Celebrante", total: 3, ativo: true, decisoes: [
        { titulo: "Buscar referências e orçar celebrantes", dias: 300, resp: "ambos" },
        { titulo: "Contratar o celebrante", dias: 270, resp: "ambos" },
        { titulo: "Alinhar o roteiro da cerimônia com o celebrante", dias: 60, resp: "ambos" },
      ] },
      { nome: "Decoração e flores", total: 6, ativo: true, decisoes: [
        { titulo: "Fazer o briefing de decoração", dias: 280, resp: "ambos" },
        { titulo: "Conhecer portfólios e orçar decoração", dias: 270, resp: "ambos" },
        { titulo: "Contratar a decoração", dias: 260, resp: "ambos" },
      ] },
      { nome: "Foto e vídeo", total: 6, ativo: true, decisoes: [
        { titulo: "Pesquisar o estilo de fotógrafos", dias: 310, resp: "cliente" },
        { titulo: "Conhecer portfólio e pacotes", dias: 300, resp: "ambos" },
        { titulo: "Contratar o fotógrafo", dias: 290, resp: "ambos" },
      ] },
      { nome: "Música e atrações", total: 5, ativo: true, decisoes: [
        { titulo: "Definir banda ou DJ", dias: 280, resp: "cliente" },
        { titulo: "Contratar o DJ ou a banda", dias: 270, resp: "ambos" },
        { titulo: "Contratar sonorização e iluminação de pista", dias: 240, resp: "ambos" },
      ] },
      { nome: "Trajes e beleza — noiva", total: 6, ativo: true, decisoes: [
        { titulo: "Definir o vestido: comprar, alugar ou sob medida", dias: 300, resp: "cliente" },
        { titulo: "Escolher o vestido", dias: 270, resp: "cliente" },
        { titulo: "Contratar o dia da noiva", dias: 150, resp: "cliente" },
      ] },
      { nome: "Trajes — noivo, padrinhos e daminhas", total: 5, ativo: true, decisoes: [
        { titulo: "Convidar padrinhos, madrinhas, daminhas e pajens", dias: 240, resp: "cliente" },
        { titulo: "Definir o traje do noivo", dias: 150, resp: "cliente" },
        { titulo: "Definir cor e modelo dos vestidos das madrinhas", dias: 150, resp: "cliente" },
      ] },
      { nome: "Papelaria e convites", total: 5, ativo: true, decisoes: [
        { titulo: "Enviar o save the date", dias: 240, resp: "ambos" },
        { titulo: "Pesquisar identidade visual e convites", dias: 220, resp: "ambos" },
        { titulo: "Contratar a papelaria", dias: 200, resp: "ambos" },
      ] },
      { nome: "Doces, bolo e lembrancinhas", total: 5, ativo: true, decisoes: [
        { titulo: "Contratar o bolo", dias: 150, resp: "ambos" },
        { titulo: "Degustar e contratar os docinhos", dias: 150, resp: "ambos" },
        { titulo: "Contratar os bem-casados", dias: 120, resp: "ambos" },
      ] },
      { nome: "Convidados e RSVP", total: 4, ativo: true, decisoes: [
        { titulo: "Finalizar a lista nominal com endereços", dias: 240, resp: "cliente" },
        { titulo: "Negociar tarifas de hotel para convidados de fora", dias: 180, resp: "cerimonialista" },
        { titulo: "Fazer a confirmação de presença (RSVP)", dias: 30, resp: "cerimonialista" },
      ] },
      { nome: "Infraestrutura e logística", total: 8, ativo: true, decisoes: [
        { titulo: "Criar o plano B para chuva", dias: 200, resp: "cerimonialista" },
        { titulo: "Contratar infraestrutura extra", dias: 180, resp: "cerimonialista" },
        { titulo: "Contratar valet e segurança", dias: 120, resp: "cerimonialista" },
      ] },
      { nome: "Documentação civil", total: 3, ativo: true, decisoes: [
        { titulo: "Definir o regime de bens", dias: 150, resp: "cliente" },
        { titulo: "Verificar a documentação necessária", dias: 120, resp: "cliente" },
        { titulo: "Dar entrada no cartório", dias: 90, resp: "cliente" },
      ] },
      { nome: "Lua de mel", total: 4, ativo: true, decisoes: [
        { titulo: "Definir o destino", dias: 180, resp: "cliente" },
        { titulo: "Emitir passagens e reservar hospedagem", dias: 120, resp: "cliente" },
        { titulo: "Verificar passaporte, vistos e vacinas", dias: 90, resp: "cliente" },
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
        { titulo: "Definir a data da festa", dias: 365, resp: "cliente" },
        { titulo: "Definir o tema da festa", dias: 350, resp: "cliente" },
        { titulo: "Definir o número estimado de convidados", dias: 350, resp: "cliente" },
      ] },
      { nome: "Espaço e recepção", total: 4, ativo: true, decisoes: [
        { titulo: "Buscar referências e orçar espaços", dias: 330, resp: "ambos" },
        { titulo: "Visitar e escolher o espaço", dias: 320, resp: "ambos" },
        { titulo: "Contratar o espaço", dias: 310, resp: "ambos" },
      ] },
      { nome: "Buffet e bebidas", total: 7, ativo: true, decisoes: [
        { titulo: "Definir o tipo de serviço", dias: 300, resp: "ambos" },
        { titulo: "Buscar referências e orçar buffets", dias: 290, resp: "ambos" },
        { titulo: "Fazer a degustação", dias: 280, resp: "cliente" },
      ] },
      { nome: "Decoração e cenografia", total: 5, ativo: true, decisoes: [
        { titulo: "Traduzir o tema em conceito de decoração", dias: 240, resp: "ambos" },
        { titulo: "Orçar a decoração", dias: 230, resp: "ambos" },
        { titulo: "Contratar a decoração", dias: 210, resp: "ambos" },
      ] },
      { nome: "Foto e vídeo", total: 3, ativo: true, decisoes: [
        { titulo: "Orçar foto e vídeo", dias: 260, resp: "ambos" },
        { titulo: "Contratar foto e vídeo", dias: 240, resp: "ambos" },
        { titulo: "Produzir o vídeo de retrospectiva", dias: 60, resp: "cliente" },
      ] },
      { nome: "Música e balada", total: 5, ativo: true, decisoes: [
        { titulo: "Orçar DJ ou banda", dias: 240, resp: "ambos" },
        { titulo: "Contratar DJ ou banda", dias: 220, resp: "ambos" },
        { titulo: "Definir as atrações da balada", dias: 150, resp: "ambos" },
      ] },
      { nome: "Valsa e coreografia", total: 4, ativo: true, decisoes: [
        { titulo: "Contratar o professor de dança", dias: 200, resp: "ambos" },
        { titulo: "Definir príncipe e pares da valsa", dias: 170, resp: "cliente" },
        { titulo: "Escolher a música da valsa", dias: 150, resp: "cliente" },
      ] },
      { nome: "Vestidos da debutante", total: 4, ativo: true, decisoes: [
        { titulo: "Escolher o vestido da valsa", dias: 180, resp: "cliente" },
        { titulo: "Escolher o vestido da recepção", dias: 150, resp: "cliente" },
        { titulo: "Escolher o look da balada", dias: 120, resp: "cliente" },
      ] },
      { nome: "Beleza e making of", total: 2, ativo: true, decisoes: [
        { titulo: "Contratar cabelo e maquiagem do dia", dias: 120, resp: "ambos" },
        { titulo: "Fazer o teste de beleza", dias: 45, resp: "cliente" },
      ] },
      { nome: "Book 15 anos", total: 3, ativo: true, decisoes: [
        { titulo: "Contratar o book 15 anos", dias: 180, resp: "ambos" },
        { titulo: "Realizar o ensaio do book", dias: 120, resp: "cliente" },
        { titulo: "Escolher as fotos do book", dias: 90, resp: "cliente" },
      ] },
      { nome: "Cerimonial e protocolo", total: 4, ativo: true, decisoes: [
        { titulo: "Definir os homenageados das 15 velas", dias: 60, resp: "cliente" },
        { titulo: "Definir o roteiro de entrada", dias: 45, resp: "ambos" },
        { titulo: "Definir homenagens e discursos", dias: 40, resp: "cliente" },
      ] },
      { nome: "Convidados e RSVP", total: 3, ativo: true, decisoes: [
        { titulo: "Montar a lista de convidados", dias: 200, resp: "cliente" },
        { titulo: "Enviar os convites", dias: 60, resp: "ambos" },
        { titulo: "Fazer a confirmação de presença (RSVP)", dias: 21, resp: "cerimonialista" },
      ] },
      { nome: "Doces, bolo e lembrancinhas", total: 3, ativo: true, decisoes: [
        { titulo: "Orçar bolo e doces", dias: 120, resp: "ambos" },
        { titulo: "Contratar bolo e doces", dias: 90, resp: "ambos" },
        { titulo: "Definir as lembrancinhas", dias: 45, resp: "cliente" },
      ] },
      { nome: "Papelaria e convites", total: 2, ativo: true, decisoes: [
        { titulo: "Aprovar a identidade visual do tema", dias: 150, resp: "ambos" },
        { titulo: "Contratar convites e papelaria", dias: 120, resp: "ambos" },
      ] },
      { nome: "Infraestrutura e logística", total: 3, ativo: true, decisoes: [
        { titulo: "Contratar segurança e apoio", dias: 90, resp: "cerimonialista" },
        { titulo: "Criar o plano B para chuva", dias: 90, resp: "cerimonialista" },
        { titulo: "Definir o transporte da debutante", dias: 30, resp: "cliente" },
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
