# Template 05: Inspiração francesa (envelope, cartões-postais, château)
Arquivo: `prototipos/Template 05.dc.html`. Fonte padrão: **05 Riviera**. Nomes: Helena & Rafael.

## Paleta
bg #f6f0e6 · alt #efe6d6 · paper #fcf8f1 · ink #1f2a44 (azul-marinho) · muted #586074 · gold #b08d57 · goldText #86652f · goldLight #dcc393 · line #e4d9c7 · lineStrong #c3b49c · dark #1b2438 · darkInk #f3ece0 · stamp #3d5a86
Selo de cera: `radial-gradient(circle at 36% 30%, #c0555a, #8e2a2e 55%, #5c181c)`, forma levemente irregular (`border-radius 47% 53% 50% 50% / 52% 48% 52% 48%`), com `inset 0 0 0 6px rgba(0,0,0,.14), inset 0 0 0 8px rgba(255,255,255,.07)`, iniciais em #f1d8c2.
Fita dos presentes: #74201f / #a63b3f.
Pequenas palavras em francês como eyebrows: Une lettre pour vous, Vous êtes invité, Bienvenue, Notre histoire, Le château, Le programme, Compte à rebours, La galerie, La boutique, Nos témoins, Répondez s'il vous plaît, À bientôt, Merci!

## Wireframe
```
[ABERTURA] fundo radial #2c3858→#141b2c; "Une lettre pour vous"; ENVELOPE (min(520px,86vw), 1.5:1):
           corpo #e3d7c1 → carta (paper: "Vous êtes invité", nomes, data) → bolso em V (clip-path) → aba triangular (62% altura) → selo de cera com iniciais;
           "Toque no selo para abrir"
[NAV fixa] após 90% do hero: monograma | História · O château · Programa · Presentes · [Confirmar presença]
[HERO 100svh] VÍDEO (Torre Eiffel à noite, loop, mudo) ou foto; molduras douradas duplas (inset clamp(14px,2.4vw,28px) e clamp(20px,3.2vw,38px));
           embaixo: "Bienvenue ao nosso casamento", nomes, ornamento (linha–losango–linha), data, local em itálico
[BIENVENUE] brasão circular 128px com iniciais (anel duplo dourado); "Uma história de amor merece um lugar encantado."; texto do convite
[NOTRE HISTOIRE] fundo alt; 4 CARTÕES-POSTAIS (3/4.3) que viram ao toque: frente = foto + selo postal com iniciais + carimbo circular (cidade/ano) + cidade/ano;
           verso = "Capítulo N", selo tracejado, título, texto itálico, linhas de endereço, cidade · ano
[LE CHÂTEAU] 260vh sticky: JANELA EM ARCO que se abre até tela cheia revelando o local; depois aparece nome + endereço + "Como chegar"
[LE PROGRAMME] fundo alt: cartão de menu em papel com molduras douradas duplas; Cerimônia/La cérémonie 16h30 · Recepção/Le cocktail 18h30 ·
           Festa/Le dîner & le bal 20h00 (linhas pontilhadas); "Tenue · Traje: Social"; "Adicionar à agenda"
[CONTAGEM] fundo dark: 4 colunas com divisórias douradas
[LA GALERIE] 5 fotos em MOLDURAS DE OURO (gradiente 135deg #8a6a3a/#e8d3a2/#a9844d/#f1ddb0) + passe-partout paper; formatos retangular e oval
[LA BOUTIQUE] 6 presentes; cada um com ETIQUETA pendurada (fio + tag com furinho) mostrando o VALOR
[NOS TÉMOINS] retratos ovais 150×196 com aro de ouro
[RSVP] fundo alt: cartão com molduras douradas; ao confirmar, CARIMBO de selo de cera
[RODAPÉ dark] "À bientôt", nomes, data entre linhas, hashtag
[SHEET] barra fixa ink: "Presentear R$ X" (botão goldLight) → "Merci! Obrigado pelo carinho."
```

## Efeitos
- **Abertura do envelope** (ao clicar):
  1. O hint e o eyebrow somem em 400ms.
  2. O selo cresce até 1.14 e depois cai e some (`translate(-50%,-25%) scale(.7) rotate(-20deg)`, 700ms).
  3. A aba faz `rotateX(0→180deg)` em 900ms, delay 450ms, `cubic-bezier(.5,0,.3,1)`, e em 900ms vai para z-index 0.
  4. A carta sobe `translateY(-56%)` em 1100ms, delay 1250ms.
  5. O envelope faz `scale 1.35, opacity 0` em 1000ms, delay 2550ms, e o overlay faz fade em 1000ms, delay 2750ms.
  6. O hero começa em 2850ms e a abertura é removida em 3800ms.
- **Hero**: as molduras entram com `opacity 0, scale 1.03` em 1800ms, delays de 600/800ms. Os itens entram com blur 10px, delays de 700/1000/1700/1950ms.
  - Com foto: `opacity 0→1` e `scale 1.14→1` em 5000ms, mais parallax de `scrollY×.3`.
  - **Com vídeo**: só fade de 1600ms, **sem** parallax e sem scale (performance).
- **Vídeo**: `autoplay muted loop playsinline`, `preload="metadata"`, poster = foto. É pausado por IntersectionObserver fora da tela.
  - Na prop `capaVideo`, true = vídeo e false = foto.
  - O arquivo enviado tem 2708×1440. **Use uma versão 1280×720 ou 1920×1080** em produção.
- **Cartões-postais**: rotações -2.5/1.8/-1.2/2.4deg; no hover, rotate 0 e translateY -8px. O giro é `rotateY(180deg)` em 1.1s `cubic-bezier(.3,.7,.2,1)` com perspective 1400px.
  - Implementado com `backface-visibility` neste modelo.
  - No T06 foi trocado por troca de opacidade no meio do giro, por performance; prefira essa versão.
- **Janela do château**: `p = clamp(-top/(altura−vh))`, `e = smoothstep(clamp(p/.7))`.
  - Máscara: `clip-path: inset(26(1−e)% {33 ou 12 no mobile}(1−e)% 7(1−e)% … round R R 0 0)`, com `R = largura da janela/2 × (1−e)`. É um arco que vira tela cheia.
  - A imagem interna faz `scale 1.25→1`.
  - O título de cima some com `1 − e×2.4`. As informações aparecem com `(p−.6)/.2`, translateY 30px→0, e usam `visibility:hidden` quando têm opacidade 0.
- **Presentes**: no hover, a etiqueta balança (`rotate 0→10→-6→3→0`, 1300ms, a partir do topo). Ao selecionar, uma fita vertical desce com `scaleY` em .7s, uma fita horizontal entra com `scaleX` (+.2s) e o laço surge com mola (+.6s); a borda vira gold e o card sobe -8px.
- **RSVP sim**: carimbo do selo `scale 2.4 rotate(-28deg), opacity 0 → scale .9 → 1, rotate(-8deg)`, 900ms. O texto entra em seguida, com delay de 350ms.
- Valores: Jantar em Paris R$ 480 · Jogo de taças de cristal R$ 320 · Passeio pelo Sena R$ 650 · Enxoval de linho R$ 540 · Aula de confeitaria R$ 280 · Noite num château R$ 1.200.
- Postais de exemplo: 2019 São Paulo "O primeiro encontro" · 2021 Paris "A primeira viagem" · 2023 Lisboa "Nossa casa" · 2025 Loire "O pedido".
