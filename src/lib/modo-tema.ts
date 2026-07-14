import type { RoteiroStatus, TaskPriority } from "@/lib/types";

// Dados (escopados a UM evento) que o Modo Evento consome.
export type ModoItem = {
  id: string;
  time: string | null; // null = horário ainda não definido ("A definir")
  title: string;
  description: string | null;
  status: RoteiroStatus;
  supplierName: string | null;
};

export type ModoSupplier = { name: string; confirmed: boolean };

export type ModoTask = {
  id: string;
  title: string;
  priority: TaskPriority;
};

// Tema do Modo Evento (claro/escuro) — usado por todos os componentes.
export type ModoTheme = {
  bg: string;
  panel: string;
  text: string;
  sub: string;
  chip: string;
  border: string;
  divide: string;
};

export const MODO_DARK: ModoTheme = {
  bg: "bg-stone-950 text-stone-100",
  panel: "bg-stone-900 border-stone-800",
  text: "text-stone-100",
  sub: "text-stone-400",
  chip: "bg-stone-800",
  border: "border-stone-800",
  divide: "divide-stone-800",
};

export const MODO_LIGHT: ModoTheme = {
  bg: "bg-stone-50 text-stone-900",
  panel: "bg-white border-stone-200",
  text: "text-stone-900",
  sub: "text-stone-500",
  chip: "bg-stone-100",
  border: "border-stone-200",
  divide: "divide-stone-200",
};

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ms -> "HH:MM:SS"
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

// Data+hora de um item do roteiro (event date + item time).
// Retorna NaN quando o horário ainda não foi definido.
export function itemDateTime(eventDate: string, time: string | null): number {
  if (!time) return NaN;
  const ms = new Date(`${eventDate}T${time}`).getTime();
  return isNaN(ms) ? NaN : ms;
}
