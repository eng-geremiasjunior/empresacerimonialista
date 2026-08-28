-- ============================================================
-- Vela — Migração 126: o guia curado
-- Execute no SQL Editor do Supabase. Convergente: pode rodar de novo.
-- ============================================================
--
-- Duas coisas que o guia (096) prometia e não entregava.
--
-- 1) CURADORIA DAS REFERÊNCIAS. O guia_publico manda ao fornecedor TODAS
--    as inspirações do evento — o mural inteiro, incluindo o que foi
--    descartado na conversa. E a tela do guia da equipe não mostra
--    referência nenhuma, então a cerimonialista nem via o que estava
--    saindo. A coluna no_guia é o selo: só entra no link quem ela
--    marcou, e como o casal aprova o guia inteiro (enviar → aprovar), o
--    que a decoradora recebe é referência escolhida E aprovada.
--
--    Sem backfill de propósito: medido antes de escrever — 2 inspirações,
--    1 guia, 1 hash compartilhado, e esse hash NÃO compartilha a seção
--    'referencias'. Nenhum link mostra referência hoje, então não há o
--    que preservar e o vazamento fecha na hora em que isto roda.
--
-- 2) O QUE NÃO PODE MUDAR. "Centro de mesa até 20 cm" é o tipo de fato
--    que nasce na conversa com a cliente e morre ali: hoje o pedido dela
--    (pedir_ajuste_guia) vai para o histórico interno, e o histórico não
--    sai no link. A coluna restricoes é onde a equipe escreve a regra, e
--    ela viaja com QUALQUER fatia — seção é assunto (cores, flores),
--    restrição é limite de execução: quem monta precisa dela mesmo que
--    só tenha recebido as cores. Depender de marcar uma caixa a mais
--    seria o caminho para a mesa montada errado.

-- ------------------------------------------------------------
-- 1) O selo da referência e a regra do guia
-- ------------------------------------------------------------
alter table public.evento_inspiracao
  add column if not exists no_guia boolean not null default false;

comment on column public.evento_inspiracao.no_guia is
  'true = a equipe levou esta referência para o guia; é o filtro do que sai no link do fornecedor.';

alter table public.evento_guia_estilo
  add column if not exists restricoes text;

comment on column public.evento_guia_estilo.restricoes is
  'O que não pode mudar na execução, escrito como REGRA ("centro de mesa até 20 cm"), não como motivo. Sai em qualquer fatia compartilhada.';

-- ------------------------------------------------------------
-- 2) guia_publico — corpo da 096 verbatim, com duas mudanças
-- ------------------------------------------------------------
-- Mudanças, e nada mais: 'restricoes' no JSON (fora do sistema de
-- seções) e `and i.no_guia` na subquery de referências. Os três gates
-- (hash existe, situação aprovada, fatia por seções) e a regra de
-- motivo_interno nunca lido ficam exatamente como estavam.
create or replace function public.guia_publico(p_hash text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_comp   public.guia_compartilhamento%rowtype;
  v_guia   public.evento_guia_estilo%rowtype;
  v_ev     public.events%rowtype;
  v_forn   text;
  v_secoes text[];
  v_out    json;
begin
  select * into v_comp from public.guia_compartilhamento where hash = p_hash;
  if not found then
    return null;
  end if;

  select * into v_guia from public.evento_guia_estilo where id = v_comp.guia_id;
  if not found or v_guia.situacao not in ('aprovado', 'alterado') then
    return null;
  end if;

  select * into v_ev from public.events where id = v_guia.event_id;
  select s.name into v_forn from public.suppliers s where s.id = v_comp.supplier_id;
  v_secoes := v_comp.secoes;

  select json_build_object(
    'guia_nome',   v_guia.nome,
    'sensacao',    v_guia.sensacao,
    'fornecedor',  v_forn,
    'evento_data', v_ev.date,
    'aprovado_em', v_guia.aprovado_em,
    'secoes',      v_secoes,
    -- fora das seções: quem executa precisa da regra mesmo que só tenha
    -- recebido as cores
    'restricoes',  nullif(trim(coalesce(v_guia.restricoes, '')), ''),
    'cores', case when 'cores' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', c.nome, 'papel', c.papel, 'hex', c.hex, 'nota', c.nota,
        'foto_path', c.foto_path) order by c.ordem), '[]'::json)
      from public.evento_guia_cor c where c.guia_id = v_guia.id
    ) else null end,
    'flores', case when 'flores' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', f.nome, 'epoca', f.epoca, 'nota', f.nota,
        'foto_path', f.foto_path) order by f.ordem), '[]'::json)
      from public.evento_guia_flor f
      where f.guia_id = v_guia.id and not f.vetada
    ) else null end,
    -- o veto sai com o motivo DO FORNECEDOR; motivo_interno não aparece
    -- em nenhum ramo desta função
    'vetadas', case when 'flores' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', f.nome,
        'motivo', coalesce(nullif(trim(f.motivo_fornecedor), ''), 'não usar')
      ) order by f.ordem), '[]'::json)
      from public.evento_guia_flor f
      where f.guia_id = v_guia.id and f.vetada
    ) else null end,
    'materiais', case when 'materiais' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'nome', m.nome, 'nota', m.nota, 'foto_path', m.foto_path)
        order by m.ordem), '[]'::json)
      from public.evento_guia_material m where m.guia_id = v_guia.id
    ) else null end,
    'trajes', case when 'trajes' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'papel', t.papel, 'hex', t.hex, 'descricao', t.descricao)), '[]'::json)
      from public.evento_guia_traje t where t.guia_id = v_guia.id
    ) else null end,
    'papelaria', case when 'papelaria' = any(v_secoes) then json_build_object(
      'fontes', v_guia.papelaria_fontes,
      'nome_casal', v_guia.papelaria_nome_casal,
      'data', v_guia.papelaria_data,
      'local', v_guia.papelaria_local,
      'nota', v_guia.papelaria_nota
    ) else null end,
    -- só as referências que a equipe levou para o guia
    'referencias', case when 'referencias' = any(v_secoes) then (
      select coalesce(json_agg(json_build_object(
        'assunto', i.assunto, 'agradou', i.legenda, 'autor', i.autor,
        'foto_path', i.storage_path) order by i.created_at), '[]'::json)
      from public.evento_inspiracao i
      where i.event_id = v_guia.event_id and i.no_guia
    ) else null end
  ) into v_out;

  return v_out;
end $$;

revoke all on function public.guia_publico(text) from public;
grant execute on function public.guia_publico(text) to anon, authenticated;

comment on function public.guia_publico(text) is
  'O guia como o fornecedor vê: só se aprovado, só a fatia daquele hash, só as referências curadas, e o veto sai com motivo_fornecedor. motivo_interno NUNCA é lido aqui.';

-- ------------------------------------------------------------
-- Conferência — todas as linhas devem voltar `true`.
-- ------------------------------------------------------------
select 'evento_inspiracao.no_guia existe' as item,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'evento_inspiracao'
                 and column_name = 'no_guia') as ok
union all
select 'evento_guia_estilo.restricoes existe',
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'evento_guia_estilo'
                 and column_name = 'restricoes')
union all
select 'o link do fornecedor filtra referências por no_guia',
       (pg_get_functiondef('public.guia_publico(text)'::regprocedure)
         like '%i.no_guia%')
union all
select 'a regra de execução sai no link (restricoes)',
       (pg_get_functiondef('public.guia_publico(text)'::regprocedure)
         like '%''restricoes''%')
union all
select 'a regra sai fora do sistema de seções (não depende de marcar caixa)',
       (pg_get_functiondef('public.guia_publico(text)'::regprocedure)
         not like '%''restricoes'', case when%')
union all
select 'motivo_interno continua fora do link',
       (pg_get_functiondef('public.guia_publico(text)'::regprocedure)
         not like '%motivo_interno%')
union all
select 'anon continua sem ler as tabelas direto (só pela função)',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public'
           and tablename in ('evento_inspiracao', 'evento_guia_estilo')
           and 'anon' = any(roles)
       );
