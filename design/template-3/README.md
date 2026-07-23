# Template 3 — arte de referência

Solte aqui o modelo a ser seguido, como **`modelo.html`**.

Esta pasta fica fora de `public/`, então **não é servida nem entra no
build** — é material de referência, não asset da aplicação.

## Formato

Um `.html` único, com os estilos **inline** ou num `<style>` no topo.

- Se gerar no Claude, use **copiar o código** do artifact — não o
  "Standalone". O Standalone empacota o HTML dentro de um bundle JS, e aí
  a arte precisa ser extraída como string escapada.
- Nada de React compilado.

## Checklist do arquivo

- [ ] **Página inteira, todas as seções, na ordem** — inclusive
      Investimento, FAQ e rodapé. Na arte anterior o trecho disponível
      cobria só o topo, e as seções finais tiveram que ser improvisadas.
- [ ] **Paleta declarada em comentário no topo**, ex.:
      `/* fundo #FAF6EF · acento #4B5632 · dourado #B08D57 · texto #2B2B26 */`
      Sem isso a cor é inferida da imagem — e inferir já deu errado uma vez.
- [ ] **Fontes nomeadas** (ex.: Playfair Display + Poppins).
- [ ] **Placeholders no lugar das fotos** — `<div style="background:#ddd">foto
      do casal</div>` basta. Base64 de imagem grande só incha o arquivo.

Não precisa se preocupar com responsivo: a arte pode vir em largura fixa
que a adaptação para celular é feita na implementação.

## Avise junto com o arquivo

Se a arte tiver **seção que o sistema não alimenta hoje** (foi o caso de
"Depoimentos" no Template 2: não existe tabela nem tela de cadastro).
Diga se quer:

- só o visual com texto fixo, ou
- o cadastro de verdade — aí vira etapa própria, com migração.

## Como o tema é aplicado

Cores e fonte entram por CSS variables; as diferenças de **arranjo**
(hero dividido, seções em cartão, pílula do menu) são flags declaradas em
`src/lib/orcamento-temas.ts` e lidas por contexto. Nenhum componente é
duplicado por template.
