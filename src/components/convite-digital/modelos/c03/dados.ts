// Os padrões das props e o estilo global do Convite 03 (data-props e <helmet> do desenho),
// extraídos por ferramentas/convites/extrair.mjs.

export const PADROES = {
  "nome1": {
    "padrao": "Isabela",
    "opcoes": null,
    "secao": "Casal"
  },
  "nome2": {
    "padrao": "Henrique",
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
    "padrao": "Todo conto de fadas começa com um encontro. O nosso ganhou um para sempre.",
    "opcoes": null,
    "secao": "Casal"
  },
  "siteUrl": {
    "padrao": "#",
    "opcoes": null,
    "secao": "Casal"
  },
  "fonte": {
    "padrao": "04 Caligrafia",
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

export const ESTILO_GLOBAL = "body{margin:0;-webkit-font-smoothing:antialiased;background:#2e1b2e;overflow:hidden}\na{color:inherit;text-decoration:none}\na:hover{opacity:.88}";
