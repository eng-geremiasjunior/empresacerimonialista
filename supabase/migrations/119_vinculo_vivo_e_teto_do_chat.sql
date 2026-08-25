-- ============================================================
-- Vela — Migração 119: o vínculo vivo passa a valer nas bordas
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Três buracos que a vistoria de produção abriu, todos com a mesma forma:
-- uma superfície que não passa por meu_cargo() e por isso não sabe que a
-- pessoa saiu da equipe, ou não sabe de qual evento é o arquivo.
--
--   1) notifications e activities — as duas únicas tabelas com dado do
--      negócio cuja policy é só `cerimonialista_id = auth.uid()`. Quem foi
--      desativada continuava LENDO e RECEBENDO a caixa do sino (nome de
--      fornecedor, valores, links) e o próprio feed, indefinidamente.
--   2) chat_enviar — quem tem um link de roteiro insere sem teto nenhum.
--   3) storage/contratos — as quatro policies olhavam só a pasta da
--      empresa. Qualquer cargo lia, sobrescrevia e APAGAVA em definitivo
--      o contrato assinado de qualquer evento. Storage não tem lixeira.
--
-- O código que acompanha: setStatusMembro agora chama
-- auth.admin.signOut(user, 'global') ao desativar — a RLS abaixo é a
-- segunda linha, para o caso do signOut falhar ou de um token já emitido.

-- ------------------------------------------------------------
-- 0) O gatilho de empresa_id enxerga a equipe, não só a dona
-- ------------------------------------------------------------
-- fill_empresa_from_cerimonialista (021) resolvia por
-- `empresas.owner_user_id = cerimonialista_id`. Para uma notificação
-- endereçada a um MEMBRO, essa busca não acha nada e empresa_id fica
-- null. Hoje não há nenhuma linha nesse estado (as 90 notificações e as
-- 671 atividades são todas de dona), mas basta a equipe começar a receber
-- para o furo aparecer — e a leitura de gestão abaixo depende do dado.
create or replace function public.fill_empresa_from_cerimonialista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.empresa_id is null and new.cerimonialista_id is not null then
    select id into new.empresa_id
    from public.empresas where owner_user_id = new.cerimonialista_id;

    -- Não é dona de empresa nenhuma: pode ser membro da equipe.
    if new.empresa_id is null then
      select m.empresa_id into new.empresa_id
      from public.membros_equipe m
      where m.user_id = new.cerimonialista_id
        and m.status = 'ativo'
      limit 1;
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1) notifications: sua caixa, enquanto você for da casa
-- ------------------------------------------------------------
-- A condição nova é `meu_cargo()` devolver alguma coisa — não é
-- `empresa_id = ...`. A diferença importa: empresa_id da LINHA pode ser
-- null em dado antigo, e comparar por ele esconderia a caixa da própria
-- dona. O que se exige aqui é vínculo vivo de QUEM está perguntando.
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications
  for all
  using (
    cerimonialista_id = auth.uid()
    and exists (select 1 from public.meu_cargo())
  )
  with check (
    cerimonialista_id = auth.uid()
    and exists (select 1 from public.meu_cargo())
  );

-- ------------------------------------------------------------
-- 2) activities: mesmo corte, preservando a leitura de gestão
-- ------------------------------------------------------------
drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select using (
    (
      cerimonialista_id = auth.uid()
      and exists (select 1 from public.meu_cargo())
    )
    or (
      empresa_id = (select empresa_id from public.meu_cargo())
      and (select cargo from public.meu_cargo()) in ('proprietaria', 'coordenadora')
    )
  );

drop policy if exists "activities_write" on public.activities;
create policy "activities_write" on public.activities
  for insert with check (
    cerimonialista_id = auth.uid()
    and exists (select 1 from public.meu_cargo())
  );

drop policy if exists "activities_delete" on public.activities;
create policy "activities_delete" on public.activities
  for delete using (
    cerimonialista_id = auth.uid()
    and exists (select 1 from public.meu_cargo())
  );

-- ------------------------------------------------------------
-- 3) chat_enviar ganha teto
-- ------------------------------------------------------------
-- Mesma ideia do teto por evento que autocadastrar_convidado já usa
-- (094). Vinte mensagens por hora é folgado para um fornecedor no dia do
-- evento e fecha a porta para encher a tela de comunicação dela.
create or replace function public.chat_enviar(link_hash text, conteudo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.roteiro_links;
  v_msg  public.event_messages;
  v_qtd  integer;
begin
  select * into v_link from public.roteiro_links where hash = link_hash;
  if v_link.id is null then
    raise exception 'link inválido';
  end if;
  if conteudo is null or length(trim(conteudo)) = 0 or length(conteudo) > 2000 then
    raise exception 'mensagem inválida';
  end if;

  select count(*) into v_qtd
  from public.event_messages
  where event_id = v_link.event_id
    and supplier_id = v_link.supplier_id
    and sender_type = 'fornecedor'
    and created_at > now() - interval '1 hour';

  if v_qtd >= 20 then
    raise exception 'muitas mensagens seguidas; tente de novo em alguns minutos';
  end if;

  insert into public.event_messages (event_id, supplier_id, sender_type, message)
  values (v_link.event_id, v_link.supplier_id, 'fornecedor', trim(conteudo))
  returning * into v_msg;

  return jsonb_build_object('id', v_msg.id, 'created_at', v_msg.created_at);
end;
$$;

revoke execute on function public.chat_enviar(text, text) from public, anon, authenticated;
grant execute on function public.chat_enviar(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) contratos: a pasta é empresa/evento/solicitacao/arquivo
-- ------------------------------------------------------------
-- O segundo segmento é o evento, então dá para apertar sem mover um único
-- arquivo. O regex antes do cast existe porque foldername de um caminho
-- inesperado faria `::uuid` levantar exceção dentro da policy.
--
-- Envio do fornecedor não passa por aqui: permitirEnvio() assina com o
-- cliente service-role, que ignora RLS.
create or replace function public.evento_do_caminho(p_name text)
returns uuid
language sql
stable
set search_path = public
as $$
  select case
    when (storage.foldername(p_name))[2] ~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(p_name))[2])::uuid
    else null
  end
$$;

-- Sem revoke aqui, de propósito. A policy é avaliada com os privilégios de
-- quem está consultando: tirar EXECUTE de PUBLIC tiraria de authenticated
-- junto, e toda leitura de contrato passaria a estourar erro de permissão
-- em vez de negar. É a mesma razão registrada na 117 para meu_cargo e
-- pode_ver_evento. A função só quebra uma string em pedaços — não há o que
-- vazar por ela.

drop policy if exists "Equipe le contratos da empresa" on storage.objects;
create policy "Equipe le contratos da empresa"
  on storage.objects for select
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
    and public.pode_ver_evento(public.evento_do_caminho(name))
  );

drop policy if exists "Equipe anexa contratos da empresa" on storage.objects;
create policy "Equipe anexa contratos da empresa"
  on storage.objects for insert
  with check (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
    and public.pode_editar_evento(public.evento_do_caminho(name))
  );

drop policy if exists "Equipe substitui contratos da empresa" on storage.objects;
create policy "Equipe substitui contratos da empresa"
  on storage.objects for update
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
    and public.pode_editar_evento(public.evento_do_caminho(name))
  );

-- Apagar contrato assinado não tem volta e nenhuma tela do app faz isso
-- hoje (apagarContrato existe em lib/contratos.ts sem um único chamador).
-- Fica com quem responde pela empresa.
drop policy if exists "Equipe apaga contratos da empresa" on storage.objects;
create policy "Equipe apaga contratos da empresa"
  on storage.objects for delete
  using (
    bucket_id = 'contratos'
    and (storage.foldername(name))[1] =
        (select mc.empresa_id::text from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc)
        in ('proprietaria', 'coordenadora')
  );

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'gatilho enxerga a equipe' as item,
       (pg_get_functiondef(p.oid) like '%membros_equipe%') as ok
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'fill_empresa_from_cerimonialista'
union all
select 'notifications exige vinculo vivo',
       (qual like '%meu_cargo%')
  from pg_policies
 where schemaname = 'public' and tablename = 'notifications'
   and policyname = 'notifications_own'
union all
select 'activities_write exige vinculo vivo',
       (with_check like '%meu_cargo%')
  from pg_policies
 where schemaname = 'public' and tablename = 'activities'
   and policyname = 'activities_write'
union all
select 'chat_enviar tem teto',
       (pg_get_functiondef(p.oid) like '%v_qtd >= 20%')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'chat_enviar'
union all
select 'contratos: leitura olha o evento',
       (qual like '%pode_ver_evento%')
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname = 'Equipe le contratos da empresa'
union all
select 'contratos: apagar so proprietaria/coordenadora',
       (qual like '%proprietaria%')
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname = 'Equipe apaga contratos da empresa'
union all
select 'contratos: authenticated executa evento_do_caminho',
       has_function_privilege('authenticated', 'public.evento_do_caminho(text)', 'execute');
