# Handoff: Debut Festa Glam — Landing Page (Template 02)

## Overview
Landing page de vendas para pacotes de festa de debutante (15 anos), em português (pt-BR).
É uma página de conversão de página única com: contagem regressiva ao vivo, nome da
debutante editável que propaga por toda a página, seletor de pacotes, slider de convidados
com preço recalculado em tempo real, e um modal de "contrato digital" com assinatura.

## About the Design Files
Os arquivos deste pacote são **referências de design criadas em HTML** — protótipos que
mostram o visual e o comportamento pretendidos, **não código de produção para copiar
diretamente**. A tarefa é **recriar estes designs no ambiente do codebase de destino**
(React, Vue, Next, etc.) usando os padrões e bibliotecas já estabelecidos nele. Se ainda
não houver ambiente, escolha o framework mais adequado (recomendado: **React + Tailwind**,
que é a base original) e implemente lá.

Arquivos incluídos:
- `reference-original.html` — o mockup React original (bundle compilado). É a **fonte da
  verdade** para copy, cores e comportamento. Contém o JSX legível no final do `<script>`.
- `Debut Festa Glam.dc.html` — reprodução fiel com estilos inline; útil para inspecionar
  medidas e efeitos exatos.

## Fidelity
**High-fidelity (hifi).** Cores, tipografia, espaçamento e interações são finais.
Recrie a UI pixel-perfeito com as bibliotecas do codebase. Todos os valores estão abaixo.

## Design Tokens

### Cores
| Token | Hex | Uso |
|---|---|---|
| Rosa (primária) | `#E91E8C` | barra topo, badges, acento "DATA TRAVADA" |
| Dourado (acento) | `#D4AF37` | "15 ANOS", ícones, pacote selecionado, thumb do slider |
| Preto (texto/superfície) | `#111111` | texto principal, seções escuras, botões |
| Preto profundo | `#0c0c0c` / `#000000` | fundo do painel de vídeo / caixas internas |
| Cinza claro (superfície) | `#F8F8F8` | seção "Como vai ser" |
| Verde (check) | `#22c55e` | ícones de check, indicador "online" |
| Branco | `#FFFFFF` | fundo geral, cartões |
| Bordas | `rgba(0,0,0,.1)` claro / `rgba(255,255,255,.1)` escuro | divisores |

Seleção de texto: `background:#E91E8C; color:#fff`.

### Tipografia
- **Corpo**: `Inter` (Google Fonts), pesos 500/600/700/800/900.
- **Display** (títulos e números grandes): `Syne`, pesos 700/800. Classe `.display`.
- Import: `https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&family=Syne:wght@700;800&display=swap`
- Escala usada (px / peso / line-height / tracking):
  - Nome hero: 56→72 / 900 / .85 / -.03em (Syne)
  - "15 ANOS": 44→52 / 900 / .9 / -.02em (Syne, dourado)
  - H2 seções: 40→64 / 900 / .9 / -.03em (Syne)
  - Preço R$: 56→72 / 900 / 1 / -.03em (Syne)
  - Rótulos/eyebrow: 11–13 / 700–900 / tracking .1em–.32em
  - Corpo: 13–20 / 500–600

### Espaçamento / raios / sombras
- Container: `max-width:1320px` (investimento: `1120px`; card de preço: `760px`; modal: `520px`), padding lateral `24px` (mobile) / `40px` (desktop).
- Seções: padding vertical `56–96px`.
- Border-radius: pílulas `9999px`; cartões `16/20/24/28px`; badge dourado hero `14px`.
- Sombra glow (pontos neon): `box-shadow:0 0 20px #fff, 0 0 40px #fff` (e variantes por cor).
- Blur dos blobs: `filter:blur(30–50px)`.

## Screens / Views

Página única, seções em ordem vertical:

### 1. Barra superior (topbar) — fundo rosa `#E91E8C`
Centralizada, `padding:10px 16px`, texto branco 13px/700. Ícone relógio + "PROPOSTA
VÁLIDA POR:" + pílula branca com contagem `NND : NNH : NNM : NNS` (fonte 12px/900,
tabular-nums) + "• Preço trava hoje". **Contagem regressiva ao vivo** (ver Interações).

### 2. Header — fundo branco, borda inferior `rgba(0,0,0,.1)`
Flex space-between: (esq) badge circular preto "15" + "DEBUT GLAM"/"TEMPLATE 02";
(centro) pílula preta "{guests} CONVIDADOS" + pílula outline "R$ {total}";
(dir) botão preto "GARANTIR DATA →" (abre modal), hover `#000`.

### 3. Hero — fundo branco, grid 2 colunas (~1.15fr / 0.85fr), empilha < 1024px
**Coluna esquerda:**
- Badge rosa "✨ TEMPLATE FESTA | MAIS PEDIDO".
- "A NOITE DA" (18px/700, tracking .32em).
- **Input do nome** editável, Syne 72px/900, uppercase, placeholder "NOME" (ver Estado).
- "TOQUE PARA EDITAR O NOME • PROPAGA AUTOMÁTICO" (11px/700, opacity .5).
- "15 ANOS" (Syne 52px/900, dourado).
- Parágrafo 20px/600, max 520px.
- 3 pílulas pretas com ícones dourados: calendário "12 DEZ • SÁBADO 20H", pessoas
  "{guests} CONVIDADOS", pin "SALÃO CRISTAL".
- Balão de chat preto: avatar dourado "Oi" + "Oi, {nome ou 'Linda'}! Sua festa vai ser
  ÉPICA 🔥" + "Cerimonialista Paula • online agora" + ponto verde pulsante.
- 2 botões: "QUERO ESSA FESTA →" (preto, abre modal) e "VER PREÇO" (outline; ao clicar
  vira dourado com texto "↓ DESCENDO...", ver Interações).

**Coluna direita — painel de vídeo** (`aspect-ratio:4/5.2`, radius 24, fundo `#0c0c0c`):
- Camada de gradientes radiais rosa/dourado/branco.
- 3 blobs desfocados (rosa 120px, dourado 90px, branco 160px) com `blur`.
- 3 pontos de brilho neon (branco, dourado, rosa) com `box-shadow` glow.
- Gradiente escuro de baixo; 2 linhas horizontais decorativas com gradiente.
- Badge branco "● AO VIVO • PISTA LOTADA" (topo esq) + círculo rosa com estrela (topo dir).
- Legenda embaixo: badge glass "FESTA REAL • CLIENTE ANTERIOR", título 22px/900
  "Pista cheia até 2h da manhã...", avatar "IS" + "@isabella fez 1.2k stories nessa noite".
- Badge dourado flutuante rotacionado -2deg "+ 300 FESTAS FEITAS ✨" (bottom-left, offset).

### 4. "O QUE TÁ INCLUSO" — seção escura `#111111`
Eyebrow dourado + H2 "O QUE VAI TER NA SUA FESTA DE {nome}" (nome em dourado) + parágrafo.
Grid de **6 cartões** (`rgba(255,255,255,.06)`, radius 20, hover `.09`): quadrado dourado
56px com ícone preto (stroke 2.5) + título 16px/900 + descrição 13px. Itens:
1. 🎵 PISTA LIBERADA — "DJ profissa, playlist sua + 4h de festa sem parar"
2. 👑 CERIMONIAL TOTAL — "Equipe cuida de tudo, você só curte e brilha"
3. 👥 RECEPÇÃO VIP — "Recepção com tapete, painel neon e hostess"
4. 📷 FOTOGRAFIA HYPE — "Fotos que bombam no feed, entrega em 48h"
5. 💡 SOM E LUZ PRO — "Moving, laser, fumaça - balada de verdade"
6. 🍷 OPEN BAR JOVEM — "Drinks sem álcool + soda italiana liberada"

### 5. "COMO VAI SER, NA PRÁTICA" — fundo `#F8F8F8`
Cabeçalho: círculo preto "→" + H2 42px + "5 ETAPAS • ZERO STRESS".
Grid de **5 etapas** dentro de um cartão branco com divisores; número dourado (Syne 36px),
título (14px/900), descrição. Conector circular "→" entre etapas (absoluto, top 50%,
right -12px). Etapas: 01 BRIEFING / 02 MONTAGEM / 03 CHEGADA / 04 FESTA / 05 AFTER
(descrições no reference-original).

### 6. "NO DIA... VOCÊ SÓ BRILHA." — fundo branco
H2 50px com "BRILHA." em caixa preta (radius 10) + badge rosa "CHECKLIST REAL DA EQUIPE".
Grid de **3 cartões** (radius 20, borda clara). Cada card: topo 220px com **gradiente**
+ blobs + linha rotacionada + ponto de acento + título branco embaixo; corpo com lista de
4 itens (círculo verde `#22c55e` com check + texto 13.5px/700):
- "CHEGADA DE ESTRELA" — grad `#1a1a1a → #2a2a2a`, acento dourado — Camarim pronto / Make checada / Família posicionada / DJ no ponto
- "A FESTA ACONTECENDO" — grad `rgba(233,30,140,.3) → #111`, acento rosa — Pista cheia / Fotos rolando / Cerimonial ativo / Você brilhando
- "FINAL ÉPICO" — grad `rgba(212,175,55,.4) → #111`, acento branco — Parabéns com efeito / Vídeo final / Despedida organizada / Material entregue

### 7. "INVESTIMENTO" — seção escura `#111111`, `id="investimento"`
Alvo do botão "VER PREÇO"; ao ativar, anel dourado inset (`box-shadow:inset 0 0 0 4px #D4AF37`) por 1600ms.
Badge "● INVESTIMENTO • TRANSPARENTE" (ponto dourado pulsante) + H2 64px
"QUANTO CUSTA FAZER A FESTA MAIS FALADA?" (últimas palavras douradas).
Cartão central (`rgba(255,255,255,.06)`, radius 28, max 760px):
- "PACOTE {nome do pacote} • {guests} CONVIDADOS".
- **Preço** Syne 72px "R$ {total}".
- "Em até 12x no cartão • Trava de preço hoje • Contrato digital".
- **3 botões de pacote** (ver Estado). Selecionado: fundo dourado, texto preto,
  `box-shadow:0 0 0 4px rgba(212,175,55,.25)`, mostra check. Rótulos: R$4.9k /
  R$6.9k ★ / R$9.7k; nomes FESTA ESSENCIAL / COMPLETA / LENDÁRIA + descrição.
- **Caixa preta "AJUSTAR CONVIDADOS"**: pílula "{guests} PESSOAS" + `input[type=range]`
  50–250 step 5, fill dourado até o valor (ver Interações); rótulos "50 PESSOAS" /
  "BASE {base}" / "250 PESSOAS"; se extra>0, linha dourada "+ {n} extras × R$35 = +R$ {x} no total".
- Botão branco "GARANTIR MINHA DATA COM {nome} →" (abre modal) + fine print.
- 3 pílulas: "✓ SEM TAXA ESCONDIDA", "✓ EQUIPE INCLUSA" (brancas) e "✓ DATA TRAVADA HOJE" (rosa).

### 8. Footer — fundo branco, borda superior
Avatar preto "PC" + "Paula Cerimonial • {nome ou 'sua festa'}" + "Respondo em até 2h •
300 festas • 4.9★ no Google" + botão preto "FECHAR MINHA FESTA AGORA →" (abre modal).
Linha final centralizada opacity .3: "TEMPLATE 02 • DEBUT FESTA GLAM • CONTRASTE AAA • LEGIBILIDADE MÁXIMA".

### 9. Modal (contrato digital) — overlay `rgba(0,0,0,.8)` + `backdrop-blur`
Card `#111111`, max 520px, radius 28, animação `slideUp .3s ease` (translateY 20px→0, opacity 0→1).
Botão fechar X (canto). Badge dourado "CONTRATO DIGITAL • ASSINATURA". Título 30px
"Fechar a festa da {nome ou 'DEBUTANTE'}?". Resumo: Pacote / Convidados / Total (borda
superior) + nota de validade. Campo **assinatura** (input branco, foco borda dourada) +
preview da assinatura em Syne 28px (ou "Sua assinatura aqui"). Checkbox (accent dourado) +
termo de aceite. Botão **"ASSINAR E TRAVAR MINHA DATA →"** — desabilitado
(`rgba(255,255,255,.15)`/texto `.4`) até nome preenchido **e** checkbox marcado; quando
válido, dourado com texto preto. Ao enviar: `alert` de confirmação e fecha o modal.

## Interactions & Behavior
- **Contagem regressiva**: alvo = `Date.now() + dias*86400000 - 10800000` (dias=10 por
  padrão; o `-3h` é ajuste de fuso). Atualiza a cada 1s; ao zerar, exibe 00. Formatar com
  `padStart(2,'0')`.
- **Nome propagado**: um único estado `name` (default "ISABELLA", sempre uppercase) alimenta
  hero, H2 de includes, saudação do chat, botões, seção de preço, footer e modal.
- **VER PREÇO**: `scrollIntoView({behavior:'smooth'})` até `#investimento`, ativa `highlight`
  (anel dourado + troca de rótulo do botão para "↓ DESCENDO...") por 1600ms.
- **Seletor de pacote**: muda `pkg`; recalcula base e total; realça o card escolhido.
- **Slider de convidados**: fill dourado via
  `linear-gradient(to right, #D4AF37 {(g-50)/200*100}%, rgba(255,255,255,.2) 0%)`.
- **Preço**: `total = precoBase + max(0, guests - base) * 35`. `base` = 80 (essencial) /
  100 (completa) / 150 (lendária). `precoBase` = 4900 / 6900 / 9700. Ex.: completa, 120
  convidados → 6900 + 20×35 = **7600**. Formatar com `toLocaleString('pt-BR')`.
- **Modal**: abre por qualquer CTA; fecha pelo X ou clique no overlay; botão de assinar
  habilita só com nome + aceite; envio dispara alert e fecha.
- Hover: botões escurecem/clareiam; cards de includes clareiam para `rgba(255,255,255,.09)`.
- **Responsivo**: hero e grids empilham em telas estreitas (breakpoints md=768 / lg=1024
  no original Tailwind).

## State Management
| Estado | Tipo | Default | Origem/Trigger |
|---|---|---|---|
| `name` | string | "ISABELLA" | input do hero (uppercase) |
| `pkg` | "essencial"\|"completa"\|"lendaria" | "completa" | botões de pacote |
| `guests` | number | 120 | slider (50–250, step 5) |
| `modal` | boolean | false | CTAs / X / overlay |
| `sig` | string | "" | input de assinatura |
| `agree` | boolean | false | checkbox |
| `cd` | {d,h,m,s} | contagem | setInterval 1s |
| `highlight` | boolean | false | VER PREÇO (timeout 1600ms) |
Derivados: `base`, `extra=max(0,guests-base)`, `total`, `pkg selecionado`.
Sem data fetching — tudo client-side.

## Assets
- **Ícones**: no original são do `lucide-react` (clock, arrow-right, sparkles, calendar,
  users, map-pin, star, check, x, music, crown, camera, lightbulb/zap, wine). No codebase
  use a lib de ícones existente (lucide, heroicons, etc.).
- **Fontes**: Inter + Syne (Google Fonts, link acima).
- **Emojis**: 🔥 ✨ 🎉 ★ — texto puro.
- Sem imagens externas; o "vídeo" é 100% CSS (gradientes + blur + glow). Se houver vídeo/
  imagem real, substituir o painel mantendo os overlays.

## Files
- `reference-original.html` — mockup React original (fonte da verdade; JSX legível no fim do script).
- `Debut Festa Glam.dc.html` — reprodução com estilos inline (medidas/efeitos exatos).
