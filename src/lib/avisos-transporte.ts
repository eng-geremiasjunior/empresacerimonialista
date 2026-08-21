// A costura do aviso. SERVER-SIDE APENAS.
//
// Mesmo desenho de lib/contratos.ts: um lugar só decide COMO o aviso
// chega. Quem produz o aviso (avisos-core) não sabe se existe WhatsApp
// configurado, e a rotina que chama não fala com a Meta.
//
// Dois canais, com naturezas diferentes:
//
//   sino     — sempre. É dentro do próprio sistema, não pede consentimento
//              de ninguém e não custa nada. É a garantia de entrega.
//   WhatsApp — só com número cadastrado, consentimento dado (a prova de
//              opt-in que a Meta pede) e transporte configurado no
//              ambiente. É melhor esforço: se falhar, o sino já entregou.
//
// Quando o número oficial não existe ainda, `whatsappConfigurado()` é
// false e nada quebra — a rotina roda inteira, o sino sai, e o WhatsApp
// entra depois por variável de ambiente, sem tocar em código.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lembrete } from "@/lib/avisos-core";
import {
  enviarTemplateWhatsapp,
  idiomaTemplate,
  nomeTemplateLembrete,
  whatsappConfigurado,
} from "@/lib/whatsapp";

export type EstadoWhatsapp =
  | "enviado"
  | "sem_consentimento"
  | "sem_transporte"
  | "falhou";

export type ResultadoEntrega = {
  destinatarioUserId: string;
  tarefas: number;
  /** o sino é a garantia: só ele decide se a tarefa fica marcada */
  sino: boolean;
  whatsapp: EstadoWhatsapp;
  erro?: string;
};

/**
 * Entrega um lembrete. O sino primeiro — se ele falhar, a rotina NÃO
 * marca as tarefas como avisadas e tenta de novo amanhã; marcar antes de
 * entregar transformaria uma falha de rede em silêncio permanente.
 */
export async function entregarLembrete(
  supabase: SupabaseClient,
  lembrete: Lembrete
): Promise<ResultadoEntrega> {
  const base: ResultadoEntrega = {
    destinatarioUserId: lembrete.destinatarioUserId,
    tarefas: lembrete.tarefaIds.length,
    sino: false,
    // o rótulo diz a verdade desde o começo: com consentimento e número,
    // o que falta é só o transporte/execução
    whatsapp: lembrete.whatsapp ? "sem_transporte" : "sem_consentimento",
  };

  const { error: erroSino } = await supabase.from("notifications").insert({
    cerimonialista_id: lembrete.destinatarioUserId,
    empresa_id: lembrete.empresaId,
    // tipo do CHECK original da 007 — é exatamente o que isto é
    type: "tarefa_proxima",
    title: lembrete.sino.title,
    message: lembrete.sino.message,
    link: lembrete.sino.link,
  });

  if (erroSino) {
    return { ...base, erro: erroSino.message };
  }
  base.sino = true;

  if (!lembrete.whatsapp) return base;

  // Transporte = credenciais E template aprovado. Faltando qualquer um dos
  // dois, o sino já entregou e não se tenta a rede.
  const template = nomeTemplateLembrete();
  if (!template || !whatsappConfigurado()) {
    return { ...base, whatsapp: "sem_transporte" };
  }

  const envio = await enviarTemplateWhatsapp({
    telefone: lembrete.whatsapp.para,
    template,
    idioma: idiomaTemplate(),
    variaveis: lembrete.whatsapp.variaveis,
  });

  if (envio.ok) return { ...base, whatsapp: "enviado" };

  // WhatsApp que falha não invalida a entrega: o sino já está lá.
  return { ...base, whatsapp: "falhou", erro: envio.error };
}
