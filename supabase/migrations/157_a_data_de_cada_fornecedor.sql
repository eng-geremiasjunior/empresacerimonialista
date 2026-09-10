-- ============================================================
-- 157 — A data de confirmação de cada fornecedor
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- O PEDIDO (dono, 10/09/2026): "e se esse disparo automático nós
-- deixarmos ele padrão assim e adicionarmos uma camada fornecedor por
-- fornecedor, onde a própria cerimonialista coloca a data que ela quer
-- que seja disparado?"
--
-- Faz sentido no ofício: o buffet confirma com um mês, a banda com uma
-- semana, e o cerimonial religioso na véspera. Um único "7 dias antes"
-- para o evento inteiro obriga a escolher o prazo mais apertado de
-- todos e cobrar o resto à mão.
--
-- O QUE ENTRA. Uma coluna no vínculo — `roteiro_links` já é a linha por
-- (evento, fornecedor), é onde mora o hash do link dele, e existe desde
-- o momento em que ela vincula. Vazia, o fornecedor segue o padrão do
-- evento (`events.confirmation_days_before`). Preenchida, o convite
-- automático dele sai NAQUELE dia.
--
-- POR QUE UMA DATA E NÃO "DIAS ANTES". Foi o que ele pediu, e é o que
-- ela tem na cabeça: "o buffet eu aviso dia 3". Dias antes obriga a
-- fazer a conta de trás para frente toda vez, e a refazer quando a data
-- do evento muda.
--
-- SEM CHECK, DE PROPÓSITO. Uma trava dizendo "não pode ser depois do
-- evento" pareceria zelo e seria armadilha: basta a data do evento ser
-- antecipada para um UPDATE legítimo passar a falhar, e a mensagem que
-- ela veria seria um erro de banco. Quem limita a escolha é a tela (o
-- campo não deixa escolher depois do evento); o banco aceita, e o cron
-- lê. Data no passado não é erro: significa "manda na próxima varredura".
--
-- ============================================================
-- O QUE MUDA FORA DAQUI, e é a parte que importa
-- ============================================================
-- Até hoje o cron carimbava `events.confirmation_sent_at` depois de
-- rodar e usava esse carimbo para não repetir: um envio por EVENTO. Com
-- datas diferentes por fornecedor isso mataria em silêncio o disparo de
-- quem ainda não chegou a vez — o primeiro fornecedor a sair fecharia a
-- porta para todos os outros.
--
-- O "já foi" passa a ser por fornecedor, e não precisa de coluna nova:
-- `supplier_confirmations.sent_at` já existe, com unique (event_id,
-- supplier_id). O carimbo do evento continua sendo escrito, mas só
-- quando não sobra ninguém a enviar — vira registro, não tranca.
--
-- EFEITO DE BORDA CONHECIDO E DESEJADO: um fornecedor vinculado a um
-- evento que já teve a rodada de confirmação, ou que na época estava sem
-- e-mail, passa a receber o convite automático quando a vez dele
-- chegar. Antes ele ficava para trás em silêncio.
--
-- NADA É REENVIADO. Quem já tem `sent_at` preenchido é pulado pelo cron.
-- Reenviar continua sendo decisão dela, pelo botão da tela.
-- ============================================================

alter table public.roteiro_links
  add column if not exists confirmar_em date;

comment on column public.roteiro_links.confirmar_em is
  'Data em que a confirmação automática deve sair PARA ESTE fornecedor. '
  'Nulo = segue o padrão do evento (events.confirmation_days_before). '
  'Quem garante que não é depois do evento é a tela, não um CHECK.';

-- O cron varre por evento e depois por fornecedor; o índice de evento
-- (idx_roteiro_links_event, da 002) já serve. Nada a criar aqui.
