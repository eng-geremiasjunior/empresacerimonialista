// Os padrões das props e o estilo global do Convite 01 (data-props e <helmet> do desenho),
// extraídos por ferramentas/convites/extrair.mjs.

export const PADROES = {
  "nome1": {
    "padrao": "Clara",
    "opcoes": null,
    "secao": "Casal"
  },
  "nome2": {
    "padrao": "Vicente",
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
  },
  "formaAbertura": {
    "padrao": "Violino",
    "opcoes": [
      "Violino",
      "Nota musical"
    ],
    "secao": "Estilo"
  }
} as const;

export const ESTILO_GLOBAL = "body{margin:0;-webkit-font-smoothing:antialiased;background:#141b2c;overflow:hidden}\na{color:inherit;text-decoration:none}\na:hover{opacity:.85}\nbutton{font:inherit;color:inherit}";
