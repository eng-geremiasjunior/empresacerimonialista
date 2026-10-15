-- ============================================================
-- 203 — O nível do plano (a base dos planos por recurso)
-- ============================================================
-- Decisão dele (09/10/2026): os planos deixam de diferir só pela
-- quantidade de eventos. Cada recurso passa a ter um plano mínimo (a
-- matriz está em .claude/plans/planos-por-recurso.md e no código, em
-- src/lib/recursos-do-plano.ts). Esta migração só dá a resposta que todas
-- as travas vão perguntar: em que nível esta conta está.
--
--   familia      — a conta da noiva que abriu sozinha (empresas.tipo):
--                  fora da matriz, o portal dela se paga pela lista;
--   gratuito     — nem pagante nem testando (a regra de 1 evento da 154);
--   essencial / profissional / master — o plano que paga OU que testa
--                  (o teste tem os recursos do plano testado, como os
--                  tetos de teto_do_plano). Pagante num plano fora do
--                  catálogo (a cortesia antiga, sem teto) = master;
--                  testando num plano fora do catálogo = essencial,
--                  como teto_do_plano já lê.
--
-- E os logins do catálogo (dado, editável depois em /admin/ajustes):
-- Essencial 2 (a dupla), Profissional 6, Master sem limite. A trava de
-- logins já existe (147, gatilho em membros_equipe).
--
-- Convergente: pode rodar mais de uma vez.

begin;

create or replace function public.nivel_do_plano(p_empresa_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_empresa_id is null then null
    when exists (select 1 from public.empresas e where e.id = p_empresa_id and e.tipo = 'familia') then 'familia'
    else coalesce((
      select case
        when not (t.pagante or t.testando) then 'gratuito'
        when t.plano in ('essencial', 'profissional', 'master') then t.plano
        when t.pagante then 'master'
        else 'essencial'
      end
      from public.teto_do_plano(p_empresa_id) t
      limit 1
    ), 'gratuito')
  end;
$$;

revoke all on function public.nivel_do_plano(uuid) from public, anon;
grant execute on function public.nivel_do_plano(uuid) to authenticated;

comment on function public.nivel_do_plano(uuid) is
  'familia | gratuito | essencial | profissional | master — o nível que as travas por recurso perguntam (203). O teste vale o plano testado.';

update public.plano_catalogo set logins = 2, updated_at = now() where codigo = 'essencial' and logins is distinct from 2;
update public.plano_catalogo set logins = 6, updated_at = now() where codigo = 'profissional' and logins is distinct from 6;
update public.plano_catalogo set logins = null, updated_at = now() where codigo = 'master' and logins is not null;

commit;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar 'true'.
-- ------------------------------------------------------------
select 'a função existe e é security definer' as item,
       coalesce((select p.prosecdef from pg_proc p where p.oid = 'public.nivel_do_plano(uuid)'::regprocedure), false) as ok
union all
select 'o anônimo não pergunta; quem entra pergunta',
       not has_function_privilege('anon', 'public.nivel_do_plano(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.nivel_do_plano(uuid)', 'execute')
union all
select 'empresa inexistente = gratuito; sem empresa = nulo',
       public.nivel_do_plano('00000000-0000-4000-8000-000000000203'::uuid) = 'gratuito'
       and public.nivel_do_plano(null) is null
union all
select 'toda conta de família responde familia',
       not exists (select 1 from public.empresas e where e.tipo = 'familia' and public.nivel_do_plano(e.id) <> 'familia')
union all
select 'toda conta responde um dos cinco níveis',
       not exists (select 1 from public.empresas e
                    where public.nivel_do_plano(e.id) not in ('familia', 'gratuito', 'essencial', 'profissional', 'master'))
union all
select 'logins: Essencial 2, Profissional 6, Master sem limite',
       (select logins from public.plano_catalogo where codigo = 'essencial') = 2
       and (select logins from public.plano_catalogo where codigo = 'profissional') = 6
       and (select logins from public.plano_catalogo where codigo = 'master') is null;
