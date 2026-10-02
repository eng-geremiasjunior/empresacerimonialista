// A marcação e a lógica de cada convite, carregadas sob demanda: a página
// de um convite baixa só o dele.

import type { DefinicaoDoConvite } from "./motor/modelo";
import type { IdDoConvite } from "./catalogo";

export const CARREGAR: Record<IdDoConvite, () => Promise<{ default: DefinicaoDoConvite }>> = {
  c01: () => import("./modelos/c01/modelo"),
  c02: () => import("./modelos/c02/modelo"),
  c03: () => import("./modelos/c03/modelo"),
  c04: () => import("./modelos/c04/modelo"),
  c05: () => import("./modelos/c05/modelo"),
  c06: () => import("./modelos/c06/modelo"),
  c07: () => import("./modelos/c07/modelo"),
  c08: () => import("./modelos/c08/modelo"),
  c09: () => import("./modelos/c09/modelo"),
};
