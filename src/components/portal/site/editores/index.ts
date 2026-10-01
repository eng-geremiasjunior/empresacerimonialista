// Os editores de bloco do "Nosso site": um por tipo, todos com as mesmas
// props (PropsDoEditor). O NossoSite abre o editor do tipo; o tipo sem
// editor aqui (mensagem, texto livre, álbum, música, mural...) continua
// com o editor de antes.

import type { ComponentType } from "react";
import type { TipoBloco } from "@/lib/site-blocos";
import { EditorCapa } from "./EditorCapa";
import { EditorCenas } from "./EditorCenas";
import { EditorGaleria } from "./EditorGaleria";
import { EditorHistoria } from "./EditorHistoria";
import { EditorJeito } from "./EditorJeito";
import { EditorLocal } from "./EditorLocal";
import { EditorMomentos } from "./EditorMomentos";
import { EditorPadrinhos } from "./EditorPadrinhos";
import { EditorPresentes } from "./EditorPresentes";
import { EditorRsvp } from "./EditorRsvp";
import { EditorTraje } from "./EditorTraje";
import type { PropsDoEditor } from "./tipos";

export type { ExtraDoEditor, PropsDoEditor } from "./tipos";
export type { PedirEnvio, ResultadoDoPedidoDeEnvio } from "./CampoFoto";
export { CabemFotos, CampoFoto, useFotosEnviadas, espacoDoModelo } from "./CampoFoto";

export const EDITORES: Partial<Record<TipoBloco, ComponentType<PropsDoEditor>>> = {
  capa: EditorCapa,
  historia: EditorHistoria,
  momentos: EditorMomentos,
  cenas: EditorCenas,
  local: EditorLocal,
  dress_code: EditorTraje,
  rsvp: EditorRsvp,
  presentes: EditorPresentes,
  galeria: EditorGaleria,
  especiais: EditorPadrinhos,
  jeito: EditorJeito,
};
