// Os ícones do portal, num lugar só (handoff: Lucide, stroke 1.4).
//
// O ícone de uma decisão vem do OBJETIVO dela (Fotografia → câmera,
// Espaço → prédio). O mapa casa por palavra do nome do objetivo, com
// um genérico de reserva — nunca deixa a linha sem ícone.

import {
  AlertCircle,
  Bell,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  Camera,
  ChevronRight,
  Church,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Flower2,
  Gem,
  Heart,
  Info,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Music,
  Palette,
  Quote,
  Shirt,
  Sparkles,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

export const TAMANHO = 18;
export const TAMANHO_PEQUENO = 15;
export const TAMANHO_GRANDE = 24;
export const TRACO = 1.4;

export {
  AlertCircle,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  Camera,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Info,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Palette,
  Quote,
  Users,
  Wallet,
};

/** Props padrão de todo ícone do portal. */
export const iconeProps = { size: TAMANHO, strokeWidth: TRACO } as const;

type Icone = typeof Camera;

// A ordem importa: a primeira palavra que casar vence.
const POR_ASSUNTO: [RegExp, Icone][] = [
  [/foto/i, Camera],
  [/v[ií]deo|cinema/i, Camera],
  [/espa[çc]o|local|recep[çc]/i, Building2],
  [/buffet|gastronom|comida|bebida|bar/i, Utensils],
  [/bolo|doce|confeit/i, Cake],
  [/m[úu]sic|som|dj|banda|coral/i, Music],
  [/decora|flor|bouquet/i, Flower2],
  [/cerim[ôo]nia|igreja|celebra|religi/i, Church],
  [/vestido|traje|beleza|noiva|roupa/i, Shirt],
  [/alian[çc]a|joia|an[ée]is/i, Gem],
  [/convidad|rsvp|lista/i, Users],
  [/papelaria|convite/i, FileText],
  [/financ|or[çc]amento|pagamento|verba/i, CircleDollarSign],
  [/lembran|brinde|presente/i, Sparkles],
  [/servi[çc]o|estrutura|infra|log[íi]stic/i, ClipboardList],
  [/data|prazo|cronograma|hor[áa]rio/i, CalendarDays],
];

/** O ícone de uma decisão, pelo nome do objetivo a que ela pertence. */
export function iconeDoAssunto(assunto: string | null | undefined): Icone {
  if (!assunto) return ClipboardList;
  for (const [regex, Ico] of POR_ASSUNTO) {
    if (regex.test(assunto)) return Ico;
  }
  return ClipboardList;
}
