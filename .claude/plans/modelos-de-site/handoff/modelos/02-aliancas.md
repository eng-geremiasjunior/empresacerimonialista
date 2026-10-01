# Template 02: Alianças de ouro (afetuoso)
Arquivo: `prototipos/Template 02.dc.html`. Fonte padrão: **04 Caligrafia**. Nomes: Marina & João.

## Paleta
bg #f8f1e7 · alt #f1e6d6 · paper #fffcf6 · ink #3a2a20 · muted #6e5a4a · accent #9a6b3c · line #e6d8c4 · lineStrong #bfa88c · dark #2a1d16 · darkInk #f5eadb · darkLine rgba(245,234,219,.3) · gold #e3c178
**O ouro das alianças é fixo** (representa o metal), independente da paleta: gradiente `#7a5620 → #d6b062 → #fff2c9 → #e3c178 → #9b7430 → #6d4b1a`, girando lentamente (`gradientTransform rotate(t/28)`).

## Componente "Alianças" (SVG, peça-chave)
- Duas alianças, cada uma com `r=52` e `stroke-width 10` em gradiente ouro, mais filetes de borda `r57/r47` (rgba(70,45,10,.35), .8px) e um brilho `r54.5` (rgba(255,248,225,.6)).
- Entrelaçamento: a metade superior direita da aliança A é redesenhada por cima da B, recortada por `clipPath rect(0,-72,72,70)`.
- Parâmetro `sep` (0 = encaixadas, 1 = separadas): `offset = 29 + sep×95`. As alianças são **sempre redondas** (não usar scaleX, que deixava a aliança oval; foi um bug corrigido).
- Interpolação suave (`lerp` .035–.12 por frame). Quando estão encaixadas, aparece um glow radial (`#ffdf9a`) pulsando e 4 brilhos em estrela (sparkles).
- Versão compacta (viewBox `-92 -62 184 124`) para usar inline: entre os nomes no lugar do "&", no cartão do convite, no rodapé e nos presentes.

## Wireframe
```
[ABERTURA] fundo dark       "O casamento de" · nomes · alianças SEPARADAS (560px) · "Toque nas alianças"
[BOTÃO FLUTUANTE]           canto inf. direito, após 80% do hero: pílula "Confirmar presença" + círculo 54px com
                            iniciais e anel dourado de progresso do scroll
[HERO 100svh]               pó dourado flutuando; eyebrow; foto em ARCO (border-radius 999px 999px 0 0, 3/4,
                            altura min(48vh,100vw)) com contorno em arco deslocado -12px; nomes com alianças no lugar do &;
                            data; local; "Role devagar" + linha que pulsa
[ALIANÇAS] fundo dark, 320vh sticky   alianças se aproximam com o scroll; 3 frases trocam:
                            "Duas histórias," → "um encontro," → "um sim." + data
[NOSSA HISTÓRIA] scroll horizontal sticky   texto de abertura + 4 polaroids (rotações -3/2.5/-1.5/3deg, dy -10/24/-20/12px)
                            + "E o resto, a gente escreve juntos."
[O GRANDE DIA] fundo alt    cartão de convite em papel (max 620px), moldura interna dourada, tilt 3D no mouse + reflexo
[CONTAGEM]                  anel dourado SVG (500px) que se completa conforme o dia chega; dias grandes + h/min/seg
[LOCALIZAÇÃO] fundo alt     foto CIRCULAR com parallax | texto + "Como chegar →"
[DRESS CODE]                3 fotos em arco
[RSVP] fundo dark           formulário com botões pílula → alianças se encaixam + estouro dourado
[PRESENTES]                 4 cards arredondados (20px) com VALOR; selecionado = borda em gradiente de ouro + reflexo + mini alianças
[NOSSO JEITO] fundo alt     4 cartões de papel levemente girados
[GALERIA]                   grid de 12 col: arco grande (7) | círculo + retângulo (5) · frase · panorâmica 16/8
[PADRINHOS] fundo alt       fotos em cápsula 150×200 com anel duplo
[RECADO + HASHTAG] · [RODAPÉ dark com alianças]
```

## Efeitos
- **Abertura**: ao tocar, o estado vai para "joining" e as alianças fazem lerp de sep 1→0 (lerp .045), com estouro dourado (50 partículas, delay 900ms, spread 300px). Em 1900ms começa o "fading" (opacity 0, scale 1.08, 1.1s). O hero começa em 2300ms e a abertura é removida em 3100ms.
- **Hero**: a foto revela com `clip-path inset(100%)→0` em 1800ms `cubic-bezier(.77,0,.18,1)`, e a camada interna faz zoom 1.3→1 em 4200ms. Os itens entram com blur 14px, com delays de 300/1100/1900/2400ms. O pó dourado tem 34 partículas de 2–4px, loop de 6–13s subindo 60–150px.
- **Seção Alianças**: `p = -top/(altura−vh)`; `e = clamp((p−.05)/.6)` com smoothstep, e `sep = 1−e`. A frase i tem centro em `.12 + i×.27` e opacidade `1 − |p−c|/.13`; a última fica fixa depois do centro. Cada frase anda `(c−p)×60px` em Y e tem blur `(1−o)×6px`. A data aparece em `p > .78`.
- **História horizontal**: a altura da seção é `scrollWidth − innerWidth + vh`, e a trilha faz `translateX(−p×dist)`. As fotos fazem um efeito de "revelação de foto": `sepia(.9) blur(10px) brightness(1.25), opacity .2, scale 1.08 → normal`, 2400ms. Hover: rotate 0 e translateY -6px.
- **Convite**: tilt `perspective(1100px) rotateX((.5−y)×7deg) rotateY((x−.5)×9deg)`, com reflexo radial `rgba(255,236,190,.45)` seguindo `--mx/--my`.
- **Contagem**: o anel tem `fração = 1 − diff/365 dias`, com um ponto brilhante na ponta.
- **RSVP sim**: alianças compactas encaixando (lerp .035) e um segundo estouro (40 partículas).
- **Presentes**: o card selecionado ganha `background: linear-gradient(paper) padding-box, linear-gradient(135deg,#8a6526,#f4dc9c,#b8904a,#f4dc9c,#8a6526) border-box`, um reflexo diagonal que atravessa em 1.3s e um selo com mini alianças que se encaixam. O botão fica "Presentear com R$ {valor}" e, ao clicar, "Obrigado pelo carinho."
- Valores de exemplo: Nossa casa R$ 250 · Nossa lua de mel R$ 480 · Novos momentos R$ 320 · Presentes especiais R$ 150.
