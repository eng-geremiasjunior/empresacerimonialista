// O catálogo pronto da lista de presentes (02/10/2026): o casal parte
// daqui — marca o que quer, muda nome, preço e quantidade — em vez de
// começar uma lista em branco. Como nas listas da Wedy, a maior parte dos
// itens de uma lista real vem do catálogo da plataforma.
//
// Só dados, sem tela e sem banco. O preço é o BASE, redondo, em reais: o
// que a família recebe quando a taxa vai para o convidado (lista-presentes:
// TAXA_DA_LISTA). Valores de referência do mercado em 2026, para o casal
// ajustar. Nenhum item é de marca: a foto é de um objeto genérico, e o
// casal compra o modelo que quiser com o dinheiro.
//
// Foto: /presentes/<codigo>.webp (public/presentes). Código sem foto
// (FOTOS_DO_CATALOGO) aparece com o fundo da categoria.

export type GrupoDoCatalogo = "casa" | "viagem" | "divertidos";

export type CategoriaDoCatalogo = {
  id: string;
  nome: string;
  grupo: GrupoDoCatalogo;
};

export type PresenteDoCatalogo = {
  codigo: string;
  categoria: string;
  titulo: string;
  /** em reais, redondo */
  valor: number;
};

export const GRUPOS: { id: GrupoDoCatalogo; nome: string }[] = [
  { id: "casa", nome: "Casa" },
  { id: "viagem", nome: "Viagem" },
  { id: "divertidos", nome: "Divertidos" },
];

export const CATEGORIAS: CategoriaDoCatalogo[] = [
  { id: "cozinha", nome: "Cozinha", grupo: "casa" },
  { id: "eletroportateis", nome: "Eletroportáteis", grupo: "casa" },
  { id: "eletrodomesticos", nome: "Eletrodomésticos", grupo: "casa" },
  { id: "mesa", nome: "Mesa posta", grupo: "casa" },
  { id: "quarto", nome: "Quarto", grupo: "casa" },
  { id: "banheiro", nome: "Banheiro", grupo: "casa" },
  { id: "lavanderia", nome: "Lavanderia e limpeza", grupo: "casa" },
  { id: "sala", nome: "Sala e decoração", grupo: "casa" },
  { id: "bar", nome: "Bar e churrasco", grupo: "casa" },
  { id: "ferramentas", nome: "Ferramentas e jardim", grupo: "casa" },
  { id: "lazer", nome: "Lazer e tecnologia", grupo: "casa" },
  { id: "lua-de-mel", nome: "Lua de mel", grupo: "viagem" },
  { id: "experiencias", nome: "Experiências a dois", grupo: "viagem" },
  { id: "divertidos", nome: "Lista divertida", grupo: "divertidos" },
];

const p = (categoria: string, codigo: string, titulo: string, valor: number): PresenteDoCatalogo => ({
  codigo,
  categoria,
  titulo,
  valor,
});

export const CATALOGO: PresenteDoCatalogo[] = [
  // cozinha
  p("cozinha", "jogo-de-panelas", "Jogo de panelas antiaderente", 600),
  p("cozinha", "panelas-de-ceramica", "Jogo de panelas de cerâmica", 1200),
  p("cozinha", "panela-de-pressao", "Panela de pressão", 350),
  p("cozinha", "frigideiras", "Jogo de frigideiras", 350),
  p("cozinha", "jogo-de-facas", "Jogo de facas", 300),
  p("cozinha", "tabuas-de-corte", "Tábuas de corte", 150),
  p("cozinha", "utensilios-de-silicone", "Utensílios de silicone", 150),
  p("cozinha", "assadeiras", "Conjunto de assadeiras", 250),
  p("cozinha", "porta-temperos", "Porta-temperos", 150),
  p("cozinha", "potes-hermeticos", "Potes herméticos", 200),
  p("cozinha", "escorredor-de-louca", "Escorredor de louça", 150),
  p("cozinha", "lixeira-automatica", "Lixeira automática", 250),

  // eletroportáteis
  p("eletroportateis", "airfryer", "Airfryer", 600),
  p("eletroportateis", "liquidificador", "Liquidificador", 350),
  p("eletroportateis", "batedeira-planetaria", "Batedeira planetária", 700),
  p("eletroportateis", "cafeteira-de-capsulas", "Cafeteira de cápsulas", 600),
  p("eletroportateis", "cafeteira-eletrica", "Cafeteira elétrica", 250),
  p("eletroportateis", "chaleira-eletrica", "Chaleira elétrica", 250),
  p("eletroportateis", "processador-de-alimentos", "Processador de alimentos", 450),
  p("eletroportateis", "mixer", "Mixer", 250),
  p("eletroportateis", "panela-eletrica-de-arroz", "Panela elétrica de arroz", 300),
  p("eletroportateis", "sanduicheira", "Sanduicheira", 200),
  p("eletroportateis", "torradeira", "Torradeira", 200),
  p("eletroportateis", "forno-eletrico", "Forno elétrico", 900),

  // eletrodomésticos
  p("eletrodomesticos", "geladeira", "Geladeira", 4000),
  p("eletrodomesticos", "fogao", "Fogão", 2000),
  p("eletrodomesticos", "cooktop", "Cooktop", 1200),
  p("eletrodomesticos", "micro-ondas", "Micro-ondas", 900),
  p("eletrodomesticos", "maquina-lava-e-seca", "Máquina lava e seca", 3500),
  p("eletrodomesticos", "lava-loucas", "Lava-louças", 3000),
  p("eletrodomesticos", "purificador-de-agua", "Purificador de água", 800),
  p("eletrodomesticos", "ar-condicionado", "Ar-condicionado", 2500),
  p("eletrodomesticos", "aspirador-robo", "Aspirador robô", 1500),

  // mesa posta
  p("mesa", "aparelho-de-jantar", "Aparelho de jantar", 700),
  p("mesa", "jogo-de-pratos", "Jogo de pratos", 400),
  p("mesa", "faqueiro", "Faqueiro", 500),
  p("mesa", "tacas-de-vinho", "Taças de vinho", 300),
  p("mesa", "tacas-de-champanhe", "Taças de champanhe", 300),
  p("mesa", "jogo-de-copos", "Jogo de copos", 200),
  p("mesa", "jogo-de-xicaras", "Jogo de xícaras", 250),
  p("mesa", "sousplats", "Sousplats", 250),
  p("mesa", "jogo-americano", "Jogo americano", 200),
  p("mesa", "travessas", "Travessas de servir", 300),
  p("mesa", "boleira", "Boleira", 200),
  p("mesa", "petisqueira", "Petisqueira", 200),
  p("mesa", "jarra-de-vidro", "Jarra de vidro", 150),

  // quarto
  p("quarto", "jogo-de-cama", "Jogo de cama", 500),
  p("quarto", "edredom", "Edredom", 450),
  p("quarto", "travesseiros", "Travesseiros", 350),
  p("quarto", "cobertor", "Cobertor", 300),
  p("quarto", "colchao", "Colchão", 3000),
  p("quarto", "cabeceira", "Cabeceira estofada", 1200),
  p("quarto", "mesas-de-cabeceira", "Mesas de cabeceira", 800),
  p("quarto", "cortina-blackout", "Cortina blackout", 450),
  p("quarto", "tapete-do-quarto", "Tapete para o quarto", 500),
  p("quarto", "luminaria-de-cabeceira", "Luminária de cabeceira", 200),

  // banheiro
  p("banheiro", "jogo-de-toalhas", "Jogo de toalhas", 350),
  p("banheiro", "roupoes", "Roupões para o casal", 400),
  p("banheiro", "tapetes-de-banheiro", "Tapetes de banheiro", 150),
  p("banheiro", "kit-de-banheiro", "Kit de banheiro", 200),
  p("banheiro", "secador-de-cabelo", "Secador de cabelo", 350),
  p("banheiro", "espelho", "Espelho", 400),

  // lavanderia e limpeza
  p("lavanderia", "ferro-a-vapor", "Ferro a vapor", 250),
  p("lavanderia", "tabua-de-passar", "Tábua de passar", 250),
  p("lavanderia", "aspirador-vertical", "Aspirador vertical", 800),
  p("lavanderia", "varal", "Varal de chão", 200),
  p("lavanderia", "cestos-de-roupa", "Cestos de roupa", 150),
  p("lavanderia", "kit-de-limpeza", "Mop e kit de limpeza", 200),
  p("lavanderia", "organizadores", "Organizadores de lavanderia", 200),

  // sala e decoração
  p("sala", "sofa", "Sofá", 4000),
  p("sala", "poltrona", "Poltrona", 1200),
  p("sala", "rack", "Rack", 800),
  p("sala", "mesa-de-centro", "Mesa de centro", 600),
  p("sala", "tapete-da-sala", "Tapete para a sala", 900),
  p("sala", "smart-tv", "Smart TV", 3000),
  p("sala", "mesa-de-jantar", "Mesa de jantar", 2500),
  p("sala", "cadeiras-de-jantar", "Cadeiras de jantar", 1500),
  p("sala", "quadros", "Quadros decorativos", 400),
  p("sala", "luminaria-de-piso", "Luminária de piso", 500),
  p("sala", "almofadas", "Almofadas", 200),
  p("sala", "vasos-e-plantas", "Vasos e plantas", 250),

  // bar e churrasco
  p("bar", "churrasqueira", "Churrasqueira", 900),
  p("bar", "kit-de-churrasco", "Kit de churrasco", 300),
  p("bar", "facas-de-churrasco", "Facas de churrasco", 350),
  p("bar", "cervejeira", "Cervejeira", 2500),
  p("bar", "adega", "Adega de vinhos", 1500),
  p("bar", "kit-de-drinks", "Kit de drinks", 250),
  p("bar", "balde-de-gelo", "Balde de gelo", 150),
  p("bar", "tabua-de-frios", "Tábua de frios", 200),

  // ferramentas e jardim
  p("ferramentas", "parafusadeira", "Parafusadeira", 400),
  p("ferramentas", "caixa-de-ferramentas", "Caixa de ferramentas", 300),
  p("ferramentas", "escada", "Escada", 300),
  p("ferramentas", "kit-de-jardinagem", "Kit de jardinagem", 200),
  p("ferramentas", "lampadas-inteligentes", "Lâmpadas inteligentes", 250),

  // lazer e tecnologia
  p("lazer", "caixa-de-som", "Caixa de som", 500),
  p("lazer", "assistente-de-voz", "Assistente de voz", 400),
  p("lazer", "leitor-de-livros", "Leitor de livros digital", 600),
  p("lazer", "videogame", "Videogame", 4000),
  p("lazer", "projetor", "Projetor", 2000),
  p("lazer", "jogos-de-tabuleiro", "Jogos de tabuleiro", 300),
  p("lazer", "bicicleta", "Bicicleta", 1500),
  p("lazer", "camera-instantanea", "Câmera instantânea", 600),

  // lua de mel
  p("lua-de-mel", "passagens-aereas", "Passagens aéreas", 3000),
  p("lua-de-mel", "diarias-de-hotel", "Diárias de hotel", 1500),
  p("lua-de-mel", "noite-de-nupcias", "Noite de núpcias", 800),
  p("lua-de-mel", "jantar-romantico", "Jantar romântico", 500),
  p("lua-de-mel", "passeio-de-barco", "Passeio de barco", 600),
  p("lua-de-mel", "dia-de-spa", "Dia de spa", 600),
  p("lua-de-mel", "mergulho", "Mergulho", 500),
  p("lua-de-mel", "passeio-pela-cidade", "Passeio pela cidade", 300),
  p("lua-de-mel", "seguro-viagem", "Seguro viagem", 400),
  p("lua-de-mel", "malas-de-viagem", "Malas de viagem", 800),
  p("lua-de-mel", "cafe-com-vista", "Café da manhã com vista", 250),
  p("lua-de-mel", "espumante", "Espumante para brindar", 300),

  // experiências a dois
  p("experiencias", "noite-de-cinema", "Noite de cinema", 150),
  p("experiencias", "ingressos-de-show", "Ingressos para um show", 500),
  p("experiencias", "aula-de-culinaria", "Aula de culinária a dois", 400),
  p("experiencias", "degustacao-de-vinhos", "Degustação de vinhos", 400),
  p("experiencias", "piquenique", "Piquenique a dois", 200),
  p("experiencias", "ensaio-fotografico", "Ensaio fotográfico", 800),
  p("experiencias", "massagem", "Massagem a dois", 400),

  // lista divertida
  p("divertidos", "primeiro-aluguel", "Ajuda com o primeiro aluguel", 500),
  p("divertidos", "quando-vem-os-filhos", "Taxa para perguntar quando vêm os filhos", 500),
  p("divertidos", "jogar-o-buque", "Para a noiva jogar o buquê na sua direção", 300),
  p("divertidos", "nao-jogar-o-buque", "Para a noiva não jogar o buquê na sua direção", 300),
  p("divertidos", "fila-do-buffet", "Primeiro lugar na fila do buffet", 150),
  p("divertidos", "dar-pitaco", "Direito a dar pitaco na festa", 500),
  p("divertidos", "rodada-de-chope", "Rodada de chope dos padrinhos", 300),
  p("divertidos", "kit-ressaca", "Kit ressaca do dia seguinte", 100),
  p("divertidos", "noite-da-pizza", "Noite da pizza", 150),
  p("divertidos", "um-ano-de-streaming", "Um ano de streaming", 300),
  p("divertidos", "dancinha", "Dancinha com os noivos", 150),
  p("divertidos", "so-para-nao-dizer", "Só para não dizer que não dei nada", 100),
  p("divertidos", "os-50-reais", "Toma aqui os 50 reais", 50),
];

/** Os códigos que já têm foto em public/presentes (preenchido quando as fotos entram). */
export const FOTOS_DO_CATALOGO: ReadonlySet<string> = new Set<string>([]);

const POR_CODIGO = new Map(CATALOGO.map((x) => [x.codigo, x]));
const CATEGORIA_POR_ID = new Map(CATEGORIAS.map((c) => [c.id, c]));

export function presenteDoCatalogo(codigo: string | null | undefined): PresenteDoCatalogo | null {
  return codigo ? (POR_CODIGO.get(codigo) ?? null) : null;
}

export function categoriaDoCatalogo(id: string | null | undefined): CategoriaDoCatalogo | null {
  return id ? (CATEGORIA_POR_ID.get(id) ?? null) : null;
}

export function ehCategoria(x: unknown): x is string {
  return typeof x === "string" && CATEGORIA_POR_ID.has(x);
}

/** A foto do item do catálogo, ou null (sem foto ainda: fundo da categoria). */
export function fotoDoCatalogo(codigo: string | null | undefined): string | null {
  return codigo && FOTOS_DO_CATALOGO.has(codigo) ? `/presentes/${codigo}.webp` : null;
}

/** A lista que já nasce montada: um punhado de cada categoria da casa e da viagem. */
export const SUGESTAO_INICIAL: readonly string[] = [
  "jogo-de-panelas", "panela-de-pressao", "jogo-de-facas", "utensilios-de-silicone",
  "airfryer", "liquidificador", "batedeira-planetaria", "cafeteira-de-capsulas",
  "geladeira", "micro-ondas", "maquina-lava-e-seca", "purificador-de-agua",
  "aparelho-de-jantar", "faqueiro", "tacas-de-vinho", "jogo-de-copos",
  "jogo-de-cama", "edredom", "travesseiros", "jogo-de-toalhas", "roupoes",
  "ferro-a-vapor", "aspirador-vertical", "sofa", "rack", "tapete-da-sala", "smart-tv",
  "churrasqueira", "kit-de-drinks", "parafusadeira", "caixa-de-som",
  "passagens-aereas", "diarias-de-hotel", "noite-de-nupcias", "jantar-romantico", "passeio-de-barco", "dia-de-spa",
  "noite-de-cinema", "aula-de-culinaria",
  "primeiro-aluguel", "quando-vem-os-filhos", "jogar-o-buque", "fila-do-buffet", "os-50-reais",
];
