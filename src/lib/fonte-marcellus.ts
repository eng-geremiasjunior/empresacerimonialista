import localFont from "next/font/local";

// A Marcellus num módulo só dela: o portal dos noivos (títulos) e o par
// Riviera dos sites usam a mesma declaração, e o site não precisa puxar
// a Nunito Sans e os ícones de fontes-noivos, que são pré-carregados.

export const marcellus = localFont({
  src: "../fontes/noivos/Marcellus-latin.woff2",
  weight: "400",
  style: "normal",
  variable: "--pn-f-titulo",
  display: "swap",
});
