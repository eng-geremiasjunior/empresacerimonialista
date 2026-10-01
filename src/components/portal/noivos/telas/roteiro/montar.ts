// Roteiro do dia (desenho v4, README §16): do programa que a RPC da 092
// devolve (só horário, título e duração) para as linhas da tela. Parte
// pura, roda no servidor: a tela recebe só dados simples.
//
// O desenho mostra, em cada linha, o local e "quem" (Noiva, Todos…). A
// janela do portal não traz nenhum dos dois — o responsável e o
// fornecedor ficam do lado da equipe (092) —, então a linha de baixo
// leva a duração, quando houver, e o chip de "quem" só aparece para
// dizer com quem está a sugestão que o casal mandou.

import type { MomentoDoDia, SugestaoCronograma } from "@/lib/supabase/programa-do-dia";

export type SugestaoDaLinha = {
  /** "16:30" */
  hora: string | null;
  mensagem: string | null;
  estado: "pendente" | "aceita" | "recusada";
  motivo: string | null;
};

export type LinhaDoRoteiro = {
  id: string;
  /** "16:00"; null quando o momento ainda não tem horário */
  hora: string | null;
  titulo: string;
  /** a linha de baixo: "45 min", "1h30" */
  sub: string | null;
  /** a sugestão de horário mais nova do casal para este momento */
  sugestao: SugestaoDaLinha | null;
};

export type PedidoDeMomento = {
  id: string;
  titulo: string;
  hora: string | null;
  estado: "pendente" | "aceita" | "recusada";
  motivo: string | null;
};

function hhmm(hora: string | null): string | null {
  return hora && /^\d{2}:\d{2}/.test(hora) ? hora.slice(0, 5) : null;
}

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** "45 min", "1h", "1h30" */
export function duracaoEmTexto(min: number | null): string | null {
  if (!min || min <= 0) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}

/** "20 de março" a partir de AAAA-MM-DD (a data da festa, sem fuso). */
export function diaEMes(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d))
  );
}

/**
 * As linhas na ordem do dia. A RPC ordena pelo relógio, e a madrugada de
 * uma festa que começa de tarde ("00:30 Corte do bolo", "02:00
 * Encerramento") viria antes do "12:00 Dia da noiva": com algum momento
 * depois do meio-dia, o que é antes das 6h conta como depois da
 * meia-noite (a mesma regra da v2). Sem horário, no fim, na ordem dela.
 */
export function montarRoteiro(
  momentos: MomentoDoDia[],
  sugestoes: SugestaoCronograma[]
): { linhas: LinhaDoRoteiro[]; pedidos: PedidoDeMomento[] } {
  // as sugestões chegam da mais nova para a mais antiga: vale a primeira
  const doMomento = new Map<string, SugestaoCronograma>();
  for (const s of sugestoes) {
    if (s.tipo === "horario" && s.roteiroItemId && !doMomento.has(s.roteiroItemId)) {
      doMomento.set(s.roteiroItemId, s);
    }
  }

  const comHora = momentos.filter((m) => hhmm(m.hora));
  const semHora = momentos.filter((m) => !hhmm(m.hora));
  const temTarde = comHora.some((m) => minutos(hhmm(m.hora)!) >= 12 * 60);
  const ordenados = comHora
    .map((m, i) => {
      let min = minutos(hhmm(m.hora)!);
      if (temTarde && min < 6 * 60) min += 24 * 60;
      return { m, min, i };
    })
    .sort((a, b) => a.min - b.min || a.i - b.i)
    .map((x) => x.m);

  const linhas: LinhaDoRoteiro[] = [...ordenados, ...semHora].map((m) => {
    const s = doMomento.get(m.id);
    return {
      id: m.id,
      hora: hhmm(m.hora),
      titulo: m.titulo,
      sub: duracaoEmTexto(m.duracao),
      sugestao: s
        ? {
            hora: hhmm(s.horarioSugerido),
            mensagem: s.mensagem?.trim() || null,
            estado: s.estado,
            motivo: s.motivoRecusa?.trim() || null,
          }
        : null,
    };
  });

  const pedidos: PedidoDeMomento[] = sugestoes
    .filter((s) => s.tipo === "momento_novo" && s.tituloSugerido?.trim())
    .map((s) => ({
      id: s.id,
      titulo: s.tituloSugerido!.trim(),
      hora: hhmm(s.horarioSugerido),
      estado: s.estado,
      motivo: s.motivoRecusa?.trim() || null,
    }));

  return { linhas, pedidos };
}
