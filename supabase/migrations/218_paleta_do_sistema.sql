-- ============================================================
-- 218 — A paleta do sistema, escolhida no painel do dono (19/10/2026)
-- ============================================================
-- Pedido dele: trocar a paleta de cores do app pelo /admin/ajustes,
-- quando achar pertinente, sem publicar nada. Uma linha só (como o
-- teste_gratis da 154): a chave da paleta. As cores moram no código
-- (src/lib/paletas-do-sistema.ts); aqui só a escolha.
--
-- Quem lê: qualquer pessoa logada (a moldura do app precisa saber a cor).
-- Quem escreve: só o painel do dono, pela chave de serviço. Anônimo: nada.
--
-- Rodar inteiro no SQL Editor. Pode rodar de novo. Conferência no fim.

begin;

create table if not exists public.paleta_do_sistema (
  id            boolean primary key default true,
  paleta        text not null default 'petroleo',
  atualizado_em timestamptz not null default now(),
  constraint paleta_do_sistema_uma_linha check (id),
  constraint paleta_do_sistema_chave check (paleta in ('petroleo', 'oliva', 'ardosia', 'chumbo', 'terracota', 'ameixa'))
);

insert into public.paleta_do_sistema (id, paleta) values (true, 'petroleo')
  on conflict (id) do nothing;

alter table public.paleta_do_sistema enable row level security;
revoke all on public.paleta_do_sistema from anon;
revoke insert, update, delete on public.paleta_do_sistema from authenticated;

drop policy if exists "paleta_do_sistema_select" on public.paleta_do_sistema;
create policy "paleta_do_sistema_select" on public.paleta_do_sistema for select to authenticated using (true);

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a linha da paleta existe' as item,
       exists (select 1 from public.paleta_do_sistema where id) as ok
union all
select 'RLS ligada',
       (select relrowsecurity from pg_class where oid = 'public.paleta_do_sistema'::regclass)
union all
select 'quem está logado lê e não escreve',
       has_table_privilege('authenticated', 'public.paleta_do_sistema', 'select')
       and not has_table_privilege('authenticated', 'public.paleta_do_sistema', 'update')
union all
select 'anônimo não lê',
       not has_table_privilege('anon', 'public.paleta_do_sistema', 'select');
