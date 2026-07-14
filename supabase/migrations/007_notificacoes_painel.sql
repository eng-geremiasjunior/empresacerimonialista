-- ============================================================
-- Vela — Migração 007: painel de notificações
-- Execute no SQL Editor do Supabase (depois da 006_chat.sql).
-- ============================================================

create table if not exists public.notifications (
  id                uuid primary key default gen_random_uuid(),
  cerimonialista_id uuid not null references auth.users (id) on delete cascade,
  type              text not null
                    check (type in ('tarefa_proxima', 'evento', 'pagamento', 'mensagem')),
  title             text not null,
  message           text not null,
  link              text,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications (cerimonialista_id, created_at desc);

alter table public.notifications enable row level security;

-- Cada cerimonialista vê/gerencia apenas as próprias notificações.
create policy "notifications_own" on public.notifications
  for all
  using (cerimonialista_id = auth.uid())
  with check (cerimonialista_id = auth.uid());

-- Realtime: INSERT/UPDATE/DELETE chegam instantaneamente ao sino.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
