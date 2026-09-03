-- ============================================================
-- Vela — Migração 143: o modelo da informação do briefing
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- O "briefing colado" (a conversa da noiva que vira evento) funcionou,
-- mas revelou um erro de MODELO: a leitura devolvia dez números soltos
-- sem dizer de quem eram. Na prática:
--
--   * "o buffet fechou por R$ 32.500" ia para events.contract_value —
--     que é o HONORÁRIO da assessoria (086:296) e é somado como
--     faturamento dela. O dinheiro do fornecedor inflava a receita.
--   * "somos 220, talvez 240" virava um número escolhido em silêncio —
--     e é esse número que define a escala do método e todo recurso por
--     pessoa.
--   * "a doceira faz 600, mas eu queria 800" desaparecia; e se ela
--     digitasse 800 à mão, o botão Recalcular apagava.
--   * nada registrava DE ONDE cada dado veio.
--
-- Esta migração dá lugar aos quatro. O que ela NÃO faz: não cria tela,
-- não muda portal_escrever_campo, não muda criar_evento_completo, não
-- acrescenta tipo de campo. A separação evento × fornecedor ×
-- financeiro é feita pelas actions que já existem — aqui só abrimos os
-- lugares que faltavam.
--
-- Desvio consciente do plano: NÃO mexemos em publico_do_evento. Mudar o
-- tipo de retorno dela (para devolver o teto) obrigaria drop/create e
-- ajuste em quatro chamadores (137:123, 137:213, prestacao.ts:80,
-- recursos.ts:94) por um ganho cosmético. guests_max é coluna lida
-- direto onde importa.

-- ------------------------------------------------------------
-- 1) O teto do público: "220, talvez 240"
-- ------------------------------------------------------------
-- guests continua sendo a estimativa de trabalho (é ela que dimensiona,
-- 132/137). guests_max é a possibilidade que a cliente mencionou — nunca
-- entra em conta nenhuma; existe para a cerimonialista não perder a
-- informação e para o briefing não ter de escolher um dos dois números.
-- o CHECK vai em bloco próprio, guardado: escrito junto do "add column",
-- o Postgres o separa num subcomando que o IF NOT EXISTS não protege, e
-- cada reexecução criaria mais um clone anônimo (145)
alter table public.events
  add column if not exists guests_max int;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname  = 'events_guests_max_check'
  ) then
    alter table public.events
      add constraint events_guests_max_check
      check (guests_max is null or guests_max >= 0);
  end if;
end $$;

comment on column public.events.guests_max is
  'Teto mencionado pela cliente ("pode chegar a 240"). Não dimensiona nada: quem dimensiona é guests/confirmados via publico_do_evento.';

-- ------------------------------------------------------------
-- 2) O Recalcular passa a respeitar o que a cliente pediu
-- ------------------------------------------------------------
-- Corpo da 137 verbatim, com UMA cláusula a mais: recurso cujo previsto
-- foi digitado como pedido da cliente (base_origem='manual') não é
-- sobrescrito nem pelo botão Recalcular (que passa p_forcar = true).
-- Para voltar ao automático, a tela limpa o número — e aí base_origem
-- volta a nulo e o dimensionamento age de novo.
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
    and (p_forcar or r.previsto is null)
    and coalesce(r.base_origem, '') <> 'manual';

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

comment on column public.evento_recurso.base_origem is
  'guests | confirmados | mesas | fixo | manual. manual = o previsto é pedido da cliente e o Recalcular não o sobrescreve.';

-- ------------------------------------------------------------
-- 3) Proveniência: de onde veio cada dado aplicado
-- ------------------------------------------------------------
-- evento_campo_escrita já é o append-only com "quem escreveu e o que
-- havia antes" (091), mas só servia a evento_campo_valor. Quatro
-- colunas o abrem para qualquer alvo: quando a leitura de um briefing
-- ou de um contrato vira verba de fornecedor, parcela ou recurso, fica
-- registrado de onde saiu — com a citação do texto.
alter table public.evento_campo_escrita
  add column if not exists fonte    text,
  add column if not exists trecho   text,
  add column if not exists alvo     text,
  add column if not exists alvo_id  uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evento_campo_escrita_fonte_check') then
    alter table public.evento_campo_escrita add constraint evento_campo_escrita_fonte_check
      check (fonte is null or fonte in ('contrato', 'cliente', 'cerimonialista', 'briefing_colado'));
  end if;
end $$;

comment on column public.evento_campo_escrita.fonte is
  'De onde a informação veio: contrato | cliente | cerimonialista | briefing_colado. Nulo nas escritas normais do portal (a origem já diz).';
comment on column public.evento_campo_escrita.trecho is
  'A citação curta do texto de onde o dado saiu — já redigida (sem contato). É o que responde "por que este número é este?".';
comment on column public.evento_campo_escrita.alvo is
  'O que foi escrito: campo | verba_fornecedor | lancamento | recurso | evento | decisao.';

-- A tabela é append-only sem policy de INSERT (091): quem escreve são as
-- funções. Esta é a porta da conferência de propostas.
create or replace function public.registrar_proveniencia(
  p_event_id    uuid,
  p_fonte       text,
  p_alvo        text,
  p_alvo_id     uuid,
  p_campo_label text,
  p_valor_novo  text,
  p_trecho      text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.pode_editar_evento(p_event_id) then
    raise exception 'sem permissão para registrar neste evento';
  end if;

  insert into public.evento_campo_escrita
    (event_id, campo_id, evento_decisao_id, autor_user_id, origem,
     campo_label, valor_anterior, valor_novo, fonte, trecho, alvo, alvo_id)
  values
    (p_event_id, null, null, auth.uid(), 'equipe',
     left(coalesce(p_campo_label, ''), 120), null,
     left(coalesce(p_valor_novo, ''), 200),
     p_fonte, left(coalesce(p_trecho, ''), 300), p_alvo, p_alvo_id);
end $$;

revoke all on function public.registrar_proveniencia(uuid, text, text, uuid, text, text, text)
  from public, anon;
grant execute on function public.registrar_proveniencia(uuid, text, text, uuid, text, text, text)
  to authenticated;

-- ------------------------------------------------------------
-- 4) A proposta do briefing, persistida e conferível
-- ------------------------------------------------------------
-- Molde da 138 (contrato_extracao): a leitura vira PROPOSTA; nada entra
-- no financeiro, na operação ou no planejamento sem a conferência item
-- a item. Uma proposta por evento (unique): hoje a colagem só acontece
-- no wizard, e cada colagem nasce num evento novo — se um dia existir
-- "recolar neste evento", a gravação vira upsert por event_id, senão o
-- unique dispara e o erro morre no log.
create table if not exists public.briefing_extracao (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  empresa_id    uuid references public.empresas (id),
  -- a proposta como o modelo devolveu, já passada pela allowlist do app
  -- e com os contatos redigidos (o trecho nunca carrega telefone)
  payload       jsonb not null,
  -- o que ela confirmou e como foi aplicado (preenchido na conferência)
  aplicado      jsonb,
  status        text not null default 'proposta'
                check (status in ('proposta', 'conferida', 'descartada')),
  criada_em     timestamptz not null default now(),
  criada_por    uuid references auth.users (id) on delete set null,
  conferida_em  timestamptz,
  conferida_por uuid references auth.users (id) on delete set null,
  descartada_em timestamptz,
  unique (event_id)
);

create index if not exists idx_briefing_extracao_evento
  on public.briefing_extracao (event_id, status);

comment on table public.briefing_extracao is
  'Proposta lida de um briefing colado. O que é do evento vai pelo wizard; o resto (fornecedores, quantidades, verba, estilo) espera aqui a conferência item a item.';

drop trigger if exists trg_fill_empresa on public.briefing_extracao;
create trigger trg_fill_empresa before insert on public.briefing_extracao
  for each row execute function public.fill_empresa_from_event();

alter table public.briefing_extracao enable row level security;

drop policy if exists briefing_extracao_select on public.briefing_extracao;
create policy briefing_extracao_select on public.briefing_extracao
  for select using (event_id in (select public.eventos_visiveis()));
drop policy if exists briefing_extracao_insert on public.briefing_extracao;
create policy briefing_extracao_insert on public.briefing_extracao
  for insert with check (public.pode_editar_evento(event_id));
drop policy if exists briefing_extracao_update on public.briefing_extracao;
create policy briefing_extracao_update on public.briefing_extracao
  for update using (public.pode_editar_evento(event_id))
  with check (public.pode_editar_evento(event_id));
drop policy if exists briefing_extracao_delete on public.briefing_extracao;
create policy briefing_extracao_delete on public.briefing_extracao
  for delete using (public.pode_editar_evento(event_id));

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'events tem o teto do público' as item,
       exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'events'
           and column_name = 'guests_max'
       ) as ok
union all
select 'nenhum evento tem teto menor que a estimativa',
       not exists (
         select 1 from public.events
         where guests_max is not null and guests is not null and guests_max < guests
       )
union all
select 'o Recalcular respeita o pedido da cliente',
       (select prosrc like '%<> ''manual''%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento')
union all
select 'dimensionar_recursos_evento existe UMA vez e mantém o gate',
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento')
       and (select prosrc like '%pode_editar_evento%'
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento')
union all
select 'publico_do_evento continua com duas colunas (não foi tocada)',
       (select pg_get_function_result(p.oid) not like '%teto%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'publico_do_evento')
union all
select 'nenhum recurso ficou manual sem número',
       not exists (
         select 1 from public.evento_recurso
         where base_origem = 'manual' and previsto is null
       )
union all
select 'o histórico de escrita tem as 4 colunas de proveniência',
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'evento_campo_escrita'
          and column_name in ('fonte', 'trecho', 'alvo', 'alvo_id')) = 4
union all
select 'a fonte só aceita as quatro origens conhecidas',
       exists (
         select 1 from pg_constraint
         where conname = 'evento_campo_escrita_fonte_check'
           and pg_get_constraintdef(oid) like '%briefing_colado%'
       )
union all
select 'registrar_proveniencia existe UMA vez, com gate e sem anon',
       (select count(*) = 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'registrar_proveniencia')
       and (select prosrc like '%pode_editar_evento%'
            from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'registrar_proveniencia')
       and not exists (
         select 1 from information_schema.role_routine_grants
         where routine_schema = 'public' and routine_name = 'registrar_proveniencia'
           and grantee in ('anon', 'PUBLIC')
       )
union all
select 'a tabela da proposta existe com RLS, unique por evento e 3 estados',
       exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'briefing_extracao' and rowsecurity)
       and exists (
         select 1 from pg_indexes
         where schemaname = 'public' and tablename = 'briefing_extracao'
           and indexdef like '%UNIQUE%(event_id)%'
       )
       and exists (
         select 1 from pg_constraint
         where conrelid = 'public.briefing_extracao'::regclass and contype = 'c'
           and pg_get_constraintdef(oid) like '%descartada%'
       )
union all
select 'as 4 policies da proposta estão de pé e nenhuma alcança anon',
       (select count(*) from pg_policies
        where schemaname = 'public' and tablename = 'briefing_extracao') = 4
       and not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'briefing_extracao'
           and 'anon' = any(roles)
       )
union all
select 'a proposta herda a empresa do evento (gatilho)',
       exists (
         select 1 from pg_trigger
         where tgrelid = 'public.briefing_extracao'::regclass
           and tgname = 'trg_fill_empresa' and not tgisinternal
       );
