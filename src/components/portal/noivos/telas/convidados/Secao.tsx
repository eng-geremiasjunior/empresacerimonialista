// Convidados (RSVP) do portal dos noivos — desenho v4, README §10.
// Componente de SERVIDOR: lê a lista (portal-pessoas: o lado e a
// restrição escrita; portal-salao: a resposta por pessoa, o recado, a
// mesa e o salão), as datas de envio do convite, os pedidos de música e
// os recados do mural — tudo pela sessão da família (a RLS decide) — e
// entrega à tela só dados simples, sem telefone nem e-mail de convidado.

import { publicBase } from "@/lib/app-url";
import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getConvidados } from "@/lib/supabase/portal-pessoas";
import { getConvidadosV2 } from "@/lib/supabase/portal-salao";
import { getFotoDoCasal, getNomesDoCasal } from "@/lib/supabase/portal-noivos";
import { hojeBR } from "@/lib/tempo";
import { getDatasDoConvite, getPedidosDeMusica, getRecadosDoMural } from "./dados";
import { montarConvidados } from "./montar";
import { TelaConvidados } from "./TelaConvidados";

export async function ConvidadosSecao({ eventoId }: { eventoId: string }) {
  const evento = await getEventoDoPortal(eventoId);
  if (!evento) return null;

  const [lista, salao, datas, musicas, recadosDoMural, casal, fotoUrl] = await Promise.all([
    getConvidados(evento.id),
    getConvidadosV2(evento.id),
    getDatasDoConvite(evento.id),
    getPedidosDeMusica(evento.id),
    getRecadosDoMural(evento.id),
    getNomesDoCasal(evento.id, evento.nome),
    getFotoDoCasal(evento.id),
  ]);

  // a lista por pessoa (180) é a base; se ela não vier e a de sempre vier,
  // a tela não pode dizer "a lista começa aqui" para quem já tem convidados
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

  const dados = montarConvidados({
    eventoId: evento.id,
    agoraServidor: Date.now(),
    hoje: hojeBR(),
    dataEvento: evento.data,
    local: evento.local,
    rsvpAberto: evento.rsvp.aberto,
    lembreteDias: evento.rsvp.lembreteDias,
    lista,
    v2,
    mesas: salao.mesas,
    recadosDoMural,
    datas,
    musicas,
    casal,
    fotoUrl,
    link: evento.rsvp.hash ? `${publicBase()}/confirmar/evento/${evento.rsvp.hash}` : null,
  });

  return <TelaConvidados dados={dados} />;
}
