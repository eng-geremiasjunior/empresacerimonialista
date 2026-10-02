// Os padrões das props e o estilo global do Convite 02 (data-props e <helmet> do desenho),
// extraídos por ferramentas/convites/extrair.mjs.

export const PADROES = {
  "nome1": {
    "padrao": "Marina",
    "opcoes": null,
    "secao": "Casal"
  },
  "nome2": {
    "padrao": "Theo",
    "opcoes": null,
    "secao": "Casal"
  },
  "modoNome": {
    "padrao": "Nomes",
    "opcoes": [
      "Nomes",
      "Iniciais",
      "Iniciais + nomes"
    ],
    "secao": "Casal"
  },
  "dataISO": {
    "padrao": "2026-10-31T16:30:00",
    "opcoes": null,
    "secao": "Casal"
  },
  "frase": {
    "padrao": "Que o nosso amor seja como o mar: imenso, sereno e sempre de volta.",
    "opcoes": null,
    "secao": "Casal"
  },
  "siteUrl": {
    "padrao": "#",
    "opcoes": null,
    "secao": "Casal"
  },
  "fonte": {
    "padrao": "06 Bilhete",
    "opcoes": [
      "01 Essencial",
      "02 Maison",
      "03 Atelier",
      "04 Caligrafia",
      "05 Riviera",
      "06 Bilhete",
      "07 Soirée",
      "08 Relicário"
    ],
    "secao": "Estilo"
  }
} as const;

export const ESTILO_GLOBAL = "body{margin:0;-webkit-font-smoothing:antialiased;background:#f3ebdf;overflow:hidden}\na{color:inherit;text-decoration:none}\na:hover{opacity:.88}";
