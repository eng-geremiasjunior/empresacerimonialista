create or replace function public.consultar_pendencias_fornecedor(p_hash text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso public.fornecedor_acesso%rowtype;
begin
  select * into v_acesso
  from public.fornecedor_acesso
  where hash = p_hash;

  if not found then return null; end if;
  if v_acesso.revogado_em is not null then return null; end if;
  if v_acesso.expira_em < now() then return null; end if;

  update public.fornecedor_acesso
  set aberturas = aberturas + 1, ultima_abertura = now()
  where id = v_acesso.id;

  return (
    select json_build_object(
      'fornecedor', (
        select json_build_object('nome', s.name)
        from public.suppliers s where s.id = v_acesso.supplier_id
      ),
      'empresa', (
        select json_build_object('nome', e.nome, 'logo_url', e.logo_url)
        from public.empresas e where e.id = v_acesso.empresa_id
      ),
      'pendencias', coalesce((
        select json_agg(
          json_build_object(
            'id', sf.id,
            'tipo', sf.tipo,
            'titulo', sf.titulo,
            'status', sf.status,
            'prazo_ate', sf.prazo_ate,
            'respondida_em', sf.respondida_em,
            'evento', json_build_object(
              'nome', coalesce(ev.name, c.name),
              'data', ev.date,
              'local', ev.location
            )
          ) order by ev.date, sf.created_at
        )
        from public.solicitacao_fornecedor sf
        join public.events ev on ev.id = sf.event_id
        left join public.clients c on c.id = ev.client_id
        where sf.supplier_id = v_acesso.supplier_id
          and sf.empresa_id = v_acesso.empresa_id
          and ev.status <> 'concluido'
          and (
            sf.status in ('enviada', 'reenviada')
            -- Pendente que já venceu também aparece: a página é o lugar
            -- onde está tudo, e a cerimonialista pode ter mandado o link
            -- por fora, sem passar pela fila. O que ainda não venceu fica
            -- de fora — mostrar seria cobrar antes da hora.
            or (
              sf.status = 'pendente'
              and (
                sf.dispara_em is null
                or sf.dispara_em <= (now() at time zone 'America/Sao_Paulo')::date
              )
            )
            or (sf.status = 'respondida' and sf.respondida_em > now() - interval '7 days')
          )
      ), '[]'::json)
    )
  );
end;
$$;

revoke all on function public.consultar_pendencias_fornecedor(text) from public;
grant execute on function public.consultar_pendencias_fornecedor(text) to anon, authenticated;

-- ============================================================
-- 5) ESCRITA PÚBLICA (o fornecedor responde)
-- ============================================================
-- Função separada que REVALIDA a pertinência: a solicitação tem que ser
-- do fornecedor dono do hash. Sem isso, quem tem um hash qualquer
-- responderia pela solicitação de outro. Molde do _item_do_link (032).
create or replace function public.responder_solicitacao(
  p_hash          text,
  p_solicitacao_id uuid,
  p_resposta      jsonb
)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_acesso public.fornecedor_acesso%rowtype;
  v_sol    public.solicitacao_fornecedor%rowtype;
  v_sincronizou int := 0;
begin
  select * into v_acesso from public.fornecedor_acesso where hash = p_hash;
  if not found
     or v_acesso.revogado_em is not null
     or v_acesso.expira_em < now() then
    return json_build_object('error', 'link inválido');
  end if;

  select * into v_sol
  from public.solicitacao_fornecedor
  where id = p_solicitacao_id
    and supplier_id = v_acesso.supplier_id
    and empresa_id  = v_acesso.empresa_id
  for update;

  if not found then
    return json_build_object('error', 'solicitação não encontrada');
  end if;
  -- 'pendente' entra aqui porque o fornecedor pode chegar pela página
  -- antes de a fila ter mandado a mensagem. Resposta adiantada é resposta
  -- boa: fecha a pendência e evita a cobrança que sairia amanhã.
  if v_sol.status not in ('pendente', 'enviada', 'reenviada') then
    return json_build_object('error', 'esta solicitação já foi respondida');
  end if;

  update public.solicitacao_fornecedor
  set status = 'respondida',
      respondida_em = now(),
      resposta = p_resposta,
      updated_at = now()
  where id = v_sol.id;

  -- Confirmação também atualiza o registro antigo, que é o que a tela de
  -- fornecedores do evento e a saúde do evento já leem hoje.
  if v_sol.tipo = 'confirmacao' then
    update public.supplier_confirmations
    set status = case
          when coalesce(p_resposta->>'confirmado', 'true') = 'false' then 'recusado'
          else 'confirmado'
        end,
        responded_at = now()
    where event_id = v_sol.event_id and supplier_id = v_sol.supplier_id;
    get diagnostics v_sincronizou = row_count;
  end if;

  -- O registro antigo tem gatilho proprio de notificacao (019). Quando ele
  -- existe, o aviso ja saiu por la; repetir daqui duplicaria na tela dela.
  if v_sincronizou = 0 then
    insert into public.notifications
      (cerimonialista_id, empresa_id, type, title, message, link)
    select ev.cerimonialista_id, v_sol.empresa_id, 'fornecedor',
           s.name || ' respondeu',
           v_sol.titulo,
           '/eventos/' || v_sol.event_id || '/fornecedores'
    from public.events ev
    join public.suppliers s on s.id = v_sol.supplier_id
    where ev.id = v_sol.event_id and ev.cerimonialista_id is not null;
  end if;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.responder_solicitacao(text, uuid, jsonb) from public;
grant execute on function public.responder_solicitacao(text, uuid, jsonb) to anon, authenticated;

-- Conferência: as duas linhas abaixo devem voltar "true".
select 'consultar aceita pendente vencida' as verificacao,
       pg_get_functiondef('public.consultar_pendencias_fornecedor(text)'::regprocedure)
         like '%sf.status = ''pendente''%' as aplicou
union all
select 'responder aceita pendente',
       pg_get_functiondef('public.responder_solicitacao(text, uuid, jsonb)'::regprocedure)
         like '%not in (''pendente'', ''enviada'', ''reenviada'')%';
