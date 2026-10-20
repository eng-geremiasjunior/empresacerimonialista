-- ============================================================
-- 217 — Tarefa livre: a tarefa dela, sem evento (19/10/2026)
-- ============================================================
-- Pedido dele: "quero tirar esse método engessado; se o usuário quiser
-- cadastrar uma tarefa sua deve ter essa possibilidade". Até aqui toda
-- tarefa era de um evento (tasks.event_id not null), e muita coisa se
-- apoia nisso — o método, o lembrete (116), o portal da família (179), a
-- pendência financeira (074). Em vez de afrouxar tasks, a tarefa sem
-- evento ganha a sua tabela, no molde da Agenda livre (213).
--
-- Quem vê: quem criou, e a dona e a coordenadora da empresa. Quem cria:
-- qualquer pessoa da equipe, só em nome próprio. Quem muda e apaga: quem
-- criou, a dona e a coordenadora. Anônimo: nada.
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. Conferência no fim.

begin;

create table if not exists public.tarefa_livre (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  criado_por  uuid references auth.users (id) on delete set null default auth.uid(),
  titulo      text not null,
  prazo       date,
  feita_em    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tarefa_livre_titulo_check') then
    alter table public.tarefa_livre add constraint tarefa_livre_titulo_check
      check (char_length(btrim(titulo)) between 1 and 200);
  end if;
end $$;

create index if not exists idx_tarefa_livre_empresa on public.tarefa_livre (empresa_id, prazo);
create index if not exists idx_tarefa_livre_criado_por on public.tarefa_livre (criado_por);

-- a empresa vem da sessão (função da 184), como na Agenda livre
drop trigger if exists trg_fill_empresa on public.tarefa_livre;
create trigger trg_fill_empresa before insert on public.tarefa_livre
  for each row execute function public.fill_empresa_from_sessao();
drop trigger if exists trg_touch on public.tarefa_livre;
create trigger trg_touch before update on public.tarefa_livre
  for each row execute function public.set_updated_at();

alter table public.tarefa_livre enable row level security;
revoke all on public.tarefa_livre from anon;

drop policy if exists "tarefa_livre_select" on public.tarefa_livre;
create policy "tarefa_livre_select" on public.tarefa_livre for select to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (
    criado_por = auth.uid()
    or (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
  )
);

drop policy if exists "tarefa_livre_insert" on public.tarefa_livre;
create policy "tarefa_livre_insert" on public.tarefa_livre for insert to authenticated with check (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and criado_por = auth.uid()
);

drop policy if exists "tarefa_livre_update" on public.tarefa_livre;
create policy "tarefa_livre_update" on public.tarefa_livre for update to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (
    criado_por = auth.uid()
    or (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
  )
) with check (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
);

drop policy if exists "tarefa_livre_delete" on public.tarefa_livre;
create policy "tarefa_livre_delete" on public.tarefa_livre for delete to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (
    criado_por = auth.uid()
    or (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
  )
);

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'tabela tarefa_livre' as item,
       to_regclass('public.tarefa_livre') is not null as ok
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class where oid = 'public.tarefa_livre'::regclass)
union all
select 'quatro regras de acesso',
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tarefa_livre') = 4
union all
select 'anônimo não lê nem grava',
       not has_table_privilege('anon', 'public.tarefa_livre', 'select')
       and not has_table_privilege('anon', 'public.tarefa_livre', 'insert')
union all
select 'empresa preenchida pela sessão',
       exists (select 1 from pg_trigger where tgname = 'trg_fill_empresa'
                  and tgrelid = 'public.tarefa_livre'::regclass);
