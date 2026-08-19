-- 104 — a trava de portal do gatilho, no lugar onde ela é visível
--
-- A 103 pôs a trava de portal no gatilho lendo `raw_app_meta_data`, do
-- mesmo jeito que a `garantir_empresa_propria` faz desde a 086. Não
-- funcionou, e o teste mostrou por quê: a trava de `equipe`, que lê
-- `raw_user_meta_data`, barra; a de portal, que lê `raw_app_meta_data`,
-- não barra nada. O Supabase grava o app_metadata em um UPDATE posterior
-- ao insert em auth.users — quando o gatilho AFTER INSERT roda, aquele
-- campo ainda está vazio. Na RPC do app a leitura funciona porque ela roda
-- muito depois, no primeiro carregamento da tela.
--
-- Então o gatilho passa a aceitar as duas marcas. A cópia em user_metadata
-- é posta pelo servidor no mesmo createUser (src/lib/portal-admin.ts) e
-- existe só para ser legível neste instante; a marca de autoridade
-- continua sendo a de app_metadata, que a usuária não edita e que o
-- middleware e a RPC usam. Ler user_metadata aqui não afrouxa nada: é
-- exatamente o que a trava de 'equipe' já fazia desde a 024, e o pior caso
-- de alguém forjar a marca no próprio cadastro é ficar SEM empresa.
--
-- Convergente. Execute no SQL Editor, depois da 103.

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
  -- user_metadata é o que existe neste instante; app_metadata fica para
  -- quando o Supabase mudar a ordem, e para acessos criados de outro jeito.
  if coalesce((new.raw_user_meta_data->>'portal')::boolean, false)
     or coalesce((new.raw_app_meta_data->>'portal')::boolean, false) then
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
begin
  raise notice '104 aplicada: o gatilho de cadastro le a marca de portal em user_metadata.';
end $$;
