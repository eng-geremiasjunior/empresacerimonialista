# Template 04: Monograma + faixas que sobem + momentos na rolagem
Arquivo: `prototipos/Template 04.dc.html`. Fonte padrão: **02 Maison**. Nomes: Luana & Geremias.
**Base visual e paleta idênticas ao Template 03** (veja `03-portal.md`); abaixo estão só as diferenças.

## Diferenças de wireframe
```
[ABERTURA]  campo sólido ink (#1d2a24) dividido em 5 faixas verticais; ao centro, monograma (iniciais + & pêssego)
            dentro de um anel SVG (r=49, stroke pêssego .6) que se desenha; data "31 · 10 · 2026"
[HERO]      foto FULL-BLEED 100svh (raio só embaixo: 0 0 clamp(24px,3vw,40px)); header sobre a foto (nomes | "Confirmar presença" pílula clara);
            nomes + data/local à esquerda; contagem em caixas à direita
[DOCK] … (igual ao T03)
[UM PEDIDO NOSSO] · [3 STAT CARDS]
[NOSSOS MOMENTOS]  NOVO: seção de 520vh com um card sticky (top 136px, altura calc(100svh−156px), raio 32px):
            5 fotos empilhadas + 5 frases centrais + topo "Nossos momentos  01 / 05" + 5 barras de progresso embaixo
[NOSSA HISTÓRIA] … (resto igual ao T03: grande dia/local, músicas, presentes, galeria, dress code, padrinhos, RSVP, rodapé)
```

## Efeitos
- **Abertura (automática, sem clique)**:
  1. O monograma entra com `opacity 0, blur 12px, scale .95 → 1` em 1000ms.
  2. O anel desenha `stroke-dashoffset 308→0` em 1300ms, delay 150ms, `cubic-bezier(.6,0,.2,1)`.
  3. Em **1500ms**, o monograma sobe e some (`translateY(-70px)`, 800ms).
  4. Em **1550ms**, as 5 faixas sobem com `translateY(0 → -101%)` em 1150ms `cubic-bezier(.77,0,.18,1)`, com delay de `|i − 2|×90ms` (o centro sai primeiro).
  5. O hero começa em 1600ms e a abertura é removida quando as faixas terminam.
- **Hero com parallax**: `translateY(scrollY×.35) scale(1 + scrollY/vh×.08)` enquanto `scrollY < 1.3vh`.
- **Nossos momentos (troca de foto na rolagem)**:
  - `L = clamp((136 − top)/(altura − alturaDoCard)) × 5` vai de 0 a 5.
  - Camada i>0: `er = smoothstep(clamp((L − (i − .35))/.35))`, com `clip-path inset((1−er)×100% 0 0 0)`. A foto nova sobe cobrindo a anterior, e a imagem interna tem `scale(1.1 − .1·er + .06·clamp(L − i))`.
  - Frase i: centro em `c = i + .3`, `o = 1 − |L − c|/.34` (a primeira fica visível antes do centro e a última depois), `translateY((c−L)×40px)`, `blur((1−o)×8px)` só quando 0<o<1.
  - Barras: `scaleX(clamp(L − i))`. Contador: `floor(L + .35) + 1`.
  - **Performance**: camadas e frases com opacidade 0 recebem `visibility:hidden` e `filter:none`.
  - Overlay: radial `rgba(15,18,15,.5)` no centro, mais gradientes em cima e embaixo.
  - Frases de exemplo: "Tudo começou com um olhar." · "Depois vieram as viagens, as risadas e os planos." · "Aprendemos que lar é onde o outro está." · "Um dia, a pergunta. E o sim, antes do fim." · "Agora, queremos viver esse capítulo com você."
  - Tipografia das frases: headFont itálico, `clamp(28px,4.6vw,60px)`, lh 1.15, max 780px, sombra de texto.
- Sem zoom infinito na foto do local (foi removido por performance).
