-- ============================================================
-- Vela — Migração 137: a defasagem do público vira aviso
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O sistema grava dois números e nunca os compara: o público que
-- dimensionou cada item da Operação (evento_recurso.base_quantidade) e
-- o público de hoje (publico_do_evento). Quando divergem, a compra está
-- sendo decidida por um número velho — e ninguém avisa.
--
-- O que muda:
--   1. publico_do_evento ganha uma irmã interna SEM gate. A varredura
--      do cron roda como service role (auth.uid() nulo) e a função com
--      gate devolveria vazio em silêncio.
--   2. abrir_pendencias_defasagem(): a varredura diária. Uma pendência
--      de revisão por evento (upsert na trava única), números
--      atualizados enquanto aberta, reaberta só se o público mudou DE
--      NOVO desde que ela revisou, e resolvida sozinha quando a
--      defasagem some.
--   3. A régua da calma: enquanto o RSVP está aberto e confirmações
--      pingam, NÃO abre pendência — o aviso ao vivo na tela da Operação
--      cobre esse período. A pendência nasce quando o número assenta:
--      origem 'guests' (ela editou a estimativa), RSVP fechado, ou
--      evento a 7 dias ou menos.
--   4. dimensionar_recursos_evento resolve a pendência quando o
--      recálculo elimina a defasagem. O Recalcular continua sendo botão
--      dela (doutrina da 132); a pendência apenas segue o fato.
--
-- Dinheiro não se move: pendência é rascunho de decisão, nunca
-- lançamento (doutrina da 074).

-- ------------------------------------------------------------
-- 1) O público sem gate — só para funções do próprio banco
-- ------------------------------------------------------------
-- Mesma conta da 132; o gate fica na função pública, que agora delega.
create or replace function public.publico_do_evento_interno(p_event_id uuid)
returns table (quantidade int, origem text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_confirmados int;
  v_guests      int;
begin
  select coalesce(sum(1 + c.acompanhantes + c.criancas), 0)
    into v_confirmados
  from public.evento_convidado c
  where c.event_id = p_event_id and c.confirmacao = 'confirmado';

  select e.guests into v_guests from public.events e where e.id = p_event_id;

  if coalesce(v_confirmados, 0) > 0 then
    quantidade := v_confirmados;
    origem := 'confirmados';
  else
    quantidade := coalesce(v_guests, 0);
    origem := 'guests';
  end if;
  return next;
end $$;

revoke all on function public.publico_do_evento_interno(uuid)
  from public, anon, authenticated;

create or replace function public.publico_do_evento(p_event_id uuid)
returns table (quantidade int, origem text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pode_ver_evento(p_event_id) then
    return;
  end if;
  return query select * from public.publico_do_evento_interno(p_event_id);
end $$;

revoke all on function public.publico_do_evento(uuid) from public, anon;
grant execute on function public.publico_do_evento(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2) A trava: UMA pendência de defasagem por evento
-- ------------------------------------------------------------
-- Ela não tem task_id nem evento_recurso_id — é do evento inteiro.
create unique index if not exists uq_pendencia_defasagem
  on public.financeiro_pendencia (event_id)
  where tipo = 'revisao' and task_id is null and evento_recurso_id is null;

-- ------------------------------------------------------------
-- 3) A varredura diária
-- ------------------------------------------------------------
create or replace function public.abrir_pendencias_defasagem()
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hoje       date := (now() at time zone 'America/Sao_Paulo')::date;
  v_abertas    int := 0;
  v_resolvidas int := 0;
  v_n          int;
  v_titulo     text;
  v            record;
begin
  for v in
    select e.id as event_id,
           p.quantidade as publico,
           p.origem     as origem,
           (e.rsvp_aberto = false) as rsvp_fechado,
           (e.date - v_hoje)       as dias_ate,
           count(*) filter (where r.base_quantidade is not null
                              and r.base_quantidade <> p.quantidade) as defasados,
           min(r.base_quantidade) filter (where r.base_quantidade is not null
                              and r.base_quantidade <> p.quantidade) as base_min,
           max(r.base_quantidade) filter (where r.base_quantidade is not null
                              and r.base_quantidade <> p.quantidade) as base_max
    from public.events e
    cross join lateral public.publico_do_evento_interno(e.id) p
    join public.evento_recurso r
      on r.event_id = e.id and r.regra = 'por_pessoa'
    where e.date >= v_hoje
      and e.status not in ('cancelado', 'concluido')
      and coalesce(e.archived, false) = false
    group by e.id, p.quantidade, p.origem
  loop
    if v.publico > 0 and v.defasados > 0
       and (v.origem = 'guests' or v.rsvp_fechado or v.dias_ate <= 7) then
      -- o número assentou e está defasado: abre (ou atualiza a aberta,
      -- ou reabre a revisada se o público mudou DE NOVO)
      if v.base_min = v.base_max then
        v_titulo := 'O público mudou de ' || v.base_min || ' para ' || v.publico
          || ' — ' || v.defasados
          || case when v.defasados = 1
               then ' item dimensionado pelo número antigo'
               else ' itens dimensionados pelo número antigo' end;
      else
        v_titulo := v.defasados || ' itens dimensionados por um público antigo — hoje são '
          || v.publico;
      end if;

      insert into public.financeiro_pendencia (event_id, titulo, tipo, quantidade)
      values (v.event_id, v_titulo, 'revisao', v.publico)
      on conflict (event_id)
        where tipo = 'revisao' and task_id is null and evento_recurso_id is null
      do update set
        titulo       = excluded.titulo,
        quantidade   = excluded.quantidade,
        status       = 'aberta',
        resolvida_em = null
      where public.financeiro_pendencia.status = 'aberta'
         or public.financeiro_pendencia.quantidade is distinct from excluded.quantidade;

      get diagnostics v_n = row_count;
      v_abertas := v_abertas + v_n;
    elsif v.defasados = 0 or v.publico = 0 then
      -- a defasagem sumiu (recalculou, ou o público voltou a bater):
      -- a pendência aberta se resolve sozinha — segue o fato
      update public.financeiro_pendencia fp
      set status = 'resolvida', resolvida_em = now()
      where fp.event_id = v.event_id
        and fp.tipo = 'revisao'
        and fp.task_id is null and fp.evento_recurso_id is null
        and fp.status = 'aberta';

      get diagnostics v_n = row_count;
      v_resolvidas := v_resolvidas + v_n;
    end if;
    -- defasado mas com RSVP aberto e evento longe: nada — o aviso ao
    -- vivo na Operação cobre; a pendência espera o número assentar
  end loop;

  return json_build_object('abertas', v_abertas, 'resolvidas', v_resolvidas);
end $$;

revoke all on function public.abrir_pendencias_defasagem()
  from public, anon, authenticated;
grant execute on function public.abrir_pendencias_defasagem() to service_role;

-- ------------------------------------------------------------
-- 4) DIMENSIONAR — mesma conta da 132, e agora fecha o ciclo
-- ------------------------------------------------------------
-- p_forcar = false (o padrão): só preenche o que está VAZIO. Sugerir é
-- ajudar; sobrescrever o que ela digitou é como software perde a
-- confiança de quem usa. O botão "recalcular" da tela é quem passa true.
-- Novidade da 137: se o recálculo eliminou a defasagem, a pendência de
-- revisão se resolve na hora — sem esperar a varredura do dia seguinte.
create or replace function public.dimensionar_recursos_evento(
  p_event_id uuid,
  p_forcar   boolean default false
)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pub    int;
  v_origem text;
  v_mesas  int;
  v_n      int := 0;
begin
  if not public.pode_editar_evento(p_event_id) then
    return 0;
  end if;

  select p.quantidade, p.origem into v_pub, v_origem
  from public.publico_do_evento(p_event_id) p;

  select count(*) into v_mesas
  from public.evento_mesa m where m.event_id = p_event_id;

  update public.evento_recurso r
  set previsto = case r.regra
        when 'fixo'       then r.indice
        when 'por_pessoa' then round(r.indice * coalesce(v_pub, 0), 2)
        when 'por_unidade'then round(r.indice * coalesce(v_mesas, 0), 2)
      end,
      base_quantidade = case r.regra
        when 'fixo'        then null
        when 'por_pessoa'  then v_pub
        when 'por_unidade' then v_mesas
      end,
      base_origem = case r.regra
        when 'fixo'        then 'fixo'
        when 'por_pessoa'  then v_origem
        when 'por_unidade' then 'mesas'
      end,
      updated_at = now()
  where r.event_id = p_event_id
    and (p_forcar or r.previsto is null);

  get diagnostics v_n = row_count;

  -- a pendência de defasagem segue o fato: se o recálculo alinhou as
  -- bases com o público de hoje, ela se resolve agora
  if not exists (
    select 1 from public.evento_recurso r
    where r.event_id = p_event_id
      and r.regra = 'por_pessoa'
      and r.base_quantidade is not null
      and r.base_quantidade <> coalesce(v_pub, 0)
  ) then
    update public.financeiro_pendencia
    set status = 'resolvida', resolvida_em = now()
    where event_id = p_event_id
      and tipo = 'revisao'
      and task_id is null and evento_recurso_id is null
      and status = 'aberta';
  end if;

  return v_n;
end $$;

revoke all on function public.dimensionar_recursos_evento(uuid, boolean) from public, anon;
grant execute on function public.dimensionar_recursos_evento(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'a irmã interna existe UMA vez e NÃO tem gate' as item,
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'publico_do_evento_interno')
       and (select prosrc not like '%pode_ver_evento%'
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'publico_do_evento_interno') as ok
union all
select 'publico_do_evento continua com gate e agora delega',
       (select prosrc like '%pode_ver_evento%'
           and prosrc like '%publico_do_evento_interno%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'publico_do_evento')
union all
select 'ninguém chama a irmã interna por REST (nem anon, nem authenticated)',
       not exists (
         select 1 from information_schema.routine_privileges
         where routine_schema = 'public'
           and routine_name = 'publico_do_evento_interno'
           and grantee in ('anon', 'authenticated')
       )
union all
select 'a trava de unicidade parcial da defasagem existe',
       exists (
         select 1 from pg_indexes
         where schemaname = 'public'
           and indexname = 'uq_pendencia_defasagem'
           and indexdef like '%WHERE%'
       )
union all
select 'a varredura existe e só o cron executa',
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'abrir_pendencias_defasagem')
       and not exists (
         select 1 from information_schema.routine_privileges
         where routine_schema = 'public'
           and routine_name = 'abrir_pendencias_defasagem'
           and grantee in ('anon', 'authenticated')
       )
union all
select 'a varredura abre, atualiza, reabre e resolve',
       (select prosrc like '%on conflict%'
           and prosrc like '%is distinct from%'
           and prosrc like '%resolvida%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'abrir_pendencias_defasagem')
union all
select 'a régua da calma está na varredura (guests / RSVP fechado / 7 dias)',
       (select prosrc like '%rsvp_fechado%'
           and prosrc like '%dias_ate <= 7%'
           and prosrc like '%''guests''%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'abrir_pendencias_defasagem')
union all
select 'o Recalcular resolve a pendência quando a defasagem some',
       (select prosrc like '%financeiro_pendencia%'
           and prosrc like '%resolvida%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento');
