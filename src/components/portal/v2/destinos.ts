// Os destinos do portal v2. A barra do celular mostra os quatro primeiros
// e "Mais"; a coluna do computador mostra todos.
//
// As telas que o desenho ainda vai trocar apontam para as de hoje
// (Dinheiro → investimento, até a fase 3). Tarefas
// da família e Fornecedores só entram quando existirem — a regra do
// desenho é nenhuma tela "Em breve".

import { rotuloPublico, tem } from "@/lib/capacidades";
import { rotuloCortejo } from "@/lib/papel";
import type { NomeDoIcone } from "./icones";

export type DestinoV2 = {
  id: NomeDoIcone;
  rotulo: string;
  /** o trecho depois de /portal/<evento>; "" = Início */
  seg: string;
  /** outros trechos que acendem o mesmo item */
  tambem?: string[];
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function destinosV2(tipo: string | null | undefined): DestinoV2[] {
  const lista: (DestinoV2 | null)[] = [
    { id: "inicio", rotulo: "Início", seg: "" },
    { id: "escolhas", rotulo: "Escolhas", seg: "escolhas", tambem: ["perguntas"] },
    { id: "dinheiro", rotulo: "Dinheiro", seg: "investimento", tambem: ["prestacao-de-contas"] },
    tem(tipo, "listaNominal")
      ? { id: "convidados", rotulo: capitalizar(rotuloPublico(tipo)), seg: "convidados" }
      : null,
    tem(tipo, "siteDoEvento") ? { id: "paleta", rotulo: "Paleta e estilo", seg: "guia-estilo" } : null,
    tem(tipo, "cortejo") ? { id: "corte", rotulo: rotuloCortejo(tipo), seg: "cortejo" } : null,
    { id: "noite", rotulo: "A noite", seg: "cronograma" },
  ];
  return lista.filter((d): d is DestinoV2 => d !== null);
}

/** O destino aceso para o caminho atual. */
export function destinoAtual(destinos: DestinoV2[], eventoId: string, pathname: string): string | null {
  const resto = pathname.replace(`/portal/${eventoId}`, "").split("/").filter(Boolean)[0] ?? "";
  const d = destinos.find((x) => x.seg === resto || (x.tambem ?? []).includes(resto));
  return d?.id ?? null;
}
