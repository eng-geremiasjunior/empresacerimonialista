-- ============================================================
-- Vela — Migração 115: a caixa de espera e a equipe de dois tipos
-- ============================================================
-- Três decisões do dono viram estrutura aqui:
--
-- 1) VISIBILIDADE POR CARGO NA CENTRAL. As tabelas da 108 nasceram por
--    empresa — cerimonialista e assistente viam solicitações, batidas e
--    hashes de fornecedor da empresa inteira. Passam a valer as regras
--    do resto do sistema: solicitação segue eventos_visiveis(); e
--    fila/espera são superfície de QUEM CONDUZ — assistente não lê a
--    Central (nem via REST). Contato de fornecedor não é assunto da
--    assistente do dia.
--
-- 2) BATIDA POR FORNECEDOR + RESPONSÁVEL. Numa empresa com duas
--    cerimonialistas, o mesmo buffet gerava uma batida que nenhuma das
--    duas enxergava inteira. Agora cada condutora tem a própria batida
--    daquele fornecedor, com os eventos dela — homogênea por
--    construção: quem envia sempre enxerga tudo. Do lado do fornecedor
--    é honesto: são interlocutoras diferentes, cada mensagem sai do
--    número de quem conduz.
--
-- 3) ENVIO ÍNTEGRO. Marcar batida como enviada vira operação atômica no
--    servidor (batida + TODOS os itens), recusando remetente que não
--    enxergue algum evento da batida — defesa de segunda linha; com a
--    batida homogênea, recusa é exceção.
--
-- Convergente: pode rodar quantas vezes for preciso.

begin;

-- ------------------------------------------------------------
-- 1) A batida ganha a responsável
-- ------------------------------------------------------------
alter table public.batida
  add column if not exists responsavel_membro_id uuid
  references public.membros_equipe (id) on delete set null;

-- Backfill: o responsável do evento da primeira solicitação anexada;
-- sem solicitação (ou evento sem responsável), a dona da empresa —
-- o fallback que a 022 estabeleceu.
update public.batida b
set responsavel_membro_id = coalesce(
  (
    select e.cerimonialista_responsavel_id
    from public.solicitacao_fornecedor sf
    join public.events e on e.id = sf.event_id
    where sf.batida_id = b.id
      and e.cerimonialista_responsavel_id is not null
    order by sf.created_at
    limit 1
  ),
  (
    select m.id from public.membros_equipe m
    where m.empresa_id = b.empresa_id and m.is_owner = true
    limit 1
  )
)
where b.responsavel_membro_id is null;

-- Anti-duplicata de batida viva: uma por (fornecedor, responsável).
-- O maybeSingle do app errava com 2+ vivas e criava uma terceira.
drop index if exists uq_batida_viva;
create unique index if not exists uq_batida_viva
  on public.batida (supplier_id, responsavel_membro_id)
  where status in ('na_fila', 'segurada');

-- ------------------------------------------------------------
-- 2) RLS: a Central passa a falar a língua do resto do sistema
-- ------------------------------------------------------------
-- solicitacao_fornecedor: leitura por EVENTO (eventos_visiveis) e nunca
-- para assistente; escrita por empresa (mantém criarPedido/cron/ações
-- funcionando), também sem assistente.
drop policy if exists "solicitacao_equipe" on public.solicitacao_fornecedor;

drop policy if exists solicitacao_select on public.solicitacao_fornecedor;
create policy solicitacao_select on public.solicitacao_fornecedor
  for select using (
    event_id in (select public.eventos_visiveis())
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  );

drop policy if exists solicitacao_insert on public.solicitacao_fornecedor;
create policy solicitacao_insert on public.solicitacao_fornecedor
  for insert with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  );

drop policy if exists solicitacao_update on public.solicitacao_fornecedor;
create policy solicitacao_update on public.solicitacao_fornecedor
  for update using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  );

drop policy if exists solicitacao_delete on public.solicitacao_fornecedor;
create policy solicitacao_delete on public.solicitacao_fornecedor
  for delete using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  );

-- batida e fornecedor_acesso: continuam por empresa (não têm event_id;
-- a batida é por fornecedor, atravessando eventos) — mas assistente sai.
drop policy if exists "batida_equipe" on public.batida;
create policy "batida_equipe" on public.batida
  for all using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  );

drop policy if exists "fornecedor_acesso_equipe" on public.fornecedor_acesso;
create policy "fornecedor_acesso_equipe" on public.fornecedor_acesso
  for all using (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  )
  with check (
    empresa_id = (select mc.empresa_id from public.meu_cargo() mc)
    and (select mc.cargo from public.meu_cargo() mc) <> 'assistente'
  );

-- ------------------------------------------------------------
-- 3) Envio íntegro: batida + TODOS os itens, atomicamente
-- ------------------------------------------------------------
-- O WhatsApp abre no aparelho dela e a mensagem sai do número dela; o
-- que esta função registra é que a batida saiu — inteira. Recusa quem
-- não enxerga algum evento da batida (não deve acontecer com a batida
-- homogênea; se acontecer, é sinal de dado velho, e recusar é o certo).
create or replace function public.marcar_batida_enviada(p_batida_id uuid)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_batida  public.batida%rowtype;
  v_cargo   text;
  v_empresa uuid;
  v_fora    int;
  v_agora   timestamptz := now();
begin
  select mc.cargo, mc.empresa_id into v_cargo, v_empresa
  from public.meu_cargo() mc;

  if v_empresa is null or v_cargo = 'assistente' then
    return json_build_object('error', 'sem permissão');
  end if;

  select * into v_batida from public.batida
  where id = p_batida_id and empresa_id = v_empresa
  for update;

  if not found then
    return json_build_object('error', 'mensagem não encontrada');
  end if;
  if v_batida.status not in ('na_fila', 'segurada') then
    return json_build_object('error', 'esta mensagem já tinha saído');
  end if;

  -- todos os eventos da batida precisam estar na visão de quem envia
  select count(*) into v_fora
  from public.solicitacao_fornecedor sf
  where sf.batida_id = p_batida_id
    and sf.event_id not in (select public.eventos_visiveis());

  if v_fora > 0 then
    return json_build_object(
      'error',
      'esta mensagem inclui eventos fora da sua visão — quem conduz esses eventos envia'
    );
  end if;

  update public.batida
  set status = 'enviada', enviada_em = v_agora
  where id = p_batida_id;

  -- primeira saída é envio; as seguintes são cobrança da mesma coisa
  update public.solicitacao_fornecedor
  set status = case when status = 'pendente' then 'enviada' else 'reenviada' end,
      enviada_em   = case when status = 'pendente' then v_agora else enviada_em end,
      reenviada_em = case when status = 'pendente' then reenviada_em else v_agora end,
      tentativas   = tentativas + 1,
      updated_at   = v_agora
  where batida_id = p_batida_id
    and status in ('pendente', 'enviada', 'reenviada');

  return json_build_object('success', true);
end;
$$;

revoke all on function public.marcar_batida_enviada(uuid) from public, anon;
grant execute on function public.marcar_batida_enviada(uuid) to authenticated;

commit;

-- ------------------------------------------------------------
-- Conferência: todas as linhas devem voltar "true".
-- ------------------------------------------------------------
select 'batida tem responsável e nenhuma ficou sem' as verificacao,
       exists (select 1 from information_schema.columns
               where table_name = 'batida'
                 and column_name = 'responsavel_membro_id')
       and not exists (select 1 from public.batida
                       where responsavel_membro_id is null) as aplicou
union all
select 'índice de batida viva única existe',
       exists (select 1 from pg_indexes where indexname = 'uq_batida_viva')
union all
select 'solicitação: leitura virou por evento',
       exists (select 1 from pg_policies
               where tablename = 'solicitacao_fornecedor'
                 and policyname = 'solicitacao_select'
                 and qual like '%eventos_visiveis%')
union all
select 'assistente fora da Central (3 tabelas)',
       (select count(*) from pg_policies
        where tablename in ('solicitacao_fornecedor', 'batida', 'fornecedor_acesso')
          and qual like '%assistente%') >= 5
union all
select 'RPC de envio íntegro existe e nega anon',
       exists (select 1 from pg_proc where proname = 'marcar_batida_enviada')
       and not exists (select 1 from information_schema.routine_privileges
                       where routine_name = 'marcar_batida_enviada'
                         and grantee = 'anon');
