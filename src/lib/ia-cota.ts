// A cota mensal de IA por plano (21/10/2026, plano "IA que trabalha").
// Pura, sem banco: o servidor usa para reservar, a tela para avisar.
//
// Decisão dele: a IA está em todos os planos pagos; muda só quanto se
// usa por mês. Os números moram em ia_ajustes (220) e ele edita no
// /admin/ajustes. As contas da casa e a família ficam fora da cota.

import type { NivelDoPlano } from "@/lib/recursos-do-plano";

export type AjustesDaIa = {
  /** o interruptor geral dos trabalhos */
  ligada: boolean;
  /** false = os trabalhos novos só aparecem nas contas da casa */
  paraTodos: boolean;
  cotaEssencial: number;
  cotaProfissional: number;
  cotaMaster: number;
  audioMinEssencial: number;
  audioMinProfissional: number;
  audioMinMaster: number;
};

/** o que vale antes de a 220 estar aplicada: desligada para todos */
export const AJUSTES_PADRAO: AjustesDaIa = {
  ligada: true,
  paraTodos: false,
  cotaEssencial: 150,
  cotaProfissional: 400,
  cotaMaster: 1500,
  audioMinEssencial: 60,
  audioMinProfissional: 180,
  audioMinMaster: 600,
};

export type Limite = { acoes: number; audioMin: number };

/** sem limite prático: contas da casa e família */
export const SEM_LIMITE: Limite = { acoes: 100_000, audioMin: 100_000 };

/**
 * O limite do mês para o plano. Gratuito = 0 (a IA é dos pagos). Nível
 * desconhecido (a leitura falhou) cai no Essencial: falta de informação
 * não tranca, mas também não abre o Master.
 */
export function limiteDoPlano(nivel: NivelDoPlano | null | undefined, a: AjustesDaIa, daCasa = false): Limite {
  if (daCasa || nivel === "familia") return SEM_LIMITE;
  switch (nivel) {
    case "gratuito":
      return { acoes: 0, audioMin: 0 };
    case "profissional":
      return { acoes: a.cotaProfissional, audioMin: a.audioMinProfissional };
    case "master":
      return { acoes: a.cotaMaster, audioMin: a.audioMinMaster };
    default:
      return { acoes: a.cotaEssencial, audioMin: a.audioMinEssencial };
  }
}

/** a linha do banco (snake_case) → ajustes; campo estranho ou faltando vira o padrão */
export function ajustesDaLinha(l: Record<string, unknown> | null | undefined): AjustesDaIa {
  if (!l) return AJUSTES_PADRAO;
  const num = (v: unknown, padrao: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100_000 ? v : padrao;
  return {
    ligada: typeof l.ligada === "boolean" ? l.ligada : AJUSTES_PADRAO.ligada,
    paraTodos: l.para_todos === true,
    cotaEssencial: num(l.cota_essencial, AJUSTES_PADRAO.cotaEssencial),
    cotaProfissional: num(l.cota_profissional, AJUSTES_PADRAO.cotaProfissional),
    cotaMaster: num(l.cota_master, AJUSTES_PADRAO.cotaMaster),
    audioMinEssencial: num(l.audio_min_essencial, AJUSTES_PADRAO.audioMinEssencial),
    audioMinProfissional: num(l.audio_min_profissional, AJUSTES_PADRAO.audioMinProfissional),
    audioMinMaster: num(l.audio_min_master, AJUSTES_PADRAO.audioMinMaster),
  };
}

/** "restam 30 leituras este mês" só a partir de 80% usado */
export function avisoDaCota(usadas: number, limite: number): string | null {
  if (limite <= 0 || limite >= SEM_LIMITE.acoes) return null;
  const restam = Math.max(0, limite - usadas);
  if (restam === 0) return "A cota de inteligência artificial deste mês acabou. Ela volta no dia 1º.";
  if (usadas / limite < 0.8) return null;
  return restam === 1 ? "Resta 1 ação de inteligência artificial este mês." : `Restam ${restam} ações de inteligência artificial este mês.`;
}
