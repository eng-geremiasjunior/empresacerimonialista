// Tema do Portal da Cliente. Pertence ao EVENTO, não ao login: a mesma
// pessoa pode ter um casamento hoje e outro tipo de evento depois.
//
// Carvão & Ouro Velho é o único tema aprovado (casamento). Ébano & Tabaco
// existe como mecanismo, para o futuro tema de debutante — que será
// decidido com telas de debutante na frente. Até lá, todo tipo de evento
// entrega Carvão: um tema não aprovado no ar é pior que um tema repetido.

import type { EventType } from "@/lib/types";

export type TemaPortal = "carvao" | "ebano";

export function temaDoEvento(tipo: EventType | string | null): TemaPortal {
  void tipo;
  return "carvao";
}
