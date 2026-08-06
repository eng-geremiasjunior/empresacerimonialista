-- 075 — Controle do canal WhatsApp na confirmação automática
--
-- A automação de confirmação JÁ enviava WhatsApp junto do e-mail (ver
-- lib/confirmacoes.ts), condicionada só a existirem credenciais — mas sem
-- nenhum controle nem indicação na tela. A cerimonialista não tinha como
-- saber, nem desligar por evento.
--
-- Default TRUE de propósito: é o comportamento que já acontece hoje.
-- Colocar false silenciaria um envio que funciona; aqui só damos visibilidade
-- e controle.

alter table public.events
  add column if not exists whatsapp_auto boolean not null default true;

comment on column public.events.whatsapp_auto is
  'Confirmação automática também por WhatsApp (além do e-mail). '
  'Mesma cadência de confirmation_days_before.';
