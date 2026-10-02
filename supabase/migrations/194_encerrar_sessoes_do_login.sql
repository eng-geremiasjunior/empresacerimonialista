-- ============================================================
-- 194 — Encerrar as sessões de um login (02/10/2026)
-- ============================================================
-- A tela Logins do painel do dono troca o e-mail de um login (o caso
-- dele: a conta criada com um "e" a menos). Se alguém entrou pelo
-- endereço errado — o dono de verdade daquele endereço pediu "esqueci a
-- senha" e entrou —, trocar o e-mail não o tira de lá: a sessão dele
-- continua valendo, e o token de atualização dura semanas.
--
-- O Supabase só encerra sessões pela API com o token DA PRÓPRIA pessoa
-- (POST /logout). Por isso esta função: apaga as sessões do login direto
-- em auth.sessions (os tokens de atualização vão junto, pela chave
-- estrangeira) e revoga os tokens antigos sem sessão.
--
-- Achado no caminho: o "suspender conta" do painel (definirBanimentoDb)
-- chamava auth.admin.signOut(<id do login>), que espera o TOKEN da
-- sessão — o pedido era recusado em silêncio, e quem ficava de fora era
-- só quem precisasse renovar a sessão. O painel passa a usar esta função
-- nos dois lugares.
--
-- Só a chave de serviço executa (o painel chama depois de
-- exigirSuperAdmin). Convergente: pode rodar de novo.
-- Termina com a conferência (tudo true).
-- ============================================================

create or replace function public.encerrar_sessoes_do_login(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_sessoes integer := 0;
begin
  if p_user is null then
    return 0;
  end if;

  delete from auth.sessions where user_id = p_user;
  get diagnostics v_sessoes = row_count;

  -- tokens de atualização sem sessão (de antes de o Supabase ter
  -- auth.sessions): revogados também
  update auth.refresh_tokens
     set revoked = true, updated_at = now()
   where user_id = p_user::text
     and revoked is distinct from true;

  return v_sessoes;
end $$;

revoke all on function public.encerrar_sessoes_do_login(uuid) from public, anon, authenticated;
grant execute on function public.encerrar_sessoes_do_login(uuid) to service_role;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a função existe, é security definer e tem search_path fixo' as item,
       coalesce((select p.prosecdef
                        and p.proconfig is not null
                        and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
                   from pg_proc p
                  where p.oid = 'public.encerrar_sessoes_do_login(uuid)'::regprocedure), false) as ok
union all
select 'nem anon nem authenticated executam (só a chave de serviço)',
       not has_function_privilege('anon', 'public.encerrar_sessoes_do_login(uuid)', 'execute')
       and not has_function_privilege('authenticated', 'public.encerrar_sessoes_do_login(uuid)', 'execute')
       and has_function_privilege('service_role', 'public.encerrar_sessoes_do_login(uuid)', 'execute')
union all
select 'login nulo não apaga nada',
       public.encerrar_sessoes_do_login(null) = 0
union all
select 'login que não existe não apaga nada',
       public.encerrar_sessoes_do_login('00000000-0000-4000-8000-000000000194') = 0;
