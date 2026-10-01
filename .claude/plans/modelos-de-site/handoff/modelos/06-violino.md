# Template 06: Experiência com violino
Arquivo: `prototipos/Template 06.dc.html`. Fonte padrão: **04 Caligrafia**. Nomes: Clara & Vicente.
**É o Template 05 como base** (paleta, envelope, programa, château, galeria, boutique, RSVP e rodapé idênticos; veja `05-franca.md`), com estas mudanças:
- A capa usa **foto do casal** (sem vídeo).
- Há uma **experiência sonora** com violino.
- A história é uma **trilha horizontal de cartões-postais ligados por uma linha** com um **arco de violino**.
- **Cordas de violino** na lateral do site.
- **Notas musicais** na confirmação de presença.

## Áudio
Arquivo: `uploads/iamnop-beautiful-and-emotional-solo-violin-ep15mp3-356054.mp3`, configurável pelo casal (prop `audio`).
- Na capa, abaixo do local, fica o botão pílula **"Clique aqui"** (11px, MAIÚSC., goldLight) com a frase **"e sinta a experiência do nosso grande dia"** (headFont itálico), um círculo de play goldLight de 40px e borda rgba(220,195,147,.8).
  - Fundo rgba(20,27,44,.55) (.8 no hover, com translateY -2px) e um anel fixo externo `inset:-6px` rgba(220,195,147,.35).
  - **Não usar** anel pulsando infinito: isso travou a página.
- Depois do clique, o botão vira "Role para baixo e ouça", com uma linha que desce em loop.
- Os navegadores só permitem áudio depois de uma interação, por isso o clique é obrigatório. O clique faz `play()` em volume 0 para desbloquear.
- **Toca enquanto a pessoa rola para baixo**:
  - A cada scroll descendente (`scrollY > lastY + 1`): fade-in até o volume 1 em 700ms e reinício de um timer ocioso de 1300ms.
  - Quando o timer expira: fade-out em 1400ms e depois `pause()`.
  - Rolar para cima não dispara o som.
  - O fade é feito com setInterval de 30ms, interpolando `audio.volume`.
- No iOS, `audio.volume` é somente leitura, então o som liga e desliga sem fade. Para ter fade no iOS, considere a Web Audio API com GainNode.
- **Botão de som flutuante**: canto inferior esquerdo; aparece quando a experiência está ativa e a pessoa passou de 90% do hero.
  - Pílula paper com borda gold e um círculo ink de 38px com o **furo em "f" do violino** em SVG (curva em S, dois círculos nas pontas e dois entalhes).
  - O "f" pulsa com `scale(1 + vol×.12×(1+sin(t/220)))`.
  - Rótulo "Som ligado" / "Som desligado"; o clique alterna o mudo.

## Cordas do violino (site todo)
- SVG `position:fixed`, à esquerda (`left: clamp(6px,1.6vw,24px)`), com 100vh de altura e `width: clamp(16px,2vw,28px)`, z-index 45, opacidade .75 e `pointer-events:none`.
- 4 cordas verticais (x 14/38/62/86 no viewBox 100×1000), cor gold, espessuras 1.3/1.05/.85/.7px (`vector-effect:non-scaling-stroke`).
- **Vibração**: cada corda é `M x 0 Q (x + amp·sin(t/(38+9i) + 1.7i)) 500 x 1000`.
  - `amp = min(14, vol×5 + kick×12)`.
  - `kick` recebe +.12 a cada scroll para baixo e vale 1 no clique da experiência; decai ×.965 por frame.
  - O loop de requestAnimationFrame **para sozinho** quando amp < .02 e vol < .01, e volta a ser acionado por scroll ou áudio.

## Nossa história: trilha horizontal com linha conectiva e arco
- A seção fica sticky com 100vh, e sua altura é `run + vh`, com `run = (scrollWidth − innerWidth) × .55`. O efeito é curto: a rolagem vertical se converte em deslocamento lateral mais rápido.
- A trilha faz `translateX(−p × dist)` e mostra **8 cartões de exemplo**; aceita de 8 a 10 fotos enviadas pela noiva.
  - Largura dos cartões: `clamp(230px,23vw,290px)`. Gap: `clamp(28px,3vw,44px)`. Rotações alternadas entre -2.5 e 2.4deg.
- **Linha (estilo varal)**:
  - Um path SVG passa pelo topo central de cada cartão, com curvas que caem entre eles (`sag = min(46, |dx|×.16)`).
  - Por baixo: trilho tracejado `2 7` em lineStrong. Por cima: linha gold de 1.8px revelada por `stroke-dashoffset`.
  - O comprimento revelado vai até o ponto do path em x = 62% da viewport, encontrado por busca binária com `getPointAtLength`; no fim, fica 100%.
- **Alfinetes**: círculo de 11px (fundo alt, borda lineStrong) com miolo gold de 5px que aparece com mola quando a linha passa.
- **Arco de violino na ponta da linha**: vara #6b4a2b (2.4px, levemente curva, 118px), crina #f3ead6 (1.2px), talão #3b2a1c com olho goldLight e ponta.
  - Ele segue a ponta da linha, rotacionado pela tangente do path (`ang − 8°`), com oscilação `sin(t/90)×6°×vol` quando o som toca.
  - Na ponta há um ponto de luz (r 6 rgba(220,195,147,.35) + r 3 #fff6de).
  - Sem `filter: drop-shadow`, por performance.
- **Virar cartão**: o container faz `perspective(1400px) rotateY(0↔180deg)` em 1.1s. Frente e verso trocam de opacidade instantaneamente aos .5s (`transition: opacity 0s linear .5s`), e o verso tem `scaleX(-1)`. Isso substitui `preserve-3d` e `backface-visibility`, que pesavam.
- Cartões de exemplo:
  - 2019 São Paulo "O primeiro encontro" · 2020 Campos do Jordão "O primeiro inverno" · 2021 Paris "A primeira viagem" · 2022 Florianópolis "Pé na areia"
  - 2023 Lisboa "Nossa casa" · 2024 Provence "Campos de lavanda" · 2025 Loire "O pedido" · 2026 São Paulo "O nosso sim"

## RSVP: notas musicais
- Ao confirmar "sim", 26 notas (♪ ♫ ♩ ♬) sobem pelo cartão, além do carimbo de selo de cera do T05.
- Tamanhos de 18 a 36px, cores #b08d57/#dcc393, `text-shadow 0 0 10px rgba(220,195,147,.6)`.
- Cada nota sobe até -560px com deriva lateral de ±70px e rotação de ±25°, em 4.2–6.8s, com delay de 0.3–2.1s e `cubic-bezier(.3,.1,.4,1)`.
