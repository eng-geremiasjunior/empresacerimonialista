"use server";

// Escrita do croqui — salão, mesas, elementos, alocação e relações.
//
// A RLS decide quem pode (pode_editar_evento); aqui validamos forma e
// devolvemos a causa quando o banco recusa. Engolir o erro do banco já
// custou uma noite de teste — a mensagem vai junto.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { analisarLista, chaveDoNome } from "@/lib/convidados-colar";
import {
  MEDIDA_ELEMENTO,
  MEDIDA_PADRAO,
  SNAP_CM,
  type TipoElemento,
  type TipoMesa,
  type TipoRestricao,
} from "@/lib/croqui-core";

export type Resultado = { error: string } | { success: true; id?: string };

const RESTRICOES: TipoRestricao[] = [
  "vegano", "vegetariano", "sem_gluten", "sem_lactose", "alergia", "outro",
];

function revalidar(eventId: string) {
  revalidatePath(`/eventos/${eventId}/mesas`);
}

function causa(error: { code?: string; message: string }, fallback: string): Resultado {
  if (error.code === "42501" || error.message.includes("row-level security")) {
    return { error: "Você não tem permissão para editar este evento." };
  }
  if (error.message.includes("mesmo_evento")) {
    return { error: "Essa mesa não é deste evento." };
  }
  console.error("[vela:mesas]", error);
  return { error: fallback };
}

const snapServidor = (cm: number) => Math.round(cm / SNAP_CM) * SNAP_CM;

/* ------------------------------------------------------------------
 * Salão
 * ---------------------------------------------------------------- */

export async function salvarSalao(
  eventId: string,
  input: { nome?: string | null; larguraM: number; alturaM: number; observacao?: string | null }
): Promise<Resultado> {
  const largura = Math.round(input.larguraM * 100);
  const altura = Math.round(input.alturaM * 100);
  if (!Number.isFinite(largura) || largura < 300 || largura > 20000) {
    return { error: "Largura entre 3 e 200 metros." };
  }
  if (!Number.isFinite(altura) || altura < 300 || altura > 20000) {
    return { error: "Profundidade entre 3 e 200 metros." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("evento_salao").upsert(
    {
      event_id: eventId,
      nome: input.nome?.trim() || null,
      largura_cm: largura,
      altura_cm: altura,
      observacao: input.observacao?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id" }
  );
  if (error) return causa(error, "Não foi possível salvar o salão");
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * A planta do local
 * ---------------------------------------------------------------- */

export async function salvarPlanta(
  eventId: string,
  input: {
    path: string;
    tipo: "svg" | "imagem";
    larguraCm: number;
    alturaCm: number;
  }
): Promise<Resultado> {
  // o caminho tem que ser da pasta DESTE evento — a policy do bucket já
  // garante, mas gravar um path de outro evento renderia uma planta que
  // ninguém consegue abrir
  if (!input.path.startsWith(`${eventId}/`)) {
    return { error: "Arquivo fora da pasta deste evento." };
  }
  if (
    !Number.isFinite(input.larguraCm) ||
    input.larguraCm < 100 ||
    input.larguraCm > 50000
  ) {
    return { error: "A escala não fechou. Refaça a calibração." };
  }

  const supabase = createClient();
  // troca de planta: o arquivo antigo sai do bucket
  const { data: atual } = await supabase
    .from("evento_salao")
    .select("planta_path")
    .eq("event_id", eventId)
    .maybeSingle();

  const { error } = await supabase
    .from("evento_salao")
    .update({
      planta_path: input.path,
      planta_tipo: input.tipo,
      planta_largura_cm: Math.round(input.larguraCm),
      planta_altura_cm: Math.round(input.alturaCm),
      planta_x_cm: 0,
      planta_y_cm: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível salvar a planta");

  if (atual?.planta_path && atual.planta_path !== input.path) {
    await supabase.storage.from("plantas").remove([atual.planta_path]);
  }
  revalidar(eventId);
  return { success: true };
}

export async function ajustarPlanta(
  eventId: string,
  input: { xCm?: number; yCm?: number; opacidade?: number; larguraCm?: number; alturaCm?: number }
): Promise<Resultado> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.xCm !== undefined) patch.planta_x_cm = Math.round(input.xCm);
  if (input.yCm !== undefined) patch.planta_y_cm = Math.round(input.yCm);
  if (input.opacidade !== undefined) {
    patch.planta_opacidade = Math.max(10, Math.min(100, Math.round(input.opacidade)));
  }
  if (input.larguraCm !== undefined) patch.planta_largura_cm = Math.round(input.larguraCm);
  if (input.alturaCm !== undefined) patch.planta_altura_cm = Math.round(input.alturaCm);

  const supabase = createClient();
  const { error } = await supabase
    .from("evento_salao")
    .update(patch)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível ajustar");
  revalidar(eventId);
  return { success: true };
}

export async function removerPlanta(eventId: string): Promise<Resultado> {
  const supabase = createClient();
  const { data: atual } = await supabase
    .from("evento_salao")
    .select("planta_path")
    .eq("event_id", eventId)
    .maybeSingle();

  const { error } = await supabase
    .from("evento_salao")
    .update({
      planta_path: null,
      planta_tipo: null,
      planta_largura_cm: null,
      planta_altura_cm: null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível remover");

  // o arquivo só sai depois que a linha esquece dele: órfão no bucket
  // incomoda menos que planta fantasma no croqui
  if (atual?.planta_path) {
    await supabase.storage.from("plantas").remove([atual.planta_path]);
  }
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Mesas
 * ---------------------------------------------------------------- */

export async function criarMesas(
  eventId: string,
  input: {
    tipo: TipoMesa;
    rotulo: string;
    lugares: number;
    quantidade: number;
  }
): Promise<Resultado> {
  const { tipo } = input;
  if (!MEDIDA_PADRAO[tipo]) return { error: "Tipo de mesa desconhecido." };
  const n = Math.max(1, Math.min(30, Math.round(input.quantidade)));
  const lugares = Math.max(0, Math.min(40, Math.round(input.lugares)));
  const rotulo = input.rotulo.trim().slice(0, 40);
  if (!rotulo) return { error: "A mesa precisa de um nome." };

  const supabase = createClient();

  // numeração contínua: se já existem 8 mesas, as novas nascem 09, 10…
  const { count } = await supabase
    .from("evento_mesa")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  const base = count ?? 0;

  // Em lote, o nome vira sequência. Se o nome dela já é um número
  // ("07"), a série continua dali; se é palavra ("Família"), vira
  // "Família 1, 2, 3" — em nenhum caso ela recebe dez mesas homônimas.
  const comoNumero = /^\d+$/.test(rotulo) ? Number(rotulo) : null;
  const nomeDaVez = (i: number) => {
    if (n === 1) return rotulo;
    if (comoNumero != null) {
      return String(comoNumero + i).padStart(rotulo.length, "0");
    }
    return `${rotulo} ${i + 1}`;
  };

  const padrao = MEDIDA_PADRAO[tipo];
  const linhas = Array.from({ length: n }, (_, i) => ({
    event_id: eventId,
    rotulo: nomeDaVez(i),
    tipo,
    lugares,
    // nascem em fileira a partir do canto, com folga de corredor;
    // a cerimonialista arrasta para o lugar real
    x_cm: 100 + (i % 5) * (padrao.largura + 150),
    y_cm: 100 + Math.floor(i / 5) * (padrao.altura + 150),
    rotacao: 0,
    assento_marcado: tipo === "noivos",
    ordem: base + i,
  }));

  const { error } = await supabase.from("evento_mesa").insert(linhas);
  if (error) return causa(error, "Não foi possível criar");
  revalidar(eventId);
  return { success: true };
}

export async function moverMesa(
  eventId: string,
  mesaId: string,
  xCm: number,
  yCm: number
): Promise<Resultado> {
  if (!Number.isFinite(xCm) || !Number.isFinite(yCm)) return { error: "Posição inválida." };
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_mesa")
    .update({
      x_cm: Math.max(0, snapServidor(xCm)),
      y_cm: Math.max(0, snapServidor(yCm)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", mesaId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível mover");
  revalidar(eventId);
  return { success: true };
}

export async function atualizarMesa(
  eventId: string,
  mesaId: string,
  input: {
    rotulo?: string;
    lugares?: number;
    rotacao?: number;
    larguraCm?: number | null;
    alturaCm?: number | null;
    assentoMarcado?: boolean;
  }
): Promise<Resultado> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.rotulo !== undefined) {
    const r = input.rotulo.trim().slice(0, 40);
    if (!r) return { error: "A mesa precisa de um nome." };
    patch.rotulo = r;
  }
  if (input.lugares !== undefined) {
    if (!Number.isInteger(input.lugares) || input.lugares < 1 || input.lugares > 40) {
      return { error: "Lugares entre 1 e 40." };
    }
    patch.lugares = input.lugares;
  }
  if (input.rotacao !== undefined) {
    patch.rotacao = ((Math.round(input.rotacao) % 360) + 360) % 360;
  }
  if (input.larguraCm !== undefined) patch.largura_cm = input.larguraCm;
  if (input.alturaCm !== undefined) patch.altura_cm = input.alturaCm;
  if (input.assentoMarcado !== undefined) patch.assento_marcado = input.assentoMarcado;

  const supabase = createClient();
  const { error } = await supabase
    .from("evento_mesa")
    .update(patch)
    .eq("id", mesaId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível salvar");
  revalidar(eventId);
  return { success: true };
}

export async function removerMesa(eventId: string, mesaId: string): Promise<Resultado> {
  const supabase = createClient();
  // quem estava nela volta para "sem mesa" (FK on delete set null)
  const { error } = await supabase
    .from("evento_mesa")
    .delete()
    .eq("id", mesaId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível remover");
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Elementos do espaço
 * ---------------------------------------------------------------- */

export async function criarElemento(
  eventId: string,
  tipo: TipoElemento
): Promise<Resultado> {
  const medida = MEDIDA_ELEMENTO[tipo];
  if (!medida) return { error: "Elemento desconhecido." };
  const supabase = createClient();
  const { error } = await supabase.from("evento_elemento").insert({
    event_id: eventId,
    tipo,
    x_cm: 100,
    y_cm: 100,
    largura_cm: medida.largura,
    altura_cm: medida.altura,
  });
  if (error) return causa(error, "Não foi possível adicionar");
  revalidar(eventId);
  return { success: true };
}

export async function moverElemento(
  eventId: string,
  elementoId: string,
  xCm: number,
  yCm: number
): Promise<Resultado> {
  if (!Number.isFinite(xCm) || !Number.isFinite(yCm)) return { error: "Posição inválida." };
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_elemento")
    .update({ x_cm: Math.max(0, snapServidor(xCm)), y_cm: Math.max(0, snapServidor(yCm)) })
    .eq("id", elementoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível mover");
  revalidar(eventId);
  return { success: true };
}

export async function atualizarElemento(
  eventId: string,
  elementoId: string,
  input: { rotulo?: string | null; larguraCm?: number; alturaCm?: number; rotacao?: number }
): Promise<Resultado> {
  const patch: Record<string, unknown> = {};
  if (input.rotulo !== undefined) patch.rotulo = input.rotulo?.trim().slice(0, 40) || null;
  if (input.larguraCm !== undefined) {
    if (!Number.isFinite(input.larguraCm) || input.larguraCm < 20 || input.larguraCm > 3000) {
      return { error: "Largura entre 20 cm e 30 m." };
    }
    patch.largura_cm = Math.round(input.larguraCm);
  }
  if (input.alturaCm !== undefined) {
    if (!Number.isFinite(input.alturaCm) || input.alturaCm < 20 || input.alturaCm > 3000) {
      return { error: "Profundidade entre 20 cm e 30 m." };
    }
    patch.altura_cm = Math.round(input.alturaCm);
  }
  if (input.rotacao !== undefined) {
    patch.rotacao = ((Math.round(input.rotacao) % 360) + 360) % 360;
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_elemento")
    .update(patch)
    .eq("id", elementoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível salvar");
  revalidar(eventId);
  return { success: true };
}

export async function removerElemento(
  eventId: string,
  elementoId: string
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_elemento")
    .delete()
    .eq("id", elementoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível remover");
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Alocação
 * ---------------------------------------------------------------- */

export async function alocarConvidado(
  eventId: string,
  convidadoId: string,
  mesaId: string | null
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado")
    .update({
      mesa_id: mesaId,
      // trocou de mesa (ou saiu): a ordem antiga não vale mais
      ordem_na_mesa: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", convidadoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível alocar");
  revalidar(eventId);
  return { success: true };
}

/** mesa com assento marcado: a ordem da lista É o lugar (esquerda→direita) */
export async function ordenarMesa(
  eventId: string,
  mesaId: string,
  idsNaOrdem: string[]
): Promise<Resultado> {
  const supabase = createClient();
  for (let i = 0; i < idsNaOrdem.length; i++) {
    const { error } = await supabase
      .from("evento_convidado")
      .update({ ordem_na_mesa: i, updated_at: new Date().toISOString() })
      .eq("id", idsNaOrdem[i])
      .eq("event_id", eventId)
      .eq("mesa_id", mesaId);
    if (error) return causa(error, "Não foi possível ordenar");
  }
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Presença no dia (141): o toque "chegou" — e o desfazer
 * ---------------------------------------------------------------- */

export async function marcarPresenca(
  eventId: string,
  convidadoId: string,
  presente: boolean
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado")
    .update({
      presente_em: presente ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", convidadoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível marcar a chegada");
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * O convidado no contexto da mesa (criança, responsável, restrições)
 * ---------------------------------------------------------------- */

export async function atualizarConvidadoCroqui(
  eventId: string,
  convidadoId: string,
  input: {
    ehCrianca?: boolean;
    responsavelId?: string | null;
    restricaoTipo?: TipoRestricao[];
    acessibilidade?: string | null;
    /** o detalhe livre da restrição (restricao_alimentar da 092) */
    restricaoDetalhe?: string | null;
  }
): Promise<Resultado> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.ehCrianca !== undefined) patch.eh_crianca = input.ehCrianca;
  if (input.responsavelId !== undefined) {
    if (input.responsavelId === convidadoId) {
      return { error: "A criança não pode ser responsável por ela mesma." };
    }
    patch.responsavel_id = input.responsavelId;
  }
  if (input.restricaoTipo !== undefined) {
    const invalida = input.restricaoTipo.find((r) => !RESTRICOES.includes(r));
    if (invalida) return { error: "Restrição desconhecida." };
    patch.restricao_tipo = input.restricaoTipo;
  }
  if (input.acessibilidade !== undefined) {
    patch.acessibilidade = input.acessibilidade?.trim().slice(0, 200) || null;
  }
  if (input.restricaoDetalhe !== undefined) {
    patch.restricao_alimentar = input.restricaoDetalhe?.trim().slice(0, 400) || null;
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado")
    .update(patch)
    .eq("id", convidadoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível salvar");
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Relações (junto / separado)
 * ---------------------------------------------------------------- */

export async function salvarRelacao(
  eventId: string,
  input: {
    convidadoA: string;
    convidadoB: string;
    tipo: "junto" | "separado";
    motivoInterno?: string | null;
  }
): Promise<Resultado> {
  if (input.convidadoA === input.convidadoB) {
    return { error: "Escolha duas pessoas diferentes." };
  }
  const supabase = createClient();
  const { error } = await supabase.from("evento_convidado_relacao").insert({
    event_id: eventId,
    convidado_a: input.convidadoA,
    convidado_b: input.convidadoB,
    tipo: input.tipo,
    motivo_interno: input.motivoInterno?.trim().slice(0, 400) || null,
  });
  if (error) {
    if (error.message.includes("uq_relacao_par") || error.code === "23505") {
      return { error: "Essas duas pessoas já têm uma regra. Remova a atual antes." };
    }
    return causa(error, "Não foi possível salvar");
  }
  revalidar(eventId);
  return { success: true };
}

export async function removerRelacao(
  eventId: string,
  relacaoId: string
): Promise<Resultado> {
  const supabase = createClient();
  const { error } = await supabase
    .from("evento_convidado_relacao")
    .delete()
    .eq("id", relacaoId)
    .eq("event_id", eventId);
  if (error) return causa(error, "Não foi possível remover");
  revalidar(eventId);
  return { success: true };
}

/* ------------------------------------------------------------------
 * Convidado novo direto na tela de mesas (a equipe também monta lista)
 * ---------------------------------------------------------------- */

export type ResultadoLote =
  | { error: string }
  | { success: true; criados: number; repetidos: number };

/**
 * A lista da noiva chega pronta — por WhatsApp, por planilha, por print.
 * Digitar 200 nomes um a um é o motivo mais comum para o Excel continuar
 * aberto do lado. Aqui ela cola a lista inteira: um nome por linha, ou a
 * planilha com cabeçalho (aí grupo, mesa, telefone, lado e restrição
 * entram junto — aposta 3, determinística). A leitura mora em
 * src/lib/convidados-colar.ts, pura e testável; aqui só se grava.
 */
export async function adicionarConvidadosEmLote(
  eventId: string,
  texto: string
): Promise<ResultadoLote> {
  if (!texto.trim()) return { error: "Cole ao menos um nome." };

  const analise = analisarLista(texto);
  const novos = analise.convidados;

  if (novos.length === 0) return { error: "Não encontrei nenhum nome nessas linhas." };

  const supabase = createClient();

  // Colar duas vezes é acidente comum: quem já está na lista não entra de
  // novo. A comparação ignora acento e caixa, que é como a mesma pessoa
  // aparece escrita de dois jeitos.
  const { data: existentes, error: erroLer } = await supabase
    .from("evento_convidado")
    .select("nome")
    .eq("event_id", eventId);

  if (erroLer) return causa(erroLer, "Não foi possível ler a lista") as ResultadoLote;

  const jaTem = new Set((existentes ?? []).map((c) => chaveDoNome(c.nome as string)));
  const paraInserir = novos.filter((n) => !jaTem.has(chaveDoNome(n.nome)));
  const repetidos = novos.length - paraInserir.length;

  if (paraInserir.length === 0) {
    return { success: true, criados: 0, repetidos };
  }

  const { data, error } = await supabase
    .from("evento_convidado")
    .insert(
      paraInserir.map((n) => ({
        event_id: eventId,
        nome: n.nome,
        acompanhantes: n.acompanhantes,
        criancas: n.criancas,
        grupo: n.grupo,
        telefone: n.telefone,
        email: n.email,
        lado: n.lado,
        restricao_alimentar: n.restricao_alimentar,
        origem: "equipe",
      }))
    )
    .select("id");

  if (error) return causa(error, "Não foi possível adicionar a lista") as ResultadoLote;
  if (!data || data.length === 0) {
    return { error: "Você não tem permissão para editar este evento." };
  }

  revalidar(eventId);
  return { success: true, criados: data.length, repetidos };
}

export async function adicionarConvidadoEquipe(
  eventId: string,
  nome: string
): Promise<Resultado> {
  const n = nome.trim().slice(0, 120);
  if (!n) return { error: "Informe o nome." };
  const supabase = createClient();
  const { error } = await supabase.from("evento_convidado").insert({
    event_id: eventId,
    nome: n,
    origem: "equipe",
  });
  if (error) return causa(error, "Não foi possível adicionar");
  revalidar(eventId);
  return { success: true };
}
