// As áreas do "O que você encontra aqui" (29/09/2026): as mesmas nas
// boas-vindas e no painel de quem já tem evento. A foto vem de
// FOTO_DA_AREA; quem não enxerga a área no menu (cargo) não vê o bloco.

import { FOTO_DA_AREA } from "@/lib/fotos-de-evento";
import { MENU_DO_APP } from "@/lib/menu-do-app";
import type { Cargo } from "@/lib/equipe-shared";

export type AreaDoSistema = { href: string; titulo: string; texto: string; foto: string; posicao: string };

const TEXTOS: { href: string; titulo: string; texto: string }[] = [
  { href: "/eventos", titulo: "Eventos", texto: "Casamentos, 15 anos, formaturas e outras festas, com tarefas, convidados, mesas e o dia do evento." },
  { href: "/clientes", titulo: "Clientes", texto: "Noivos, famílias, empresas e contatos, com o histórico de cada um." },
  { href: "/orcamentos", titulo: "Gestão comercial", texto: "Orçamentos e propostas até virarem contrato fechado." },
  { href: "/fornecedores", titulo: "Fornecedores", texto: "Sua lista de parceiros, pronta para vincular a cada evento." },
  { href: "/cerimonialistas", titulo: "Equipe", texto: "Quem trabalha com você e o que cada pessoa tem para fazer." },
  { href: "/financeiro", titulo: "Financeiro", texto: "Recebimentos dos clientes e pagamentos aos fornecedores." },
];

function podeVer(href: string, cargo: Cargo | null): boolean {
  const item = MENU_DO_APP.find((i) => i.href === href);
  return !item?.cargos || (cargo !== null && item.cargos.includes(cargo));
}

/** As seis áreas, na ordem do desenho, só as que o cargo enxerga. */
export function areasDoSistema(cargo: Cargo | null): AreaDoSistema[] {
  return TEXTOS.filter((a) => podeVer(a.href, cargo)).map((a) => ({
    ...a,
    foto: FOTO_DA_AREA[a.href].src,
    posicao: FOTO_DA_AREA[a.href].posicao,
  }));
}
