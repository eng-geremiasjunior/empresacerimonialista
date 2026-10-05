// A Visão geral do portal dos noivos (desenho v4, README §6), na ordem do
// desenho: Hoje, só uma coisa → atalhos → linha do tempo → trilha →
// Agenda + Perguntas → o cartão da cerimonialista (o rodapé é da casca).
// Acima de tudo, enquanto a lista de presentes não está no ar, a chamada
// para criá-la (pedido dele, 05/10/2026).
//
// Componente de SERVIDOR: lê tudo pela sessão da família (a RLS e as RPCs
// decidem o que cada um vê) com os carregadores que o portal já tem — os
// mesmos das telas Convidados, Fornecedores e Tarefas, então os números
// batem com os delas — e entrega às partes cliente só dados simples.
// Nenhum valor em dinheiro atravessa: das parcelas, o atalho de
// Fornecedores usa só se falta o sinal (e isso já vem pronto do montar).

import {
  getContatoCerimonialista,
  getEventoDaFamilia,
  getEventoDoPortal,
  getInvestimento,
  getPerguntas,
} from "@/lib/supabase/portal";
import { getTarefasDoPortal } from "@/lib/supabase/portal-tarefas";
import { getConvidados } from "@/lib/supabase/portal-pessoas";
import { getConvidadosV2 } from "@/lib/supabase/portal-salao";
import { getFornecedoresDoPortal } from "@/lib/supabase/portal-fornecedores";
import { getCuradoriasDoPortal } from "@/lib/supabase/curadoria";
import { chamarParaALista } from "@/lib/supabase/portal-presentes";
import { getNomesDoCasal } from "@/lib/supabase/portal-noivos";
import { linkWhatsapp } from "@/lib/whatsapp-link";
import { hojeBR } from "@/lib/tempo";
import { estadoDoConvite } from "@/app/(portal)/portal/[eventoId]/cerimonialista/actions";
import { montarConvidados } from "../convidados/montar";
import { montarCartoes } from "../fornecedores/montar";
import { LinhaDoTempoSecao } from "../linha-do-tempo/Secao";
import { TrilhaSecao } from "../trilha/Secao";
import { getNivelNoPortal } from "./dados";
import {
  atalhoDeConfirmacoes,
  atalhoDeFornecedores,
  exemploDeHashtag,
  montarCartaoDaCerimonialista,
  montarPerguntas,
  montarTarefasDoDia,
  type Atalho,
} from "./montar";
import { ChamadaDaLista } from "./ChamadaDaLista";
import { HojeUmaCoisa } from "./HojeUmaCoisa";
import { Atalhos } from "./Atalhos";
import { AgendaEPerguntas } from "./AgendaEPerguntas";
import { CartaoCerimonialista } from "./CartaoCerimonialista";
import "./visao-geral.css";

export async function VisaoGeralSecao({ eventoId }: { eventoId: string }) {
  const evento = await getEventoDoPortal(eventoId);
  if (!evento) return null;

  // o layout já perguntou (cache): sai sem ida ao banco
  const daFamilia = await getEventoDaFamilia(evento.id);

  // uma leva só, em paralelo (o que é de cada nível é filtrado depois; a
  // RLS já devolve vazio o que o nível não alcança)
  const [nivel, contato, tarefas, perguntas, casal, lista, salao, fornecedores, curadorias, investimento, convite, chamarLista] =
    await Promise.all([
      getNivelNoPortal(evento.id),
      getContatoCerimonialista(evento.id),
      getTarefasDoPortal(evento.id),
      getPerguntas(evento.id, evento.data),
      getNomesDoCasal(evento.id, evento.nome),
      getConvidados(evento.id),
      getConvidadosV2(evento.id),
      getFornecedoresDoPortal(evento.id),
      getCuradoriasDoPortal(evento.id),
      getInvestimento(evento.id),
      // só lê o pedido esperando; o convite só existe na conta de família
      daFamilia ? estadoDoConvite(evento.id) : null,
      // o layout já perguntou (cache)
      chamarParaALista(evento.id),
    ]);

  // o nível (189): o padrinho não vê Convidados, Fornecedores nem a linha
  // Agenda + Perguntas (como no desenho); "só leitura" não escreve. Sem a
  // 189 (null), como o casal.
  const padrinho = nivel === "padrinho";
  const podeEscrever = nivel !== "leitura" && nivel !== "vitrine";
  const base = `/portal/${evento.id}`;
  const hoje = hojeBR();

  // ---- os atalhos: os mesmos números das telas Convidados e Fornecedores
  const atalhos: Atalho[] = [];
  if (!padrinho) {
    // a lista por pessoa (180) é a base; sem ela, a de sempre (como na tela)
    const v2 =
      salao.convidados.length || !lista.length
        ? salao.convidados
        : lista.map((c) => ({
            id: c.id,
            nome: c.nome,
            telefone: null,
            hash: c.hash,
            confirmacao: c.confirmacao,
            acompanhantes: c.acompanhantes,
            criancas: c.criancas,
            faixa: null,
            sexo: null,
            pessoas: [],
            restricoes: [],
            recado: null,
            mesaId: null,
            confirmadoEm: null,
            confirmadoVia: c.confirmadoVia,
          }));
    const conv = montarConvidados({
      eventoId: evento.id,
      agoraServidor: 0,
      hoje,
      dataEvento: evento.data,
      local: evento.local,
      rsvpAberto: evento.rsvp.aberto,
      lembreteDias: null,
      lista,
      v2,
      mesas: salao.mesas,
      recadosDoMural: {},
      datas: { saveTheDate: null, convites: null, prazo: null },
      musicas: { pedidos: [], sugeridas: 0, aprovadas: 0 },
      casal: null,
      fotoUrl: null,
      link: null,
    });
    const confirmacoes = atalhoDeConfirmacoes({
      anel: conv.anel,
      comMesa: conv.mesas.length > 0 ? conv.lista.filter((c) => c.status === "sim" && c.mesaId).length : null,
      href: `${base}/convidados`,
    });
    if (confirmacoes) atalhos.push(confirmacoes);

    const cartoes = montarCartoes({
      daCerimonialista: fornecedores.daCerimonialista,
      daFamilia: fornecedores.daFamilia,
      curadorias,
      parcelas: investimento?.parcelas ?? [],
      hoje,
    });
    const deFornecedores = atalhoDeFornecedores({ cartoes, href: `${base}/fornecedores` });
    if (deFornecedores) atalhos.push(deFornecedores);
  }

  // quem cuida do resto: o primeiro nome dela (na conta de família, ninguém)
  const cerimonialista = daFamilia
    ? null
    : contato.nome?.trim().split(/\s+/)[0] || evento.marca?.nome?.trim() || null;

  const pedido = convite?.pedido ?? null;
  const cartao = montarCartaoDaCerimonialista({
    daFamilia,
    pedidoDe: pedido ? pedido.empresa?.trim() || pedido.quem?.trim() || "Uma cerimonialista" : null,
    contatoNome: contato.nome,
    marcaNome: evento.marca?.nome ?? null,
    whatsapp: linkWhatsapp(contato.whatsapp),
    daCerimonialista: tarefas.daCerimonialista,
    base,
  });

  return (
    <>
      {chamarLista && <ChamadaDaLista href={`${base}/presentes`} />}
      <HojeUmaCoisa
        tarefas={montarTarefasDoDia({ tarefas: tarefas.tarefas, hoje, cerimonialista })}
        podeMarcar={podeEscrever}
        quemCuida={cerimonialista}
      />
      <Atalhos atalhos={atalhos} />
      <LinhaDoTempoSecao eventoId={evento.id} />
      <TrilhaSecao eventoId={evento.id} />
      <AgendaEPerguntas
        perguntas={podeEscrever && !padrinho ? montarPerguntas(perguntas.abertas) : []}
        exemploHashtag={exemploDeHashtag(casal, evento.data)}
      />
      <CartaoCerimonialista dados={cartao} />
    </>
  );
}
