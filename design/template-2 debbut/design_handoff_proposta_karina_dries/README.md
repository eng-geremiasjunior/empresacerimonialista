# Handoff: Proposta V2.0 Interativa — Karina Dries Eventos

## Overview
Landing page interativa de proposta comercial para uma festa de 15 anos, da empresa "Karina Dries Eventos" (KD.), Governador Valadares — MG. Página de venda one-page com sidebar de navegação fixa, resumo de preço ao vivo, e uma calculadora de investimento interativa (seleção de pacote, slider de convidados, toggle de chá de debutante).

## About the Design Files
The file in this bundle (`Proposta.dc.html`) is a **design reference prototype** built with inline styles and a small React-like component runtime — it is not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, plain JS, etc.), following its established component patterns, styling approach, and state-management conventions. If no environment/framework exists yet in the target repo, choose the most appropriate one and implement the design there.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, copy, and interactive behavior (package selection, guest slider, live price calculation, testimonial carousel, expandable process steps, countdown timer) should all be reproduced pixel- and behavior-accurate.

## Layout Overview
Two-column layout: fixed-width left sidebar (270px) + fluid main content area, full page scroll on the right.

### Sidebar (fixed/sticky, 270px wide, full height, right border 1px #EDE9E3, padding 32px 24px)
- Logo "KD." — Playfair Display, 34px, color #C4A265
- Sub-label "KARINA DRIES EVENTOS • GV • MG" — 9px, letter-spacing 0.18em, color #A8A29A
- Divider line
- Nav list (6 items, click scrolls to section):
  01 APRESENTAÇÃO · 02 COMO CUIDAMOS · 03 PROCESSO · 04 EXCELÊNCIA · 05 INVESTIMENTO · 06 DEPOIMENTOS
  Each item: small gold index number (#C4A265, 10px) + label (12px, letter-spacing 0.06em)
- "Resumo Dinâmico" card (pushed to bottom via margin-top:auto): border 1px #EDE9E3, radius 14px, padding 18px
  - Header row: "RESUMO DINÂMICO" (10px, #A8A29A) + "AO VIVO" pill (bg #F3EEE5, text #B08D4F)
  - Rows: Pacote (tier name), Convidados (guest count)
  - Divider, then "TOTAL" label (9px) + big price (Playfair Display 26px)
  - Installment line: "em até 6x de R$X sem juros" (10px, #A8A29A)
  - Gold gradient CTA button "ACEITAR AGORA →" (gradient #C4A265→#E8CFA0, white text, pill radius)
  - Small caption "garantia e contrato digital"
- Countdown box: border 1px #EDE9E3, radius 12px, "⏱ EXPIRA EM [countdown]"
- Footer tagline: "KD. ORGANIZAMOS SONHOS, CRIAMOS MEMÓRIAS." (9px, color #C9C2B6)

### Main content sections (each padded 90px 56px, separated by 1px #EDE9E3 top border)

**1. Hero** (`#hero`, min-height 100vh, 2-col grid ~1.05fr/1fr)
- Left: eyebrow pill "PROPOSTA EXCLUSIVA PARA [Nome] ✎" (dashed underline on name)
- H1 Playfair Display 52px/1.08: "15 ANOS. UM MOMENTO PARA FICAR" + italic gold line "PARA SEMPRE."
- Paragraph (15px, color #6B6560, max-width 480px) with bolded guest name
- 3 meta items with emoji icons: date (📅), guest count (👥), venue (📍) — bold 13px title + 11px gray subtitle
- 2 CTA buttons: gold gradient "⚡ VER PACOTES" (pill) + outline "▷ ASSISTA O TEASER"
- "💬 Deixar comentário" link
- Right: full-bleed video/image placeholder (dark #2B2723 bg, diagonal stripe pattern), centered play button (84px circle, white bg), "TEASER • 45s" pill, bottom-overlay package summary card (glass dark bg, crown icon, package name, strikethrough price, "DISPONÍVEL" status dot)

**2. Como Cuidamos** (`#cuidados`) — H2 + "💬 Comentar" button top-right; 5-column grid of icon cards (icon in circle chip, bold title, gray description). Items: Planejamento, Fornecedores, Coordenação, Acompanhamento, Tranquilidade.

**3. Nosso Processo** (`#processo`) — H2, subtitle copy, "💬 Comentar processo" link top-right; 5-column grid of clickable step cards (numbered 01–05, top border accent bar highlights gold when expanded/active, title + expandable description on click). Steps: Conexão, Planejamento, Preparativos, Alinhamentos, O Grande Dia.

**4. Excelência em Cada Detalhe** (`#galeria`) — H2 + "GALERIA • CLIQUE PARA EXPANDIR" label + comment button; 6-column image gallery grid, 3:4 aspect ratio placeholders.

**5. Investimento** (`#investimento`, bg #FBF8F2) — H2 + "CALCULADORA AO VIVO" pill + validity countdown pill (top-right); subtitle copy.
- 3-column pricing tier cards (Essencial R$4.900, Completa R$6.900 "MAIS ESCOLHIDA", Premium R$9.700 "LUXO TOTAL"): badge pill, name, tagline, radio dot selector, big Playfair price, "à vista" caption, checklist of features (gold check icons). Selected tier gets 2px gold border + filled radio dot.
- 2-column bottom row:
  - "Personalize sua Festa" card: guest-count range slider (80–300, default 150, gold thumb), min/max/base labels, chá de debutante toggle switch (+R$800), tip callout box, comment link
  - "Resumo Financeiro" card: live line-item breakdown (pacote base, convidados extra, chá if enabled), divider, TOTAL (big Playfair price) + installment line, gold CTA "ACEITAR PROPOSTA →", 3 trust badge chips (Garantia total / Suporte 2h / Top 1% GV)
- Full-width "Satisfação Garantida" guarantee banner below

**6. Depoimentos** (`#depoimentos`) — H2 + prev/next carousel arrow buttons; testimonial card (bg #FBF8F2, star rating, italic Playfair quote, name + meta, pagination dots — active dot widens to pill).
- Closing statement: centered Playfair headline "Os 15 anos acontecem uma vez. Nossa missão é eternizá-los." + stats line "KARINA DRIES • 127 FESTAS • 9 ANOS • GOVERNADOR VALADARES & REGIÃO"

## Interactions & Behavior
- Nav clicks smooth-scroll to the corresponding section by id.
- Selecting a pricing tier updates the selected state, sidebar summary, and financial summary total in real time.
- Guest-count slider updates guest total everywhere live; extra guests beyond the 150 included in the base package add cost (R$25/guest in the prototype — confirm real pricing rule with business).
- Chá de debutante toggle adds/removes a flat R$800 and its line item in the financial summary.
- Total price = tier base price + (guests over 150) × per-guest rate + chá (if on). Installment = total / 6, "sem juros" (no interest).
- Countdown timers (sidebar "expira em" and investimento "validade") tick down every second from a fixed initial duration.
- Process steps expand/collapse their description on click; only one open at a time.
- Testimonial carousel: prev/next arrows cycle through 3 testimonials; dots indicate position.
- All "💬 Comentar" buttons are placeholders for a commenting feature — no destination implemented in the prototype.

## State Management
- `selectedTier`: 'essencial' | 'completa' | 'premium' (default 'completa')
- `guests`: number, 80–300 step 10 (default 150)
- `cha`: boolean (default false)
- `expandedStep`: index of open process step (default 0, -1 = none)
- `testimonialIndex`: 0–2 (default 0)
- `secondsLeft`: countdown seconds, ticks down every 1000ms
- Derived: `total`, `installment`, `guestsExtraCost` computed from the above on every render

## Design Tokens
**Colors**
- Background (page): #FFFEFB
- Background (alt sections): #FBF8F2
- Ink / text primary: #2B2723
- Text secondary: #6B6560
- Text muted: #8A8479
- Text faint: #A8A29A / #C9C2B6
- Border: #EDE9E3
- Accent gold: #C4A265 (gradient to #E8CFA0)
- Accent gold pill bg: #F3EEE5, text #B08D4F
- Dark hero panel: #2B2723

**Typography**
- Display/headings: 'Playfair Display' (serif), weights 400/500/600, italic used for accent phrases
- Body/UI: 'Inter' (sans-serif), weights 300–600
- H1: 52px/1.08. H2 section titles: 30px. Body copy: 12–15px. Labels/eyebrows: 9–11px, letter-spacing 0.06–0.22em.

**Spacing / Radius**
- Section padding: 90px vertical, 56px horizontal
- Card border-radius: 14–18px; pills/buttons: fully rounded (999px)
- Grid gaps: 14–20px

## Assets
All imagery in the prototype is a placeholder (striped/solid color blocks with monospace labels describing intended content: teaser video/cover photo, gallery photos of table settings, flowers, venue, rings, etc.). Real photography/video assets need to be sourced from Karina Dries Eventos and dropped in during implementation.

## Files
- `Proposta.dc.html` — full design reference (streaming component template + logic class combined into one file, includes inline styles and interactive state logic for reference).
