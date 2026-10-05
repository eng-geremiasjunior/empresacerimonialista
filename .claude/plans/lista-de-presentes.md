# Lista de presentes com compra (fatia C do plano "Site e lista")

02/10/2026. Pedido dele: "pode começar aí" (o catálogo pronto, como as
listas da Wedy) e o botão de comprar — "é o motivo de eu ter corrido atrás
do split do Pagar.me, então teremos também".

## O que as listas da Wedy mostraram (3 sites reais, lidos hoje)

- 100 a 240 itens em categorias (cômodos, viagem com o destino, "Lista
  Divertida"); filtro Todos/Casa/Viagem/Criativos; "COMPRAR" e, depois de
  pago, "COMPRADO" no fim da categoria.
- A maior parte das fotos é do CATÁLOGO da plataforma (232 de 236 num
  site); o casal edita nome e preço e cria itens com foto própria.
- Preço exibido com a taxa somada (~4%); o base é redondo.
- Um casal pôs "PIX - telefone" num item de R$ 0,21 para fugir da taxa.

## Decisões já tomadas por ele (memória lista-de-presentes-parcerias)

- Taxa 3,89% por presente, REPASSADA ao convidado por padrão (o casal pode
  assumir). Mínimo R$ 50.
- Do que sobra depois da tarifa da Pagar.me, metade é da cerimonialista
  (Pix mensal com recibo, calculado pelo sistema) — relatório numa fatia
  depois.
- Pix primeiro; cartão depois (tokenização + domínio cadastrado).
- O dinheiro vai DIRETO ao recebedor da família no split; o eOrganizei
  nunca guarda dinheiro. CPF e conta passam para a Pagar.me sem ficar aqui.

## Desenho (decisões minhas, ditas a ele)

1. **A lista é uma página própria**, `/c/<endereço>/presentes` (rewrite,
   como o convite), com a cara do site (cores e fontes do modelo). O bloco
   de presentes de cada modelo de site continua; ganha o link "Ver a lista
   de presentes". Motivo: 24 itens dentro do conteúdo do site não comportam
   uma lista de 100+ com categorias, e cada um dos 7 modelos teria de
   redesenhar o bloco.
2. **A lista mora numa tabela própria** (`evento_presente`), ao vivo, sem
   a revisão do dono: na v1 as fotos são SÓ do nosso catálogo (o casal
   escolhe entre elas); foto própria do casal entra depois, passando pela
   revisão dele (a regra dele: o risco é a foto).
3. **O convidado informa nome, e-mail, CPF e celular** — a Pagar.me exige
   os quatro para Pix. CPF e celular vão direto para ela; aqui ficam nome,
   e-mail (para o "obrigado") e o recado.
4. **Comprado** = pagamentos confirmados ≥ quantidade desejada do item.
5. **Confirmação**: a página do convidado pergunta ao nosso servidor, que
   RELÊ o pedido na Pagar.me (o webhook acelera, não é a verdade).
6. **Recebedor no portal do casamento** (hoje só existe no da debutante):
   a seção "Receber os presentes" na tela Presentes do v4.
7. **Liberada só nas contas da casa** (`listaDePresentesLiberada`) até o
   primeiro presente de verdade passar em produção.

## Fatias

- C1 — Catálogo (dados + fotos) e a montagem da lista no portal (v4).
- C2 — Página pública da lista + link no site.
- C3 — Migração 197: lista, configurações e pagamentos (2 céticos).
- C4 — Comprar: pedido Pix com split, status, webhook; recebedor no v4;
  "Recebidos" no portal.
- Depois: foto própria com revisão; cartão; cotas; agradecer por e-mail;
  relatório da cerimonialista; produto por link de loja.

## Provas

- Teste da Pagar.me (sk_test_): o pedido COM split é aceito (o simulador
  de Pix não paga pedido com split — docs/simulador-pix); o "pago" é
  provado num Pix SEM split (≤ R$ 500 paga sozinho em segundos).
- Produção: ele faz um presente real de R$ 50 num evento da casa com
  recebedor ativo.

## O que foi construído (02/10/2026)

- **Catálogo** `src/lib/catalogo-de-presentes.ts`: 14 categorias, 139
  presentes com preço redondo, 44 na sugestão inicial. Fotos: 29 (as que
  ele escolheu, em public/presentes-catalogo; o resto mostra a inicial).
- **Portal (v4)** `telas/presentes/lista/`: começar com a sugestão, catálogo
  com busca e categorias, "outro presente", nome/valor/quantidade
  editáveis, quem paga a taxa (com o exemplo em reais), frase, pôr no ar,
  link/WhatsApp, Recebidos (só o casal), e a conta que recebe (o cadastro
  do v2, com as peças do v4). Só nas contas da casa.
- **Página do convidado** `/c/<endereço>/presentes` (`src/app/presentes`,
  `components/lista-presentes`): cores e letras do site do casal,
  categorias, ordenar por valor, preço já com a taxa, janela do Pix (QR,
  copia e cola, espera, "Obrigado"), o Pix guardado na aba.
- **Site**: o bloco de presentes dos 6 modelos e do "Site do casamento"
  ganha "Ver a lista de presentes" quando a lista está no ar (e o Pix
  avulso do site sai de cena).
- **Dinheiro**: rota que gera o Pix (preço do banco, split, freio por
  pessoa no banco, mesmo Pix para o mesmo convidado, corrida do último
  item), rota de estado (relê a Pagar.me, vez atômica de 4 s), webhook
  (order.* e charge.* sem fatura), rotina diária presentes-pendentes, e as
  passagens de estado num lugar só (`lib/supabase/presente-pagamento.ts`).
- **2 céticos** revisaram a 197 e o caminho do dinheiro: nenhum achado
  grave; os médios e baixos foram corrigidos (197 revisada para ele
  reaplicar).

## O cartão (04/10/2026)

Decisões dele: até 6x; a taxa do cartão é de quem presenteia; contestação
como no Pix (o casal e a plataforma, cada um pela sua parte); a mesma taxa
para todas as bandeiras. A taxa é a tabela "Depois" que o gerente da conta
mandou (custo efetivo com recebimento em D+15): 5,38% · 7,71% · 9,09% ·
10,47% · 11,85% · 13,23% (1x a 6x), mais o antifraude de R$ 0,44. Mudou o
contrato, muda só `TAXAS_DO_CARTAO` (`lib/lista-presentes.ts`).

- **A conta**: o acréscimo resolve acréscimo = taxa × (total do Pix +
  acréscimo) + antifraude, com inteiros e para cima. O casal recebe o
  mesmo que no Pix; a plataforma não fica abaixo do Pix. Provado em 4.956
  casos (`ferramentas/sim/cartao-taxas-puro.mjs`).
- **198**: `meio`, `parcelas` e `taxa_cartao_centavos` em
  presente_pagamento; o casal lê meio e parcelas ("cartão em 3x").
- **O caminho**: o navegador troca o cartão por token direto com a
  Pagar.me (a chave pública vem do servidor: a de teste só com a secreta
  de teste); a rota recebe token, parcelas e o endereço da fatura e cobra
  na hora (pago, recusado ou em análise). Sem resposta da Pagar.me (rede,
  5xx) o pagamento fica "aguardando" em vez de convidar a pagar de novo; o
  webhook acha o pagamento pelo código do pedido se a ligação não foi
  gravada. Freios do cartão: 6 tentativas por origem por hora, 5 recusas
  por origem e 3 por e-mail por dia, disjuntor de 15 recusas por lista por
  hora.
- **A loja de teste aprova QUALQUER cartão de teste** (o "de falha" 0028 e
  o "em análise" 0036 voltaram pagos): a recusa e o "em análise" foram
  provados trocando só a resposta da rota no navegador
  (`ferramentas/sim/lista-cartao-e2e.mjs`). O endereço público é
  `/c/<endereço>/presentes` (o `/presentes/<endereço>` direto pede login).
- **Falta**: a prova real em produção (a divisão no cartão, como a do
  Pix, só se prova lá) — depende de uma conta que recebe aprovada.

## Sem esperar a prova de vida (05/10/2026, migração 200)

Decisão dele: o pagamento do convidado (Pix ou cartão) depende só do
processamento da Pagar.me; a prova de vida segura apenas a TRANSFERÊNCIA
para a conta da noiva, e o link dela ele manda à mão, pelo WhatsApp.

- **Regra**: a conta que recebe serve com o recebedor CADASTRADO e não
  recusado, suspenso, bloqueado ou inativo (`contaRecebe` em
  `src/lib/lista-presentes.ts`). A 200 troca essa mesma condição em
  `portal_salvar_lista` (pôr no ar) e em `lista_publica` (`pode_pagar`);
  a rota `/api/presentes/[slug]/pagar` e a tela seguem a mesma regra.
- **Ordem**: a 200 vai ao banco ANTES do código; sem ela o banco ainda
  recusa pôr no ar e o `pode_pagar` fica falso.
- **Refazer o cadastro**: não troca a conta que já recebeu presente (nem
  com um Pix aberto) — o dinheiro ficaria no recebedor antigo.
- **No portal** (mesmo pedido): Presentes logo depois da Visão geral, em
  pêssego, e o Site do casamento e o Convite em seguida (saíram do Mais);
  "Crie sua lista de presentes agora mesmo" acima do Hoje da Visão geral;
  o presente flutuante em toda tela menos Presentes. Banner e presente só
  para o nível casal e só com a lista fora do ar (`chamarParaALista`);
  o presente se esconde enquanto o menu está na faixa de baixo da tela.
  No celular, a conta que recebe sobe para o topo de Presentes enquanto
  pede ação. Prova: `ferramentas/sim/presentes-chamada-e2e.mjs`.

## O que falta

- Ele reaplicar a 197 revisada; depois, a prova do Pix na loja de teste.
- Fotos do catálogo: 35 de 139. Em 05/10 entraram as de marca (o ferro,
  a parafusadeira e as 4 TVs; "as imagens são públicas", disse ele) e a
  panela de pressão ganhou a foto que ele mandou. Faltam os outros 104
  (lotes de 30).
- Na Pagar.me de produção: marcar no webhook os avisos order.paid,
  order.canceled, order.payment_failed, charge.paid e charge.refunded.
- A prova real em produção: um presente de R$ 50 — desde a 200 basta a
  conta cadastrada (a transferência espera a prova de vida).
- Depois: foto própria com revisão, cotas, agradecer por e-mail,
  relatório da cerimonialista, produto por link de loja.
