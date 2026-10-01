# Template 03: Cartões arredondados + dock de ícones
Arquivo: `prototipos/Template 03.dc.html`. Fonte padrão: **03 Atelier**. Nomes: Marina & Téo.

## Paleta
bg #f1ece4 · card #fbf9f5 · soft #f3eee6 · sage #e4ebe3 · ink #1d2a24 (verde escuro) · muted #5f6862 · accent #e8a987 (pêssego) · accentText #a95f3b · line #e7e0d5 · lineStrong #c9bfb1
Hero, intro e cards de foto: fundo #1a1f1b; texto sobre foto #f7f1e8; gradientes `rgba(15,18,15,…)`.

## Linguagem visual
- Container de largura máxima 1240px, padding `clamp(12px,2vw,24px) clamp(12px,2.4vw,32px)` e gap entre blocos `clamp(16px,2vw,28px)`.
- Blocos são **cards de raio 28–32px** em `card` sobre o fundo `bg`. Itens internos usam raio 16–24px sobre `soft`.
- Botões em ink, raio 18px (ou pílula), peso 600. Ícones são SVG de linha (stroke 1.6–1.8, 24×24) em círculos de 50px.

## Wireframe
```
[ABERTURA] foto full-screen + iniciais enormes (& em pêssego) + "{n1} e {n2} · 31 de outubro de 2026" + "Toque na foto para entrar" (linha 56px)
[HEADER]   nomes (wordmark) | pílula de data (oculta <640px) | botão "Confirmar presença"
[HERO]     card raio 32px, min-height clamp(520px,78vh,760px); foto; nomes grandes à esquerda; à direita, contagem em 4 caixas
           (64–84px, raio 18px; dias/horas/min com fundo rgba(20,26,22,.55) + borda clara; SEG em pêssego)
[DOCK]     sticky top 12px, sobreposto ao hero (margin-top negativo ≈ 84–100px), card branco raio 28px, rolagem horizontal no mobile:
           Início · Nossa história · O grande dia · Local · Músicas · Presentes · Galeria · Padrinhos · Confirmar
           ícone da seção ativa = fundo ink + ícone claro + scale 1.06 (mola)
[UM PEDIDO NOSSO]  eyebrow com ponto pêssego; ícone 64px em sage; "Confirme sua presença"; "Pedimos a resposta até 15 de outubro";
           dica em soft; à direita: "Confirmar agora" (ink) + "Ver o convite" (contorno)
[3 STAT CARDS]  Cerimônia 16h30 · Traje Social · Cota da lua de mel R$ 7.450 com barra (62% da meta de R$ 12.000)
[NOSSA HISTÓRIA]  "O caminho até o altar"; legenda (o que já vivemos / o que vem pela frente);
           ONDA SVG (viewBox 1000×300) com 5 marcos (2019, 2020, 2021, 2024, 2026); abaixo, o capítulo selecionado
           (texto + foto 16/10)
[O GRANDE DIA | LOCAL]  2 cards: agenda (3 linhas em soft) + "Adicionar à minha agenda" | foto do local com "Como chegar" (pílula clara)
[MÚSICAS] card ink: disco de vinil 300px com selo pêssego e iniciais | lista de 6 momentos (hora, momento, música · artista);
           item ativo = fundo card; "Ouvir o trecho" faz o disco girar e o equalizador animar; "Peça a sua música para a pista" (input + "Pedir")
[PRESENTES]  card com título + card de COTA da lua de mel (R$ 250 a cota, barra de progresso);
           grid de 6 presentes (foto 4/3 raio 20px, título, desc, VALOR)
[GALERIA]  grid 4 col, linhas clamp(120px,15vw,210px), spans variados, raio 28px
[DRESS CODE]  card horizontal com ícone
[PADRINHOS]  pílulas com foto circular 64px + nomes
[RSVP]     2 col: título | formulário (inputs raio 18px em soft)
[RODAPÉ]   card escuro raio 32px com foto a 45% de opacidade, frase, nomes, hashtag
[SHEET DE PRESENTE]  barra fixa embaixo (max 560px, raio 24px, ink): "Seu presente" + título + "Presentear R$ X" + ×
```

## Efeitos
- **Abertura**: as iniciais entram com blur 14px e scale .94, em 2200ms com delay 300ms; as linhas seguintes com delays de 1000 e 1700ms. Ao tocar, a foto faz scale 1.12 e a abertura vai para opacity 0 em 1.2s; o hero começa em 500ms e a abertura sai em 1300ms.
- **Hero**: a foto faz `scale 1.14→1` com `brightness .7→1` em 3200ms, e os itens entram com blur 10px e delay de 500 + i×260ms.
- **Dock**: a seção ativa é a última `[data-sec]` cujo topo está abaixo de 40% da viewport.
- **Onda da história**: um path Bezier liga os pontos; por baixo há uma linha tracejada `3 8` em lineStrong, e por cima a linha pêssego de 3px revelada por `clip-path inset(-20px {100−x}% -20px -20px)` com transição de 1.1s.
  - Marco ativo: 60px, ink, halo `0 0 0 8px rgba(232,169,135,.28)`. Marcos passados: #f6dccb. Futuros: card com borda.
  - Os rótulos ficam acima ou abaixo, conforme y < 50%.
  - O capítulo entra com fade, blur e translateY(14px) em 800ms.
- **Vinil**: rotação de 5.2s em loop (só enquanto toca), sulcos com `repeating-radial-gradient`, reflexo `conic-gradient` e 5 barras de equalizador.
- **Galeria (reveal img)**: `opacity 0, scale 1.18, blur 8px → 1`, 1800ms; hover com scale 1.06.
- **Cards**: reveal com `translateY(34px) scale(.985)`. Stat cards no hover: translateY -4px e sombra.
- **Presentes**: o item selecionado ganha borda ink, sobe -8px, sombra, check com mola e opacidade .55 nos demais. O sheet sobe com `translate(-50%,140%)→0` em .7s. Ao presentear, mostra "Obrigado pelo carinho!" e, na cota, soma R$ 250 ao arrecadado.
- **RSVP sim**: 34 pétalas em tons de outono (#e3a47f, #c9774f, #d9b36a, #b5562f, #e8c7a8).
- Valores dos presentes: Jogo de panelas R$ 390 · Jantar romântico R$ 480 · Máquina de café R$ 650 · Passeio de barco R$ 820 · Enxoval de cama R$ 540 · Aula de dança R$ 280. Cota R$ 250.
- Músicas de exemplo: 16:00 Entrada dos padrinhos (Can't Help Falling in Love – Elvis Presley) · 16:10 Entrada do noivo (Hallelujah – Leonard Cohen) · 16:15 Entrada da noiva (A Thousand Years – Christina Perri) · 16:35 Alianças (Perfect – Ed Sheeran) · 16:50 Saída dos noivos (Marry You – Bruno Mars) · 20:00 Primeira dança (Velha Infância – Tribalistas).
  - "Ouvir o trecho" ainda não toca áudio; ligar a prévias reais se houver.
