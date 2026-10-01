# Portal dos Noivos v4 — plano (30/09/2026)

Desenho: `Downloads/design_handoff_portal_noivos/` (Portal da Noiva v4.dc.html
+ README). Alta fidelidade: tokens, fontes, raios, sombras e animações finais.

## Decisões dele (30/09)
- Celular: eu adapto (desenho é só 1280px) e mostro cada adaptação em 390px.
- Sem cerimonialista (conta de família, 187/188): marca **eorganizei**; o
  cartão escuro da cerimonialista vira o **convite** (e o pedido, quando
  chegar); "com o Geremias" vira "com vocês".
- **Tudo junto**: inclusive as partes sem sistema por trás. Duas dependem de
  terceiros e ficam no limite do possível:
  - WhatsApp automático (API da Meta parada) → lembretes por e-mail e Google;
    o canal WhatsApp entra quando a API voltar (sem chave "em breve").
  - Presente pago verificado (Pagar.me) → a cota da lua de mel funciona já
    como no desenho: "Pix direto na conta de vocês" — o convidado paga na
    chave do casal e DECLARA (valor + recado); o casal agradece. Quando a
    Pagar.me liberar, o pagamento passa a ser conferido.
- Modelo: Opus 5.5; **ultracode nas telas** (a fundação sai de uma mão só).

## Arquitetura
- `usaPortalNoivos(tipo)` = casamento (a v2 continua na debutante).
- Casca nova `src/components/portal/noivos/` (irmã de `v2/`): tokens,
  fontes (Marcellus, Nunito Sans, Material Symbols Rounded com subconjunto
  dos ícones usados — servidas localmente: lição do redeploy), keyframes do
  README copiados como estão, `prefers-reduced-motion` desliga kb/sweep/
  halo/confete.
- Layout do evento: capa + barra + menu persistem; as telas são as rotas de
  hoje (/portal/[id]/convidados, …) e as novas (documentos, musicas, agenda,
  inspiracoes, roteiro, financeiro, familia, lembretes, privacidade, depois).
- Entrada: uma vez por sessão (sessionStorage); "Entrada" repete. A MESMA
  camada da foto anima (top/left/width/height/raio, 1.1s).
- Foto da capa: a do casal no site (evento_site.foto_casal_path) quando
  houver; senão a noiva sobe uma (mesmo balde, pasta do evento); sem foto,
  o fundo `#26392f` com as iniciais.
- Celular: capa menor, menu vira faixa rolável, grids em 1 coluna, card
  RSVP empilhado; cada adaptação dita a ele com captura.

## Fase 0 — Fundação (eu, sem agentes)
Tokens/fontes/keyframes, Entrada + transição, barra (modo Planejando/É hoje,
Entrada, sino, pessoa + "Ver como"), capa (contagem sem backdrop-filter),
menu de 12 + "Mais" (8), toast, primitivas (Card, Eyebrow, Chip, Botão,
Barra, Anel, Toggle, Selo pop). Prova: capturas 1280 e 390 lado a lado com o
protótipo aberto no Chrome sem janela; medidas por estilo computado.

## Fase 1 — Telas com dado que já existe (ultracode, em paralelo)
Visão geral (Hoje só uma coisa = tarefas da família; 3 atalhos; linha do
tempo; trilha; perguntas; cerimonialista/convite; rodapé instalar) ·
Convidados (anel RSVP, envios, lista) · Fornecedores · Documentos (contratos
que o portal já vê; decisões da mão dupla) · Linha do tempo (decisões e
tarefas por mês, com vocês × com a cerimonialista) · Músicas (trilha 180 +
prévia de 30s) · Inspirações · Presentes (Pix + listas nas lojas) · Roteiro
do dia · Financeiro (parcelas; só quem contrata) · Guia de estilo, Escolhas,
Convite, Cortejo (conteúdo atual com os tokens). Cada agente: uma tela, a
prova de fidelidade roda EM FILA (máquina de 8 GB: um servidor, um Chrome).

## Fase 2 — Sistemas novos (cada um com migração revisada e aplicada por ele)
1. **Pessoas e permissões**: convidar mãe/pai, padrinho, só leitura, "pode
   aprovar"; o menu e os atalhos somem conforme o papel; RLS por
   capacidade; "Ver o portal como". (Fable/céticos.)
2. **Aprovações com histórico**: aprovar / pedir mudança; data e hora do
   servidor + id de quem aprovou (imutável, molde do aceite).
3. **Assinar documento**: registro de quem assinou, quando, IP e hash
   (molde da 162); o arquivo é da equipe.
4. **Parcelas com Pix**: QR estático (BR Code) com a chave da cerimonialista
   e o valor; o casal sobe o comprovante (178); a equipe confirma.
5. **Presentes declarados**: o convidado diz quanto mandou e deixa recado;
   meta da cota; "Agradecer" (e-mail; WhatsApp por link).
6. **RSVP ao vivo + convite digital**: "Chegando agora" por realtime; o
   fluxo do convidado (/confirmar) redesenhado como no celular do desenho
   (passos, acompanhantes, restrições, música, recado, confete) — restrições
   e hotel viram contagem para buffet/hotel.
7. **Mesas pelo casal**: mapa simples sobre as mesas da equipe (sem
   conflitar com o croqui; regra de quem manda a decidir).
8. **Google Agenda do casal**: OAuth pelo portal, agenda "eOrganizei" (molde
   da integração da cerimonialista).
9. **Lembretes**: e-mail e Google por tema (parcelas, prazos, mensagens,
   confirmações).
10. **Privacidade e dados**: consentimento no RSVP, apagar convidados 90 dias
    depois (rotina), baixar dados, excluir a conta.
11. **Depois do casamento**: fotos (álbum do site), agradecimento em massa,
    avaliação de fornecedores (5 estrelas).
12. **É hoje**: liga sozinho na data; agora/a seguir do roteiro; contatos;
    mala da noiva; tudo em cache offline (service worker do portal).

## Como a Fase 2 é entregue (30/09, depois do levantamento)
- Permissões por pessoa (item 1) = migração própria: `evento_acesso.nivel`
  ('casal' | 'familia' | 'padrinho' | 'leitura') + `pode_aprovar`; os
  acessos que já existem ficam 'casal' (a debutante não muda). Regra do
  desenho: mãe/pai sem Financeiro, Documentos, Família e acessos,
  Privacidade; padrinho só Visão geral, Linha do tempo, Músicas,
  Inspirações, Roteiro e os itens de Mais permitidos; "só leitura" não
  escreve. No banco: `portal_pode(evento, área)` e
  `portal_pode_escrever(evento)`; as 34 funções do portal ganham a
  conferência por EMBRULHO (a atual é renomeada `…_base` e a nova confere
  o papel e chama a base — sem copiar corpo); ~35 das 44 políticas de
  família (convidados, acompanhantes, chegada, dinheiro, gastos,
  recebedor, documentos, fornecedores da família, e toda escrita) ganham a
  condição. Dois céticos antes de aplicar.
- Tabelas novas numa migração só (aditiva): presente declarado (+ meta da
  cota no site), mala da noiva, avaliação de fornecedores, preferências de
  lembrete por pessoa, apagar convidados em 90 dias (evento), aprovação
  com histórico imutável, assinatura de documento (molde 162).
- Google do casal: tokens por login do portal (molde 168), rota OAuth do
  portal, agenda "eOrganizei".
- Entrega em levas: a Fase 1 sobe quando verificada (o menu só mostra
  tela pronta); cada leva da Fase 2 sobe depois da migração aplicada.
- Sino: feed próprio do portal (a policy de notifications é só de equipe
  e os links apontam para o painel) — entra com Lembretes.

## Verificação (toda fase)
tsc, lint, `next build` com o servidor parado; capturas 1280 e 390 lado a
lado com o protótipo; sem erro no console; conta de teste só-família criada e
apagada no fim; migrações com conferência `true` e dois céticos nas de RLS.

## Riscos
- Máquina de 8 GB: um servidor e um Chrome por vez (o dev já morreu com 3).
- Fonte de ícones: subconjunto local, senão ~4 MB.
- "Tudo junto" = várias migrações; cada uma para na mão dele para aplicar.
