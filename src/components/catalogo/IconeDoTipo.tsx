import {
  Baby,
  Bird,
  Building2,
  Cake,
  Crown,
  Flower2,
  GraduationCap,
  Heart,
  Mic2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { EventType } from "@/lib/types";

// O ícone de cada tipo de evento. Eram emojis (💍 👑 🎓…) — e o dono
// cortou emoji da interface inteira: "isso tira a credibilidade". Emoji
// também muda de desenho em cada aparelho e ignora a cor da tela; ícone
// desenhado segue o traço do resto do sistema.
const ICONES: Record<EventType, LucideIcon> = {
  casamento: Heart,
  debutante: Crown,
  formatura: GraduationCap,
  aniversario: Cake,
  bodas: Flower2,
  cha_revelacao: Baby,
  batizado: Bird,
  corporativo: Building2,
  show: Mic2,
  outro: Sparkles,
};

export function IconeDoTipo({
  tipo,
  tamanho = 18,
  className,
}: {
  tipo: EventType;
  tamanho?: number;
  className?: string;
}) {
  const Icone = ICONES[tipo] ?? Sparkles;
  return <Icone size={tamanho} strokeWidth={1.75} className={className} aria-hidden />;
}
