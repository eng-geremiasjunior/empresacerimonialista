# O portal da noiva que abre conta sozinha (04/10/2026)

## O pedido dele

"Sozinha, planejamento e organização são dela" (decisão de 30/09/2026).
Em 04/10/2026, ao ver que não estava pronto:

- roteiro do dia, sentar os convidados, controle de orçamento, contratos e
  documentos — "a maior parte já existe, só reaproveitar";
- o planejamento **menos técnico, mais visual e bonito**: cada assunto com
  uma foto (Buffet → uma foto de buffet, e ali dentro as decisões);
- o mesmo calendário da cerimonialista, ligado à Agenda do Google;
- "se ela convidar a cerimonialista dela, aí é outra conversa": o evento
  passa para a conta da cerimonialista (188) e o portal volta a ser o de
  hoje (a cerimonialista conduz, a família acompanha e sugere).

## O que já existe e vale para ela

- **A conta da família é uma empresa** (`tipo = 'familia'`) e a noiva é a
  `proprietaria`: toda a RLS por cargo do sistema da cerimonialista já
  deixa ela ler e gravar o próprio evento. As ações do sistema rodam com a
  sessão dela.
- **O método já está no evento dela**: o casamento da conta da família
  nasce com os mesmos 17 assuntos e 90 decisões da cerimonialista
  (`evento_objetivo`, `evento_decisao`, `evento_campo_valor`).
- **A passagem para a cerimonialista é genérica** (`transferir_evento_de_familia`,
  188): tudo o que tem `event_id` + `empresa_id` vai junto. Roteiro, mesas,
  financeiro, documentos e compromissos ficam nas MESMAS tabelas do
  sistema — nada novo a ensinar à passagem.
- Peças prontas: o planejamento (`getPlanejamento`, ações de decidir e de
  preencher campo), as mesas (`MesasDoEvento` + ações, já no celular), o
  roteiro (ações do roteiro), o financeiro do evento (a conta da família,
  `familia-actions`), os documentos do evento (`evento_documento`), a
  Agenda do Google (`lib/google`: agenda "eOrganizei" na conta da pessoa,
  ids determinísticos, fila).

## As telas (só na conta da família; com cerimonialista, nada muda)

1. **Planejamento**, a tela nova do portal. Ele recusou copiar os 17
   assuntos ("quero algo muito mais visual, e mais fácil de lembrar"):
   viraram **9 capítulos** com nome curto e foto (a cor do capítulo com o
   ícone até a foto chegar), e "Agora" no alto (as 3 próximas, em tempo).
   Tocar abre o capítulo: a capa e as decisões numa lista simples — tocar
   abre as perguntas, "Feito" fecha, "Não vamos ter isso" tira do plano.
   Sem palavra de sistema. Por baixo, as MESMAS decisões do método.
2. **Orçamento**: quanto vai custar (a verba de cada assunto), quanto já
   foi pago, quanto falta e as próximas parcelas, em tempo ("vence em 4
   dias"). Lançar um gasto e marcar parcela paga em um toque.
3. **Roteiro do dia**: a tela de hoje passa a editar — acrescentar,
   mudar a hora, tirar um momento.
4. **Mesas**: o editor de mesas do sistema dentro do portal, para ela
   sentar os convidados que já estão na lista.
5. **Contratos e documentos**: subir o contrato de cada fornecedor e os
   comprovantes; ver e baixar.
6. **Calendário**: os compromissos dela (provas, degustações, visitas,
   parcelas) num calendário, com "Ligar à Agenda do Google" — a mesma
   integração da cerimonialista, com a agenda "eOrganizei" na conta dela.

## Os 9 capítulos e as fotos

O assunto entra no capítulo pelo CÓDIGO do método (`metodo_objetivo.codigo`);
código desconhecido (criado à mão) cai em "Outros". Não há foto de nenhum
capítulo no sistema: ele manda as 9, com o nome do capítulo, em
`public/planejamento/<id>.webp`, e o id entra em `FOTOS_DO_PLANEJAMENTO`
(`src/lib/portal-planejamento.ts`). Até lá, a cor do capítulo com o ícone.

| Capítulo | O que tem dentro | Códigos do método | Arquivo |
|---|---|---|---|
| O começo | o formato, os convidados e o orçamento | estrutura | `comeco.webp` |
| O lugar | o espaço, a estrutura e o plano B | espaco, infra | `lugar.webp` |
| O sim | a igreja, o celebrante e o cartório | cerimonia, celebrante, civil | `sim.webp` |
| A festa | buffet, bebidas, música, bolo e doces | buffet, musica, doces | `festa.webp` |
| A decoração | flores e o clima do lugar | decoracao | `decoracao.webp` |
| O look | vestido, beleza, noivo e padrinhos | noiva, noivo | `look.webp` |
| As fotos | fotógrafo e vídeo | foto | `fotos.webp` |
| Os convidados | a lista, os convites e a confirmação | convidados, papelaria | `convidados.webp` |
| Antes e depois | noivado, chá, despedida e lua de mel | satelites, lua_mel | `antes-e-depois.webp` |

Regras que a tela segue:
- "Definir a data" some: a data vem do cadastro (`events.date`) e a
  decisão não tem pergunta.
- Prazo em tempo ("em 4 semanas", "para agora"); só o que está a até 31
  dias ganha a cor, o resto fica em cinza.
- Só quem abriu a conta vê e mexe (`donaDaFesta`): quem ela convida para o
  portal não lê o método (`evento_objetivo` é só da equipe). O noivo
  planejar junto é o próximo passo.
- Só casamento: a conta de família de 15 anos continua no portal da
  família (outra casca, outros assuntos: valsa, vestidos, book, protocolo).
- No celular a capa do portal ocupa a primeira tela: o capítulo abre já
  nele (#capitulo) e voltar cai no planejamento (#planejamento).

## A ordem

Uma parte por vez, cada uma provada no servidor local (390 e 1440, com um
login de família temporário apagado no fim), commit só dela e subida só
com o ok dele:

1. Planejamento visual (com a cor no lugar da foto até as fotos chegarem) — feito.
2. Orçamento — feito: na aba Financeiro, só para a dona da conta. Usa o motor
   do Financeiro da cerimonialista (getFinanceiroDoEvento, numerosDaVerba,
   linhasDeFornecedor) e as ações dele (salvarVerbaTotal,
   salvarContratoFornecedor, lancarNaVerba, gerarParcelasDoFornecedor). Tem o
   orçamento, "Novo gasto" (à vista ou parcelado, com entrada; o fornecedor
   novo entra no cadastro e aparece no planejamento), "Paguei" e "Desfazer"
   em um toque, apagar, e "Por capítulo" (a divisão do método, mostrada e
   não gravada). Falta editar um gasto: hoje é apagar e lançar de novo.
3. Roteiro do dia — feito: a conta de família nascia sem roteiro e sem a hora
   da cerimônia. Agora ela diz a hora e o roteiro nasce do modelo da conta
   (metodo_roteiro_item, sem a "chegada do cerimonialista"; a pista entra),
   em horário estimado. Mudar a hora da cerimônia move só o estimado (o
   gatilho da 112). O lápis muda a hora, o nome e o detalhe (a hora mudada
   vira firme), e ela também acrescenta e tira momentos. Quem ela convida
   vê a tela de leitura de sempre.
4. Mesas — feito: o MESMO editor da cerimonialista (MesasDoEvento: croqui,
   sentar pela mesa ou pelo convidado, regras de quem senta com quem) em
   /portal/<id>/mesas, num cartão do portal. O editor ganhou `noPortal`: o
   "Adicionar convidados" leva à lista do portal e as folhas impressas (rota
   /imprimir, fora do portal) ficam de fora. "Mesas" no Mais e os atalhos
   em Convidados ("Sentar nas mesas" / "Mudar as mesas") só para a dona.
   Quem ela convida volta para Convidados (o mapa só leitura de sempre).
5. Contratos e documentos — feito: a tela Documentos da dona mostra os
   contratos (um por fornecedor dos gastos, mais "Anexar outro contrato" de
   quem ainda não tem gasto: o nome novo entra no cadastro dela) e os
   comprovantes dos pagamentos feitos. O contrato sobe pela porta da
   cerimonialista (prepararAnexoContrato / confirmarAnexoContrato: balde
   contratos, solicitacao_fornecedor); o comprovante, pela do Financeiro
   (balde comprovantes, salvarComprovante). O arquivo abre por
   /portal/<id>/documentos/arquivo, que confere a dona e busca o caminho no
   banco: a /api/contrato fica fora do /portal, que o middleware barra.
6. Calendário e Agenda do Google — feito: a aba Agenda (só a dona) com o mês, "Próximos" e a
   Agenda do Google. Compromissos = a tabela da cerimonialista (compromisso),
   pelas ações dela (criarCompromisso / excluirCompromisso); a fila da 168 leva
   cada mudança para o Google. Na conta de família o link que vai para o
   Google aponta para o portal. Ligar usa as rotas de sempre: o middleware
   deixa quem é do portal passar SÓ por /api/google/conectar e /retorno (que
   exigem cargo — só a dona tem), e o destino de volta aceita
   /portal/<id>/agenda.

Migração só se uma ação do sistema da cerimonialista travar para a
família (cada uma é conferida antes); se precisar, os 2 céticos revisam.

## Já entregue em 04/10/2026

- 89a4a3f: a prova de vida avisa o dono por e-mail e fala certo com a
  noiva (sem "fale com a cerimonialista"); a lista de exemplo sem cartão.
- 088a713: o checkout da lista em duas etapas.
