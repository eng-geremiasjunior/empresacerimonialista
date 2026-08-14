# Handoff: Tela de Orçamentos — Ateliê Vela (redesign *quiet luxury*)

## Overview
Redesign da tela **Orçamentos** de um SaaS de cerimonial/assessoria de eventos.
A tela lista propostas (orçamentos) enviadas a clientes, com métricas no topo,
busca, filtros e uma lista em estilo "documento". Objetivo: passar de um visual
de dashboard genérico para uma estética sóbria e profissional (Notion /
Superhuman — *quiet luxury*), e trazer as **informações básicas do cliente já
de cara** para a cerimonialista.

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** —
protótipos que mostram o visual e o comportamento pretendidos, **não** código
de produção para copiar diretamente. A tarefa é **recriar este design no
ambiente do seu codebase** (React, Vue, Svelte, etc.), usando os componentes,
tokens e padrões já existentes no projeto. Se ainda não houver um front-end
estruturado, escolha o framework mais adequado e implemente lá.

- `Orcamentos.reference.html` — protótipo completo. É um "Design Component":
  o markup (com estilos inline) fica dentro de `<x-dc>…</x-dc>`; a lógica fica
  na classe `Component` no `<script data-dc-script>` ao final. Os `{{ … }}` são
  bindings — leia-os como "este valor vem do método `renderVals()`".
- `orcamentos.logic.js` — a **lógica portável** (filtro, ordenação, formatação,
  alerta de validade, paletas) extraída em funções puras e comentadas. Use como
  fonte de verdade das regras de negócio.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e interações são
finais. Recrie a UI fielmente usando as bibliotecas/design system do seu
codebase; os valores exatos estão em *Design Tokens*.

## Screens / Views

### Tela: Orçamentos (lista)
- **Purpose**: a cerimonialista visualiza, filtra, ordena e abre orçamentos;
  identifica cliente e status de relance e prioriza follow-ups.
- **Layout**: dois painéis lado a lado, altura total da viewport.
  - **Sidebar** fixa, `236px`, fundo `#F7F7F5`, borda direita `1px #E9E9E7`.
    Logo "Vela" (quadrado chumbo + wordmark serif) no topo; navegação vertical;
    bloco de usuário fixado no rodapé (`margin-top:auto`).
  - **Main** rolável, conteúdo centralizado com `max-width:1080px`,
    `padding:34px 48px 80px`.
- **Componentes** (topo → base do main):
  1. **Topbar**: data por extenso à esquerda (`12.5px`, `#B4B1A9`);
     indicador "9+ novidades" à direita com bolinha `#C08A4E`.
  2. **Cabeçalho**: `<h1>` "Orçamentos" (serif Newsreader, `34px`/500,
     `letter-spacing:-0.3px`) + subtítulo (`14px`, `#8A867C`).
     À direita: botão secundário "Modelos de precificação" (borda `#E9E9E7`,
     hover fundo `#F7F7F5`) e botão primário "＋ Novo orçamento"
     (fundo `#37352F`, texto `#F7F7F5`, hover `#000`). Raio `9px`.
  3. **Métricas**: grid de 4 colunas dentro de um contêiner único
     (borda `1px #E9E9E7`, raio `14px`, divisórias verticais entre cards).
     Cada card: rótulo em caixa-alta (`10.5px`, `letter-spacing:1px`, `#B4B1A9`)
     e número em serif `30px`/500 + sufixo colorido.
     **Cards "Em aberto" e "Aprovados" são CLICÁVEIS** e filtram a lista
     (ver Interações). Card ativo recebe fundo `#F2F1EE`. "Total de orçamentos"
     limpa o filtro; "Taxa de conversão" não é clicável.
  4. **Controles** (duas linhas):
     - Linha 1: busca (fundo `#F7F7F5`, borda `#E9E9E7`, raio `10px`,
       placeholder "Buscar por contato ou telefone…") + chips de **status**
       (Todos / Aprovados / Enviados).
     - Linha 2: rótulo "TIPO DE EVENTO" + chips de **tipo**
       (Todos os tipos / Casamento / Debutante).
     - Chip ativo: fundo `#37352F`, texto `#F7F7F5`. Inativo: fundo branco,
       borda `#E9E9E7`, texto `#6B6862`. Raio `10px`, `padding:9px 15px`.
  5. **Cabeçalho de colunas** (grid `2.4fr 1.1fr 1.1fr 1fr 1.3fr 1.1fr`,
     `gap:16px`): Cliente · Evento · Data prevista · Valor · Validade · Status.
     **"Data prevista" e "Valor" são clicáveis para ordenar**, com seta ↑/↓.
  6. **Linhas** (mesmo grid): cada linha é um link (abre o orçamento) + resumo
     que expande no hover. Detalhe de cada célula:
     - **Cliente**: avatar circular `36px` com iniciais (paleta por tipo:
       casamento `#EDE9E2`/`#8A6E4B`, debutante `#EAEAE6`/`#6E7A6A`), nome em
       serif `16px`/500 e telefone formatado `(DD) NNNNN-NNNN` (`12px`,`#B4B1A9`).
     - **Evento**: tag suave (fundo `#F2F1EE`, `#8A867C`, raio `6px`).
     - **Data prevista**: `dd mmm aaaa` — **o ano é obrigatório** (há eventos em
       anos diferentes). `13.5px`, `#37352F`.
     - **Valor**: serif `16px`/500, `R$ x.xxx` (locale pt-BR).
     - **Validade**: texto + ponto colorido; muda conforme proximidade do
       vencimento (ver Interações). `12.5px`.
     - **Status**: bolinha + rótulo (Aprovado `#5A7A55`/`#7A9B6E`,
       Enviado `#9A7B3E`/`#C08A4E`); tag "Evento" opcional; botão **⋮** (kebab).
  7. **Rodapé da lista**: "Mostrando X de Y orçamentos" e estado vazio.

## Interactions & Behavior
- **Abrir orçamento**: clicar em **qualquer parte da linha** navega para o
  orçamento (a linha é um `<a>`). O kebab **⋮** NÃO abre a linha
  (`preventDefault` + `stopPropagation`).
- **Menu de ações (⋮)**: dropdown ancorado à direita (`168px`, raio `10px`,
  sombra `0 8px 28px rgba(55,53,47,.12)`) com: Editar orçamento · Duplicar ·
  Enviar por WhatsApp · —— · **Excluir** (texto `#B0553F`, hover `#F7EEEB`).
- **Busca**: filtra por nome (case-insensitive) OU telefone (apenas dígitos).
- **Filtros de status/tipo**: chips e cards de métrica compartilham o mesmo
  estado de status. Clicar num card ativo (ou no chip ativo) alterna de volta
  para "todos".
- **Ordenação**: clicar em "Data prevista" ou "Valor" ordena; clicar de novo na
  mesma coluna inverte a direção (asc↔desc). Coluna nova começa em asc.
  Seta ↑ = asc, ↓ = desc. Ordenação inicial: data, asc.
- **Alerta de validade**: calculado contra a data de "hoje".
  - `> 30 dias`: "Válido até dd/mm/aaaa", cor `#B4B1A9`, sem ponto.
  - `0–30 dias`: "Vence em N dias", cor âmbar `#9A7B3E`, com ponto.
  - vencido: "Vencido em dd/mm/aaaa", cor `#B0553F`, com ponto.
- **Hover na linha**: fundo `#F7F7F5` e expansão suave de um resumo com
  **Local · Convidados · Horário · Pacote · E-mail** + botão "Falar com
  cliente". Transição: `max-height`/`transform`/`opacity`,
  `cubic-bezier(.22,.61,.36,1)`, ~`0.35–0.42s`, leve `translateY(-4px)→0`.

## State Management
Estado da tela:
- `query: string` — texto da busca.
- `status: 'todos' | 'aprovado' | 'enviado'` — compartilhado por chips e cards.
- `type: 'todos' | 'casamento' | 'debutante'`.
- `sortKey: 'date' | 'value'`, `sortDir: 'asc' | 'desc'`.
- `hovered: index` — linha com resumo aberto (`-1` = nenhuma).
- `openMenu: index` — linha com menu ⋮ aberto (`-1` = nenhum).

Pipeline por render: `filtrar (query+status+type) → ordenar (sortKey/sortDir)`.
Ver funções `selectRows`, `nextSort`, `toggleStatFilter`, `validityInfo` em
`orcamentos.logic.js`. Dados devem vir da API real (a lista aqui é exemplo).

## Design Tokens
**Cores**
- Fundo: `#FFFFFF`
- Sidebar / hover de linha / superfícies suaves: `#F7F7F5`
- Tag / card ativo: `#F2F1EE`
- Texto principal (chumbo quente): `#37352F`
- Texto secundário: `#8A867C` · terciário/placeholder: `#B4B1A9` · nav: `#6B6862`
- Bordas: `#E9E9E7` (padrão) · `#E4E2DD` (mais sutil)
- Ativo/seleção (nav, avatar casamento bg): `#EDE9E2`
- Status Aprovado: texto `#5A7A55`, ponto `#7A9B6E`
- Status Enviado / âmbar / alerta suave: texto `#9A7B3E`, ponto/acento `#C08A4E`
- Alerta vencido / destrutivo: `#B0553F` (hover `#F7EEEB`)
- Botão "Falar com cliente": texto `#5A7A55`, borda `#DCE4D8`, hover `#EFF3ED`
- Avatar casamento: bg `#EDE9E2` / `#8A6E4B` · debutante: bg `#EAEAE6` / `#6E7A6A`

**Tipografia**
- Títulos/valores/nome do cliente: **Newsreader** (serif), pesos 400–600.
- Corpo/UI: stack estilo Apple —
  `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif`.
- Escala: h1 `34px`/500 · valor & nome `16px`/500 · corpo `13.5–14px` ·
  labels caixa-alta `10.5px` (`letter-spacing:0.8–1px`) · meta `11–12.5px`.

**Raio**: cards `14px` · inputs/botões `9–10px` · chips `10px` · tags `6px` ·
avatar `50%`.

**Sombra**: dropdown `0 8px 28px rgba(55,53,47,0.12)`.

**Grid da lista**: `2.4fr 1.1fr 1.1fr 1fr 1.3fr 1.1fr`, `gap:16px`,
`padding:14px 12px` por linha.

**Transições**: hover/expansão `cubic-bezier(.22,.61,.36,1)` `0.32–0.42s`.

## Assets
- **Fonte Newsreader** via Google Fonts. No seu codebase, prefira a forma de
  carregamento de fontes já usada no projeto (self-host ou `@font-face`).
- **Sem imagens/ícones bitmap.** Ícones são glifos/formas simples: kebab "⋮",
  lupa "⌕", "＋", setas "↑/↓", bolinhas de status (CSS `border-radius:50%`).
  Substitua pelos ícones da sua biblioteca (ex.: Lucide `more-vertical`,
  `search`, `plus`, `chevron-up/down`) mantendo tamanho/cor.
- Avatares são iniciais sobre cor sólida (sem foto).

## Files
- `Orcamentos.reference.html` — protótipo hifi (markup + lógica).
- `orcamentos.logic.js` — regras portáveis (filtro, sort, validade, formatação).
- `README.md` — este documento (auto-suficiente).
