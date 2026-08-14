# Handoff: Proposta Maison Lumière — Orçamento de Casamento (padrão milionário)

## Overview
Landing/proposta de página única para um ateliê de casamentos de luxo ("Maison Lumière"). O objetivo é apresentar uma proposta comercial sofisticada (padrão R$ 500k+) e converter o casal em cliente: os dados pessoais só são pedidos **depois** de o usuário clicar em "Aceitar proposta", num modal com formulário + assinatura digital em canvas + recibo.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram a aparência e o comportamento pretendidos, **não** código de produção para copiar diretamente. A tarefa é **recriar este design no ambiente do codebase de destino** (React, Vue, Next, etc.), usando os padrões e bibliotecas já estabelecidos nele. Se não houver ambiente ainda, escolha o framework mais apropriado (recomendado: React + CSS-in-JS ou Tailwind) e implemente lá.

### Arquivos do pacote
- **`index.html`** — versão **standalone** já compilada (abre com duplo clique, funciona offline). Use para visualizar o resultado final.
- **`proposta-maison-lumiere.dc.html`** — o design de referência (fonte). Contém o template (markup + estilos inline) e a classe de lógica JS num único arquivo.
- **`support.js`** — runtime necessário para o `.dc.html` rodar quando servido (o `.dc.html` carrega `./support.js`). Sirva os dois juntos (ex.: `npx serve`).
- **`README.md`** — este documento.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, sombras e interações são finais. Recrie pixel-perfect com as bibliotecas do codebase.

## Design Tokens

### Cores
| Token | Hex | Uso |
|---|---|---|
| Espresso | `#2B1E16` | Texto principal, blocos escuros, badge "mais escolhido" |
| Marrom escuro | `#3C2415` | Barra do topo, pill ativa do menu, botões primários, círculos de passo |
| Taupe | `#8B7355` | Textos secundários / labels |
| Camel / dourado | `#B8935A` | Acentos, dots pulsantes, linhas finas, estrelas |
| Marrom médio texto | `#5C4033` | Parágrafos de corpo |
| Off principal | `#FAF8F5` | Fundo da página / texto sobre escuro |
| Off cartão | `#FDFBF7` | Sidebar, cards, células |
| Off seção investimento | `#F5F1EB` | Fundo da seção de preço |
| Bordas | `#E8DDD2` / `#DDD5C7` | Hairlines 0.5px |
| WhatsApp | `#25D366` | Botão do modal de sucesso |

### Tipografia (Google Fonts)
- **Cormorant Garamond** (serif) — títulos, números grandes, preço. Pesos 300/400/500.
- **Great Vibes** (cursiva) — nome do casal ("Marina & João"). 72px no hero, 48px no card da imagem.
- **Inter** (sans) — corpo e UI. Pesos 400/500/600/700. Mínimo 11px em labels, 14–15px em corpo.
- Import: `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Great+Vibes&family=Inter:wght@400;500;600&display=swap`

### Espaçamento / raios / sombras
- Padding de seção: `112px 72px` (desktop), container `max-width:1320px` centrado.
- Raios: pill `9999px`; cards `4px` (imagens), `12/16/20/24px` (blocos); modal `20px`.
- Sombra luxo (reutilizada): `box-shadow: 0 20px 60px -20px rgba(60,36,21,.15), 0 1px 0 0 rgba(184,147,90,.15) inset;`
- Bordas hairline: `0.5px solid`.

## Layout global
- **Barra fixa do topo** (44px, `#3C2415`): "PROPOSTA VÁLIDA POR:" + countdown HH/MM/SS (o S em pill dourada), dot dourado pulsante + "PREÇO TRAVA HOJE", prova social e botão "GARANTIR DATA".
- **Barra de progresso** fixa (2px) logo abaixo do topo: preenche em `#3C2415` conforme o scroll.
- **Sidebar fixa** `240px` à esquerda (topo 46px → base): logo "MAISON LUMIÈRE", nav com scrollspy, cards de escassez/confidencialidade. Ao rolar >10px ganha `backdrop-filter: blur(12px)` + sombra lateral.
- **Main** com `margin-left:240px; padding-top:46px;`.

## Screens / Views (seções, na ordem)
1. **apresentacao (hero)** — grid `1.08fr / 0.92fr`. Esquerda: badge "VAGAS LIMITADAS • MAIO 2026" (animação `badgePulse`), "Proposta de" (Cormorant 56px, taupe) + "Marina & João" (Great Vibes 72px), linha de data, parágrafo, 3 chips, botão "ACEITAR PROPOSTA • R$ 12.800" com brilho `shimmer`. Direita: imagem vertical **800×1100 (4:5.5)** com borda offset dourada, overlay gradiente escuro, nome cursivo branco e bokeh; card flutuante "REFERÊNCIA / Seu casamento nesse padrão".
2. **quem-somos** — grid 2 col: título serif + parágrafo + 3 métricas (127 / 300+ / 12); à direita imagem **1200×800 (3:2)**, imagem **600×600 (1:1)** e card escuro com citação "Detalhe é não negociável.".
3. **incluso** — lista de 5 linhas `[96px número serif dourado] [título serif] [descrição]`, separadas por hairlines.
4. **como-funciona** — grid `0.9fr/1.1fr`: título + imagem **900×600**; timeline vertical de 3 passos (círculos `#3C2415` conectados por linha).
5. **no-dia** — grade 3×2 de horários (07:00 → 02:00), células `#FDFBF7` separadas por gaps de 0.5px sobre fundo `#E8DDD2`.
6. **investimento** — bloco central `max-width:720px`: card de preço **R$ 12.800** (Cormorant 48px), "7x de R$ 1.828", checklist com bullets ✓ finos, botão CTA com shimmer, selo "MAIS ESCOLHIDO".
7. **eventos** — galeria 4 col de imagens **400×300 (4:3)**, hover `scale(1.03)`.
8. **depoimentos** — 3 cards brancos com ★★★★★ dourado + citação serif.
9. **proximos** — bloco escuro `#2B1E16` grid `1.1fr/0.9fr`: "Vamos travar sua data?" + CTA claro + 3 stats; à direita "O QUE ACONTECE DEPOIS" (4 passos) + card "GARANTIA MAISON".
10. **footer** — hairline, © e selo confidencial.

Todos os slots de imagem exibem uma **pill branca** no canto com o tamanho (ex.: `800×1100 | 4:5.5`) para o cliente trocar depois.

## Interactions & Behavior
- **Countdown**: inicia em `23:41:58`, decrementa 1s; ao zerar reinicia em `23:59:59`.
- **Scrollspy**: `IntersectionObserver` com `rootMargin: "-40% 0px -50% 0px"` marca a seção ativa → pill `#3C2415` + dot dourado com animação `goldPulse 2.5s`.
- **Barra de progresso**: `scrollY / (scrollHeight - innerHeight) * 100`.
- **Navegação**: clique no menu faz `window.scrollTo({behavior:"smooth"})` com offset de 46px (NÃO usar `scrollIntoView`).
- **Imagens**: começam como placeholders SVG (com a pill de tamanho) e trocam para fotos de referência após ~15s (configurável); `onerror` volta ao placeholder.
- **Modal (só após "Aceitar")**: qualquer CTA abre o modal. Passo 1 = formulário (Nome, CPF, E-mail, Telefone, Data) + **assinatura em `<canvas>`** (pointer events, traço `#2B1E16` 1.6px). Botão "ASSINAR E TRAVAR DATA" fica **desabilitado** até `nome && cpf && assinatura`. Passo 2 = tela de sucesso com **recibo `KD-XXXX`** (número aleatório de 4 dígitos), breakdown de preço/entrada 30% = R$ 3.840, botão "ABRIR WHATSAPP VIP". Backdrop fecha o modal só se ainda não concluído.

### Animações (keyframes)
- `goldPulse` (2.5s): opacity .45→1, scale 1→1.35 (dots dourados).
- `badgePulse` (3s): halo de box-shadow expandindo (badge do hero).
- `shimmer` (2.8s): brilho diagonal atravessando os botões primários.

## State Management
- `time {h,m,s}`, `progress`, `scrolled`, `active` (id da seção).
- `modalOpen`, `done` (sucesso), `sigCaptured` (assinatura desenhada).
- `form {nome,cpf,email,tel,data}`, `receipt` (`KD-####` gerado uma vez).
- Refs: `canvasRef`. Timers: `setInterval` (countdown), `setTimeout` (troca de imagens), listener de `scroll`, `IntersectionObserver` — todos limpos no unmount.

### Tweaks/props expostas
- `revealPhotos` (bool, default true) — trocar placeholders por fotos.
- `revealDelaySec` (int, default 15) — atraso da troca.
- `countdownStartH` (int, default 23) — horas iniciais do countdown.

## Assets
- Sem assets locais. Fotos de referência vêm do Unsplash (URLs no bloco `this.real` da lógica) e devem ser **substituídas pelas fotos reais do cliente** nos tamanhos indicados nas pills. Placeholders são SVG data-URI inline.
- Ícones/glyphs são caracteres Unicode (✓ ★ → ✕), sem biblioteca de ícones.

## Files
- `index.html` — resultado compilado standalone (para ver rodando).
- `proposta-maison-lumiere.dc.html` — fonte do design (template + lógica).
- `support.js` — runtime do `.dc.html`.

## Responsivo
O design de referência foi construído desktop-first (sidebar fixa 240px). Ao recriar, aplique os breakpoints do codebase: em telas < ~1024px, colapse a sidebar para um menu no topo e adote CTA fixo inferior no mobile (padrões já previstos no conceito original).
