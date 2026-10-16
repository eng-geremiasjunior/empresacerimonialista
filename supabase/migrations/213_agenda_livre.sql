-- 213: a agenda livre da empresa (16/10/2026)
--
-- Pedido dele: "na agenda a cerimonialista pode colocar qualquer coisa" —
-- visita a salão, reunião com cliente nova, dentista. Até aqui a Agenda só
-- mostrava eventos e tarefas, e o compromisso (069) é preso a um evento
-- (o portal da família e a sincronia com o Google leem por ele), então
-- ganhou tabela própria, da empresa, sem evento.
--
-- Acesso no molde do Estoque (184): a equipe da empresa vê; proprietária,
-- coordenadora e cerimonialista escrevem; apagar, também quem criou.
-- Nada de portal nem de anônimo. Convergente: pode rodar de novo.

create table if not exists public.agenda_item (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas (id) on delete cascade,
  criado_por  uuid references auth.users (id) on delete set null default auth.uid(),
  titulo      text not null,
  data        date not null,
  hora        time,
  local       text,
  observacao  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_item_titulo_check') then
    alter table public.agenda_item add constraint agenda_item_titulo_check
      check (char_length(btrim(titulo)) between 1 and 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agenda_item_textos_check') then
    alter table public.agenda_item add constraint agenda_item_textos_check
      check (coalesce(char_length(local), 0) <= 160 and coalesce(char_length(observacao), 0) <= 500);
  end if;
end $$;

create index if not exists idx_agenda_item_empresa_data on public.agenda_item (empresa_id, data);

-- a empresa vem da sessão (função da 184)
drop trigger if exists trg_fill_empresa on public.agenda_item;
create trigger trg_fill_empresa before insert on public.agenda_item
  for each row execute function public.fill_empresa_from_sessao();
drop trigger if exists trg_touch on public.agenda_item;
create trigger trg_touch before update on public.agenda_item
  for each row execute function public.set_updated_at();

alter table public.agenda_item enable row level security;
revoke all on public.agenda_item from anon;

drop policy if exists "agenda_item_select" on public.agenda_item;
create policy "agenda_item_select" on public.agenda_item for select to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
);

drop policy if exists "agenda_item_insert" on public.agenda_item;
create policy "agenda_item_insert" on public.agenda_item for insert to authenticated with check (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora', 'cerimonialista')
);

drop policy if exists "agenda_item_update" on public.agenda_item;
create policy "agenda_item_update" on public.agenda_item for update to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora', 'cerimonialista')
) with check (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
);

drop policy if exists "agenda_item_delete" on public.agenda_item;
create policy "agenda_item_delete" on public.agenda_item for delete to authenticated using (
  empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
  and (
    criado_por = auth.uid()
    or (select mc.cargo from public.meu_cargo() mc) in ('proprietaria', 'coordenadora')
  )
);

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'tabela agenda_item' as verificacao,
       to_regclass('public.agenda_item') is not null as aplicou
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class where oid = 'public.agenda_item'::regclass)
union all
select 'quatro regras de acesso',
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'agenda_item') = 4
union all
select 'anônimo não lê',
       not has_table_privilege('anon', 'public.agenda_item', 'select')
union all
select 'empresa preenchida pela sessão',
       exists (select 1 from pg_trigger where tgname = 'trg_fill_empresa'
                  and tgrelid = 'public.agenda_item'::regclass);
