-- ============================================================
-- 182 — A lista de presentes, etapa 1: o recebedor da família
-- ============================================================
-- O dinheiro dos presentes vai direto para a família, pelo split da
-- Pagar.me: o eOrganizei nunca guarda dinheiro de evento. Para isso o
-- responsável vira RECEBEDOR na Pagar.me (cadastro + prova de vida).
--
-- Aqui fica SÓ o que a tela precisa: o código do recebedor, o estado da
-- análise e um resumo para mostrar ("Itaú · conta ···123"). CPF, data de
-- nascimento, nome da mãe, renda, endereço e conta completa vão direto
-- para a Pagar.me e NÃO são guardados aqui.
--
-- Escrita só pelo servidor (chave de serviço), depois de conferir que
-- quem pede é o responsável do evento — nenhuma policy de escrita.
--
-- Idempotente. Termina com a conferência (tudo true).

create table if not exists public.evento_recebedor (
  event_id             uuid primary key references public.events (id) on delete cascade,
  empresa_id           uuid references public.empresas (id) on delete cascade,
  pagarme_recipient_id text not null unique,
  status               text not null default 'registration',
  kyc_status           text,
  titular_nome         text,
  banco_resumo         text,
  criado_por           uuid references auth.users (id) on delete set null,
  criado_por_nome      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.evento_recebedor drop constraint if exists evento_recebedor_status_check;
alter table public.evento_recebedor add constraint evento_recebedor_status_check
  check (status in ('registration', 'affiliation', 'active', 'refused', 'suspended', 'blocked', 'inactive')
         and (titular_nome is null or char_length(titular_nome) <= 80)
         and (banco_resumo is null or char_length(banco_resumo) <= 80));

drop trigger if exists trg_fill_empresa on public.evento_recebedor;
create trigger trg_fill_empresa before insert on public.evento_recebedor
  for each row execute function public.fill_empresa_from_event();

alter table public.evento_recebedor enable row level security;

-- a família e a equipe leem o estado; ninguém escreve pela API
drop policy if exists evento_recebedor_select on public.evento_recebedor;
create policy evento_recebedor_select on public.evento_recebedor
  for select to authenticated using (
    public.pode_ver_evento(event_id) or event_id in (select public.eventos_da_cliente())
  );

-- ------------------------------------------------------------
-- Conferência — tudo true
-- ------------------------------------------------------------
select 'o recebedor existe, com RLS ligada' as item,
       coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.evento_recebedor')), false) as ok
union all
select 'uma policy só (leitura); nenhuma escrita pela API',
       (select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'evento_recebedor')
union all
select 'nenhuma coluna de documento, nascimento, renda ou conta completa',
       not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'evento_recebedor'
                      and column_name ~ 'cpf|document|nasc|birth|renda|income|mae|mother|agencia|branch|account|conta_numero');
