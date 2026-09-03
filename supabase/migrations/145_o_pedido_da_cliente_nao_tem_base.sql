-- 145 — O pedido da cliente não tem base
--
-- A 143 ensinou o Recalcular a respeitar o número que ela digita
-- (base_origem='manual'). Faltou a outra metade: a linha continuava
-- guardando em base_quantidade o público do último dimensionamento — e
-- são exatamente três leitores que perguntam isso para dizer "este
-- evento está defasado":
--
--   * a resolução da pendência dentro de dimensionar_recursos_evento
--     (143), que só fecha quando NENHUM item por pessoa tem base
--     diferente do público de hoje;
--   * a varredura noturna abrir_pendencias_defasagem (137:116-122);
--   * o aviso ao vivo da Operação (defasagemDoPublico, recursos-core).
--
-- Efeito em silêncio: bastava a cliente pedir "800 doces" num item por
-- pessoa para o evento ficar com um alerta de defasagem e uma pendência
-- de revisão que NENHUM caminho do produto conseguia mais fechar — nem
-- o botão Recalcular, que agora pula essa linha de propósito. Apareceria
-- semanas depois, num evento real, como um aviso que não some.
--
-- O conserto é semântico, não remendo: número pedido pela cliente não
-- tem base. Quem manda é ela. A tela já dizia isso (textoDaBase devolve
-- "pedido pela cliente" e ignora a base); faltava o banco concordar. A
-- outra metade fecha no app, em salvarNumero, para a linha não voltar a
-- nascer torta. Item que volta ao automático (previsto limpo → origem
-- nula) recebe base nova no próximo dimensionamento, como sempre.
--
-- Também normaliza o CHECK do teto: a 143 o escreveu junto do "add
-- column if not exists", e o Postgres separa o CHECK num subcomando
-- próprio — o IF NOT EXISTS guarda só a coluna. Uma segunda execução da
-- 143 criaria events_guests_max_check1, uma terceira o 2, e assim por
-- diante. Nada quebra, mas "rodar duas vezes dá o mesmo estado" deixa
-- de ser verdade, e é essa regra que torna a migração re-executável com
-- segurança.

-- ------------------------------------------------------------------
-- 1) O número dela perde a base
-- ------------------------------------------------------------------

update public.evento_recurso
   set base_quantidade = null,
       updated_at      = now()
 where base_origem = 'manual'
   and base_quantidade is not null;

-- ------------------------------------------------------------------
-- 2) Um CHECK só para o teto do público
-- ------------------------------------------------------------------

do $$
declare
  c record;
begin
  -- qualquer clone anônimo criado por reexecução da 143 sai
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.events'::regclass
      and contype  = 'c'
      and conname <> 'events_guests_max_check'
      and pg_get_constraintdef(oid) ilike '%guests_max%'
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;

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

-- ------------------------------------------------------------------
-- 3) Conferência — tudo true
-- ------------------------------------------------------------------

select 'nenhum item pedido pela cliente guarda base' as item,
       not exists (
         select 1 from public.evento_recurso
         where base_origem = 'manual' and base_quantidade is not null
       ) as ok
union all
select 'o teto do público tem um CHECK, e um só',
       (select count(*) = 1 from pg_constraint
        where conrelid = 'public.events'::regclass
          and contype  = 'c'
          and pg_get_constraintdef(oid) ilike '%guests_max%')
union all
select 'o teto continua recusando número negativo',
       exists (
         select 1 from pg_constraint
         where conrelid = 'public.events'::regclass
           and conname  = 'events_guests_max_check'
       )
union all
select 'o Recalcular continua respeitando o pedido da cliente',
       (select prosrc like '%<> ''manual''%'
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'dimensionar_recursos_evento')
union all
-- as duas linhas abaixo medem o privilégio direto, não a presença de uma
-- linha numa view de catálogo: um "not exists" passa também quando a
-- view devolve nada, e conferência que passa por acidente não confere
select 'registrar_proveniencia fora do alcance de anon',
       not has_function_privilege(
         'anon',
         'public.registrar_proveniencia(uuid,text,text,uuid,text,text,text)',
         'execute')
union all
select 'semear_briefing_casal fora do alcance de anon',
       not has_function_privilege('anon', 'public.semear_briefing_casal(uuid)', 'execute');
