// Os padrões das props e o estilo global do Convite 07 (data-props e <helmet> do desenho),
// extraídos por ferramentas/convites/extrair.mjs.

export const PADROES = {
  "nome1": {
    "padrao": "Giulia",
    "opcoes": null,
    "secao": "Casal"
  },
  "nome2": {
    "padrao": "Lorenzo",
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
    "padrao": "2027-06-12T17:00:00",
    "opcoes": null,
    "secao": "Casal"
  },
  "frase": {
    "padrao": "Como a luz sobre os canais, o amor encontrou o seu caminho até nós.",
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

export const ESTILO_GLOBAL = "body{margin:0;-webkit-font-smoothing:antialiased;background:#1a0c10;overflow:hidden}\na{color:inherit;text-decoration:none}\na:hover{opacity:.88}";
