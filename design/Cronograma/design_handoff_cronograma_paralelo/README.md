# Handoff: Cronograma Paralelo de Evento (raias por equipe)

## Overview
Cronograma operacional para o dia de um evento (ex.: casamento) que resolve o problema
de **paralelismo**: várias equipes (Som, Decoração, Buffet, Fotografia, Cerimônia) trabalham
ao mesmo tempo, então um cronograma vertical linear (uma coluna, tarefa após tarefa) não
representa a realidade. Este design usa duas visões complementares:

- **Raias · panorama** — o tempo corre na vertical (eixo de horas à esquerda) e **cada equipe é uma coluna**. Um bloco = uma tarefa, posicionado pela hora de início, com altura proporcional à duração. Tarefas simultâneas de equipes diferentes aparecem lado a lado na mesma altura. Serve para o cerimonialista ver o panorama e detectar conflitos no planejamento.
- **Lista · sequência** — a lista vertical clássica ordenada por horário, para o operacional no dia (celular, uma coisa de cada vez). Mostra um badge "⇄ Simultânea" nos itens que se sobrepõem a outra tarefa.

Recursos-chave: linha "Agora" que segue o relógio real, detecção de **choque de equipe**
(mesma equipe em 2 tarefas ao mesmo tempo), e **atraso em cascata** com preview e dependências
`dura`/`suave`.

## About the Design Files
Os arquivos deste bundle são **referências de design feitas em HTML** — protótipos que mostram o
visual e o comportamento pretendidos, **não** código de produção para copiar direto. A tarefa é
**recriar estes designs no ambiente do codebase de destino** (React, Vue, SwiftUI, nativo, etc.),
usando os padrões e bibliotecas já estabelecidos lá. Se ainda não houver ambiente, escolha o
framework mais apropriado e implemente os designs nele.

`Cronograma Paralelo.dc.html` é um "Design Component": a marcação vive num template com holes
`{{ ... }}` e a lógica numa classe `Component` (React-like). `support.js` é apenas o runtime que
renderiza esse formato no navegador — **não** precisa ser portado; use-o só para rodar o protótipo
localmente. Toda a lógica de negócio relevante (modelo de dados, cálculo de status, choque e
cascata) está descrita abaixo e no arquivo `LOGICA.md`.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, estados e interações são finais.
Recriar a UI fielmente usando as bibliotecas/design system do codebase. As cores estão em `oklch()`
— há uma tabela de equivalência aproximada em hex na seção Design Tokens.

## Screens / Views

### 1. Cabeçalho (header)
- **Layout:** linha flex, `space-between`, wrap. Padding do container: `28px 32px 48px`. Largura máxima do conteúdo: `1240px`, centralizado.
- **Esquerda:** eyebrow "CRONOGRAMA DO DIA · VISÃO POR EQUIPES" (12px, 600, uppercase, letter-spacing .06em, roxo primário) → título "Casamento Marina & Rafael" (28px, 800, letter-spacing -.02em) → subtítulo data/local (14px, cinza).
- **Direita:** bloco "Progresso do dia" com barra (160×8px, trilho cinza, preenchimento verde `oklch(0.6 0.19 150)`, % calculado) + pill "Agora HH:MM" (fundo roxo primário, texto branco, 700, com ponto branco pulsando — animação `omBlink` 1.4s).

### 2. Faixa de alertas (abaixo do header)
Linha flex com dois cards:
- **"A seguir" (banner roxo):** gradiente `100deg, oklch(0.55 0.19 285) → oklch(0.5 0.2 300)`, texto branco, radius 16px, padding 14px 18px. Mostra: label "A SEGUIR", horário grande (22px, 800), separador vertical, título + "equipe · em X min". Quando não há próxima tarefa: "Nada mais agendado — dia encerrado 🎉".
- **"Choque de equipe" (card, condicional):** só aparece se houver choque. Fundo `oklch(0.97 0.04 25)` (vermelho claro), borda `oklch(0.85 0.09 25)`, radius 16px. Título "⚠ CHOQUE DE EQUIPE" e uma linha por equipe em choque: "**Som / DJ** em 2 tarefas ao mesmo tempo — provável a mesma pessoa".

### 3. Barra de controles
Linha flex `space-between`:
- **Esquerda — seletor de visão (segmented control):** container `oklch(0.94 0.008 285)`, padding 4px, radius 12px. Duas abas: "Raias · panorama" e "Lista · sequência". Aba ativa: fundo branco + sombra `0 1px 3px rgba(30,20,60,.1)`; inativa: transparente, texto cinza.
- **Direita:** botão "↺ Desfazer atrasos" (condicional, aparece se houver algum atraso aplicado; estilo laranja claro) + legenda "Equipes:" + chips de cada equipe (pill branca com ponto colorido + nome).

### 4. Visão RAIAS (timeline por equipe)
- **Container:** card branco, borda `oklch(0.91 0.008 285)`, radius 18px. Área rolável de **altura fixa 660px**, `overflow:auto`, `position:relative`.
- **Cabeçalho de colunas (sticky top):** coluna "Hora" (largura fixa **74px**) + uma coluna por equipe (flex:1). Cada cabeçalho de equipe: ponto colorido + nome (13.5px, 700) + badge "⚠" se a equipe tem choque + contagem "N tarefas".
- **Corpo:** altura = `(END - START) * ppm` px, onde `START=13:00`, `END=23:00` (em minutos), `ppm` = pixels por minuto (padrão **1.9**). `min-width:820px`.
  - **Linhas de grade:** uma linha horizontal por hora (`oklch(0.94 0.006 285)`), condicional ao toggle `showGrid`.
  - **Coluna de horas:** fixa à esquerda (74px), rótulos "13:00"…"23:00" centralizados na altura de cada hora.
  - **Colunas de equipe:** cada uma `position:relative`, borda direita sutil. Blocos posicionados em absolute.
  - **Blocos de tarefa:** `position:absolute; top=(início-START)*ppm; height=(duração)*ppm`. Largura por sub-coluna (ver "Empacotamento" em Interactions). Radius 11px, `overflow:hidden`. Conteúdo: linha título (+ badge ⚠ inline se choque em bloco estreito) → faixa de horário "13:00–15:30" (com "era HH:MM" riscado se atrasada) → chip de status (ou ponto de status em slots estreitos) + botão "+15 min" → alerta de choque por extenso (blocos altos) → nota em itálico (blocos altos).
  - **Linha "Agora":** faixa horizontal roxa (2px) em `top=(now-START)*ppm`, com badge "HH:MM" à esquerda (dentro da coluna de horas, `top:3px` para não colidir com o rótulo da hora).
- **Legenda** abaixo do card: Concluído / Em andamento / Pendente / Choque de equipe + dica.

**Estados visuais do bloco:**
- **Concluído** (`fim <= agora`): fundo suave da cor da equipe, borda esquerda 4px média, `opacity .72`; chip verde "✓ Concluído".
- **Em andamento** (`início <= agora < fim`): fundo suave, borda 1.5px + esquerda 4px na cor da equipe, sombra colorida; chip sólido na cor da equipe "Em andamento"; ponto pulsando (`omBlink` 1.2s) antes do título.
- **Pendente** (`início > agora`): fundo branco, borda tracejada 1.5px + esquerda 4px clara; chip cinza "Pendente".
- **Choque** (sobrepõe: `+= border:2px solid oklch(0.6 0.2 25); background:oklch(0.98 0.03 25)`).
- **Atrasada** (`+= box-shadow:0 0 0 2px oklch(0.7 0.16 30) inset`).

### 5. Visão LISTA
- Coluna flex, gap 10px, `max-width:820px`. Uma linha por tarefa, ordenada por início efetivo.
- **Linha (row):** flex, padding 14px 16px, radius 14px, borda `oklch(0.92 0.008 285)`, fundo branco.
  - **Caixa de horário** (66px, fundo `oklch(0.97 0.006 285)`, radius 10px, 800/15px): horário de início; "+Nm" laranja embaixo se atrasada.
  - **Barra colorida** vertical 5px na cor da equipe.
  - **Corpo:** título (15px, 700) + badge "⇄ Simultânea" (clicável, expande "Acontece junto com") + badge "⚠ Choque de equipe" (se aplicável). Abaixo: equipe (ponto + nome, na cor da equipe) + range "13:00–15:30" + "era …" riscado se atrasada. Nota em itálico se houver. Painel expandido "Acontece junto com": chips das tarefas simultâneas.
  - **Direita:** chip de status + botão "+15 min" (se não concluída).
  - **Live:** borda roxa + sombra; chip roxo. **Choque:** borda vermelha.

### 6. Modal de atraso (preview de cascata)
Overlay `rgba(30,20,50,.4)`, card branco centralizado (max 440px), radius 20px, animação de entrada `omPop` .18s.
- Título: "Atrasar **{tarefa}** em +15 min?"
- **Se há impacto (dependentes `dura`):** texto "Vai empurrar N tarefa(s) com dependência **dura**:", lista de dependentes (ponto colorido + título + equipe + "HH:MM → HH:MM" com origem riscada e destino laranja), nota "Dependências **suaves** e tarefas sem vínculo continuam iguais". Botões: **"Confirmar · empurra N"** (roxo, primário) e **"Só essa"** (cinza).
- **Se não há impacto:** texto explicando que não afeta ninguém. Botões: **"Aplicar +15 min"** (roxo) e "Cancelar" (cinza).
- Fecha ao clicar no backdrop; clique no card não propaga.

## Interactions & Behavior

### Linha "Agora" / relógio
- Por padrão segue o **relógio real** (`new Date()` → minutos desde 00:00), atualizando a cada **30s** via `setInterval`, com clamp na janela `[START, END]`.
- Há um modo de **simulação** (prop/toggle `simular`): quando ligado, a posição vem do controle `nowMinutes` (slider) em vez do relógio. Serve para demonstrar/testar qualquer horário.

### Empacotamento de sub-colunas (raias) — importante
Quando 2+ tarefas **da mesma equipe** se sobrepõem no tempo, elas não podem ocupar a coluna inteira (senão se empilham). Algoritmo:
1. Ordena as tarefas da equipe por início.
2. Atribuição gulosa de colunas: cada tarefa vai para a **primeira** coluna cujas tarefas não conflitam com ela; se nenhuma serve, cria nova coluna. `nCols` = número de colunas criadas.
3. Para cada tarefa, calcula `colSpan`: quantas colunas livres à direita ela pode ocupar durante seu intervalo (estende até achar uma coluna ocupada por tarefa concorrente).
4. Posição: `left = (col * 100/nCols)% + 6px`, `width = (span * 100/nCols)% - 12px`.

Resultado: tarefas sem sobreposição ocupam a coluna inteira; **apenas o par em choque** divide a largura (meia largura cada), ficando visivelmente em paralelo. Em slots estreitos (`span < nCols`) o bloco entra em modo "compacto/apertado": esconde horário/nota/botão e o chip de status vira um **ponto colorido** (evita clip do texto).

### Detecção de choque de equipe
Choque = existe outra tarefa **da mesma equipe** cujo intervalo se sobrepõe (`a.início < b.fim && b.início < a.fim`). Usa apenas o dado que já existe (a equipe) — não exige cadastrar pessoa/recurso. Renderiza: borda vermelha no bloco, badge ⚠ (inline em blocos estreitos, frase por extenso em blocos altos), badge no cabeçalho da raia, e card de alerta no topo. Há um choque **proposital** nos dados de exemplo (Som/DJ: "Montagem de som" 13:00–15:30 × "Teste de microfones" 14:00–14:45).

### Atraso em cascata
- Cada tarefa pode ter `dep` (id da tarefa anterior) e `depType`: **`dura`** (tem que terminar antes — empurra) ou **`suave`** (ideal terminar antes, mas pode rodar em paralelo — **nunca** empurra).
- Botão "+15 min" abre o modal com preview. `duraChain(id)` percorre recursivamente só os dependentes `dura` (BFS), calculando os novos horários.
- **"Confirmar"**: aplica +15 na tarefa **e** em cada dependente `dura` da cascata.
- **"Só essa"**: aplica +15 só na tarefa clicada.
- Atrasos ficam num mapa `delays[taskId] = minutos acumulados`. O horário efetivo é `base + delay`. O horário original é preservado e mostrado riscado ("era HH:MM"). "Desfazer atrasos" zera o mapa.
- Teste: atrasar "Chegada do buffet" → cascata dura empurra "Mise en place" → "Coquetel" → "Jantar". Já "Passagem de som" → "Áudio da cerimônia" é `suave`, então não empurra.

### Status por horário
`status = fim <= agora ? "done" : (início <= agora ? "live" : "pending")`. Progresso do dia = `done / total` (arredondado).

## State Management
- `view`: `"raias" | "lista"` — visão ativa.
- `open`: id da tarefa com painel "Acontece junto com" aberto na lista (ou null).
- `delays`: `{ [taskId]: minutos }` — atrasos acumulados.
- `preview`: `null | { id, title, impacted: [...] }` — dados do modal de atraso.
- `clock`: minutos do relógio real, atualizado a cada 30s.
- Props/tweaks: `simular` (bool), `nowMinutes` (range 780–1380, step 5), `zoom` (ppm, range 1.2–3.4), `showGrid` (bool).

## Design Tokens
Cores em `oklch()` (hex aproximado para referência):
- **Roxo primário:** `oklch(0.55 0.19 285)` ≈ `#7C5CE6` · escuro `oklch(0.46 0.19 285)` ≈ `#5B3FC4`
- **Fundo app:** `oklch(0.98 0.004 285)` ≈ `#F7F6FB` · **branco de card:** `#FFFFFF`
- **Texto:** `oklch(0.28 0.02 285)` ≈ `#3A3550` · **cinza secundário:** `oklch(0.5 0.02 285)` ≈ `#6E6980`
- **Bordas:** `oklch(0.91 0.008 285)` ≈ `#E7E4EE`
- **Verde (progresso/concluído):** `oklch(0.6 0.19 150)` ≈ `#2FA36B`
- **Vermelho (choque):** `oklch(0.6 0.2 25)` ≈ `#E0503C` · claro `oklch(0.97 0.04 25)` ≈ `#FDECE8`
- **Laranja (atraso):** `oklch(0.5 0.16 30)` ≈ `#C55A32` · claro `oklch(0.97 0.03 30)` ≈ `#FBEDE6`
- **Cores por equipe** (hue no oklch, L/C base `0.6 0.19`): Som/DJ 285 (roxo), Decoração 20 (vermelho-terra), Buffet 70 (âmbar), Fotografia 180 (teal), Cerimônia 250 (azul). Fundo suave por equipe: `oklch(0.965 0.03 <hue>)`.

- **Tipografia:** família **Plus Jakarta Sans** (Google Fonts, pesos 400–800). Título 28/800, seção 13.5/700, corpo 13–15/600–700, labels 11–12/600.
- **Radius:** cards 18px, timeline card 18px, blocos 11px, rows 14px, caixas internas 10px, pills 99px.
- **Sombras:** card `0 1px 3px rgba(30,20,60,.04)`; bloco live `0 4px 14px oklch(0.6 0.19 <hue> / .22)`; modal `0 24px 60px rgba(30,20,60,.3)`.
- **Constantes de escala:** `START=780` (13:00), `END=1380` (23:00), `ppm` padrão `1.9`, coluna de horas `74px`, timeline `height:660px`.
- **Keyframes:** `omBlink` (opacidade 1→.3→1, pulso do "agora"), `omPop` (entrada do modal).

## Assets
Nenhuma imagem. Apenas a fonte **Plus Jakarta Sans** via Google Fonts e dois emojis (🎉 no estado "dia encerrado", ⚠ nos alertas). Ícones são desenhados com CSS (quadrados/pontos coloridos). Se o codebase tiver um sistema de ícones, substituir o ⚠ e o "↺" pelos equivalentes.

## Files
- `Cronograma Paralelo.dc.html` — protótipo hifi completo (template + lógica). Referência visual e comportamental.
- `support.js` — runtime do formato de protótipo (não portar; só para rodar localmente abrindo o `.dc.html` no navegador).
- `LOGICA.md` — modelo de dados (TASKS, PALETTE) e pseudocódigo das regras (empacotamento, choque, cascata, status) prontos para reimplementar.
