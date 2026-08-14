// Assuntos e tipos do mural — parte PURA, sem next/headers.
//
// Componentes "use client" importam daqui. A leitura (que assina as URLs
// do bucket privado) mora em supabase/guia-estilo.ts, só servidor.

export const ASSUNTOS = [
  "geral",
  "decoracao",
  "flores",
  "vestido",
  "bolo",
  "papelaria",
] as const;

export type Assunto = (typeof ASSUNTOS)[number];

export const ASSUNTO_ROTULO: Record<string, string> = {
  geral: "Geral",
  decoracao: "Decoração",
  flores: "Flores",
  vestido: "Vestido e traje",
  bolo: "Bolo e doces",
  papelaria: "Papelaria",
};

export type Inspiracao = {
  id: string;
  assunto: string;
  legenda: string | null;
  storagePath: string;
  /** URL assinada de 10 minutos; null se a assinatura falhou */
  url: string | null;
  origem: "cliente" | "equipe";
};
