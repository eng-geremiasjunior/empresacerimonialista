-- ============================================================
-- 187 — A conta da família (30/09/2026)
-- ============================================================
-- A noiva (ou o pai, a mãe, o responsável da debutante) cria a conta
-- sozinha no portal, sem convite de cerimonialista. Decisões dele:
-- grátis, sem cartão e sem teste; casamento e 15 anos; sozinha, o
-- planejamento e a organização são dela; se ela tiver cerimonialista,
-- manda um convite, e quando a cerimonialista aceita o evento passa para
-- a conta dela (isso é a 188).
--
-- O desenho: a família ganha uma EMPRESA marcada `tipo = 'familia'`, em
-- que ela é a proprietária. Assim toda a RLS que já existe (planejamento,
-- organização, financeiro, fornecedores, convidados) vale para o evento
-- dela sem reescrever uma regra. O login dela leva `portal: true` no
-- app_metadata (posto pelo servidor), e o middleware a prende ao portal:
-- ela nunca abre o painel da cerimonialista.
--
-- Quem cria a conta de família é SÓ o servidor, pela função abaixo, com a
-- chave de serviço. O gatilho de cadastro (104) continua sem criar
-- empresa para login de portal. Por isso ninguém ganha uma conta de
-- família pelo cadastro público do Supabase: marcar user_metadata é
-- coisa que qualquer um faz; chamar esta função, não.
--
-- Fora da conta de família (no código, não aqui): teste de 7 dias,
-- cobrança, régua de e-mails e promoção andam por `assinaturas`, e a
-- conta de família não tem assinatura; os números do /admin tiram as
-- contas de família junto com as da casa.
--
-- Aditiva e convergente: pode rodar de novo. Termina com a conferência.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) O tipo da conta
-- ------------------------------------------------------------
alter table public.empresas
  add column if not exists tipo text not null default 'cerimonial';

alter table public.empresas drop constraint if exists empresas_tipo_check;
alter table public.empresas
  add constraint empresas_tipo_check check (tipo in ('cerimonial', 'familia'));

create index if not exists empresas_de_familia_idx
  on public.empresas (created_at) where tipo = 'familia';

-- ------------------------------------------------------------
-- 2) Só o sistema diz que uma conta é de família
-- ------------------------------------------------------------
-- Sem isto, a dona de uma conta de cerimonial trocava o próprio tipo
-- pela API e saía da cobrança. O gatilho NÃO é security definer de
-- propósito: assim `current_user` é quem escreveu (molde da 186). As
-- funções do sistema (security definer) rodam como a dona delas e passam.
create or replace function public.empresa_tipo_so_pelo_sistema()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and (
       (tg_op = 'INSERT' and new.tipo is distinct from 'cerimonial')
       or (tg_op = 'UPDATE' and new.tipo is distinct from old.tipo)) then
    raise exception 'o tipo da conta é definido pelo sistema';
  end if;
  return new;
end $$;

drop trigger if exists trg_tipo_so_pelo_sistema on public.empresas;
create trigger trg_tipo_so_pelo_sistema
  before insert or update on public.empresas
  for each row execute function public.empresa_tipo_so_pelo_sistema();

-- ------------------------------------------------------------
-- 3) O aceite dos termos também no cadastro da família (149)
-- ------------------------------------------------------------
alter table public.termos_aceite drop constraint if exists termos_aceite_contexto_check;
alter table public.termos_aceite
  add constraint termos_aceite_contexto_check
  check (contexto in ('assinatura', 'conta_da_familia'));

-- ------------------------------------------------------------
-- 4) Criar a conta da família, de uma vez
-- ------------------------------------------------------------
-- Chamada pelo servidor logo depois de criar o login (Admin API). Numa
-- transação só: a conta de família, a dona, a cliente, o evento, o
-- acesso ao portal e o aceite dos termos. Se qualquer passo falhar, nada
-- fica pela metade (e o servidor apaga o login).
--
-- Os gatilhos de sempre fazem o resto: a empresa nova ganha o método
-- semeado (064), e o evento novo instancia o método do tipo (065) — é o
-- planejamento da família no primeiro minuto.
--
-- No 15 anos, quem cria a conta é o pai, a mãe ou o responsável (a
-- debutante tem 14 ou 15 anos); a confirmação que o portal pede no
-- primeiro acesso (175) é feita aqui, na caixa do cadastro.
create or replace function public.criar_conta_da_familia(
  p_user   uuid,
  p_nome   text,
  p_papel  text,
  p_tipo   text,
  p_data   date,
  p_festa  text,
  p_cidade text,
  p_termos_versao text,
  p_ip     text,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email   text;
  v_nome    text := trim(coalesce(p_nome, ''));
  v_festa   text := trim(coalesce(p_festa, ''));
  v_cidade  text := nullif(trim(coalesce(p_cidade, '')), '');
  v_empresa uuid;
  v_cliente uuid;
  v_evento  uuid;
begin
  -- (null not in (...) dá null e passaria: por isso o "is null" explícito)
  if p_tipo is null or p_tipo not in ('casamento', 'debutante') then
    raise exception 'tipo de evento inválido';
  end if;
  if p_papel is null
     or (p_tipo = 'casamento' and p_papel not in ('noiva', 'noivo')) then
    raise exception 'papel inválido para casamento';
  end if;
  -- a debutante não cria a própria conta: é menor de idade
  if p_tipo = 'debutante' and p_papel not in ('mae', 'pai', 'outro') then
    raise exception 'papel inválido para 15 anos';
  end if;
  -- defesa em camadas: só um login preso ao portal vira conta de família
  -- (sem a marca, ele abriria o painel da cerimonialista)
  if coalesce((select u.raw_app_meta_data->>'portal' from auth.users u where u.id = p_user), '') <> 'true' then
    raise exception 'login sem a marca de portal';
  end if;
  if length(v_nome) not between 2 and 80 then
    raise exception 'nome inválido';
  end if;
  if length(v_festa) not between 2 and 80 then
    raise exception 'nome da festa inválido';
  end if;
  if length(trim(coalesce(p_termos_versao, ''))) = 0 then
    raise exception 'aceite dos termos obrigatório';
  end if;
  if length(coalesce(v_cidade, '')) > 80 then
    raise exception 'cidade longa demais';
  end if;
  if p_data is null
     or p_data < (now() at time zone 'America/Sao_Paulo')::date
     or p_data > (now() at time zone 'America/Sao_Paulo')::date + 1825 then
    raise exception 'data do evento inválida';
  end if;

  select u.email into v_email from auth.users u where u.id = p_user;
  if v_email is null then
    raise exception 'login não encontrado';
  end if;
  -- quem já é da equipe de alguma conta não vira família por aqui
  if exists (select 1 from public.membros_equipe m where m.user_id = p_user)
     or exists (select 1 from public.empresas e where e.owner_user_id = p_user) then
    raise exception 'este login já tem uma conta';
  end if;

  insert into public.empresas (nome, owner_user_id, tipo)
  values (v_festa, p_user, 'familia')
  returning id into v_empresa;

  insert into public.membros_equipe (empresa_id, user_id, nome, email, cargo, status, is_owner)
  values (v_empresa, p_user, v_nome, v_email, 'proprietaria', 'ativo', true);

  insert into public.clients (cerimonialista_id, empresa_id, name, email)
  values (p_user, v_empresa, v_nome, v_email)
  returning id into v_cliente;

  insert into public.events (cerimonialista_id, empresa_id, client_id, type, name, date, city, status)
  values (p_user, v_empresa, v_cliente, p_tipo, v_festa, p_data, v_cidade, 'confirmado')
  returning id into v_evento;

  insert into public.evento_acesso
    (event_id, empresa_id, user_id, client_id, nome, email, papel, status, responsavel_confirmado_em)
  values
    (v_evento, v_empresa, p_user, v_cliente, v_nome, v_email, p_papel, 'ativo',
     case when p_tipo = 'debutante' then now() end);

  insert into public.termos_aceite (empresa_id, user_id, email, versao, contexto, ip, user_agent)
  values (v_empresa, p_user, v_email, trim(p_termos_versao), 'conta_da_familia',
          nullif(left(coalesce(p_ip, ''), 60), ''),
          nullif(left(coalesce(p_user_agent, ''), 300), ''));

  return v_evento;
end $$;

revoke all on function public.criar_conta_da_familia(uuid, text, text, text, date, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.criar_conta_da_familia(uuid, text, text, text, date, text, text, text, text, text)
  to service_role;

-- ------------------------------------------------------------
-- 5) O portal pergunta: este evento é de uma conta de família?
-- ------------------------------------------------------------
-- É o que tira do portal a "sua cerimonialista" (que seria a própria
-- família) e põe no lugar o convite para a cerimonialista (188). Vale
-- para quem tem acesso de portal ao evento (a dona e, um dia, o noivo que
-- ela chamar); gerar o convite continua só da dona (188). Depois que a
-- cerimonialista entra, o evento sai da conta de família e a resposta
-- vira false sozinha: o portal volta a ser o de sempre.
create or replace function public.portal_evento_da_familia(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
      from public.events e
      join public.empresas emp on emp.id = e.empresa_id
      join public.evento_acesso a on a.event_id = e.id
     where e.id = p_event_id
       and emp.tipo = 'familia'
       and a.user_id = auth.uid()
       and a.status = 'ativo'
  );
$$;

revoke all on function public.portal_evento_da_familia(uuid) from public, anon;
grant execute on function public.portal_evento_da_familia(uuid) to authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência: tudo true
-- ------------------------------------------------------------
select 'coluna tipo em empresas' as item,
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'empresas'
                  and column_name = 'tipo') as ok
union all
select 'toda conta de família tem dona na equipe',
       not exists (select 1 from public.empresas e
                    where e.tipo = 'familia'
                      and not exists (select 1 from public.membros_equipe m
                                       where m.empresa_id = e.id and m.is_owner))
union all
select 'a trava do tipo está ligada',
       exists (select 1 from pg_trigger
                where tgname = 'trg_tipo_so_pelo_sistema'
                  and tgrelid = 'public.empresas'::regclass)
union all
select 'a trava do tipo não é security definer',
       not (select p.prosecdef from pg_proc p
             where p.oid = 'public.empresa_tipo_so_pelo_sistema()'::regprocedure)
union all
select 'anon não cria conta de família',
       not has_function_privilege('anon',
         'public.criar_conta_da_familia(uuid, text, text, text, date, text, text, text, text, text)', 'execute')
union all
select 'login comum não cria conta de família',
       not has_function_privilege('authenticated',
         'public.criar_conta_da_familia(uuid, text, text, text, date, text, text, text, text, text)', 'execute')
union all
select 'o aceite dos termos aceita a conta de família',
       pg_get_constraintdef((select oid from pg_constraint
                              where conname = 'termos_aceite_contexto_check'))
         like '%conta_da_familia%'
union all
select 'anon não pergunta pelo evento da família',
       not has_function_privilege('anon', 'public.portal_evento_da_familia(uuid)', 'execute')
union all
select 'o servidor cria conta de família',
       has_function_privilege('service_role',
         'public.criar_conta_da_familia(uuid, text, text, text, date, text, text, text, text, text)', 'execute');
