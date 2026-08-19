-- 103 — o gatilho de cadastro passa a respeitar o nome do negócio
--       (e para de criar empresa para noiva do portal)
--
-- A 102 ajustou `garantir_empresa_propria`, mas o teste de ponta a ponta
-- mostrou que a empresa continuava nascendo "Minha Empresa". Motivo: neste
-- projeto o gatilho `trg_handle_novo_usuario` em auth.users ESTÁ instalado
-- — a 024 o criou dentro de um bloco `exception` supondo que o Supabase
-- hospedado recusaria por permissão, e deixou registrado que não instala.
-- Instalou. Então quem cria a empresa é o gatilho, no mesmo instante do
-- insert em auth.users; a RPC do app roda depois e encontra a equipe já
-- montada, saindo pelo `return` logo no começo. Ou seja: o conserto tinha
-- que ser aqui.
--
-- A função vive no schema public, então dá para substituí-la sem tocar em
-- auth.users (que pertence a supabase_auth_admin) — o gatilho continua o
-- mesmo, apontando para a nova versão.
--
-- Duas correções:
--
--   1. Nome do negócio. Passa a ler 'empresa' (o campo novo do cadastro) e
--      só depois 'name'. Antes, 'name' servia às duas coisas: virava nome
--      da empresa E nome da pessoa na equipe. São coisas diferentes — o
--      primeiro sai na proposta pública para o casal.
--
--   2. Noiva do portal não é dona de empresa. O acesso do portal é criado
--      pela Admin API com `app_metadata.portal = true` (src/lib/portal-admin.ts)
--      mas SEM `user_metadata.equipe`, que é a única trava que o gatilho
--      conhecia. Resultado medido no banco: 3 usuárias de portal viraram
--      'proprietaria' de empresas próprias (as três "Cliente de Teste").
--      A `garantir_empresa_propria` já tinha essa trava desde a 086; o
--      gatilho não. Agora tem, igual.
--
-- Convergente: pode rodar mais de uma vez.
-- Execute no SQL Editor, depois da 102.

begin;

create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Membro de equipe: o registro é feito pela Admin API.
  if coalesce(new.raw_user_meta_data->>'equipe', '') = 'true' then
    return new;
  end if;

  -- Acesso de portal (noiva/cliente): nunca ganha empresa própria.
  -- Marca posta pelo servidor em app_metadata, que a usuária não edita.
  if coalesce((new.raw_app_meta_data->>'portal')::boolean, false) then
    return new;
  end if;

  insert into public.empresas (nome, owner_user_id)
  values (
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'empresa'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      'Minha Empresa'
    ),
    new.id
  )
  on conflict (owner_user_id) do nothing;

  insert into public.membros_equipe
    (empresa_id, user_id, nome, email, cargo, status, is_owner)
  select e.id, new.id,
         coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Proprietária'),
         new.email, 'proprietaria', 'ativo', true
  from public.empresas e
  where e.owner_user_id = new.id
    and not exists (
      select 1 from public.membros_equipe m where m.user_id = new.id
    );

  return new;
end;
$$;

commit;

do $$
declare
  v_portal_donas int;
begin
  select count(*) into v_portal_donas
  from public.empresas e
  join auth.users u on u.id = e.owner_user_id
  where coalesce((u.raw_app_meta_data->>'portal')::boolean, false);

  raise notice '103 aplicada. Empresas fantasma de usuaria de portal que ja existiam: % (novas nao serao mais criadas).', v_portal_donas;
end $$;
