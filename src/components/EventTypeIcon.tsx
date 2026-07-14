import {
  Heart,
  Crown,
  GraduationCap,
  Cake,
  Briefcase,
  Gift,
  Droplet,
  Wine,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";
import type { EventType } from "@/lib/types";

const ICONS: Record<EventType, LucideIcon> = {
  casamento: Heart,
  debutante: Crown,
  formatura: GraduationCap,
  aniversario: Cake,
  corporativo: Briefcase,
  cha_revelacao: Gift,
  batizado: Droplet,
  bodas: Wine,
  outro: CalendarPlus,
};

// Ícone monocromático (currentColor) por tipo de evento.
export function EventTypeIcon({
  type,
  className,
  size = 20,
}: {
  type: EventType;
  className?: string;
  size?: number;
}) {
  const Icon = ICONS[type] ?? CalendarPlus;
  return <Icon size={size} strokeWidth={1.75} className={className} />;
}
