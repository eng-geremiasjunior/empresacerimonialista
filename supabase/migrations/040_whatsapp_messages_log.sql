-- ============================================================
-- Vela — Migração 040: log de mensagens recebidas do WhatsApp.
--
-- Auditoria de TUDO que chega no webhook, inclusive o que não foi
-- processado automaticamente — é o que permite depurar "o fornecedor
-- respondeu e não aconteceu nada".
--
-- Sem policies: a tabela é escrita e lida apenas pelo service role
-- (webhook server-side). RLS ligada nega qualquer acesso via anon/
-- authenticated, que é o comportamento desejado para um log bruto —
-- o payload da Meta pode conter dados de outras empresas.
--
-- Execute no SQL Editor do Supabase (depois da 039).
-- ============================================================

begin;

create table if not exists public.whatsapp_messages_log (
  id           uuid primary key default gen_random_uuid(),
  from_phone   text not null,
  message_type text not null,   -- 'text' | 'button_reply' | 'interactive' | 'status' | 'outro'
  raw_payload  jsonb not null,
  processado   boolean not null default false,
  resultado    text,            -- o que foi feito com a mensagem (debug)
  created_at   timestamptz not null default now()
);

create index if not exists idx_whatsapp_log_phone
  on public.whatsapp_messages_log (from_phone, created_at desc);
create index if not exists idx_whatsapp_log_created
  on public.whatsapp_messages_log (created_at desc);

alter table public.whatsapp_messages_log enable row level security;

commit;
