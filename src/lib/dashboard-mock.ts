// Tipos compartilhados dos cartões do Dashboard.
// Os dados são todos reais (ver src/lib/supabase/queries.ts) — nada de mock.

export type Kpi = {
  title: string;
  value: string;
  sub: string;
  tone: "up" | "down" | "neutral";
};

export type DonutSlice = {
  name: string;
  value: number;
  color: string;
};
