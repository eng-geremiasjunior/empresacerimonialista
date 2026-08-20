// Núcleo de decisão da Central de Solicitações.
//
// Tudo aqui é função pura: recebe o estado do banco já lido e o instante
// atual, devolve o que fazer. Nada de Supabase, nada de fetch. O motivo é
// simples — as regras que importam (quando agrupar, quando calar, quando
// escalar para ela) são as que mais mudam, e precisam ser testáveis sem
// subir banco.
//
// A regra de negócio em uma frase: o fornecedor recebe UMA mensagem por
// vez, com tudo que a cerimonialista precisa dele naquele momento,
// atravessando os eventos dela.

/** Quantos dias à frente puxamos junto o que ainda vai vencer. */
export const JANELA_ANTECIPACAO_DIAS = 3;

/** Silêncio mínimo entre duas batidas ao mesmo fornecedor. */
export const INTERVALO_MINIMO_DIAS = 3;

/** Depois disso o sistema para de insistir e chama a cerimonialista. */
export const MAX_TENTATIVAS = 2;

/** Padrão quando a tarefa não define reenvio_horas. */
export const REENVIO_HORAS_PADRAO = 48;

export type TipoSolicitacao = "confirmacao" | "contrato";

export type StatusSolicitacao =
  | "pendente"
  | "enviada"
  | "reenviada"
  | "respondida"
  | "expirada"
  | "cancelada";

export type Solicitacao = {
  id: string;
  supplierId: string;
  eventId: string;
  tipo: TipoSolicitacao;
  titulo: string;
  status: StatusSolicitacao;
  /** data (YYYY-MM-DD) a partir da qual pode sair; null = já pode */
  disparaEm: string | null;
  /** instante ISO em que morre sem resposta; null = não expira */
  prazoAte: string | null;
  tentativas: number;
  enviadaEm: string | null;
  reenvioHoras: number | null;
  eventoNome: string | null;
  eventoData: string | null;
};

export type BatidaExistente = {
  supplierId: string;
  status: "na_fila" | "segurada" | "enviada" | "cancelada";
  programadaPara: string | null;
  enviadaEm: string | null;
};

export type PlanoBatida = {
  supplierId: string;
  solicitacaoIds: string[];
  /** por que esta batida existe — vai para o log da rotina, não para a tela */
  motivo: string;
};

// ---------------------------------------------------------------- datas

function soData(iso: string): string {
  return iso.slice(0, 10);
}

function diasEntre(deIso: string, ateIso: string): number {
  const de = Date.parse(`${soData(deIso)}T00:00:00Z`);
  const ate = Date.parse(`${soData(ateIso)}T00:00:00Z`);
  return Math.round((ate - de) / 86_400_000);
}

// ------------------------------------------------------------- maturação

/** Já passou da data de disparo (ou nunca teve uma). */
export function madura(s: Solicitacao, hoje: string): boolean {
  if (s.status !== "pendente") return false;
  return !s.disparaEm || s.disparaEm <= hoje;
}

/** Ainda não venceu, mas vence perto o bastante para ir junto. */
export function venceNaJanela(
  s: Solicitacao,
  hoje: string,
  janelaDias = JANELA_ANTECIPACAO_DIAS
): boolean {
  if (s.status !== "pendente") return false;
  if (!s.disparaEm) return false;
  const falta = diasEntre(hoje, s.disparaEm);
  return falta > 0 && falta <= janelaDias;
}

// ------------------------------------------------------------ agrupamento

/**
 * O silêncio devido ao fornecedor. Batida viva (na fila, segurada ou
 * enviada aguardando) bloqueia; batida enviada há menos que o intervalo
 * mínimo também. A cerimonialista não descobre isso na tela — ela só
 * percebe que o fornecedor dela não é metralhado.
 */
export function podeBater(
  supplierId: string,
  batidas: BatidaExistente[],
  agoraIso: string,
  intervaloDias = INTERVALO_MINIMO_DIAS
): boolean {
  for (const b of batidas) {
    if (b.supplierId !== supplierId) continue;
    if (b.status === "na_fila" || b.status === "segurada") return false;
    if (b.status === "enviada") {
      if (!b.enviadaEm) return false;
      if (diasEntre(b.enviadaEm, agoraIso) < intervaloDias) return false;
    }
  }
  return true;
}

/**
 * Uma batida por fornecedor com tudo que já venceu, mais o que vence nos
 * próximos dias. Uma solicitação que só vence perto NÃO cria batida
 * sozinha — ela pega carona. Sem isso o agrupamento vira antecipação
 * infinita e o fornecedor recebe mensagem por coisa que ainda nem é dele.
 */
export function agrupar(
  solicitacoes: Solicitacao[],
  batidas: BatidaExistente[],
  hoje: string,
  agoraIso: string
): PlanoBatida[] {
  const porFornecedor = new Map<
    string,
    { maduras: Solicitacao[]; carona: Solicitacao[] }
  >();

  for (const s of solicitacoes) {
    const grupo = porFornecedor.get(s.supplierId) ?? { maduras: [], carona: [] };
    // Novidade e cobrança entram na MESMA batida. Separá-las faria o
    // fornecedor receber duas mensagens no mesmo dia — que é exatamente
    // o que a Central existe para não fazer.
    if (madura(s, hoje) || precisaReenvio(s, agoraIso)) grupo.maduras.push(s);
    else if (venceNaJanela(s, hoje)) grupo.carona.push(s);
    porFornecedor.set(s.supplierId, grupo);
  }

  const planos: PlanoBatida[] = [];
  for (const [supplierId, grupo] of porFornecedor) {
    if (grupo.maduras.length === 0) continue;
    if (!podeBater(supplierId, batidas, agoraIso)) continue;

    const juntas = [...grupo.maduras, ...grupo.carona].sort((a, b) =>
      (a.eventoData ?? "9999").localeCompare(b.eventoData ?? "9999")
    );
    planos.push({
      supplierId,
      solicitacaoIds: juntas.map((s) => s.id),
      motivo:
        grupo.carona.length > 0
          ? `${grupo.maduras.length} vencida(s) + ${grupo.carona.length} de carona`
          : `${grupo.maduras.length} vencida(s)`,
    });
  }
  return planos;
}

// ------------------------------------------------------- reenvio e fim

/**
 * Reenvio é a MESMA solicitação de novo, nunca uma nova. Duplicar a
 * solicitação faria o fornecedor ver duas linhas iguais na página dele.
 */
export function precisaReenvio(s: Solicitacao, agoraIso: string): boolean {
  if (s.status !== "enviada") return false;
  if (!s.enviadaEm) return false;
  if (s.tentativas >= MAX_TENTATIVAS) return false;
  const horas = s.reenvioHoras ?? REENVIO_HORAS_PADRAO;
  const limite = Date.parse(s.enviadaEm) + horas * 3_600_000;
  return Date.parse(agoraIso) >= limite;
}

export function expirou(s: Solicitacao, agoraIso: string): boolean {
  if (s.status !== "enviada" && s.status !== "reenviada") return false;
  if (!s.prazoAte) return false;
  return Date.parse(agoraIso) > Date.parse(s.prazoAte);
}

/**
 * Silêncio escala para pessoa, não para mais mensagem. Depois do teto de
 * tentativas o sistema para e vira tarefa dela — ligar resolve o que a
 * quarta mensagem não resolveria.
 */
export function precisaEscalar(s: Solicitacao, agoraIso: string): boolean {
  if (s.status !== "reenviada") return false;
  if (s.tentativas < MAX_TENTATIVAS) return false;
  if (!s.enviadaEm) return false;
  const horas = s.reenvioHoras ?? REENVIO_HORAS_PADRAO;
  return Date.parse(agoraIso) >= Date.parse(s.enviadaEm) + horas * 3_600_000;
}

// ------------------------------------------------------------- mensagem

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const partes = soData(iso).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : "";
}

function rotulo(s: Solicitacao): string {
  const nome = s.eventoNome?.trim() || "evento";
  const quando = dataCurta(s.eventoData);
  return quando ? `${nome} (${quando})` : nome;
}

/**
 * A batida nomeia o que mudou. "Você tem novidades no sistema" não gera
 * resposta, gera ruído: o fornecedor precisa saber, antes de abrir, se
 * aquilo é coisa de dois minutos ou de meia hora.
 */
export function textoDaBatida(
  fornecedorNome: string,
  remetente: string,
  itens: Solicitacao[],
  link: string
): string {
  // Nome inteiro de propósito: fornecedor quase sempre é empresa, e cortar
  // no primeiro nome produz "Oi, DJ!" e "Oi, Buffet!".
  const abertura = `Oi, ${fornecedorNome.trim()}! Aqui é ${remetente}.`;

  if (itens.length === 1) {
    const s = itens[0];
    return [
      abertura,
      "",
      `${s.titulo} — ${rotulo(s)}.`,
      "",
      `Dá para responder por aqui, leva menos de um minuto: ${link}`,
    ].join("\n");
  }

  const linhas = itens.map((s) => `• ${s.titulo} — ${rotulo(s)}`);
  return [
    abertura,
    "",
    `Tenho ${itens.length} coisas com você:`,
    ...linhas,
    "",
    `Responde tudo por aqui: ${link}`,
  ].join("\n");
}

/** Assunto do e-mail — mesmo princípio: diz o que é, não que "há novidades". */
export function assuntoDaBatida(itens: Solicitacao[]): string {
  if (itens.length === 1) return itens[0].titulo;
  const eventos: string[] = [];
  for (const s of itens) {
    const nome = s.eventoNome?.trim() || "evento";
    if (!eventos.includes(nome)) eventos.push(nome);
  }
  return `${itens.length} pendências — ${eventos.slice(0, 2).join(", ")}`;
}
