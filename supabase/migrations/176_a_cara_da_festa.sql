-- ============================================================
-- 176 — A CARA DA FESTA
-- ============================================================
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
--
-- Portal da família, fase 1 (desenho "Portal da Família v2", 25/09/2026).
-- A família escolhe a cor da festa, o fundo do portal, o topo do Início
-- e o retrato da debutante. A cor é UMA só: dela saem o destaque do
-- portal inteiro (texto, fundo, linha e profundo, calculados na tela).
--
-- A cor mora em três números (L, C, H do oklch) e um nome, e não num id
-- de paleta: as 10 paletas do desenho só preenchem estes números, e a
-- "Paleta e estilo" (fase 6) vai deixar a família montar a dela — sem
-- trocar de coluna.
--
-- Quem escreve: a família do evento (evento_acesso ativo) e a equipe
-- que edita o evento. A linha guarda QUEM mudou por último, com o nome,
-- para a tela dizer "Júlia escolheu · ontem".
--
-- O retrato fica no balde 'inspiracoes' (092), na pasta do evento — a
-- mesma credencial de pasta que a família já usa para as referências.
-- Ele NÃO vai para a página do convidado sem retrato_no_convite = true:
-- a debutante é menor de idade, e a foto dela numa página aberta por
-- link é decisão do responsável.

create table if not exists public.evento_portal_estilo (
  event_id            uuid primary key references public.events (id) on delete cascade,
  empresa_id          uuid references public.empresas (id),
  cor_nome            text not null default 'Lilás',
  cor_l               numeric(4, 3) not null default 0.66,
  cor_c               numeric(4, 3) not null default 0.09,
  cor_h               numeric(5, 1) not null default 305,
  fundo               text not null default 'festa',
  topo                text not null default 'padrao',
  retrato_path        text,
  retrato_no_convite  boolean not null default false,
  atualizado_por      uuid references auth.users (id) on delete set null,
  atualizado_por_nome text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- CHECKs separados do ADD COLUMN, para a migração poder rodar de novo
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evento_portal_estilo_fundo_chk') then
    alter table public.evento_portal_estilo add constraint evento_portal_estilo_fundo_chk
      check (fundo in ('festa', 'seda', 'noite', 'jardim', 'papel'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evento_portal_estilo_topo_chk') then
    alter table public.evento_portal_estilo add constraint evento_portal_estilo_topo_chk
      check (topo in ('padrao', 'retrato'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'evento_portal_estilo_cor_chk') then
    alter table public.evento_portal_estilo add constraint evento_portal_estilo_cor_chk
      check (cor_l between 0.3 and 0.85
             and cor_c between 0 and 0.2
             and cor_h between 0 and 360
             and char_length(btrim(cor_nome)) between 1 and 30);
  end if;
  -- o retrato só pode morar na pasta do PRÓPRIO evento
  if not exists (select 1 from pg_constraint where conname = 'evento_portal_estilo_retrato_chk') then
    alter table public.evento_portal_estilo add constraint evento_portal_estilo_retrato_chk
      check (retrato_path is null or retrato_path like event_id::text || '/%');
  end if;
end $$;

drop trigger if exists trg_fill_empresa on public.evento_portal_estilo;
create trigger trg_fill_empresa before insert on public.evento_portal_estilo
  for each row execute function public.fill_empresa_from_event();

-- quem mudou por último, e quando: a família pelo nome do acesso dela,
-- a equipe pelo nome da equipe
create or replace function public.trg_estilo_autor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.atualizado_por := auth.uid();
  new.atualizado_por_nome := coalesce(
    (select ea.nome from public.evento_acesso ea
      where ea.event_id = new.event_id and ea.user_id = auth.uid() and ea.status = 'ativo'
      limit 1),
    (select m.nome from public.membros_equipe m
      where m.user_id = auth.uid()
      limit 1),
    new.atualizado_por_nome
  );
  return new;
end $$;

revoke all on function public.trg_estilo_autor() from public, anon;

drop trigger if exists trg_estilo_autor on public.evento_portal_estilo;
create trigger trg_estilo_autor before insert or update on public.evento_portal_estilo
  for each row execute function public.trg_estilo_autor();

alter table public.evento_portal_estilo enable row level security;

drop policy if exists evento_portal_estilo_select on public.evento_portal_estilo;
create policy evento_portal_estilo_select on public.evento_portal_estilo
  for select using (
    public.pode_ver_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

drop policy if exists evento_portal_estilo_insert on public.evento_portal_estilo;
create policy evento_portal_estilo_insert on public.evento_portal_estilo
  for insert with check (
    public.pode_editar_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

drop policy if exists evento_portal_estilo_update on public.evento_portal_estilo;
create policy evento_portal_estilo_update on public.evento_portal_estilo
  for update using (
    public.pode_editar_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  ) with check (
    public.pode_editar_evento(event_id)
    or event_id in (select public.eventos_da_cliente())
  );

-- sem policy de delete: a linha só muda, nunca some pela API

-- ------------------------------------------------------------
-- Conferência — tudo true
-- ------------------------------------------------------------
select 'a tabela da cara da festa existe, com RLS ligada' as item,
       coalesce((select c.relrowsecurity from pg_class c
                  where c.oid = to_regclass('public.evento_portal_estilo')), false) as ok
union all
select 'três policies (ler, criar, mudar) e nenhuma de apagar',
       (select count(*) = 3 from pg_policies
         where schemaname = 'public' and tablename = 'evento_portal_estilo')
       and not exists (select 1 from pg_policies
                        where schemaname = 'public' and tablename = 'evento_portal_estilo'
                          and cmd = 'DELETE')
union all
select 'os quatro CHECKs no lugar',
       (select count(*) = 4 from pg_constraint
         where conrelid = 'public.evento_portal_estilo'::regclass
           and conname like 'evento_portal_estilo_%_chk')
union all
select 'o gatilho do autor e o da empresa no lugar',
       (select count(*) = 2 from pg_trigger t join pg_class c on c.oid = t.tgrelid
         where c.relname = 'evento_portal_estilo'
           and t.tgname in ('trg_estilo_autor', 'trg_fill_empresa'));
