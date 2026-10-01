// A trilha de vocês (Músicas) — o cartão escuro do desenho v4 (README §8),
// na tela Músicas e na Visão geral. Componente de SERVIDOR: lê a trilha
// (180), a hora de cada momento no roteiro dela e as iniciais do casal
// para o selo do disco, e entrega só dados simples ao cartão (cliente).

import { getEventoDoPortal } from "@/lib/supabase/portal";
import { getProgramaDoDia } from "@/lib/supabase/programa-do-dia";
import { getTrilha } from "@/lib/supabase/portal-trilha";
import { getNomesDoCasal } from "@/lib/supabase/portal-noivos";
import { iniciaisDoCasal } from "@/lib/portal-noivos";
import type { MusicaEscolhida } from "@/lib/trilha";
import { MOMENTOS_DO_CASAMENTO, horaNoRoteiro } from "./momentos";
import { CartaoTrilha, type MomentoDaTrilha } from "./CartaoTrilha";

export async function TrilhaSecao({ eventoId }: { eventoId: string }) {
  const evento = await getEventoDoPortal(eventoId);
  if (!evento) return null;

  const [escolhas, programa, casal] = await Promise.all([
    getTrilha(evento.id),
    getProgramaDoDia(evento.id),
    getNomesDoCasal(evento.id, evento.nome),
  ]);

  const momentos: MomentoDaTrilha[] = MOMENTOS_DO_CASAMENTO.map((m) => ({
    id: m.id,
    nome: m.nome,
    hora: horaNoRoteiro(m, programa),
    cena: m.cena ?? null,
    sugestoes: m.sugestoes,
  }));

  // só o que a tela mostra (quem escolheu e quando ficam no servidor)
  const musicas: Record<string, MusicaEscolhida> = {};
  for (const m of momentos) {
    const e = escolhas[m.id];
    if (e) {
      musicas[m.id] = {
        titulo: e.titulo,
        artista: e.artista,
        capa: e.capa,
        preview: e.preview,
        duracao: e.duracao,
        link: e.link,
      };
    }
  }

  const ini = iniciaisDoCasal(casal);
  return (
    <CartaoTrilha
      eventoId={evento.id}
      selo={ini.b ? `${ini.a}&${ini.b}` : ini.a}
      momentos={momentos}
      escolhas={musicas}
    />
  );
}
