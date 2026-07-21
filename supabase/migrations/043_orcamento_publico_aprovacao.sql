-- ============================================================
-- Vela — Migração 043: link público do orçamento (Etapa 5 de 6)
--
-- Cliente abre por hash (sem login), vê a proposta, aprova ou recusa e,
-- aprovando, preenche a ficha de cadastro. Mesmo padrão de RPC
-- SECURITY DEFINER + grant a anon já usado em roteiro_publico e
-- responder_confirmacao — a tabela nunca é exposta diretamente.
--
-- DECISÕES:
--  * Ficha do cliente em colunas dedicadas no próprio orcamentos
--    (ficha_*): são 7 campos, não justifica tabela separada, e a Etapa 6
--    lê tudo de uma linha só ao criar Cliente + Evento.
--  * NÃO sobrescrevemos contato_* com os dados da ficha: contato_* é o
--    que a cerimonialista digitou (histórico da negociação); ficha_* é o
--    que o cliente confirmou. A Etapa 6 usa ficha_* com fallback.
--  * responder_orcamento notifica a RESPONSÁVEL quando houver
--    (cerimonialista_responsavel_id -> membros_equipe.user_id), senão a
--    dona da empresa — padrão de notificação já usado no projeto.
--  * Tipos de notificação novos exigem ampliar o CHECK de notifications
--    (a 019 restringiu a lista; sem isto o INSERT falharia).
--
-- Execute no SQL Editor do Supabase (depois da 042).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Ficha de cadastro preenchida pelo cliente na aprovação
-- ------------------------------------------------------------
alter table public.orcamentos
  add column if not exists ficha_nome       text,
  add column if not exists ficha_telefone   text,
  add column if not exists ficha_whatsapp   text,
  add column if not exists ficha_email      text,
  add column if not exists ficha_instagram  text,
  add column if not exists ficha_cep        text,
  add column if not exists ficha_endereco   text,
  add column if not exists ficha_cidade     text,
  add column if not exists ficha_preenchida_em timestamptz,
  add column if not exists respondido_em    timestamptz;

-- Tipos de notificação desta etapa (o CHECK da 019 é restritivo).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'tarefa_proxima', 'evento', 'pagamento', 'mensagem', 'fornecedor',
    'orcamento_aprovado', 'orcamento_recusado'
  ));

-- ------------------------------------------------------------
-- 2) Consulta pública por hash
-- ------------------------------------------------------------
create or replace function public.consultar_orcamento_publico(p_hash text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'nome_contato', o.contato_nome,
    'tipo_evento', o.tipo_evento,
    'data_evento', o.data_evento,
    'local_evento', o.local_evento,
    'cidade_evento', o.cidade_evento,
    'numero_convidados', o.numero_convidados,
    'valor_total', o.valor_total,
    'data_criacao', o.data_criacao,
    'data_validade', o.data_validade,
    'validade_dias', o.validade_dias,
    'status', o.status,
    'respondido_em', o.respondido_em,
    'ficha_preenchida', o.ficha_preenchida_em is not null,
    'logo_url', e.logo_url,
    'nome_empresa', e.nome,
    'itens', coalesce(
      (
        select json_agg(
          json_build_object(
            'nome', oi.nome,
            'descricao', oi.descricao,
            'valor', oi.valor_calculado,
            'tipo_calculo', oi.tipo_calculo,
            'valor_unitario', oi.valor_unitario,
            'quantidade_convidados', oi.quantidade_convidados_aplicada,
            'taxa_fixa', oi.taxa_fixa
          ) order by oi.ordem
        )
        from public.orcamento_itens oi
        where oi.orcamento_id = o.id
      ),
      '[]'::json
    )
  )
  from public.orcamentos o
  join public.empresas e on e.id = o.empresa_id
  where o.hash_publico = p_hash;
$$;

revoke all on function public.consultar_orcamento_publico(text) from public;
grant execute on function public.consultar_orcamento_publico(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3) Aprovar / recusar
-- ------------------------------------------------------------
create or replace function public.responder_orcamento(p_hash text, p_status text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc   public.orcamentos%rowtype;
  v_dono  uuid;
  v_tipo  text;
begin
  if p_status not in ('aprovado', 'recusado') then
    return json_build_object('error', 'status inválido');
  end if;

  select * into v_orc from public.orcamentos where hash_publico = p_hash;
  if not found then
    return json_build_object('error', 'orçamento não encontrado');
  end if;

  if v_orc.status <> 'enviado' then
    return json_build_object(
      'error', 'este orçamento já foi respondido ou não está disponível para resposta'
    );
  end if;

  if v_orc.data_validade < current_date then
    update public.orcamentos set status = 'expirado', updated_at = now()
    where id = v_orc.id;
    return json_build_object('error', 'este orçamento expirou');
  end if;

  update public.orcamentos
  set status = p_status, respondido_em = now(), updated_at = now()
  where id = v_orc.id;

  -- Notifica a responsável, se houver; senão a dona da empresa.
  select coalesce(
    (select m.user_id from public.membros_equipe m
      where m.id = v_orc.cerimonialista_responsavel_id),
    (select e.owner_user_id from public.empresas e where e.id = v_orc.empresa_id)
  ) into v_dono;

  v_tipo := case when p_status = 'aprovado'
                 then 'orcamento_aprovado' else 'orcamento_recusado' end;

  if v_dono is not null then
    insert into public.notifications (cerimonialista_id, type, title, message, link)
    values (
      v_dono,
      v_tipo,
      v_orc.contato_nome || case when p_status = 'aprovado'
        then ' aprovou o orçamento!' else ' recusou o orçamento' end,
      v_orc.tipo_evento || ' — R$ ' || to_char(v_orc.valor_total, 'FM999G999G990D00'),
      '/orcamentos/' || v_orc.id
    );
  end if;

  return json_build_object(
    'success', true,
    'status', p_status,
    'precisa_ficha_cadastro', p_status = 'aprovado'
  );
end;
$$;

revoke all on function public.responder_orcamento(text, text) from public;
grant execute on function public.responder_orcamento(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 4) Ficha de cadastro (só após aprovar)
-- ------------------------------------------------------------
create or replace function public.preencher_ficha_orcamento_aprovado(
  p_hash      text,
  p_nome      text,
  p_telefone  text,
  p_whatsapp  text,
  p_email     text,
  p_instagram text,
  p_cep       text,
  p_endereco  text,
  p_cidade    text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orc public.orcamentos%rowtype;
begin
  select * into v_orc from public.orcamentos
  where hash_publico = p_hash and status = 'aprovado';

  if not found then
    return json_build_object('error', 'orçamento não encontrado ou não aprovado');
  end if;

  if coalesce(trim(p_nome), '') = '' or coalesce(trim(p_telefone), '') = '' then
    return json_build_object('error', 'nome e telefone são obrigatórios');
  end if;

  -- contato_* preserva o que a cerimonialista digitou; ficha_* guarda o
  -- que o cliente confirmou (a Etapa 6 usa ficha_* com fallback).
  update public.orcamentos set
    ficha_nome      = trim(p_nome),
    ficha_telefone  = nullif(trim(p_telefone), ''),
    ficha_whatsapp  = nullif(trim(coalesce(p_whatsapp, '')), ''),
    ficha_email     = nullif(trim(coalesce(p_email, '')), ''),
    ficha_instagram = nullif(trim(coalesce(p_instagram, '')), ''),
    ficha_cep       = nullif(trim(coalesce(p_cep, '')), ''),
    ficha_endereco  = nullif(trim(coalesce(p_endereco, '')), ''),
    ficha_cidade    = nullif(trim(coalesce(p_cidade, '')), ''),
    ficha_preenchida_em = now(),
    updated_at = now()
  where id = v_orc.id;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.preencher_ficha_orcamento_aprovado(
  text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.preencher_ficha_orcamento_aprovado(
  text, text, text, text, text, text, text, text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5) Expiração automática (chamada pelo cron diário)
-- ------------------------------------------------------------
create or replace function public.expirar_orcamentos_vencidos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd integer;
begin
  update public.orcamentos
  set status = 'expirado', updated_at = now()
  where status = 'enviado' and data_validade < current_date;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

revoke all on function public.expirar_orcamentos_vencidos() from public, anon;
grant execute on function public.expirar_orcamentos_vencidos() to authenticated, service_role;

commit;
