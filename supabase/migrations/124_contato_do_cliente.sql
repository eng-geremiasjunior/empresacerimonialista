-- ============================================================
-- Vela — Migração 124: o registro de contato com a cliente
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- A tela nova de Clientes precisa responder "quem esfriou" — e para isso
-- precisa saber QUANDO ela falou com cada uma pela última vez. Esse dado
-- não existia: a tela antiga mostrava a data do último EVENTO CRIADO e
-- chamava de "último contato", que é outra coisa. Cliente com evento
-- fechado há um ano e conversa ontem aparecia como fria.
--
-- Uma linha por conversa registrada. O "último contato" é o max(em), e a
-- visão "sem contato +30d" e o aviso do Copiloto saem daqui — a mesma
-- fonte, para não repetir o erro de dois números discordando na tela.
--
-- Não é um CRM de histórico completo: é o registro curto que ela toca
-- depois de ligar. Sem isso, a visão de frios seria adivinhação.

create table if not exists public.cliente_contato (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  empresa_id  uuid references public.empresas (id) on delete cascade,
  -- data do contato, não do registro: ela pode lançar hoje a ligação de
  -- ontem. Por isso `em` é date e existe separado de created_at.
  em          date not null default current_date,
  canal       text not null default 'outro'
              check (canal in ('whatsapp', 'telefone', 'email', 'presencial', 'outro')),
  nota        text,
  criado_por  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cliente_contato_cliente
  on public.cliente_contato (client_id, em desc);
create index if not exists idx_cliente_contato_empresa
  on public.cliente_contato (empresa_id, em desc);

-- empresa_id preenchido pelo gatilho que já existe para outras tabelas
-- filhas (021): deriva do pai em vez de confiar em quem insere.
create or replace function public.fill_empresa_from_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Deriva SEMPRE, não só quando vem nulo: quem insere pela API poderia
  -- mandar a própria empresa junto com o client_id de outra e a policy
  -- (que compara empresa_id com meu_cargo) aprovaria a linha.
  if new.client_id is not null then
    select empresa_id into new.empresa_id
    from public.clients where id = new.client_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fill_empresa on public.cliente_contato;
create trigger trg_fill_empresa before insert on public.cliente_contato
  for each row execute function public.fill_empresa_from_client();

alter table public.cliente_contato enable row level security;

-- Mesma régua de clients (024): a empresa toda para quem gerencia; para
-- cerimonialista, só as clientes dos eventos que ela enxerga. Contato com
-- cliente é dado comercial, não operacional — assistente fica de fora.
drop policy if exists "cliente_contato_select" on public.cliente_contato;
create policy "cliente_contato_select" on public.cliente_contato
  for select using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (
      (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
      or exists (
        select 1 from public.events e
        where e.client_id = cliente_contato.client_id
          and public.pode_ver_evento(e.id)
      )
    )
  );

drop policy if exists "cliente_contato_insert" on public.cliente_contato;
create policy "cliente_contato_insert" on public.cliente_contato
  for insert with check (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo())
        in ('proprietaria', 'coordenadora', 'cerimonialista')
    -- E o cliente precisa ser um que ela ENXERGA. Sem esta linha, a
    -- policy só olhava a empresa: uma cerimonialista podia gravar
    -- contato na ficha de qualquer cliente da casa, inclusive das que a
    -- própria clients_select esconde dela. O exists roda com a RLS de
    -- clients aplicada, então reusa a régua que já existe em vez de
    -- copiá-la (e envelhecer junto).
    and exists (
      select 1 from public.clients c where c.id = client_id
    )
  );

-- Apagar registro de contato reescreve o histórico de quem esfriou;
-- fica com quem responde pela empresa.
drop policy if exists "cliente_contato_delete" on public.cliente_contato;
create policy "cliente_contato_delete" on public.cliente_contato
  for delete using (
    empresa_id = (select empresa_id from public.meu_cargo())
    and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
  );

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'tabela cliente_contato existe' as item,
       exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = 'cliente_contato') as ok
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class
        where oid = 'public.cliente_contato'::regclass)
union all
select 'as tres policies (select, insert, delete)',
       (select count(*) = 3 from pg_policies
        where schemaname = 'public' and tablename = 'cliente_contato')
union all
select 'gatilho preenche empresa_id',
       exists (select 1 from pg_trigger
               where tgrelid = 'public.cliente_contato'::regclass
                 and tgname = 'trg_fill_empresa')
union all
select 'insert confere o cliente, não só a empresa',
       (select with_check like '%from public.clients%' from pg_policies
        where schemaname = 'public' and tablename = 'cliente_contato'
          and policyname = 'cliente_contato_insert')
union all
select 'gatilho deriva sempre (ignora empresa_id enviada)',
       (pg_get_functiondef('public.fill_empresa_from_client()'::regprocedure)
         not like '%new.empresa_id is null%')
union all
-- O anon TEM grant de insert (padrão do Supabase); quem barra é a RLS.
-- A prova útil é que toda policy passa por meu_cargo(), que devolve vazio
-- para quem não está logado — logo nenhuma linha satisfaz a condição.
select 'toda policy exige vínculo (meu_cargo)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'cliente_contato'
           and coalesce(qual, with_check) not like '%meu_cargo%'
       );
