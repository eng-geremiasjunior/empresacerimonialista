-- ============================================================
-- Vela — Migração 025: auto-provisionamento de empresa no signup
-- (fecha a Etapa 4)
--
-- O gatilho em auth.users da 024 não instala no Supabase hospedado
-- (permissão). Esta função SECURITY DEFINER faz o mesmo trabalho, mas é
-- chamada pelo APP (RPC) quando detecta um usuário logado sem equipe —
-- cobre signup direto, confirmação de e-mail e primeiro login.
--
-- Idempotente e segura para membros de equipe: se o usuário já tem
-- QUALQUER registro em membros_equipe (ativo ou inativo), não faz nada
-- (não cria empresa para uma cerimonialista convidada nem para uma
-- membro desativada).
--
-- Execute no SQL Editor do Supabase (depois da 024).
-- ============================================================

begin;

create or replace function public.garantir_empresa_propria()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_empresa uuid;
  v_nome    text;
  v_email   text;
begin
  if v_uid is null then
    return;
  end if;

  -- Já pertence a alguma equipe (qualquer status)? Então não provisiona.
  if exists (select 1 from public.membros_equipe where user_id = v_uid) then
    return;
  end if;

  select raw_user_meta_data->>'name', email
    into v_nome, v_email
  from auth.users where id = v_uid;

  insert into public.empresas (nome, owner_user_id)
  values (coalesce(nullif(trim(v_nome), ''), 'Minha Empresa'), v_uid)
  on conflict (owner_user_id) do nothing;

  select id into v_empresa
  from public.empresas where owner_user_id = v_uid;

  if v_empresa is null then
    return;
  end if;

  insert into public.membros_equipe
    (empresa_id, user_id, nome, email, cargo, status, is_owner)
  values (
    v_empresa, v_uid,
    coalesce(nullif(trim(v_nome), ''), v_email, 'Proprietária'),
    v_email, 'proprietaria', 'ativo', true
  )
  on conflict do nothing;
end;
$$;

grant execute on function public.garantir_empresa_propria() to authenticated;

commit;
