// Os padrões das props e o estilo global do Convite 09 (data-props e <helmet> do desenho),
// extraídos por ferramentas/convites/extrair.mjs.

export const PADROES = {
  "nome1": {
    "padrao": "Valentina",
    "opcoes": null,
    "secao": "Casal"
  },
  "nome2": {
    "padrao": "Arthur",
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
  "pais1": {
    "padrao": "Roberto e Helena Albuquerque",
    "opcoes": null,
    "secao": "Casal"
  },
  "pais2": {
    "padrao": "Fernando e Lúcia Monteiro",
    "opcoes": null,
    "secao": "Casal"
  },
  "dataISO": {
    "padrao": "2027-06-12T17:00:00",
    "opcoes": null,
    "secao": "Casal"
  },
  "frase": {
    "padrao": "O amor é paciente, o amor é bondoso. Tudo sofre, tudo crê, tudo espera, tudo suporta.",
    "opcoes": null,
    "secao": "Casal"
  },
  "referencia": {
    "padrao": "1 Coríntios 13",
    "opcoes": null,
    "secao": "Casal"
  },
  "siteUrl": {
    "padrao": "#",
    "opcoes": null,
    "secao": "Casal"
  },
  "fonte": {
    "padrao": "02 Maison",
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

export const ESTILO_GLOBAL = "body{margin:0;-webkit-font-smoothing:antialiased;background:#0d0c0b;overflow:hidden}\na{color:inherit;text-decoration:none}\na:hover{opacity:.88}";
