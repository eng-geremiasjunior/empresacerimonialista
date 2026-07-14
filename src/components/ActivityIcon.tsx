import {
  CalendarDays,
  Banknote,
  FileText,
  User,
  Handshake,
  ListChecks,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { ActivityCategory } from "@/lib/activity";

const ICONS: Record<ActivityCategory, LucideIcon> = {
  eventos: CalendarDays,
  financeiro: Banknote,
  orcamentos: FileText,
  clientes: User,
  fornecedores: Handshake,
  checklist: ListChecks,
  sistema: Settings,
};

export function ActivityIcon({
  category,
  size = 16,
  className,
}: {
  category: ActivityCategory;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Settings;
  return <Icon size={size} strokeWidth={1.75} className={className} />;
}
