// Os ícones do desenho v2: traço simples, viewBox 24.

export const ICONE = {
  inicio: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5.5v-6.5h-5V21H4a1 1 0 0 1-1-1z",
  escolhas: "M9 11.5l2.5 2.5L20 5.5M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  dinheiro: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01",
  convidados:
    "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3.5 3.5 0 0 1 0 6.8",
  mais: "M4 7h16M4 12h16M4 17h16",
  paleta:
    "M12 21a9 9 0 1 1 9-9c0 1.8-1.6 3-3.4 3H16a1.8 1.8 0 0 0-1.3 3.1A1.7 1.7 0 0 1 12 21zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01",
  corte: "M3 19h18M4 19 3 8l5 4 4-7 4 7 5-4-1 11",
  tarefas: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  fornecedores: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  noite: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  zap: "M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z",
} as const;

export type NomeDoIcone = keyof typeof ICONE;

export function Icone({
  nome,
  tamanho = 22,
  traco = 1.7,
}: {
  nome: NomeDoIcone;
  tamanho?: number;
  traco?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      aria-hidden
      style={{ strokeWidth: traco, strokeLinecap: "round", strokeLinejoin: "round", flex: "none" }}
    >
      <path d={ICONE[nome]} />
    </svg>
  );
}
