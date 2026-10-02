// A cor do fundo de cada convite (o body do <helmet> do desenho), já com a
// paleta escolhida: a página pública põe no HTML antes de o convite montar
// (sem clarão branco) e na cor da barra do navegador do celular.

import { CONVITES, paletaDoConvite, type IdDoConvite } from "./catalogo";
import { criarAjuste } from "./motor/ajuste";
import { mapaDaPaleta } from "./motor/modelo";
import { ESTILO_GLOBAL as E01 } from "./modelos/c01/dados";
import { ESTILO_GLOBAL as E02 } from "./modelos/c02/dados";
import { ESTILO_GLOBAL as E03 } from "./modelos/c03/dados";
import { ESTILO_GLOBAL as E04 } from "./modelos/c04/dados";
import { ESTILO_GLOBAL as E05 } from "./modelos/c05/dados";
import { ESTILO_GLOBAL as E06 } from "./modelos/c06/dados";
import { ESTILO_GLOBAL as E07 } from "./modelos/c07/dados";
import { ESTILO_GLOBAL as E08 } from "./modelos/c08/dados";
import { ESTILO_GLOBAL as E09 } from "./modelos/c09/dados";

const ESTILOS: Record<IdDoConvite, string> = {
  c01: E01,
  c02: E02,
  c03: E03,
  c04: E04,
  c05: E05,
  c06: E06,
  c07: E07,
  c08: E08,
  c09: E09,
};

export function corDeFundo(modelo: IdDoConvite, paleta: string | null | undefined): string {
  const m = /body\{[^}]*background:([^;}]+)/.exec(ESTILOS[modelo]);
  const cor = m ? m[1].trim() : "#000000";
  return criarAjuste(mapaDaPaleta(CONVITES[modelo].original, paletaDoConvite(modelo, paleta)), null)(cor);
}
