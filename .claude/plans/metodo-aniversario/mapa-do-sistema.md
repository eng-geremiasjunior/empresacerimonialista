

########## mapa:mecanica ##########

**Regras duras do método: o que o método do aniversário precisa respeitar**

**1. Colunas, CHECKs e unicidades**
- **metodo_objetivo**
  - Tem `codigo`, `nome`, `descricao`, `ordem` e unique `(empresa_id, tipo_evento, codigo)` (064:31-43).
  - Colunas de verba e ativação: `faixa_pct_min/ideal/max` (int) e `ativo_padrao` (083:123-129).
  - `tipo_evento` já aceita `aniversario`, no domínio e em `events.type` (132:53-65).
- **metodo_decisao**
  - `responsavel` aceita só `noivos`, `cerimonialista` ou `ambos` (064:53-54).
  - O unique é `(empresa_id, codigo)` e **atravessa os tipos** (064:63). Por isso cada tipo usa prefixo (122:17-19, 132:29-31, 141:28-29). Sugestão: `aniv_`.
  - Prazo em faixa: `offset_min_dias` e `offset_max_dias` (083:138-140).
  - Na instância, `estado` aceita `pendente`, `decidida` ou `nao_se_aplica` (064:117-118).
- **metodo_campo**
  - `tipo` aceita: texto, numero, moeda, sim_nao, escolha, data, hora, anexo, fornecedor (114:41-53).
  - `opcoes text[]`; unique `(decisao_id, codigo)` (083:44, 55).
  - `sensibilidade` aceita `normal`, `alergia` ou `medicamento` (091:53-66).
  - `pergunta_cliente` é boolean; `label_portal` é texto (090:162-173).
  - `ativa_objetivo_codigo` e `ativa_quando` existem (083:48-53), mas nada lê essas colunas. Não dá para contar com elas.
- **evento_campo_valor**
  - Unique `(evento_decisao_id, codigo)` (083:99): um mesmo código pode se repetir entre decisões do evento.
  - Uma coluna de valor por tipo, mais `valor_hora` (083:90-95, 114:55-56).
- **metodo_tarefa**
  - `responsavel` com o mesmo CHECK (066:47-48). `vinculo_modulo` aceita `execucao` ou `financeiro` (073:12-18).
  - Não tem unique; o seed se protege por `(decisao_id, titulo)` (106:73-78).
- **metodo_arquetipo**
  - `eixo` aceita só `escala` ou `cenario`; unique `(empresa_id, tipo_evento, eixo, codigo)` (083:150-161).
- **metodo_arquetipo_delta**
  - `alvo_tipo` aceita `objetivo` ou `decisao`.
  - `operacao` aceita exatamente 9 valores: `ativar_objetivo`, `desativar_objetivo`, `set_offset_ideal`, `set_offset_min`, `set_offset_max`, `set_faixa_pct_min`, `set_faixa_pct_ideal`, `set_faixa_pct_max`, `set_prioridade` (083:170-177).
  - Combinação cruzada é ignorada em silêncio: offset e prioridade só valem em decisão; ativar/desativar e faixa só valem em objetivo (083:260-310).
  - `valor_num` é convertido com `::int`.
  - Sem unique; o seed se protege por `(arquétipo, alvo_tipo, alvo_codigo, operacao)` (141:407-411).
- **events.escala e events.cenario**
  - Os CHECKs são uma lista única somada de todos os tipos (141:55-72). O aniversário precisa entrar nessa lista.
- **metodo_roteiro_item**
  - `offset_min` obrigatório, `duracao_min`, `condicao`; unique `(empresa_id, tipo_evento, codigo)` (112:78-91).
  - `roteiro_items.origem_horario` aceita `calculado`, `espaco`, `fornecedor` ou `manual` (112:55-62).
- **metodo_checklist_dia**
  - `bloco` aceita `montagem`, `colacao`, `cerimonia`, `recepcao` ou `desmontagem` (125:338-356).
  - `requer_objetivo_codigo`; unique `(empresa_id, tipo_evento, codigo)` (111:36-52).
  - Os rótulos da tela são fixos, e `recepcao` aparece como "Recepção" (ChecklistDoDia.tsx:25-31).
- **metodo_recurso**
  - `regra` aceita `fixo`, `por_pessoa` ou `por_unidade`; `indice` é numeric(12,3) ≥ 0; `unidade` é obrigatória; `compravel` (132:73-100).
  - Unique `(objetivo_id, codigo)`, mas na instância o unique é `(event_id, codigo)` (132:150). **O código do recurso precisa ser único no tipo inteiro.**
  - `base_origem` aceita `guests`, `confirmados`, `mesas`, `fixo` ou `manual` (132:130-131).
- **metodo_pergunta_curada**
  - A chave primária é só `codigo`, global, sem tipo (146:58-62).

**2. Códigos com efeito especial**
- **escala e cenario**
  - Ao salvar o campo, o valor é gravado em `events` (planejamento/actions.ts:133-141), o que dispara `aplicar_arquetipos_evento` (083:318-335).
  - As opções do campo precisam bater com os códigos de arquétipo; a conferência da 142 cobra isso para todos os tipos (142:600-613).
  - Nunca viram pergunta do portal (090:248-254, 146:156-157).
  - Os seletores da faixa de contexto só aparecem quando o campo e os arquétipos existem (PlanejamentoEvento.tsx:513-515).
  - Precisam ser únicos por evento, porque `campoPorCodigo` usa `maybeSingle` (novo/actions.ts:67-72).
  - O assistente de criação só grava porte se houver linha em `PORTE_POR_PUBLICO` (capacidades.ts:80-88), e só pergunta o cenário se houver linha em `PERGUNTA_CENARIO` (StepEstruturacao.tsx:30-32). **As duas mudanças são de código, não de migração.**
- **verba_total** (moeda)
  - Espelha em `events.verba_total` (121:45-48, versão corrigida em 142:45-75).
  - Alimenta a distribuição (actions.ts:233-314), o Financeiro (lancamento-actions.ts:152) e a extração do briefing (briefing-extracao-actions.ts:222).
- **reserva_pct** (numero): a sugestão grava 10 quando está vazio (actions.ts:259-278).
- **Primeiro campo tipo `fornecedor` + `valor_contratado`**
  - Ao decidir, viram `evento_fornecedor_orcamento` (083:372-392).
  - O portal mostra à cliente o fornecedor, o nome do objetivo como categoria e o `valor_contratado` (089:201-221). **Esse valor é o que a cliente paga, nunca o custo interno.**
- **Curadoria de opções** (curadoria-actions.ts:284-292)
  - Grava em `valor_contratado` **ou no primeiro campo moeda** que encontrar, e a leitura não tem ordenação.
  - Duas moedas na mesma decisão arriscam gravar no campo errado, como `preco_por_pessoa` (141:197-198).
  - `preco_por_pessoa` não tem nenhum leitor no código.
- **liberacao_fornecedores** (hora): é o único código lido pelo aviso de conflito do roteiro (roteiro/page.tsx:61-68). O `liberacao_montagem` do corporativo (141:193) não é lido por nenhuma tela.
- **estilo_desejado e paleta_cores**: são gravados pela extração do briefing (briefing-extracao-actions.ts:491, 515).
- **Decisões `data` e `deb_data`**: gravam `events.date` (PlanejamentoEvento.tsx:714-716).
- **celebracao_formato**: só formatura (125:444-447).
- **Travas de pergunta**: códigos `valor%` e `orcamento%` nunca são pergunta (090:253-254). O prefixo `proprio_` fica reservado a campo criado à mão (actions.ts:342-353).
- **Código de decisão com `%contratar%`**: ganha as 4 tarefas de contrato no seed (141:266-285).
- **Tarefa financeira com "quantidade" no título**: gera pendência do tipo `revisao` (132:559-562).

**3. Compressão de prazo** (versão vigente: 142:157-295)
- **Não entram na conta:** decisões `nao_se_aplica` e as de objetivo inativo, que ficam sem prazo (184-195).
- **Sem data** do evento: prazo nulo. **Data hoje ou passada:** tudo vence hoje.
- **Quando o método cabe** (nenhum `offset_ideal` pendente passa dos dias restantes): prazo = data − offset (217-231).
- **Quando não cabe:**
  - meses = ceil(dias/30); teto = ceil(N/meses); janela = floor(dias/meses).
  - Aloca por prioridade decrescente, depois ordem do objetivo, depois ordem da decisão.
  - Piso de dependência: ao descer de patamar de prioridade, nada volta para antes (258-260).
  - O último mês absorve o excesso.
  - Decisão comprimida vence em min(data, hoje + mês × janela) (284-291).
- **Tarefas herdam o deslocamento da decisão**, presas entre hoje e a data. Offset negativo vence depois do evento (142:111-131).
- **Quando recalcula:** ao instanciar (132:434-435), ao mudar a data (070:236-238), ao mudar o estado (070:255-257) e ao aplicar arquétipo (083:314).
  - Não há cron: o prazo congela no dia do cálculo.
  - Ligar ou desligar objetivo à mão não recalcula (actions.ts:319-334).
- **Caso da cliente real** (hoje 13/09, evento 17/10 = 34 dias): 2 janelas de 17 dias. Qualquer offset acima de 34 comprime o mapa inteiro: as decisões vencem em 13/09 ou 30/09, com metade no máximo em cada janela.
  - **Armadilha:** decisão com offset 0 cai no índice 2, é presa em 1 e fica marcada como comprimida, então vence em **30/09, antes da festa**. Pós-evento deve viver em tarefa com offset negativo.
- **Prioridade tem de descer junto com o offset** (141:131-132).

**4. Como cada parte é instanciada**
- **Árvore do método**
  - Gatilho AFTER INSERT em `events` (065:74-88) chama `instanciar_metodo_evento`, cuja última versão é 132:382-439.
  - Proteção tudo-ou-nada: se o evento já tem um objetivo, nada é instanciado.
  - Copia objetivos (com `ativo_padrao` e faixas), decisões e campos vazios; depois aplica arquétipos e recursos.
- **Pergunta e sensibilidade** entram pelo gatilho `trg_campo_herda_pergunta` (091:75-102).
- **Arquétipos** (083:208-315)
  - Rebase numérico a partir do template, só nas decisões pendentes; depois delta de escala, depois delta de cenário.
  - **`ativo` nunca volta ao padrão.** Objetivo ligado por um cenário continua ligado se o cenário mudar.
  - No wizard, escala e cenário só chegam depois do insert (novo/actions.ts:233-239).
- **Recursos** (132:322-369)
  - Só objetivos ativos, protegido por código; exige `pode_editar_evento`, então não roda no SQL Editor.
  - Objetivo ligado depois só ganha recursos pelo botão "trazer do método" (operacao/actions.ts:161-171).
- **Checklist do dia** é semeado ao abrir a tela (111:136-143), sem gatilho, a partir de roteiro/page.tsx:27 e modo-evento/page.tsx:34.
  - A regra é por item, com `requer_objetivo_codigo` exigindo objetivo ativo; a versão vigente é 125:416-466.
- **Roteiro**
  - Não é criado no banco no wizard. O app lê `metodo_roteiro_item` (roteiro-template.ts:34-38) e filtra por `condicao`.
  - `condicao` é uma chave booleana das respostas do wizard (roteiro-template.ts:86-91). O **token do cenário escolhido vira essa chave** (novo/actions.ts:126-131).
  - A RPC calcula o horário como p_time + offset, com origem `calculado` (112:326-350). Mudar a hora recalcula só o que é `calculado` (112:172-213).
  - Pelo orçamento, só entram itens com `condicao` nula e hora nula (112:498-511).
  - Fluxo rápido: sem roteiro.
  - **Hoje o aniversário cai no template "outro", que tem roteiro vazio** (event-templates.ts:296-302, 323-326). O evento da cliente não tem roteiro.
  - Trocar o cenário depois não mexe no roteiro.

**5. Portal da cliente**
- **"Falta decidir"**: decisões `noivos` ou `ambos`, pendentes, de objetivo ativo (141:556-578); a home mostra 3 (portal.ts:576-580).
- **Perguntas** (portal.ts:356-396): campos com `pergunta_cliente` e `visivel_portal`, em decisão pendente da cliente e de objetivo ativo. Decisão com offset ≤ 0 só pergunta a partir da data do evento.
  - Rótulo exibido: `label_portal`, ou o `label` interno se não houver.
- **Escrita da cliente** passa por `portal_escrever_campo`, que bloqueia decisão que não é dela, bloco fechado, campo que não é pergunta, fornecedor e anexo (114:411-425).
- **Curadoria global**
  - O gatilho (146:119-166) marca como pergunta qualquer campo inserido com um dos 32 códigos curados, em decisão `noivos` ou `ambos`, com o **texto na voz de casamento**.
  - Se o seed já vier com `pergunta_cliente = true`, vale o `label_portal` próprio (146:132-134, 164).
  - Com `false`, a curadoria sobrescreve. Então: ou marcar explicitamente com texto próprio, ou evitar esses códigos (`playlist`, `atracoes`, `paleta_cores`, `tipo_lembrancinha`, `lista_bebidas`, `topo_bolo`, `lista_fotos`…).
- **Leitura pelo banco**: a policy deixa a cliente ler **todo** campo de decisão `noivos` ou `ambos` (089:160-170), não só as perguntas.
  - `visivel_portal` não existe no template.
  - **Anotação interna, custo ou margem só podem morar em decisão `cerimonialista`.**
- **Roteiro**: os títulos vão para a cliente (092:682-700). Recursos e checklist não têm policy de portal (132:187-189; 111:131-133).
- **Portal de um aniversário hoje: vazio.** Com o método, mostraria só o que o seed marcar.

**6. O que a 142 corrigiu no corporativo**
1. Campo `verba_total` nascendo vazio apagava a coluna do evento (45-84).
2. Tarefa com offset negativo vencia no dia da festa (86-148).
3. Decisão de objetivo desligado recebia prazo e vencia (150-195).
4. Evento em orçamento com data passada ganhava o mapa inteiro para hoje; virou `nao_se_aplica` (316-323).
5. Itens do roteiro no mesmo minuto (326-335).
6. Delta que baixa `offset_ideal` sem baixar `offset_min` (340-354).
7. Objetivo que gasta dinheiro sem faixa de verba (359-372).
8. Contratação sem as 4 tarefas porque o código não tinha "contratar" (377-393).
9. Campos que pediam número que o sistema já conta, e recurso que duplicava campo do contrato (403-445).
10. Título que enumerava o formulário; unidade que repetia a instrução (451-470).

**7. O molde da 141, que a migração do aniversário deve seguir**
- **(a)** Recriar os CHECKs de `events.escala` e `events.cenario` como lista somada, localizando pela definição (41-73).
- **(b)** Funções de seed **não destrutivas**, com `not exists`, e `revoke` de `public` e `anon`: método, roteiro, checklist, recursos (79-548).
  - Os seeds antigos apagam antes de semear (084:38; 132:638), o que deixa eventos vivos órfãos (133:15-19; 146:10-14).
- **(c)** Recriar `trg_semear_metodo_empresa` **copiando o corpo da 144:89-118** e acrescentando as chamadas novas.
- **(d)** Laço de backfill sobre todas as empresas (636-645).
- **(e)** Eventos vivos (`orcamento` ou `confirmado`): insert direto de objetivos, decisões e campos com `not exists` (658-710).
  - Depois, `aplicar_arquetipos_evento` em cada um (714-724) e recursos por insert direto (729-773).
  - Checklist fica para quando a tela abrir; `roteiro_items` vivos não são tocados (650-657).
  - Somar a proteção da 142 item 4 para eventos com data passada.
  - Caso da cliente, sem roteiro: inserir roteiro só onde não existe nenhum item é decisão nova, para o dono aprovar.
- **(f)** Conferência em linhas `true` (778-976): contagens por empresa, prefixo, 4 campos especiais únicos, soma 100, faixa nula nos objetivos sem verba, 4 tarefas por contratação, delta aponta para alvo existente, opções = arquétipos, CHECK, `requer_objetivo` existe, gatilho, sem overload, eventos vivos com verba, sem órfãos, **outros tipos com o mesmo tamanho**.
- **(g) Fora da migração, no código:** `PORTE_POR_PUBLICO` e `PERGUNTA_CENARIO` para o assistente de criação.

########## mapa:codigo ##########

**Mapa do código TypeScript que muda por tipo: o que falta para o aniversário ter método de ponta a ponta**

## 1. Onde o tipo e o arquétipo entram (o essencial)

**Planejamento (tela da faixa de verba e arquétipo)**
- **PlanejamentoEvento.tsx:513-516.**
  - Hoje: a faixa só mostra os chips se existir um campo `escala` no método e alguma opção no eixo escala. Sem escala, o chip de cenário também some.
  - Falta: o aniversário precisa ter os dois eixos, com os códigos literais `escala`, `cenario`, `verba_total` e `reserva_pct` (campos podem repetir código entre tipos; a unicidade é por decisão). Nada muda no TS.
- **FaixaContexto.tsx:683-702 e 937-953.** A tela já é genérica. Mas o texto das linhas 949-951 ("definem quais objetivos existem, os prazos e os %") explica o sistema, o que a regra de ouro proíbe. Não é específico do aniversário.
- **planejamento/actions.ts:133-141.**
  - Hoje: `salvarCampo` grava a escolha em `events.escala`/`events.cenario`, e é isso que dispara os deltas do arquétipo.
  - Falta: se o CHECK dessas colunas (141:55-72) não aceitar os códigos do aniversário, a resposta fica salva no campo mas o evento não recebe a escolha. O resultado é estado dividido: deltas não aplicados e passo do guia nunca cumprido. A migração precisa ampliar o CHECK.
- **planejamento/page.tsx:35-46 e celebra.ts:146-162.** Genéricos: leem as opções de `metodo_arquetipo` pelo tipo. Nada a fazer.

**Wizard**
- **capacidades.ts:80-88 (`PORTE_POR_PUBLICO`).**
  - Hoje: só o corporativo tem faixas de porte.
  - Falta: uma entrada `aniversario`, com faixas cujos códigos batam com três lugares: `metodo_arquetipo`, as opções do campo `escala` e o CHECK. Sem ela, a action (novo/actions.ts:233) nunca preenche a escala.
- **StepEstruturacao.tsx:30-32 (`PERGUNTA_CENARIO`).**
  - Hoje: só o corporativo tem pergunta de subtipo. Mesmo com cenários no banco, o aniversário não mostra a pergunta.
  - Falta: uma linha, por exemplo `aniversario: "Como é a festa?"`. A page (novo/page.tsx:21-37) já traz as opções de todos os tipos.
- **StepEstruturacao.tsx:10-26.**
  - Hoje: `PERGUNTAS` é indexado por `resolverTemplate`, e o aniversário cai em "outro", que não tem perguntas.
  - Recomendação: não criar pergunta sim/não; o feitio da festa vai inteiro no cenário.
- **StepEstruturacao.tsx:148-153.** O bloco "Fornecedores já contratados" não tem efeito: `fornecedoresContratados` não é lido em nenhum lugar do servidor (`tasks = []` desde a 076). A frase "o checklist não vai gerar Confirmar" é falsa. Para o aniversário mostraria a lista de "outro". Remover.
- **StepDadosBasicos.tsx:30-36 (`ROTULO_HORA`).** O aniversário cai em "Hora de início". Serve se a âncora do roteiro (minuto 0) for o início da festa. Se a âncora for o parabéns, precisa de entrada própria.
- **StepDadosBasicos.tsx:270-273.** O texto "No rápido, criamos um checklist mínimo" também é falso.
- **EventWizard.tsx:165-167.** O nome sugerido é "Aniversário — {cliente}", mas é só placeholder. No aniversário, `events.name` vira o "de quem" do convite (129:554, `coalesce(name,'os anfitriões')`). Sem nome, o convite diz "o aniversário de os anfitriões". A sugestão para esse tipo deveria ser o nome de quem faz aniversário.

**Criação do evento e roteiro**
- **novo/actions.ts:126-139.**
  - Hoje: só o cenário é espelhado como chave booleana antes de montar o roteiro. A escala é derivada depois (233).
  - Consequência: no roteiro, `condicao` só pode usar código de cenário, nunca de porte. É restrição de desenho do seed.
- **novo/actions.ts:137-139 e StepDadosBasicos:255-261 (fluxo "Criar evento rápido").**
  - Hoje: esse fluxo não gera roteiro e pula o passo 4, então o evento nasce sem cenário. A escala ainda sai do número de convidados.
- **novo/actions.ts:218-227.** Bloco exclusivo da formatura. Nada a fazer.
- **roteiro-template.ts:34-38 e 86-91.** Genérico: lê `metodo_roteiro_item` pelo tipo real. O caso especial da formatura (60-73) não afeta. O fallback (75-84) devolve vazio para "outro" enquanto não houver seed.
- **event-templates.ts:297-303 e 309-327.** O aniversário continua caindo em "outro" (4 fases e roteiro de reserva vazio). Aceitável: com seed no banco, esse fallback não é usado. Não é preciso criar um template TS novo.

**Checklist do dia**
- **checklist-actions.ts:11.** Blocos fixos e genéricos. Nada a fazer.
- **roteiro/page.tsx:27 e modo-evento/page.tsx:34.** `semear_checklist_dia` roda ao abrir a tela, então um evento que já existe recebe o checklist sozinho quando houver `metodo_checklist` do aniversário.
- **ChecklistDoDiaAjuste.tsx:95-99.** Só esconde o bloco "Colação" quando vazio. "Cerimônia" aparece vazio no aniversário, como já acontece no corporativo. Aplicar o mesmo filtro a `cerimonia`.
- **ChecklistDoDia.tsx:59-69.** A sugestão de bloco já cai em `recepcao` quando não há cerimônia. Nada a fazer.

**Recursos**
- **operacao/page.tsx:38-51.** O botão "trazer do método" (`instanciar_recursos_evento`) aparece assim que o evento tem objetivos. Um evento que já existe recebe os recursos por esse botão ou pelo backfill.

## 2. Códigos de decisão e de campo fixos no TS

O código da decisão é único por empresa em todos os tipos (064:63), então o aniversário vai usar prefixo, por exemplo `aniv_`. Isso quebra as constantes abaixo:

- **DrawerDecisao.tsx:44 e 1260, PlanejamentoEvento.tsx:205.**
  - Hoje: `CODIGO_DECISAO_GUIA = "decoracao_briefing"`, código do casamento.
  - Falta: se o aniversário tiver briefing de decoração, isso vira lista. Sem isso, o portal (guia-estilo/page.tsx:50-63) mostra para sempre "Sua cerimonialista ainda vai montar o guia", porque o menu libera a tela para todo tipo com `siteDoEvento`.
- **PlanejamentoEvento.tsx:714-717.** A decisão de data é reconhecida só por `data`/`deb_data`. Recomendo que o aniversário não tenha decisão de data (o corporativo também não tem): a data já vem do wizard.
- **briefing-extracao-actions.ts:67-75.** `DECISAO_CONTRATAR` só conhece códigos de casamento. Um "não teremos buffet" num aniversário responde "este método não tem essa decisão". Trocar por busca de `%{categoria}_contratar` dentro do evento, ou mapa por tipo.
- **briefing-extracao-actions.ts:222, 491 e 515.** Os campos `verba_total`, `estilo_desejado` e `paleta_cores` são buscados pelo código literal. O seed deve reusar esses códigos para receber o que vem do briefing.
- **imprimir/musica/[id]/page.tsx:44-51 e 83-87.** Lista fechada de códigos. Reusar `playlist` e `lista_veto`; o código do parabéns do aniversário precisa entrar na lista.
- **roteiro/page.tsx:67.** `liberacao_fornecedores` é literal. Reusar o código se o método tiver o horário de liberação do espaço.
- **RoteiroPadraoSection.tsx:20-23.**
  - Hoje: a lista `TIPOS` só tem casamento e debutante (formatura, show e corporativo também estão de fora).
  - Falta: entrada do aniversário com o nome da âncora, para a proprietária poder ajustar o roteiro modelo.

## 3. Textos que estreitam para casamento (aparecem assim que o aniversário tiver Planejamento)

- PlanejamentoEvento.tsx:412: "defina a data do casamento"
- ModoAmplo.tsx:184: "Defina a data do casamento…"
- ModoFoco.tsx:538 e 549: "neste casamento"
- MapaMental.tsx:572: "Arquitetura do casamento" (o rótulo por tipo em 247-258 já inclui o aniversário)
- DrawerDecisao.tsx:897: "conversa com os noivos"
- DrawerDecisao.tsx:1010: "data do casamento"
- OrganizacaoEvento.tsx:1790: "Defina a data do casamento"

Todos são texto neutro de uma linha e não afetam os outros tipos.

## 4. Portal da cliente: o que um aniversário mostra hoje

Não há exceção em `capacidades.ts:27-30`, então o aniversário tem as quatro capacidades. O menu (destinos.ts:89-94) mostra: Visão geral, Guia de estilo, Escolhas, Convidados, Convite, Linha do tempo, Cortejo, Roteiro do dia e Resumo financeiro.

- **Defeito atual: cortejo com papéis de casamento.** `portal-pessoas-shared.ts:89-91` usa os papéis do casamento como padrão. A cliente do aniversário vê Padrinhos, Madrinhas, Damas, Pajens e Porta-alianças.
  - Opção A: `EXCECOES.aniversario = ["listaNominal","mesas","siteDoEvento"]`.
  - Opção B: papéis próprios em `PAPEIS_POR_TIPO`.
  - Decisão do dono.
- **Home sem método.** "O que falta decidir" vem vazio e as perguntas dizem "Nada para responder aqui".
- **Home com método.** Ver `portal.ts:356-370`: só vira pergunta o campo com `pergunta_cliente` marcado explicitamente no seed. A curadoria da 146 cobre só códigos de casamento; o corporativo marcou os seus explicitamente.
- **papel.ts.** Os padrões já são neutros ("cliente", "para o dia do evento", "do evento", "Com carinho,"). Entradas opcionais para o aniversário: `CONTAGEM` e `EVENTO_DE` com "a festa"; `PAPEIS_PORTAL_POR_TIPO` hoje dá só ["outro"], e numa festa infantil mãe e pai fariam sentido.

## 5. O que o evento de aniversário já guarda (o método não deve perguntar de novo)

- **Já guarda:** `events.type`, `name` (texto livre, opcional), `date`, `time` (rotulado "Hora de início"), `city`, `location`, `guests`, `guests_max` (só vindo do briefing), `contract_value`, `status`, responsável.
- **Da cliente:** nome e telefone; e-mail só se veio do briefing. `clients.birthday` existe, mas o wizard não pergunta.
- **Não guarda:** quem faz aniversário (quando é outra pessoa que contrata), idade, tema, se o público é infantil ou adulto. Também não existe coluna para nenhum desses; só `events.name` pode fazer as vezes do nome.
- **Sugestão:** o método pergunta idade e tema (tema com `pergunta_cliente`). Público e feitio ficam no cenário. Porte sai de `guests`. Nome de quem faz aniversário vai em `events.name`. Não repetir data, horário, local nem convidados.

## 6. O guia do primeiro acesso e o evento da cliente de 17/10

- **guia-vivo.ts:158-160 e lib/supabase/guia-vivo.ts:41-50.**
  - Hoje: o caminho do guia é escolhido pela contagem de `evento_objetivo`. O aniversário dela está no caminho sem método (3 passos).
  - Efeito do backfill: quando a migração criar objetivos no evento dela, `temMetodo` vira verdadeiro e ela é jogada para o caminho de 5 passos, no passo 2 ("Diga o tamanho e o feitio"). Isso não acontece se ela já concluiu o guia (`concluido_em` carimbado).
- **O passo 2 é cumprível?** Pela 160:181-182, exige `events.escala` e `events.cenario` preenchidos. Só dá para cumprir se as quatro condições valerem:
  1. o método tem os dois eixos;
  2. existem os campos literais `escala` e `cenario`;
  3. existem opções nos dois eixos, senão a caixa destacada fica sem chip (PlanejamentoEvento:494 e 514);
  4. o CHECK aceita os códigos.

  Hoje a tela não deixa escolher nada para o aniversário, porque não há opções no banco.
- **Recomendação:** o backfill grava a escala a partir de `guests`, no campo e em `events`, e ela só escolhe o cenário no chip. Não mexer na 160 (afetaria todos os tipos).
- **Nenhum caminho TS instancia o método num evento que já existe.** Não há chamada a `instanciar_metodo_evento`, e o roteiro só é montado na criação. A migração precisa:
  - instanciar objetivos, decisões, campos e tarefas no evento dela;
  - semear `roteiro_items` a partir de `events.time`. O evento dela tem roteiro vazio: "outro" não tem roteiro de reserva e o rápido não gera nenhum.

  Checklist e recursos chegam sozinhos (seções 1 e 4). A data está a 34 dias, então a compressão de prazos (070) vai apertar todos os prazos.

## 7. Textos de listas de tipos

- `recursos-do-sistema.ts:37`: "Casamento, debutante, formatura, corporativo e show têm decisões próprias". Incluir o aniversário.
- `guia-vivo.ts:63`: incluir o aniversário.
- `guia-vivo.ts:105-117`: o comentário ficará obsoleto.
- `ajuda-conteudo.ts:108`: exemplos de âncora só de casamento e debutante.

########## mapa:dados ##########

**1. Eventos por tipo (78 eventos, 7 empresas)**

| tipo | total | status | com evento_objetivo | escala e cenário preenchidos |
|---|---|---|---|---|
| casamento | 52 | 17 conf / 11 orç / 24 concl | 21 (19 dos 28 ativos; **9 casamentos ativos sem Planejamento**) | 7 de 21 |
| debutante | 12 | 5 conf / 2 orç / 5 concl | **7 = todos os ativos**; nenhum concluído | 0 de 7 |
| formatura | 1 | 1 concl | **0** | — |
| corporativo | 4 | 2 orç / 2 concl | 2 (os ativos) | 1 |
| show | 1 | 1 conf | 1 | 0 |
| aniversário | 3 | 2 conf / 1 concl | 0 | 0 |
| bodas / batizado / chá revelação | 2 / 2 / 1 | todos concluídos | 0 | 0 |

- **Debutante:** o Planejamento existe de fato nos eventos reais.
- **Formatura:** o método está semeado nas 7 empresas, mas nenhum evento real tem Planejamento de formatura. A única formatura já estava concluída quando a 125 rodou.
- **Escala/cenário (arquétipos):** só existem para casamento, debutante e corporativo. Show e formatura não têm, então **em show e formatura o passo 2 do guia de 5 passos não tem como ser cumprido.** A faixa da tela não mostra as opções e o único jeito de sair é "Pular", que desliga o guia para sempre.

**2. Aniversários**

- **Status:** 2 confirmados, 1 concluído, nenhum arquivado. Estão em **2 empresas** (uma tem 2, a outra 1).
- **Convidados (guests):** sem valor 0; ≤30 0; 31–80 **1**; 81–150 **2**; >150 0.
- **Antecedência (criação até a data):** 0–30 dias **2** (0 e 8 dias); 31–60 **1** (34 dias); acima de 60, nenhum. Nenhum aniversário foi criado com mais de 34 dias de antecedência.
- **Distância até hoje:** 1 já passou, **1 é hoje (13/09, criado hoje)**, 1 falta 34 dias (17/10).
- **Escala/cenário:** 0 e 0.
- **Nenhum tem** tarefa, convidado, roteiro ou fornecedor. Só o concluído tem 1 lançamento financeiro.
- **O evento da cliente do anúncio:** a empresa foi criada hoje e tem 1 evento e 1 membro (a proprietária). O guia não foi pulado nem concluído, então hoje ela está em **"Passo 2 de 3"**.
- **A outra empresa (47 eventos):** o evento mais recente dela é o aniversário com **data de hoje**. Esse é o evento do guia de 2 cerimonialistas com o guia ainda aberto (a proprietária já concluiu o dela).

**3. Empresas:** 7. As 7 têm os 5 métodos semeados.

**4. O guia quando o aniversário ganhar objetivos**

- **Troca de caminho:** sim. `getEstadoDoGuia` conta `evento_objetivo` a cada navegação (`temMetodo`), e `passosDoEvento` passa de `PASSOS_SEM_METODO` (3 passos) para `PASSOS` (5). Nada fica gravado sobre o passo em que ela está, então a troca acontece na próxima tela que ela abrir.
- **Numeração:** vai de "2 de 3 — Monte a lista de convidados" para **"2 de 5 — Diga o tamanho e o feitio do evento"**, e a rota muda para `/planejamento`.
- **Se ela já tiver adicionado convidados antes da migração:** estaria em "3 de 3" e **volta para "2 de 5"**.
  - A lista de convidados e as tarefas manuais deixam de contar como progresso.
  - O passo 4 só aceita tarefa com `evento_decisao_id`.
- **Se ela tiver concluído os 3 passos antes:** `concluirGuia` já carimbou `guia_concluido_em`, que é permanente, e o guia não volta.
- **O que ela perde:** nenhum dado. Um backfill no padrão da 141 (insert com `not exists`) não mexe em convidados, tarefas ou roteiro. A verba sobe da coluna para o campo (142). Ela perde só o progresso do guia.
- **Condições para o passo 2 ser possível.** `meu_guia` exige `escala` **e** `cenario` não nulos. Sem uma destas, o passo trava e a única saída é "Pular", que desliga o guia para sempre:
  1. `metodo_campo` com os códigos `escala` e `cenario` em alguma decisão do aniversário.
  2. `metodo_arquetipo` do aniversário nos dois eixos. A tela só mostra as opções se houver arquétipo de escala.
  3. Os códigos aceitos por `events_escala_check` e `events_cenario_check`. Senão, `portal_escrever_campo` grava o campo, mas o `update events` falha com "Não foi possível aplicar o arquétipo." e o passo nunca vence.
     - Reaproveitar `tradicional|compacta` e `salao|clube|chacara_sitio|casa_de_festas` dispensa DDL.
     - Um código novo obriga a trocar a CHECK compartilhada.
     - As conferências da 142 ("cabe no CHECK", "toda opção existe como arquétipo") pegam a divergência.
- **Passo 4:** só vence se ela decidir uma decisão que tenha `metodo_tarefa`. As primeiras decisões óbvias do aniversário precisam gerar tarefa.
- **Filtro do backfill:** o aniversário da outra empresa com data 13/09 é o evento do guia de 2 pessoas. Se entrar no backfill, todas as decisões pendentes recebem prazo "hoje" (`v_dias <= 0`) e ficam vencidas no dia seguinte. É o mesmo caso que a 142 teve de corrigir no corporativo. **Recomendo `date > current_date`.**

**5. Compressão de prazo, simulada no papel**

Usei a última definição de cada função: `redistribuir_decisoes_evento` e `gerar_tarefas_da_decisao` da 142, `instanciar_metodo_evento` da 132 e `aplicar_arquetipos_evento` da 083.

- **Parâmetros:** aniversário em 17/10, método instanciado em 14/09. Dá 33 dias, 2 meses, janela de 16 dias e teto de ⌈N/2⌉ decisões por mês.
- **Não cabe:** existe offset maior que 33, então o motor comprime.
  - Decisão com offset acima de 33 vai para o mês 0, com prazo = hoje.
  - O que passa do teto vai para o mês 1, com prazo 30/09.
  - Quando a prioridade cai, o piso de dependência empurra todo o resto para o mês 1.
  - Offsets entre 2 e 17 que caem no mês 1 mantêm a data ideal.

Resultado com offsets 120→0 e prioridade descendo junto:

- **N=15:** **8 decisões em 14/09** (offsets 120 a 45); 4 em 30/09 (45, 30, 21 e **0**); depois 03/10, 10/10 e 14/10, uma em cada.
- **N=22:** **11 em 14/09**; **7 em 30/09** (45, 40, 30, 30, 21, 1, 0); depois 1 por data em 03, 07, 10 e 14/10.
- **N=7:** 3 em 14/09; 1 em 17/09; 1 em 30/09 (offset 0); 03/10 e 10/10.

O que isso significa:

- **Mesmo dia:** sim. Metade das decisões recebe o prazo do próprio dia da instanciação.
- **Anomaly do offset 0/1:** quando comprime, decisão do dia da festa é **puxada 17 dias para antes** (`floor(33/16)=2` é diferente do mês 1, então conta como comprimida). No recálculo com 1 mês ela vai para "hoje".
- **Offsets 30 e 21:** quando o piso sobe, vão **mais tarde** que o ideal (30/09 em vez de 17/09 e 26/09).
- **Nasce vencida?**
  - Decisões: não no dia, porque prazo = `current_date`. **Ficam vencidas no dia seguinte**, 8 a 11 de uma vez.
  - Supabase usa UTC: uma migração aplicada depois das 21h de Brasília tira um dia (32 dias).
- **Toda mudança de estado recalcula** (`trg_redistribuir_por_estado`, com o hoje novo). Se ela decidir algo em 20/09 (27 dias, 1 mês, teto N):
  - N=14: **10 pendentes vão para 20/09**.
  - N=21: **15 vão para 20/09**.
  - Todo offset acima dos dias restantes, mais o offset 0, volta para "hoje". O monte não se espalha: ele volta para hoje a cada decisão.
- **Tarefas:** só nascem quando ela decide, e **nunca vencidas** (`greatest(current_date, …)`).
  - As 4 de contrato, com o offset da decisão, vencem em `max(dia em que decidiu, prazo)`. Cinco contratações decididas numa tarde dão **20 tarefas para o mesmo dia**.
  - Tarefa específica herda o deslocamento da decisão: vence em prazo + (offset da decisão − offset da tarefa), limitado ao dia do evento. Por isso:
    - decisão 60 com tarefa 7 vence **17/10**, no dia da festa;
    - decisão 90 com tarefa 10 vence **17/10**;
    - decisão 45 com tarefa 30 vence 29/09;
    - decisão 45 com tarefa 20 vence 09/10;
    - offset negativo vence em 18/10, depois da festa (correto).
  - Tarefas "de véspera" em decisão de offset alto se acumulam no dia do evento.
  - Se um delta de escala baixar o offset da decisão, as tarefas de contrato (que ficam com o offset base) vão para **antes** do prazo da decisão, com mínimo em hoje.
- **Afoga?** Sim, nos dois lados. `portal.ts` lê o `prazo_previsto`, então a contratante vê as decisões dela e as de "ambos" como "para hoje" logo no primeiro acesso. A cerimonialista vê 8 a 15 itens vencendo hoje depois de cada decisão.

**Implicação para o desenho do método:** nos dados reais, os 3 aniversários foram criados com 34 dias ou menos de antecedência.

- Com o **offset ideal máximo de 33 dias ou menos no método base**, o evento de 17/10 usa as datas do método sem comprimir nada. A escala nasce nula, então é o método base que vale na instanciação.
- Offsets maiores só por delta de escala: um evento com pouco prazo que escolher porte grande volta a comprimir.
- N em torno de 10 a 12.
- Evitar offset 0 ou 1 em decisão; deixar isso para o roteiro e o checklist do dia.

Scripts (só leitura) em `C:/Users/user/AppData/Local/Temp/claude/C--Users-user-Documents-GitHub-empresacerimonialista/90107a48-370f-4fb8-b8a8-74a68c98944d/scratchpad/metodo-aniversario/`:
- `contagens.mjs`
- `detalhe.mjs`
- `simular.mjs`

########## mapa:vizinhos ##########

Migrações lidas em C:/Users/user/Documents/GitHub/empresacerimonialista/supabase/migrations/.

Legenda: N = `noivos` (a tela diz "família" ou "comissão"; o aniversário cai em "cliente", src/lib/papel.ts), A = ambos, C = cerimonialista. Offsets ideal/min/max em dias; p = prioridade. O título só aparece quando foge do óbvio.

## 1. Debutante (122; checklist da 111; depois só a curadoria da 146 mexeu nela): ~12 meses, seed DESTRUTIVO

**Objetivos** (todos com ativo_padrao=true; faixa min/ideal/max):
estrutura "Estrutura e datas" sem faixa; espaco "Espaço e recepção" 10/15/20; buffet "Buffet e bebidas" 20/28/40; decoracao "Decoração e cenografia" 10/14/18; foto "Foto e vídeo" 8/10/14; musica "Música e balada" 8/12/16; valsa "Valsa e coreografia" 1/2/4; vestidos "Vestidos da debutante" 5/7/10; beleza "Beleza e making of" 2/3/5; book "Book 15 anos" 1/2/4; protocolo "Cerimonial e protocolo" sem faixa; convidados "Convidados e RSVP" sem faixa; doces "Doces, bolo e lembrancinhas" 3/5/7; papelaria "Papelaria e convites" 2/3/5; infra "Infraestrutura e logística" 2/4/6.
O ideal soma 105, não 100. Só 6 objetivos têm descrição.

**Decisões** (57, prefixo deb_):
- estrutura: data N 365/300/400 p100 (sem campo: a data fica em events.date); tema N 350/300/365 p99; convidados_numero N 350/300/365 p98; budget "Levantar o budget" A 350/300/365 p97; prioridades "Definir as prioridades da família" N 345/300/365 p96
- espaco: espaco_orcar "Buscar referências e orçar espaços" A 330/280/360 p92; espaco_visitar A 320/270/350 p91; espaco_contratar A 310/260/350 p90; espaco_vt C 60/45/90 p40
- buffet: buffet_tipo_servico A 300/260/330 p89; buffet_orcar A 290/250/320 p88; buffet_degustar N 280/240/310 p87; buffet_contratar A 270/230/300 p86; drinks_jovem_definir "Definir o bar de drinks sem álcool" A 150/90/200 p45; buffet_cardapio A 90/60/120 p44; buffet_confirmar_numero C 12/10/15 p20
- decoracao: decor_conceito "Traduzir o tema em conceito de decoração" A 240/200/280 p84; decor_orcar A 230/190/270 p83; decor_contratar A 210/170/250 p82; decor_aprovar A 60/45/90 p35; painel_foto "Definir painel e áreas de foto" A 90/60/120 p33
- foto: foto_orcar A 260/220/300 p81; foto_contratar A 240/200/280 p80; retrospectiva "Produzir o vídeo de retrospectiva" N 60/30/90 p34
- musica: dj_orcar A 240/200/280 p78; dj_contratar A 220/180/260 p77; atracoes_definir "Definir as atrações da balada" A 150/90/200 p50; iluminacao_contratar "Contratar iluminação e efeitos de pista" A 150/90/200 p49; parabens_musica N 45/30/60 p22
- valsa: valsa_contratar "Contratar o professor de dança" A 200/150/240 p60; valsa_pares "Definir príncipe e pares da valsa" N 170/120/200 p58; valsa_musica N 150/90/180 p55; valsa_ensaios "Começar os ensaios" N 120/90/150 p52
- vestidos: vestido_valsa N 180/120/220 p70; vestido_recepcao N 150/90/200 p68; vestido_balada "Escolher o look da balada" N 120/60/160 p66; provas_finais N 21/14/30 p25
- beleza: beleza_contratar "Contratar cabelo e maquiagem do dia" A 120/90/160 p56; beleza_teste N 45/30/60 p30
- book: book_contratar A 180/120/220 p62; book_realizar N 120/90/150 p54; book_escolher N 90/60/120 p42
- protocolo: velas_lista "Definir os homenageados das 15 velas" N 60/45/90 p46; entrada_roteiro A 45/30/60 p38; homenagens "Definir homenagens e discursos" N 40/30/60 p36; roteiro_fechar "Fechar o roteiro da noite com o espaço" C 15/10/21 p24
- convidados: lista_convidados N 200/150/240 p74; convites_enviar A 60/45/75 p48; rsvp C 21/14/30 p19
- doces: bolo_orcar A 120/90/150 p47; bolo_contratar A 90/60/120 p43; lembrancinhas N 45/30/60 p26
- papelaria: identidade_tema "Aprovar a identidade visual do tema" A 150/120/180 p57; papelaria_contratar A 120/90/150 p53
- infra: seguranca_contratar C 90/60/120 p41; transporte_debutante N 30/21/45 p23; plano_b_chuva C 90/60/150 p39

A prioridade NÃO acompanha o offset (roteiro_fechar 15/p24 fica acima de rsvp 21/p19).

**Campos:**
- Todo contratar leva fornecedor + valor_contratado. O espaço acrescenta contrato; o buffet, preco_por_pessoa.
- deb_tema carrega tema, paleta_tema, escala (tradicional|compacta) e cenario (salao|clube|chacara_sitio|casa_de_festas).
- budget: verba_total, reserva_pct. tipo_servico: a_francesa|buffet|coquetel|finger_food|ilhas. O resto é data, anexo ou texto.
- O seed não marca nenhuma pergunta_cliente. A curadoria da 146 é um gatilho por código, sem filtro de tipo. Por isso prioridades e atracoes viraram perguntas com texto de casamento ("O que não pode faltar no dia de vocês?").

**Tarefas:** as 12 decisões de contratar ganham as 4 de contrato. Específicas:
- "1ª prova do vestido da valsa" N 90
- "Prova final do vestido (levar o sapato)" N 14
- "Ensaio geral da valsa" N 7
- "Conferir presença dos homenageados no dia" C 7
- "Informar o número confirmado a buffet, espaço e decoração" C 12

Nenhuma tarefa de pós-evento.

**Arquétipos:**
- escala tradicional é a base.
- escala compacta "Festa compacta" (~5 meses) tem 13 set_offset_ideal: espaço 150/140/130, buffet 125/110, DJ e foto 100, decoração, vestido e professor 90, book 80, papelaria 60, convites 30.
- Não há set_offset_min, então o ideal fica abaixo do mínimo (150 < 280). É o mesmo defeito que a 142 corrigiu no corporativo.
- Os cenários não têm delta (a 122 os chama de "registro").

**Roteiro** (0 = entrada da aniversariante; offset/duração): equipe_decoracao -360/240; buffet -240/90; entrada 0/15; valsa 15/20; troca_vestido 120/30; velas "As 15 velas" 150/30; homenagem_pais 180/20; pista 200; cabine_fotos 200, condicao cabineFotos.

**Checklist** (19 itens, sem requer_objetivo):
- montagem: reuniao_equipe, orientar_fornecedores, conferir_decoracao, som_luz_telao, conferir_mapa_mesas, lembrancinhas, itens_debutante
- cerimonia: entrada_alinhada, grupo_valsa, lista_velas, homenagem_pais, agua_familia, orientar_fotografos
- recepcao: camarim_troca, horario_jantar, bolo_parabens
- desmontagem: pertences_debutante, itens_alugados, saida_fornecedores

**Recursos:** nenhum.

## 2. Formatura (125): ~120 dias, enxuta, seed destrutivo

**Objetivos** (6, todos ativos, SEM faixa porque "a verba da turma não é dela"; sem arquétipos): celebracoes "Celebrações e formato"; becas "Becas e canudos"; foto_video; atracoes "Atrações do baile"; telao "Telão e retrospectiva"; papeis "Papéis e homenagens".

**Decisões** (prefixo form_):
- celebracoes_definir "Definir as celebrações da turma" N 120/90/150 p100
- comissao_alinhar "Alinhar papéis e prazos com a comissão" C 110/90/130 p98
- becas_contratar A 90/60/120 p95
- foto_contratar A 100/80/130 p92
- papeis_definir "Definir os papéis de honra" N 60/45/90 p90
- ensaio_colacao "Marcar o ensaio da colação" C 15/7/30 p88
- fotos_convite "Organizar o dia das fotos do convite" N 90/60/120 p85
- atracoes_definir N 90/60/120 p84
- atracoes_contratar A 75/50/100 p83
- canudos_confirmar "Confirmar canudos e diplomas simbólicos" A 60/45/90 p80
- telao_contratar "Contratar telão e projeção" A 75/50/100 p75
- homenagens_definir "Definir homenagens e presentes" N 45/30/60 p70
- madrinha_anel N 45/30/60 p65
- retrospectiva_turma "Montar a retrospectiva da turma" N 30/20/60 p60

**Campos:**
- celebracao_formato usa opções em texto legível (Juntos / Separados / Só o baile), e o checklist lê esse texto literalmente.
- Os demais: missa_culto; becas (Aluguel|Compra, quantidade, retirada); paraninfo, patrono, orador, juramentista; atracoes (virou pergunta pela curadoria).
- As decisões de contratar não têm campo de fornecedor nem de valor.

**Tarefas:** as 4 decisões de contratar ganham as 4 de contrato. Específicas:
- "Receber a lista de formandos da comissão" C 60
- "Conferir a pronúncia dos nomes com a comissão" C 15
- "Recolher as fotos da turma" N 45
- "Ensaio geral (entrada, juramento, mesa de honra)" C 7
- "Imprimir a ordem de entrada e a chamada" C 3

**Roteiro**, com duas âncoras:
- colacao_* (0 = abertura da sessão solene; condicao colacaoJunto): chegada_formandos -60/40; entrada_formandos -20/15; mesa_honra -5/5; abertura 0/5; juramento 5/10; discursos 15/30; outorga 45/60; encerramento 105/10.
- baile_* (0 = abertura oficial): equipe -360/240; buffet -240/90; recepcao "Recepção e coquetel" -60/60; mesas -10/10; abertura 0/10; homenagens 10/30; valsa 40/20; pista 60.
- Quando colação e baile são juntos, o app desloca o baile em +180 minutos.

**Checklist** (21 itens, com requer_objetivo; o bloco colacao nasceu nesta migração):
- montagem: reuniao_equipe, orientar_fornecedores, som_luz_festa, telao_testado[telao], mesa_diplomas[becas]
- colacao: becas_conferidas, ordem_entrada, som_chamada, mesa_honra_pronta, agua_mesa_honra, juramento_impresso, alinhar_mc, receber_autoridades
- recepcao: recepcao_formandos, valsa_alinhada, atracoes_conferidas[atracoes], retrospectiva_rodando[telao]
- desmontagem: becas_devolvidas, itens_alugados, avarias_espaco, saida_fornecedores

**Recursos** (132): becas_qtd e canudos_qtd por_pessoa 1; agua_mesa fixo 12.

## 3. Corporativo (141/142) como padrão
- **Seed aditivo:** usa not exists e nunca apaga. A 122 e a 125 apagam e recriam.
- **Objetivos:** 15, todos com descrição. O ideal soma 100 (104 depois da faixa da premiação). Os opcionais nascem desligados e o cenário liga.
- **Decisões:** 21, uma por fornecedor (sem a cadeia orçar → visitar). A prioridade desce de 100 a 20 junto com o offset, sem exceção.
- **Pós-evento:** uma decisão com offset 0 e tarefas com offset -1 e -7.
- **Perguntas ao cliente:** pergunta_cliente e label_portal vão dentro do próprio insert.
- **Lições da 142:**
  - pôr set_offset_min junto do set_offset_ideal;
  - decisão que contrata sem "contratar" no código fica sem as 4 tarefas;
  - o título não enumera o formulário.

## 4. O que o aniversário herdaria quase igual
- **Estrutura da debutante, sem o "15":** tema, convidados, verba_total/reserva_pct, prioridades.
- **Fornecedores e decisões:**
  - espaço;
  - buffet (tipo de serviço, degustação, cardápio, confirmar número C 12);
  - decoração (conceito do tema, aprovar, painel de fotos);
  - foto e vídeo, DJ, música do parabéns, doces/bolo/lembrancinhas, convites;
  - lista e RSVP, com a tarefa "Informar o número confirmado…";
  - visita técnica, plano B, roteiro_fechar.
- **Da formatura:** retrospectiva com "Recolher as fotos"; homenagens.
- **Eixos:** tradicional/compacta e os 4 cenários da debutante, que o CHECK já aceita.
- **Roteiro:** equipe, buffet, entrada 0, homenagem, pista, cabine. Falta "Parabéns e bolo" como item (na debutante ele só existe no checklist).
- **Checklist:** a montagem sem itens_debutante; horario_jantar e bolo_parabens; a desmontagem com avarias_espaco.
- **Recursos:** a debutante não tem. O molde é o do casamento (salgados 10, doces 6, bolo 0,12 kg por pessoa; centros de mesa por mesa).

## 5. O que é específico e não serve
- **Da debutante:** valsa, três vestidos e provas, book, 15 velas, drinks sem álcool como decisão fixa, transporte da debutante, iluminação de pista, troca de vestido (roteiro e camarim), base de 12 meses.
- **Da formatura:**
  - colação e protocolo acadêmico, becas e canudos, comissão, pronúncia;
  - fotos do convite, madrinha do anel;
  - evento ligado (evento_pai_id) e bloco colacao;
  - método sem faixa (no aniversário a verba é da cliente);
  - entrada tardia da cerimonialista.

## 6. Padrões de redação
- **Decisão:** infinitivo + artigo + objeto, de 3 a 7 palavras, sem dois-pontos.
- **Objetivo:** de 1 a 4 palavras, muitas vezes "X e Y".
  - Descrição no padrão da 141: uma frase concreta sobre o que há dentro, com ponto e sem travessão ("Quanto se pode gastar e quanto fica de reserva.").
  - Evitar o travessão e o adjetivo da 122 ("o coração de uma festa de 15").
- **Tarefa:** infinitivo, detalhe entre parênteses, até ~70 caracteres. A debutante mistura títulos em substantivo ("Ensaio geral da valsa").
- **Checklist e roteiro:** checklist no particípio ("Lembrancinhas recebidas"); roteiro em substantivo.
- **Campo:** rótulo curto; o fornecedor ganha nome próprio ("Professor"); opções em snake_case, ou texto legível quando o código lê o valor.
- **Pergunta ao cliente:**
  - segunda pessoa, uma pergunta só, dica curta entre parênteses ("Quem fala? (nome, cargo, tempo)");
  - critério da 090: gosto, família, corpo, escolha pessoal;
  - nunca em moeda, fornecedor, anexo, valor%, orcamento%, escala, cenario, verba_total ou reserva_pct;
  - só em decisão N ou A.
- **Códigos:** a decisão leva prefixo do tipo, porque o unique (empresa_id, codigo) vale entre todos os tipos (aniv_ está livre). Campos não levam prefixo; os 4 especiais são literais.
- **Armadilha nas perguntas:**
  - Os 32 códigos curados viram pergunta sozinhos, com texto de casamento (playlist, lista_veto, paleta_cores, topo_bolo, tipo_lembrancinha, lista_bebidas, lista_fotos, estilo_desejado, banda_ou_dj, convidados_estimado, carro, hashtag, prioridades, atracoes…).
  - Pôr pergunta_cliente=false no insert não impede. Só resolve marcar true com label próprio, ou usar outro código.
- **cuidados_noivos:** a decisão das alergias, com sensibilidade, é de casamento, e o código já está ocupado em cada empresa.

## 7. Tokens do CHECK global (141; nada depois mudou)
**escala:**
- tradicional: base do casamento e da debutante (~12 meses, sem delta)
- mini_wedding: casamento em ~4 meses, desliga satélites, 13 prazos comprimidos
- elopement: casamento só com o essencial; desliga satélites, música, doces, papelaria, infra e convidados
- compacta: debutante em ~5 meses
- ate_100: corporativo em ~2,5 meses
- 100_a_400: base do corporativo
- acima_400: corporativo; liga licenças e fecha fornecedores mais cedo

**cenario:**
- igreja: casamento, liga a cerimônia religiosa
- salao_urbano: casamento, infra 2/3/4
- praia, campo_chacara: casamento, infra 10/12/15, plano B com p93 a 315 dias
- destination: casamento, save the date 360, convites 90, hotel 300
- salao, clube, chacara_sitio, casa_de_festas: debutante, sem delta
- confraternizacao: alimentação 30/38/45, AV e conteúdo menores
- convencao_kickoff: liga protocolo e logística
- lancamento: liga protocolo, cenografia 10/15/20
- congresso_seminario: liga protocolo e logística, conteúdo 8/14/20, programa 90
- premiacao: liga premiação e protocolo; roteiro entrega_premios
- treinamento: desliga cenografia
- inauguracao: liga protocolo; roteiro corte_fita

Regras:
- **Tipos sem eixo:** formatura e show.
- **Onde mora o significado:** em (tipo_evento, eixo, codigo) de metodo_arquetipo. Reutilizar um token não mexe no CHECK.
- **Token novo:** exige recriar os dois CHECKs com todos os valores atuais mais o novo, e passar nas duas conferências da 142.
- **Wizard:** só pergunta cenário (e só deriva escala do público) no corporativo. O aniversário cai no template "outro".

## 8. O que pesa no aniversário de 17/10
- **Faltam 34 dias.** Toda decisão com offset maior entra em compressão. A compressão ordena por prioridade e não deixa uma decisão de prioridade menor vencer antes das de prioridade maior já alocadas. Com prioridade fora de ordem, decisões são empurradas para o fim.
- **O guia do primeiro acesso (160) trava.** O passo 2 só vence com events.escala E events.cenario preenchidos. Sem os dois eixos, o guia da primeira cliente não passa desse passo.
- **Evento já criado:** recebe o método por INSERT direto + aplicar_arquetipos_evento (141 §9), porque instanciar_metodo_evento não roda sem sessão de usuária.