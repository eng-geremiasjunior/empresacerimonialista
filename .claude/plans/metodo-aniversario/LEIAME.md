# Método do aniversário — rascunho para revisão

Estado em 13/09/2026. Nada disto está no banco nem no código ainda.

## O que foi pedido

- Começar os métodos que faltam pelo aniversário (a primeira cliente vinda
  do anúncio criou um aniversário para 17/10/2026).
- "já deixa o dela pra ter as atualizações": o evento dela recebe o método.
- "aniversário existem dos mais diversos, aniversário de criança, de adulto,
  de idosos" / "ter uma faixa etária seria interessante e o planejamento
  nascer conforme isso".

## Como foi feito

Fluxo de agentes: mapa do sistema (mecânica do método, código por tipo,
métodos vizinhos, dados vivos só em contagem) → 3 rascunhos (operação do
dia, dinheiro e fornecedor, faixa etária) → 2 juízes → síntese → 3 críticas
(domínio, conformidade, produto) → versão final. A final passou no
`conferir.mjs` sem erro nem aviso, nas 24 combinações de porte e faixa.

## Arquivos

- `metodo-final.json` — o método para revisão (15 objetivos, 7 ligados na
  base; 20 decisões; 60 campos, 23 perguntas à cliente; 25 tarefas;
  59 deltas; 21 itens de roteiro; 32 do checklist do dia; 5 recursos).
- `conferir.mjs` — `node conferir.mjs metodo-final.json` confere as regras
  duras. Rodar de novo depois de qualquer ajuste.
- `conferencia-final.json` — a saída da conferência.
- `criticas.json` — as 37 críticas que a final absorveu.
- `sintese-antes-das-criticas.json` — a versão anterior, para comparar.
- `mapa-do-sistema.md` — o levantamento, com arquivo:linha.

## As escolhas centrais

- Faixa etária é o eixo `cenario`: primeiro_ano, infantil (2 a 12),
  adolescente (13 a 17), adulto (18 a 59), sessenta_mais. Porte é `escala`
  com dois arquétipos: ate_150 (base) e acima_150.
- A base (antes de escolher a faixa) tem 11 decisões, todas com prazo de até
  30 dias. Os aniversários reais foram criados com 0, 8 e 34 dias de
  antecedência; prazo maior empilharia decisões "para hoje".
- Cada faixa soma 100% de verba entre os objetivos ligados.
- desativar só onde o item é contraindicado (bar para menores, bebê,
  recreação, lembrancinhas no adulto e nos 60+).
- Alergias e medicamentos entram como campos sensíveis.
- Âncora do roteiro: início da festa; parabéns aos 150 minutos.

## Antes de virar migração (162)

1. Revisão do conteúdo pelo dono e por uma cerimonialista (faixas de verba,
   prazos, costumes). As dúvidas estão em `perguntas_abertas`.
2. Janela: aplicada até 16/09 antes das 21h de Brasília, a base do evento de
   17/10 nasce sem compressão de prazo. Depois disso as decisões de 30 dias
   nascem "para hoje".
3. Código que precisa subir ANTES da migração: textos que dizem
   casamento/noivos no Planejamento (DrawerDecisao.tsx:897 e 1010,
   ModoFoco.tsx:538 e 549, MapaMental.tsx:572, PlanejamentoEvento.tsx:412,
   ModoAmplo.tsx:184, OrganizacaoEvento.tsx:1790).
4. Código junto com a migração: PORTE_POR_PUBLICO (capacidades.ts) com corte
   em 150; PERGUNTA_CENARIO do aniversário (StepEstruturacao.tsx) para o
   assistente perguntar a faixa etária; RoteiroPadraoSection; bloco
   Cerimônia vazio no ajuste do checklist; impressão de música lendo
   musica_parabens; listas de tipos com método (guia-vivo.ts,
   recursos-do-sistema.ts).
5. Migração no molde da 141: seeds aditivos; CHECK superconjunto de
   events.escala/cenario com os tokens novos; trigger de empresa nova
   copiando o corpo vigente; backfill das empresas; backfill dos
   aniversários vivos só com `date > current_date`; prazos; recursos;
   conferência com "os outros tipos não mudaram de tamanho".

## Decisões do dono ainda em aberto

- Semear o roteiro base no evento da cliente (hoje ela não tem roteiro).
- Instanciar recursos ao salvar o cenário (conserta também o corporativo).
- Roteiro por faixa em evento já criado (hoje só nasce pelo assistente).
- Papéis de casamento no cortejo do portal do aniversário.

## Achados fora do aniversário

- Guia do primeiro acesso travado no passo 2 em show e formatura (não têm
  arquétipos): a única saída é "Pular", que desliga o guia para sempre.
- Faixas da debutante somam 105; delta "compacta" deixa offset_ideal abaixo
  do offset_min.
- 9 casamentos ativos sem Planejamento.
- Assistente de criação: bloco "Fornecedores já contratados" sem efeito e
  frase "No rápido, criamos um checklist mínimo" falsa.
- Compressão de prazo: a cada mudança de estado, o que não cabe volta para
  "hoje" (vale para todos os tipos).
