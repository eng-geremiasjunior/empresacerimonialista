// Os padrões das props e o estilo global do Convite 05 (data-props e <helmet> do desenho),
// extraídos por ferramentas/convites/extrair.mjs.

export const PADROES = {
  "nome1": {
    "padrao": "Helena",
    "opcoes": null,
    "secao": "Casal"
  },
  "nome2": {
    "padrao": "Miguel",
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
    "padrao": "2027-04-17T16:00:00",
    "opcoes": null,
    "secao": "Casal"
  },
  "frase": {
    "padrao": "Há histórias que já nascem escritas. A nossa estava só esperando por este capítulo.",
    "opcoes": null,
    "secao": "Casal"
  },
  "siteUrl": {
    "padrao": "#",
    "opcoes": null,
    "secao": "Casal"
  },
  "fonte": {
    "padrao": "08 Relicário",
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

export const ESTILO_GLOBAL = "body{margin:0;-webkit-font-smoothing:antialiased;background:#1a130e;overflow:hidden}\na{color:inherit;text-decoration:none}\na:hover{opacity:.88}";
