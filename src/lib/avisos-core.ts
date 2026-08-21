// Núcleo do lembrete de prazo.
//
// Puro: recebe as tarefas que vencem em breve já lidas do banco e devolve
// UMA entrega por pessoa — o texto do sino e as variáveis do template de
// WhatsApp. Nada de Supabase, nada de fetch.
//
// Duas decisões de produto moram aqui.
//
// 1) Uma mensagem por dia, não uma por tarefa. Quatro tarefas em quatro
//    mensagens interrompem quatro vezes e, no WhatsApp, custam quatro
//    conversas de 24h — a Meta cobra por janela, não por mensagem.
//
// 2) A rotina olha DOIS dias: amanhã (a véspera, que é a promessa) e
//    hoje. O "hoje" existe porque a rotina roda uma vez, de manhã: uma
//    tarefa criada às três da tarde com prazo para amanhã já perdeu a
//    janela da véspera — e, sem esta segunda rede, nunca receberia aviso
//    nenhum. Ela cai no dia do vencimento, com o texto dizendo "Hoje".
//    Nada de prometer véspera e entregar silêncio.

/** Tarefa com prazo próximo, com a pessoa que responde por ela resolvida. */
export type TarefaDeVespera = {
  id: string;
  titulo: string;
  /** yyyy-MM-dd */
  dueDate: string;
  status: string;
  priority: string | null;
  eventId: string;
  /** nome do evento ou, na falta, da cliente */
  eventoNome: string | null;
  eventoStatus: string | null;
  /** auth.users — quem recebe (responsável pelo evento; sem ela, quem criou) */
  destinatarioUserId: string;
  destinatarioNome: string;
  destinatarioWhatsapp: string | null;
  destinatarioAceitaWhatsapp: boolean;
  empresaId: string | null;
};

export type JanelaDoAviso = { hoje: string; amanha: string };

export type Lembrete = {
  destinatarioUserId: string;
  empresaId: string | null;
  nome: string;
  tarefaIds: string[];
  sino: { title: string; message: string; link: string };
  /**
   * Variáveis do template `lembrete_tarefas_amanha`, na ordem {{1}}..{{5}}:
   *
   *   Olá, {{1}}! {{2}} você tem {{3}}.
   *   {{4}}
   *   Abra {{5}} para ver os detalhes.
   *
   * O corpo começa E termina com texto: a Meta recusa template com
   * variável solta na ponta ("dangling parameter").
   *
   * null quando ela não tem número ou não consentiu — e aí só o sino sai.
   */
  whatsapp: { para: string; variaveis: string[] } | null;
};

/** Peso da prioridade: quem aparece como "a primeira" da mensagem. */
const PESO: Record<string, number> = { alta: 0, media: 1, baixa: 2 };

/** yyyy-MM-dd -> dd/mm. É o que cabe numa frase falada. */
export function diaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** O dia seguinte a uma data ISO, sem depender do fuso do processo. */
export function diaSeguinte(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** Hoje em Brasília. `current_date` do Postgres é UTC e vira o dia às 21h. */
export function hojeEmBrasilia(agora: Date = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function janelaDoAviso(agora: Date = new Date()): JanelaDoAviso {
  const hoje = hojeEmBrasilia(agora);
  return { hoje, amanha: diaSeguinte(hoje) };
}

function primeiroNome(nome: string): string {
  const limpo = nome.trim();
  if (!limpo) return "";
  return limpo.split(/\s+/)[0];
}

/**
 * Sanitiza uma variável de template da Meta. A API recusa parâmetro com
 * quebra de linha, tabulação ou espaços em sequência — e o texto vem de
 * campo digitado à mão, então isso acontece.
 */
export function limparVariavel(texto: string, max = 120): string {
  const plano = texto.replace(/\s+/g, " ").trim();
  if (plano.length <= max) return plano;
  return `${plano.slice(0, max - 1).trimEnd()}…`;
}

function rotuloTarefa(t: TarefaDeVespera): string {
  return t.eventoNome ? `${t.titulo} — ${t.eventoNome}` : t.titulo;
}

function plural(n: number): string {
  return n === 1 ? "1 tarefa" : `${n} tarefas`;
}

/**
 * Quem entra no lembrete: tarefa aberta, com prazo hoje ou amanhã, de
 * evento que ainda existe de verdade. Evento concluído ou cancelado não
 * cobra ninguém — a mesma regra que a Central já usa.
 */
export function elegivel(t: TarefaDeVespera, janela: JanelaDoAviso): boolean {
  if (t.dueDate !== janela.hoje && t.dueDate !== janela.amanha) return false;
  if (t.status === "concluido") return false;
  if (t.eventoStatus === "concluido" || t.eventoStatus === "cancelado") return false;
  if (!t.destinatarioUserId) return false;
  return true;
}

function ordenarPorUrgencia(lista: TarefaDeVespera[]): TarefaDeVespera[] {
  return lista.slice().sort((a, b) => {
    // vence hoje antes de vence amanhã
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    const pa = PESO[a.priority ?? "media"] ?? 1;
    const pb = PESO[b.priority ?? "media"] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
}

/**
 * "Hoje (22/08)" / "Amanhã (23/08)" / "Hoje e amanhã" — a frase que abre a
 * mensagem, e o prefixo curto do sino. Quem tem tarefa nos dois dias
 * recebe UM aviso que fala dos dois: dois avisos no mesmo minuto seriam
 * duas interrupções e duas conversas cobradas.
 */
function comoChamarODia(
  temHoje: boolean,
  temAmanha: boolean,
  janela: JanelaDoAviso
): { longo: string; curto: string } {
  if (temHoje && temAmanha) return { longo: "Hoje e amanhã", curto: "Hoje e amanhã" };
  if (temHoje) return { longo: `Hoje (${diaMes(janela.hoje)})`, curto: "Hoje" };
  return { longo: `Amanhã (${diaMes(janela.amanha)})`, curto: "Amanhã" };
}

/**
 * Agrupa por pessoa e monta os textos. Devolve na ordem estável do
 * primeiro aparecimento de cada destinatária, para o log da rotina ficar
 * previsível entre execuções.
 */
export function montarLembretes(
  tarefas: TarefaDeVespera[],
  janela: JanelaDoAviso,
  appUrl: string
): Lembrete[] {
  const porPessoa = new Map<string, TarefaDeVespera[]>();
  for (const t of tarefas) {
    if (!elegivel(t, janela)) continue;
    const atual = porPessoa.get(t.destinatarioUserId);
    if (atual) atual.push(t);
    else porPessoa.set(t.destinatarioUserId, [t]);
  }

  const lembretes: Lembrete[] = [];

  for (const [userId, lista] of porPessoa) {
    const ordenadas = ordenarPorUrgencia(lista);
    const primeira = ordenadas[0];
    const n = ordenadas.length;

    const dia = comoChamarODia(
      ordenadas.some((t) => t.dueDate === janela.hoje),
      ordenadas.some((t) => t.dueDate === janela.amanha),
      janela
    );
    const destaque = rotuloTarefa(primeira);

    // O sino: quando é uma só, o título carrega a tarefa (é acionável);
    // quando são várias, carrega o número e a frase nomeia a primeira.
    const sino =
      n === 1
        ? {
            title: `${dia.curto}: ${primeira.titulo}`,
            message: primeira.eventoNome
              ? `${diaMes(primeira.dueDate)} · ${primeira.eventoNome}`
              : diaMes(primeira.dueDate),
            link: "/tarefas",
          }
        : {
            title: `${dia.curto} você tem ${n} tarefas`,
            message: `${diaMes(primeira.dueDate)} · a primeira é ${destaque}`,
            link: "/tarefas",
          };

    const numero = (primeira.destinatarioWhatsapp ?? "").trim();
    const podeWhatsapp = primeira.destinatarioAceitaWhatsapp && numero.length > 0;

    lembretes.push({
      destinatarioUserId: userId,
      empresaId: primeira.empresaId,
      nome: primeira.destinatarioNome,
      tarefaIds: ordenadas.map((t) => t.id),
      sino,
      whatsapp: podeWhatsapp
        ? {
            para: numero,
            variaveis: [
              limparVariavel(
                primeiroNome(primeira.destinatarioNome) || "cerimonialista",
                40
              ),
              dia.longo,
              plural(n),
              limparVariavel(n === 1 ? destaque : `A primeira: ${destaque}`, 140),
              `${appUrl.replace(/\/$/, "")}/tarefas`,
            ],
          }
        : null,
    });
  }

  return lembretes;
}
