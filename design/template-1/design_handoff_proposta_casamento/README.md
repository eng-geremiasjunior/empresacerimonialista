# Handoff: Proposta de Casamento — Karina Dries Eventos (Marina & João)

## Overview
An interactive wedding-planner sales proposal page. Single long-scroll page with a sidebar nav (scrollspy), a live countdown ("proposta válida por"), an interactive pricing calculator (package selection, guest slider, add-on toggles, installment options, live totals), an about section, an "included" grid, a 6-step process timeline (with detail modals), a wedding-day feature section, a gallery + testimonials band, a final CTA with a digital-signature contract modal (two signature canvases) and a WhatsApp-share receipt modal, plus a comments box.

## About the Design Files
The bundled HTML/`.dc.html` files in this package are **design references** built in an HTML prototyping tool — they show the intended look and behavior, not production code to copy verbatim. The original file the client supplied was a compiled/minified React bundle (unreadable source); this package de-obfuscates it into plain specs and a working reference build so it can be reliably re-implemented. Recreate this UI in the target codebase's existing framework/component library and patterns. If no codebase exists yet, plain React (or the team's default stack) is a reasonable choice — this design has no dependency on any specific framework.

## Fidelity
**High-fidelity (hifi).** Colors, type sizes, spacing, copy, and calculator logic below are exact values extracted from the client's original bundle — not approximations. Recreate pixel-perfectly.

## Design Tokens
- Colors: background `#F9F5F0` (page), `#FDFCFB` (sidebar/cards), border `#E8DDD2`, text `#3C2415` (dark brown, also used as a dark section bg), muted text `#6B5A4B`, tertiary/label text `#8B7355`, gold accent `#B8935A`, success dot `#3CA37A`.
- Fonts: headings — "Cormorant Garamond" (serif), weights 400/500/600/700. Body/UI — "Inter", weights 400/500/600. Google Fonts import: `family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600`.
- Radii: small chips/buttons 999px (pill), cards 16–28px.
- Shadows: hero card `0 10px 40px -15px rgba(60,36,21,0.15)`; selected package card `0 20px 60px -20px rgba(60,36,21,0.3)` + `scale(1.02)`.
- Letter-spacing: nav/labels 0.1–0.22em uppercase, 11px.

## Screens / Sections (single scrolling page, in order)
1. **Top progress bar** — fixed, 3px, track `#E8DDD2`, fill `#B8935A`, width = % of page scrolled.
2. **Sidebar (desktop, fixed left, 240px)** — logo "KD" monogram + "KARINA DRIES / EVENTOS" wordmark, 9-item scrollspy nav (`APRESENTAÇÃO, QUEM SOMOS, O QUE ESTÁ INCLUSO, COMO FUNCIONA, NO DIA DO CASAMENTO, INVESTIMENTO, EVENTOS REALIZADOS, DEPOIMENTOS, PRÓXIMOS PASSOS`), active item = dark-brown pill with pulsing gold dot; bottom "DÚVIDAS?" WhatsApp card. Below 1024px: collapses to a sticky top bar with a hamburger that opens a 2-column nav grid.
3. **Countdown bar** — dark-brown strip: "⏱ PROPOSTA VÁLIDA POR:" + 4 pill chips (days/hours/minutes, seconds pill in gold), counting down live from a fixed deadline (10 days from first load in the original).
4. **Hero ("APRESENTAÇÃO")** — status pill "PROPOSTA DE ASSESSORIA COMPLETA • V2.0 INTERATIVA"; H1 "Proposta de / {Couple Names} ♥ / assessoria" (couple names editable inline in the reference build); italic serif quote; 3 info cards (Data: 24 de Maio 2026, Sábado 16h30 / Convidados: {n} pessoas, Villa + Jardim / Local: Espaço Villa, Curitiba PR); planner intro card.
5. **INVESTIMENTO (pricing calculator)** — heading "Invista no dia mais feliz da vida"; payment-mode toggle (`ATÉ 7X SEM JUROS` vs `5% DESCONTO À VISTA`); 3 package cards side by side:
   - **Essencial** — R$1.900, light bg, 5 features.
   - **Completa** (recommended, "MAIS ESCOLHIDO" badge) — R$2.500, dark-brown bg/white text, 7 features.
   - **Premium** — R$4.200, cream/gold-tinted bg, 7 features.
   Selecting a card sets border to dark-brown + shadow + 1.02 scale (background color per card is fixed, not selection-dependent).
   Below: "Ajustes finos" panel — guest-count slider (50–300, base 150, +R$12/guest above 150), two add-on toggle rows (Cerimônia no campo +R$600, Assessoria lua de mel +R$450), installment pill selector (3x/5x/7x). Beside it, a dark summary panel: total, discount line (if à vista), entrada (30%) card + parcela card, "ACEITAR E ASSINAR DIGITALMENTE" button.
   **Pricing formula:** `subtotal = packagePrice + max(0, guests-150)*12 + (campo?600:0) + (luaDeMel?450:0)`; `discount = paymentMode==='vista' ? subtotal*0.05 : 0`; `total = subtotal - discount`; `entrada = total*0.3`; `parcela = (total-entrada)/installments`.
6. **QUEM SOMOS (about)** — "11 anos transformando SIM em arte", bio paragraph, stat cards (320+ casamentos, 4.9★ avaliação média).
7. **O QUE ESTÁ INCLUSO** — 2-col grid, 5 cards (icon + title + short desc; "VER DETALHES" expands to a longer paragraph in place): Planejamento Total, Curadoria Premium, Design & Estilo, No Dia - 12h, Pós-Casamento. Full copy in Content section below.
8. **COMO FUNCIONA (process timeline)** — 6-step horizontal timeline (numbered circles 01–06) with a connecting line; "VER EXPLICAÇÃO COMPLETA DO PROCESSO" opens a modal listing all 6 steps' long descriptions; clicking a single step opens a small modal with just that step's long text.
9. **NO DIA DO CASAMENTO** — 4 small feature cards (kit emergência, coordenação, recepção VIP, kit noiva) + 2 photo slots.
10. **EVENTOS REALIZADOS + DEPOIMENTOS** — dark-brown full-bleed band: 3 event photo thumbnails, and 3 testimonial cards (name + quote).
11. **PRÓXIMOS PASSOS (final CTA)** — 3-step "como fechamos" list, "ACEITAR PROPOSTA AGORA" button, comments box ("Observações dos noivos": list + add-comment input), footer.

## Interactions & Behavior
- **Scrollspy**: clicking a nav item smooth-scrolls to the section and highlights it; in the full build this should also update on scroll position (the reference implements click-set active + native `scrollIntoView`).
- **Countdown**: live 1s interval from a fixed epoch deadline; stops at zero.
- **Progress bar**: updates on `scroll` as `scrollY / (scrollHeight - innerHeight) * 100`.
- **Package selection**: click sets active package; price/features/total recompute.
- **Guest slider**: native range input, live-updates guest count and "+R$ extra" label.
- **Add-on toggles**: pill/switch style, toggles boolean, adds fixed amount to total.
- **Installment pills**: 3/5/7, changes parcela divisor.
- **Payment mode**: parcelado vs à vista (5% discount), mutually exclusive pill buttons.
- **Contract modal**: opens from either CTA button. Two required name fields (noiva/noivo), two `<canvas>` signature pads (mouse + touch draw, "LIMPAR" clears), a required terms checkbox. Confirm button disabled until both names filled and checkbox checked. Confirm generates a receipt id (`KD-XXXXXX-2026` random) and opens the receipt modal.
- **Receipt modal**: shows id, total, signee names; "ENVIAR NO WHATSAPP DA KARINA" opens `https://wa.me/<phone>?text=<prefilled confirmation message>`; "FECHAR" dismisses.
- **Comments**: text input + add button appends `{author:"Marina", text, time:"agora"}` to a list rendered above the input; seeded with one existing comment.
- **Animations**: fade-up on modal open (~0.4s ease); small floating pulse on the active nav dot.
- **Responsive**: sidebar becomes a collapsible top bar below 1024px (`lg` breakpoint); multi-column grids collapse to 1–2 columns on narrow viewports.

## State Management
Local component state only (no backend in the reference): active nav section, selected package key, guest count, two addon booleans, payment mode, installment count, process-modal open + selected step, contract-modal open, receipt-modal open + generated id, bride/groom name strings, terms-accepted boolean, couple display name, comments array + draft text, scroll progress, countdown remaining, mobile menu open, per-card "expanded" map for the included-items grid.

## Design Tokens — Content Reference (exact copy)

**Packages** (`price` in BRL):
- Essencial — R$1.900 — "Para casais práticos" — Assessoria 30 dias antes; Reunião de alinhamento final; Checklist personalizado; Acompanhamento no dia (8h); Coordenação de fornecedores no dia.
- Completa (recommended) — R$2.500 — "DIAMANTE • Mais escolhido" — Assessoria completa 6 meses; Visitas técnicas ilimitadas; Curadoria completa de fornecedores; 3 reuniões presenciais + online ilimitadas; Acompanhamento no dia (12h) com 2 cerimonialistas; Kit emergência noiva + RSVP + Cronograma; Ensaio fotográfico de acompanhamento.
- Premium — R$4.200 — "Experiência Platinum" — Tudo da Completa +; Assessoria desde o pedido até a lua de mel; Wedding Designer incluso; Equipe de 4 profissionais no dia; Assessoria de lua de mel completa; Gestão total de convidados e hospedagem; After-movie coordination + álbum premium.

**Included items (long text for expanded state):**
1. Planejamento Total — "Criamos um plano mestre com mais de 180 itens verificados. Você terá acesso a um dashboard exclusivo com evolução em tempo real, lembretes automáticos e reuniões quinzenais de alinhamento estratégico."
2. Curadoria Premium — "Nossa rede conta com 120+ fornecedores homologados. Negociamos em média 18% de economia para nossos casais e garantimos cláusulas de proteção que só quem faz 80 casamentos por ano consegue."
3. Design & Estilo — "Da paleta terrosa que amam ao desenho técnico da mesa de doces. Entregamos projeto 3D da decoração, papelaria artesanal e curadoria de vestido com consultoras parceiras."
4. No Dia - 12h — "Chegamos 4h antes, coordenamos 18 fornecedores, cuidamos do buquê, da gravata do noivo, da entrada da daminha. Vocês só precisam dizer SIM. Kit emergência, costureira e segurança emocional inclusos."
5. Pós-Casamento — "Após o grande dia, cuidamos da devolução de trajes, entrega de fotos, coordenação de agradecimentos e curadoria do álbum. Suporte por 30 dias pós-evento."

**Process timeline (01–06, `full` = modal detail text):**
1. Diagnóstico dos Sonhos — "Imersão de 2h para entender estilo, prioridades e non-negotiables." — full: "Encontro no nosso atelier ou online. Levantamos história de vocês, referências, orçamento real e medos. Entregamos mapa emocional do casal e definimos 3 palavras-chave que guiarão todo o casamento."
2. Curadoria & Contratações — "Apresentação de 3 opções por categoria já com valores negociados." — full: "Em até 15 dias entregamos shortlist de local, foto, vídeo, buffet, decoração e música. Visitamos juntos, negociamos contratos e centralizamos pagamentos em planilha transparente."
3. Design do Grande Dia — "Criação do projeto visual e experiências para convidados." — full: "Moodboard completo, planta baixa humanizada, projeto de iluminação cênica e roteiro de experiências (welcome drink, cerimônia, festa)."
4. Ensaios & Testes — "Prévia de maquiagem, prova de menu, ensaio e briefing final." — full: "Acompanhamos prova de vestido, teste de penteado, degustação com 5 pratos e ensaio fotográfico. 30 dias antes fazemos o ensaio geral com cronômetro."
5. Semana de Blindagem — "Confirmação de todos fornecedores e plano B de chuva." — full: "Checklist de 87 itens, confirmação individual de cada convidado VIP, kit de emergência montado, cronograma impresso e digital para todos. Entramos em modo plantão 24h."
6. O SIM Perfeito — "Execução impecável enquanto vocês vivem o melhor dia." — full: "Equipe posicionada às 6h, rádio-comunicadores, timeline minuto a minuto. Garantimos que a noiva entre 5 min atrasada por charme, não por caos."

**Testimonials:** Juliana & Marcos — "Profissionalismo absurdo. A planilha financeira nos salvou!" · Lara & Felipe — "No dia choveu e ela já tinha plano B montado. Gênia." · Bia & Thiago — "Parecia que tínhamos uma melhor amiga organizando tudo."

**Nav labels (exact, uppercase):** APRESENTAÇÃO, QUEM SOMOS, O QUE ESTÁ INCLUSO, COMO FUNCIONA, NO DIA DO CASAMENTO, INVESTIMENTO, EVENTOS REALIZADOS, DEPOIMENTOS, PRÓXIMOS PASSOS.

## Assets
All photos are placeholders in this handoff (the original used stock Unsplash URLs, which are not licensed for reuse) — drop in the client's real event photography. Icons are simple glyphs (clock, award, sparkles, heart, gift) — recreate with the target codebase's icon set (e.g. Lucide, which the original bundle used).

## Files
- `Proposta Marina & João.dc.html` — the working, fully-interactive HTML reference build (open directly in a browser).
- This README.
