// O nome que a pessoa lê para uma opção de pergunta de "escolha" do método.
//
// O método grava códigos (simbolica, so_festa, a_francesa) e é o código que
// o Planejamento, os arquétipos e as regras leem: ele não muda. Só o que
// aparece na tela vira português, com acento, maiúscula e a palavra inteira
// onde o código encurta ("ate_100" → "Até 100").
//
// Os nomes de escala e cenário são os mesmos de metodo_arquetipo (084, 122,
// 141): o portal da cliente e o Planejamento dizem igual.
//
// Opção já escrita como texto (a Formatura grava "Aluguel", "Só o baile")
// passa como está. Código que não está aqui ganha a primeira letra
// maiúscula — nunca aparece cru.

const ROTULOS: Record<string, string> = {
  // casamento: formato (084)
  tradicional: "Tradicional",
  mini_wedding: "Mini wedding",
  elopement: "Elopement",
  igreja: "Igreja",
  salao_urbano: "Salão urbano",
  praia: "Praia",
  campo_chacara: "Campo / chácara",
  destination: "Destination",
  civil: "Civil",
  religiosa: "Religiosa",
  simbolica: "Simbólica",
  so_festa: "Só festa",
  // buffet (084, 122)
  a_francesa: "À francesa",
  buffet: "Buffet",
  coquetel: "Coquetel",
  finger_food: "Finger food",
  ilhas: "Ilhas",
  // música, trajes, doces (084)
  banda: "Banda",
  dj: "DJ",
  ambos: "Os dois",
  comprar: "Comprar",
  alugar: "Alugar",
  sob_medida: "Sob medida",
  doceira: "Doceira",
  decoradora: "Decoradora",
  // civil (084)
  comunhao_parcial: "Comunhão parcial de bens",
  comunhao_universal: "Comunhão universal de bens",
  separacao_total: "Separação total de bens",
  cartorio: "No cartório",
  mesmo_dia: "No dia do evento",
  // debutante (122)
  compacta: "Festa compacta",
  salao: "Salão de festas",
  clube: "Clube",
  chacara_sitio: "Chácara / sítio",
  casa_de_festas: "Casa de festas",
  // corporativo (141)
  presencial: "Presencial",
  hibrido: "Híbrido",
  ate_100: "Até 100",
  "100_a_400": "100 a 400",
  acima_400: "Acima de 400",
  confraternizacao: "Confraternização",
  convencao_kickoff: "Convenção / kick-off",
  lancamento: "Lançamento",
  congresso_seminario: "Congresso / seminário",
  premiacao: "Premiação",
  treinamento: "Treinamento / workshop",
  inauguracao: "Inauguração",
  email: "E-mail",
  whatsapp: "WhatsApp",
  link: "Link",
  lista_impressa: "Lista impressa",
  cracha: "Crachá",
};

export function rotuloDaOpcao(valor: string): string {
  const v = valor.trim();
  if (ROTULOS[v]) return ROTULOS[v];
  // já é texto (maiúscula, espaço, acento): fica como ela escreveu
  if (!/^[a-z0-9_]+$/.test(v)) return v;
  const texto = v.replace(/_/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
