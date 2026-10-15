-- ============================================================
-- 208 — O RSVP sabe a quem a entrada e o pedido já foram mandados
-- ============================================================
-- A aba RSVP nova (13/10/2026, "ficha em três painéis"). O problema
-- prático que o dono achou: a cerimonialista confirmava um convidado à
-- mão (ele respondeu no WhatsApp dela) e não sabia quem já tinha a
-- entrada (o QR) e a quem já tinha pedido a confirmação.
--
-- Quatro colunas em evento_convidado, gravadas pela EQUIPE (a policy
-- convidado_update da 092 já cobre): quando e por onde ela mandou a
-- entrada, e quando e por onde ela pediu a confirmação.
--
-- O que elas dizem, sem prometer mais do que sabem:
--   · 'email'    — o Resend aceitou a mensagem (não que chegou);
--   · 'whatsapp' — ela abriu o WhatsApp DELA com a mensagem pronta
--                  (a tela fala "WhatsApp aberto em 13/10", não "enviado").
--
-- Nada novo para o anônimo nem para o portal; nenhuma função nova.
-- Convergente: pode rodar mais de uma vez.

begin;

alter table public.evento_convidado add column if not exists entrada_enviada_em  timestamptz;
alter table public.evento_convidado add column if not exists entrada_enviada_via text;
alter table public.evento_convidado add column if not exists pedido_enviado_em   timestamptz;
alter table public.evento_convidado add column if not exists pedido_enviado_via  text;

do $$
begin
  alter table public.evento_convidado drop constraint if exists evento_convidado_entrada_via;
  alter table public.evento_convidado add constraint evento_convidado_entrada_via
    check (entrada_enviada_via is null or entrada_enviada_via in ('whatsapp', 'email'));
  alter table public.evento_convidado drop constraint if exists evento_convidado_pedido_via;
  alter table public.evento_convidado add constraint evento_convidado_pedido_via
    check (pedido_enviado_via is null or pedido_enviado_via in ('whatsapp', 'email'));
end $$;

comment on column public.evento_convidado.entrada_enviada_em is
  'Quando a equipe mandou a entrada (QR) ao convidado (208). Por e-mail = o Resend aceitou; por WhatsApp = ela abriu o WhatsApp dela com a mensagem.';
comment on column public.evento_convidado.pedido_enviado_em is
  'Quando a equipe pediu a confirmação ao convidado (208). Mesma leitura de entrada_enviada_em.';

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'as quatro colunas existem' as item,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'evento_convidado'
           and column_name in ('entrada_enviada_em', 'entrada_enviada_via', 'pedido_enviado_em', 'pedido_enviado_via')) = 4 as ok
union all
select 'só whatsapp ou email na entrada',
       exists (select 1 from pg_constraint where conname = 'evento_convidado_entrada_via')
union all
select 'só whatsapp ou email no pedido',
       exists (select 1 from pg_constraint where conname = 'evento_convidado_pedido_via')
union all
select 'a equipe continua podendo atualizar o convidado',
       exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'evento_convidado' and policyname = 'convidado_update');
