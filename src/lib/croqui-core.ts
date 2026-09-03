// Croqui do salão — as regras, sem tela.
//
// Tudo em CENTÍMETROS INTEIROS, o mesmo sistema do banco e do viewBox
// do SVG: a coordenada que se lê aqui é a que se desenha, sem conversão.
//
// Parte PURA: nada de DOM, nada de fetch. A UI não calcula distância,
// conflito nem contagem — pergunta aqui. É o que deixa a régua de
// segurança testável: a contagem do buffet sai de contagemPorMesa e
// NUNCA carrega nome; motivo_interno não entra em NENHUM tipo daqui.

import { rotuloMesaPrincipal } from "@/lib/papel";

/* ---------------- constantes ---------------- */

/** passo do snap ao soltar uma mesa (25 cm) */
export const SNAP_CM = 25;
/** corredor mínimo de circulação entre mesas (1,5 m) */
export const CORREDOR_MIN_CM = 150;
/** raio de desobstrução exigido na frente de uma saída de emergência */
export const DESOBSTRUCAO_SAIDA_CM = 120;

/** largura de uma cadeira de evento */
export const LARGURA_CADEIRA_CM = 45;
/** do centro da cadeira até a borda da mesa */
export const AFASTAMENTO_CADEIRA_CM = 28;
/** quanto a mesa "cresce" de cada lado com a cadeira posta */
export const CADEIRA_TOTAL_CM = AFASTAMENTO_CADEIRA_CM + LARGURA_CADEIRA_CM / 2;
/** passo confortável entre centros de cadeira lado a lado */
export const PASSO_CADEIRA_CM = 60;

export type TipoMesa =
  | "redonda_8"
  | "redonda_10"
  | "retangular"
  | "imperial"
  | "noivos"
  | "bolo";

export type TipoElemento =
  | "porta"
  | "banheiro"
  | "bar"
  | "praca_alimentacao"
  | "coluna"
  | "saida_emergencia"
  | "pista"
  | "palco";

export type TipoRestricao =
  | "vegano"
  | "vegetariano"
  | "sem_gluten"
  | "sem_lactose"
  | "alergia"
  | "outro";

/** medidas padrão por tipo (cm). Redondas: largura = altura = diâmetro. */
export const MEDIDA_PADRAO: Record<TipoMesa, { largura: number; altura: number; redonda: boolean; lugares: number }> = {
  redonda_8: { largura: 150, altura: 150, redonda: true, lugares: 8 },
  redonda_10: { largura: 180, altura: 180, redonda: true, lugares: 10 },
  retangular: { largura: 240, altura: 100, redonda: false, lugares: 8 },
  imperial: { largura: 400, altura: 120, redonda: false, lugares: 16 },
  noivos: { largura: 300, altura: 100, redonda: false, lugares: 6 },
  bolo: { largura: 120, altura: 120, redonda: true, lugares: 0 },
};

export const NOME_TIPO_MESA: Record<TipoMesa, string> = {
  redonda_8: "Redonda 8",
  redonda_10: "Redonda 10",
  retangular: "Retangular",
  imperial: "Imperial",
  noivos: "Mesa dos noivos",
  bolo: "Mesa do bolo",
};

/** O nome do tipo como ESTE evento o chama — só a 'noivos' muda (o valor no banco, não). */
export function nomeTipoMesa(tipoMesa: TipoMesa, tipoEvento?: string | null): string {
  return tipoMesa === "noivos" ? rotuloMesaPrincipal(tipoEvento) : NOME_TIPO_MESA[tipoMesa];
}

export const NOME_ELEMENTO: Record<TipoElemento, string> = {
  porta: "Porta",
  banheiro: "Banheiro",
  bar: "Bar",
  praca_alimentacao: "Praça de alimentação",
  coluna: "Coluna",
  saida_emergencia: "Saída de emergência",
  pista: "Pista",
  palco: "Palco",
};

/** medida padrão de elemento ao criar (cm) */
export const MEDIDA_ELEMENTO: Record<TipoElemento, { largura: number; altura: number }> = {
  porta: { largura: 160, altura: 30 },
  banheiro: { largura: 300, altura: 200 },
  bar: { largura: 300, altura: 100 },
  praca_alimentacao: { largura: 400, altura: 300 },
  coluna: { largura: 60, altura: 60 },
  saida_emergencia: { largura: 160, altura: 30 },
  pista: { largura: 500, altura: 500 },
  palco: { largura: 600, altura: 300 },
};

export const NOME_RESTRICAO: Record<TipoRestricao, string> = {
  vegano: "vegano",
  vegetariano: "vegetariano",
  sem_gluten: "sem glúten",
  sem_lactose: "sem lactose",
  alergia: "alergia",
  outro: "outra restrição",
};

/* ---------------- modelo ---------------- */

export type Mesa = {
  id: string;
  rotulo: string;
  tipo: TipoMesa;
  lugares: number;
  xCm: number;
  yCm: number;
  rotacao: number;
  /** nulos = padrão do tipo */
  larguraCm: number | null;
  alturaCm: number | null;
  assentoMarcado: boolean;
  ordem: number;
};

export type Elemento = {
  id: string;
  tipo: TipoElemento;
  rotulo: string | null;
  xCm: number;
  yCm: number;
  rotacao: number;
  larguraCm: number;
  alturaCm: number;
};

export type ConvidadoCroqui = {
  id: string;
  nome: string;
  confirmacao: "aguardando" | "confirmado" | "nao_vai";
  mesaId: string | null;
  ordemNaMesa: number | null;
  ehCrianca: boolean;
  responsavelId: string | null;
  restricaoTipo: TipoRestricao[];
  /** presença basta para contar acessibilidade; o texto em si é interno */
  acessibilidade: string | null;
  acompanhantes: number;
};

/** ATENÇÃO: sem motivo_interno de propósito — quem consome este tipo
 *  (croqui, impressos) não tem como vazar o que nunca recebeu. */
export type RelacaoCroqui = {
  convidadoA: string;
  convidadoB: string;
  tipo: "junto" | "separado";
};

/* ---------------- geometria ---------------- */

export const snap = (cm: number): number => Math.round(cm / SNAP_CM) * SNAP_CM;

export const dentroDoSalao = (
  cm: number,
  tamanhoPeca: number,
  tamanhoSalao: number
): number => Math.max(0, Math.min(cm, tamanhoSalao - tamanhoPeca));

export type Caixa = {
  x: number;
  y: number;
  largura: number;
  altura: number;
  /** presente quando a peça é redonda */
  raio?: number;
};

/** caixa da mesa em coordenadas do salão (x,y do banco = canto superior esquerdo) */
export function caixaDaMesa(m: Pick<Mesa, "tipo" | "xCm" | "yCm" | "larguraCm" | "alturaCm">): Caixa {
  const padrao = MEDIDA_PADRAO[m.tipo];
  const largura = m.larguraCm ?? padrao.largura;
  const altura = m.alturaCm ?? padrao.altura;
  return padrao.redonda
    ? { x: m.xCm, y: m.yCm, largura, altura: largura, raio: largura / 2 }
    : { x: m.xCm, y: m.yCm, largura, altura };
}

export const caixaDoElemento = (e: Pick<Elemento, "xCm" | "yCm" | "larguraCm" | "alturaCm">): Caixa => ({
  x: e.xCm,
  y: e.yCm,
  largura: e.larguraCm,
  altura: e.alturaCm,
});

const centro = (c: Caixa) => ({ cx: c.x + c.largura / 2, cy: c.y + c.altura / 2 });

/** caixa envolvente da forma GIRADA em torno do próprio centro (o mesmo
 *  eixo do rotate() do desenho). Círculo não muda. Para retângulo em
 *  ângulo diagonal a envolvente é maior que a mesa — de propósito: numa
 *  régua de aviso, acusar 10 cm antes é melhor que deixar de acusar. */
export function caixaGirada(c: Caixa, rotacao: number): Caixa {
  if (c.raio != null || rotacao % 180 === 0) return c;
  const rad = (rotacao * Math.PI) / 180;
  const largura = Math.abs(c.largura * Math.cos(rad)) + Math.abs(c.altura * Math.sin(rad));
  const altura = Math.abs(c.largura * Math.sin(rad)) + Math.abs(c.altura * Math.cos(rad));
  const { cx, cy } = centro(c);
  return { x: cx - largura / 2, y: cy - altura / 2, largura, altura };
}

/** a pegada da mesa no chão, já considerando rotação e cadeiras */
export const pegadaDaMesa = (m: Mesa): Caixa => caixaGirada(caixaDaMesa(m), m.rotacao);
export const pegadaComCadeiras = (m: Mesa): Caixa =>
  caixaGirada(caixaComCadeiras(m), m.rotacao);

/** menor distância entre um ponto e um retângulo (0 se dentro) */
function distanciaPontoRetangulo(px: number, py: number, r: Caixa): number {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.largura));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.altura));
  return Math.hypot(dx, dy);
}

/** gap em cm ENTRE BORDAS (0 = encostadas ou sobrepostas) */
export function distanciaEntre(a: Caixa, b: Caixa): number {
  if (a.raio != null && b.raio != null) {
    const ca = centro(a), cb = centro(b);
    return Math.max(0, Math.hypot(cb.cx - ca.cx, cb.cy - ca.cy) - a.raio - b.raio);
  }
  if (a.raio != null || b.raio != null) {
    const redonda = a.raio != null ? a : b;
    const reta = a.raio != null ? b : a;
    const c = centro(redonda);
    return Math.max(0, distanciaPontoRetangulo(c.cx, c.cy, reta) - (redonda.raio as number));
  }
  // retângulo × retângulo: gap por eixo (AABB)
  const gapX = Math.max(a.x - (b.x + b.largura), b.x - (a.x + a.largura), 0);
  const gapY = Math.max(a.y - (b.y + b.altura), b.y - (a.y + a.altura), 0);
  if (gapX === 0 && gapY === 0) return 0;
  if (gapX > 0 && gapY > 0) return Math.hypot(gapX, gapY);
  return Math.max(gapX, gapY);
}

export const sobrepostas = (a: Caixa, b: Caixa): boolean => distanciaEntre(a, b) === 0;

/** a mesa com as cadeiras postas — a pegada que ela realmente ocupa no chão */
export function caixaComCadeiras(m: Pick<Mesa, "tipo" | "xCm" | "yCm" | "larguraCm" | "alturaCm" | "lugares">): Caixa {
  const caixa = caixaDaMesa(m);
  if (m.lugares <= 0) return caixa;
  const folga = CADEIRA_TOTAL_CM;
  return caixa.raio != null
    ? {
        x: caixa.x - folga,
        y: caixa.y - folga,
        largura: caixa.largura + folga * 2,
        altura: caixa.altura + folga * 2,
        raio: caixa.raio + folga,
      }
    : {
        x: caixa.x - folga,
        y: caixa.y - folga,
        largura: caixa.largura + folga * 2,
        altura: caixa.altura + folga * 2,
      };
}

/* ---------------- cadeiras ---------------- */

/** posição do centro de cada cadeira, RELATIVA ao canto da caixa da mesa
 *  (mesmo referencial do translate do <g>). `angulo` é a rotação do
 *  desenho da cadeira, em graus, com 0 = encosto voltado para cima. */
export type Cadeira = { x: number; y: number; angulo: number };

/** distribui n pontos igualmente espaçados ao longo de um segmento,
 *  com meia folga nas pontas (assim ninguém senta na quina) */
const aoLongo = (comprimento: number, n: number): number[] =>
  Array.from({ length: n }, (_, i) => (comprimento * (i + 0.5)) / n);

export function posicoesDasCadeiras(mesa: Mesa): Cadeira[] {
  if (mesa.lugares <= 0 || mesa.tipo === "bolo") return [];
  const caixa = caixaDaMesa(mesa);
  const n = mesa.lugares;

  // Redonda: volta inteira, primeira cadeira ao norte.
  if (caixa.raio != null) {
    const r = caixa.raio;
    const orbita = r + AFASTAMENTO_CADEIRA_CM;
    return Array.from({ length: n }, (_, i) => {
      const rad = (i / n) * 2 * Math.PI - Math.PI / 2;
      return {
        x: r + orbita * Math.cos(rad),
        y: r + orbita * Math.sin(rad),
        angulo: (rad * 180) / Math.PI + 90,
      };
    });
  }

  const { largura, altura } = caixa;
  const fora = AFASTAMENTO_CADEIRA_CM;

  // Mesa dos noivos: costas para a parede, todo mundo virado para o salão.
  if (mesa.tipo === "noivos") {
    return aoLongo(largura, n).map((x) => ({ x, y: -fora, angulo: 0 }));
  }

  // Retangular e imperial: lados longos primeiro; o que não couber
  // confortavelmente vai para as cabeceiras.
  const porLado = Math.max(1, Math.floor(largura / PASSO_CADEIRA_CM));
  const nasCabeceiras = Math.min(2, Math.max(0, n - porLado * 2));
  const nosLongos = n - nasCabeceiras;
  const nTopo = Math.ceil(nosLongos / 2);
  const nBaixo = nosLongos - nTopo;

  const cadeiras: Cadeira[] = [
    ...aoLongo(largura, nTopo).map((x) => ({ x, y: -fora, angulo: 0 })),
    ...aoLongo(largura, nBaixo).map((x) => ({ x, y: altura + fora, angulo: 180 })),
  ];
  if (nasCabeceiras >= 1) {
    cadeiras.push({ x: largura + fora, y: altura / 2, angulo: 90 });
  }
  if (nasCabeceiras >= 2) {
    cadeiras.push({ x: -fora, y: altura / 2, angulo: 270 });
  }
  return cadeiras;
}

/* ---------------- circulação ---------------- */

export type ProblemaCirculacao =
  | { tipo: "corredor_estreito"; mesaA: string; mesaB: string; gapCm: number }
  | { tipo: "cadeiras_encostam"; mesaA: string; mesaB: string }
  | { tipo: "saida_obstruida"; mesaId: string; elementoId: string };

/** corredores < 1,5 m entre mesas, cadeiras que se esbarram, e mesa
 *  colada em saída de emergência.
 *
 *  Sobreposição mesa × mesa NÃO entra aqui de propósito: "mesa em cima
 *  de mesa é problema dela, não do sistema" — a tela só marca o contorno.
 *  Cadeira encostando é outra coisa: aí ninguém consegue sentar, e o
 *  aviso substitui o de corredor (dizer as duas coisas do mesmo par só
 *  faria barulho). */
export function problemasDeCirculacao(
  mesas: Mesa[],
  elementos: Elemento[]
): ProblemaCirculacao[] {
  const problemas: ProblemaCirculacao[] = [];
  for (let i = 0; i < mesas.length; i++) {
    for (let j = i + 1; j < mesas.length; j++) {
      const gap = distanciaEntre(pegadaDaMesa(mesas[i]), pegadaDaMesa(mesas[j]));
      if (gap === 0) continue; // sobrepostas: escolha dela
      const gapCadeiras = distanciaEntre(
        pegadaComCadeiras(mesas[i]),
        pegadaComCadeiras(mesas[j])
      );
      if (gapCadeiras === 0) {
        problemas.push({
          tipo: "cadeiras_encostam",
          mesaA: mesas[i].id,
          mesaB: mesas[j].id,
        });
      } else if (gap < CORREDOR_MIN_CM) {
        problemas.push({
          tipo: "corredor_estreito",
          mesaA: mesas[i].id,
          mesaB: mesas[j].id,
          gapCm: Math.round(gap),
        });
      }
    }
  }
  const saidas = elementos.filter((e) => e.tipo === "saida_emergencia");
  for (const mesa of mesas) {
    const caixa = pegadaDaMesa(mesa);
    for (const saida of saidas) {
      const caixaSaida = caixaGirada(caixaDoElemento(saida), saida.rotacao);
      if (distanciaEntre(caixa, caixaSaida) < DESOBSTRUCAO_SAIDA_CM) {
        problemas.push({ tipo: "saida_obstruida", mesaId: mesa.id, elementoId: saida.id });
      }
    }
  }
  return problemas;
}

/* ---------------- saúde da mesa ---------------- */

export type ProblemaMesa =
  | { tipo: "separados_juntos"; convidadoA: string; convidadoB: string }
  | { tipo: "juntos_separados"; convidado: string; deveriaEstarCom: string }
  | { tipo: "crianca_sem_responsavel"; convidado: string }
  | { tipo: "lotada"; ocupacao: number; lugares: number };

export type SaudeMesa = {
  mesaId: string;
  /** pessoas na mesa contando acompanhantes (só quem não recusou) */
  ocupacao: number;
  problemas: ProblemaMesa[];
  /** contagem por tipo de restrição — o ÚNICO dado que vira impresso de buffet */
  restricoes: Partial<Record<TipoRestricao, number>>;
  acessibilidade: number;
};

const nomeDe = (convidados: ConvidadoCroqui[], id: string) =>
  convidados.find((c) => c.id === id)?.nome ?? "";

export function saudeDaMesa(
  mesa: Mesa,
  convidados: ConvidadoCroqui[],
  relacoes: RelacaoCroqui[]
): SaudeMesa {
  const naMesa = convidados.filter(
    (c) => c.mesaId === mesa.id && c.confirmacao !== "nao_vai"
  );
  const ids = new Set(naMesa.map((c) => c.id));
  const problemas: ProblemaMesa[] = [];

  for (const r of relacoes) {
    const aAqui = ids.has(r.convidadoA);
    const bAqui = ids.has(r.convidadoB);
    if (r.tipo === "separado" && aAqui && bAqui) {
      problemas.push({
        tipo: "separados_juntos",
        convidadoA: nomeDe(convidados, r.convidadoA),
        convidadoB: nomeDe(convidados, r.convidadoB),
      });
    }
    // "manter junto" só reclama quando os dois estão alocados em mesas diferentes
    if (r.tipo === "junto" && (aAqui || bAqui) && !(aAqui && bAqui)) {
      const dentro = aAqui ? r.convidadoA : r.convidadoB;
      const fora = aAqui ? r.convidadoB : r.convidadoA;
      const convidadoFora = convidados.find((c) => c.id === fora);
      if (convidadoFora?.mesaId && convidadoFora.confirmacao !== "nao_vai") {
        problemas.push({
          tipo: "juntos_separados",
          convidado: nomeDe(convidados, dentro),
          deveriaEstarCom: convidadoFora.nome,
        });
      }
    }
  }

  for (const c of naMesa) {
    if (!c.ehCrianca) continue;
    // sem responsável marcado, qualquer adulto da mesa serve
    const temAdulto = naMesa.some((o) => o.id !== c.id && !o.ehCrianca);
    const responsavelAqui = c.responsavelId
      ? ids.has(c.responsavelId)
      : temAdulto;
    if (!responsavelAqui) {
      problemas.push({ tipo: "crianca_sem_responsavel", convidado: c.nome });
    }
  }

  const ocupacao = naMesa.reduce((s, c) => s + 1 + c.acompanhantes, 0);
  if (ocupacao > mesa.lugares && mesa.lugares > 0) {
    problemas.push({ tipo: "lotada", ocupacao, lugares: mesa.lugares });
  }

  const restricoes: Partial<Record<TipoRestricao, number>> = {};
  for (const c of naMesa) {
    for (const r of c.restricaoTipo) {
      restricoes[r] = (restricoes[r] ?? 0) + 1;
    }
  }

  return {
    mesaId: mesa.id,
    ocupacao,
    problemas,
    restricoes,
    acessibilidade: naMesa.filter((c) => !!c.acessibilidade?.trim()).length,
  };
}

/* ---------------- contagens ---------------- */

export type Contadores = {
  confirmados: number;
  aguardando: number;
  naoVao: number;
  /** confirmados + aguardando já sentados */
  alocados: number;
  semMesa: number;
};

export function contadores(convidados: ConvidadoCroqui[]): Contadores {
  const vao = convidados.filter((c) => c.confirmacao !== "nao_vai");
  const conta = (lista: ConvidadoCroqui[]) =>
    lista.reduce((s, c) => s + 1 + c.acompanhantes, 0);
  return {
    confirmados: conta(convidados.filter((c) => c.confirmacao === "confirmado")),
    aguardando: conta(convidados.filter((c) => c.confirmacao === "aguardando")),
    naoVao: conta(convidados.filter((c) => c.confirmacao === "nao_vai")),
    alocados: conta(vao.filter((c) => c.mesaId != null)),
    semMesa: conta(vao.filter((c) => c.mesaId == null)),
  };
}

/** A folha do buffet: por mesa, SÓ CONTAGENS. Nome não entra no tipo de
 *  retorno — restrição alimentar é dado de saúde de terceiro e nunca sai
 *  nominalmente para fornecedor. */
export type LinhaBuffet = {
  mesaId: string;
  rotulo: string;
  pessoas: number;
  criancas: number;
  restricoes: { tipo: TipoRestricao; quantidade: number }[];
  acessibilidade: number;
};

export function contagemPorMesa(
  mesas: Mesa[],
  convidados: ConvidadoCroqui[]
): LinhaBuffet[] {
  const ordenadas = [...mesas].sort(
    (a, b) => a.ordem - b.ordem || a.rotulo.localeCompare(b.rotulo, "pt-BR")
  );
  return ordenadas.map((mesa) => {
    const naMesa = convidados.filter(
      (c) => c.mesaId === mesa.id && c.confirmacao !== "nao_vai"
    );
    const porTipo = new Map<TipoRestricao, number>();
    for (const c of naMesa) {
      for (const r of c.restricaoTipo) {
        porTipo.set(r, (porTipo.get(r) ?? 0) + 1);
      }
    }
    return {
      mesaId: mesa.id,
      rotulo: mesa.rotulo,
      pessoas: naMesa.reduce((s, c) => s + 1 + c.acompanhantes, 0),
      criancas: naMesa.filter((c) => c.ehCrianca).length,
      restricoes: [...porTipo.entries()]
        .map(([tipo, quantidade]) => ({ tipo, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade),
      acessibilidade: naMesa.filter((c) => !!c.acessibilidade?.trim()).length,
    };
  });
}

/** A folha da recepção: nome → mesa, ordem alfabética. Sem restrição,
 *  sem telefone — a recepcionista só precisa apontar a mesa. */
export function listaRecepcao(
  mesas: Mesa[],
  convidados: ConvidadoCroqui[]
): { nome: string; mesa: string }[] {
  const rotulo = new Map(mesas.map((m) => [m.id, m.rotulo]));
  return convidados
    .filter((c) => c.confirmacao !== "nao_vai" && c.mesaId != null)
    .map((c) => ({ nome: c.nome, mesa: rotulo.get(c.mesaId as string) ?? "" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
